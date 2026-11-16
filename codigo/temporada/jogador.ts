// Clube do jogador (etapa 4, 8ª fatia, parte 8a; GDD-gestao 1 e 8): técnico do jogador, início de carreira e o
// gancho síncrono que a temporada chama em cada ciclo. Toda resposta `null` (ou gancho ausente) é "delegado":
// a temporada faz o que a IA faria, sem gastar sorteio a mais.
import type { Clube, PadraoTime, Tatica, Tecnico } from '../motor/dados.ts';
import type { AjustePausa, ControlePausa, InfoPausa, ResultadoPartida } from '../motor/tipos.ts';
import { efetivo } from '../gestao/comissao.ts';
import type { Carga, Ciclo, Foco } from '../gestao/treino.ts';
import { chaveTatica } from '../gestao/treino.ts';
import type { Meta, NivelMeta } from '../gestao/diretoria.ts';
import type { ModeloEvento } from '../gestao/eventos.ts';
import type { Desfalques, Memoria } from './memoria.ts';
import type { JogoDisputado } from './temporada.ts';
import type { Jogador } from '../motor/dados.ts';

/** Áreas de delegação (GDD-gestao 8). Na 8a, compra e venda, comercial e base seguem sempre com a IA (manual na 8b). */
export type Area = 'tatica' | 'treino' | 'imprensa' | 'mercado' | 'comercial' | 'base';
export const AREAS: Record<Area, string> = {
  tatica: 'Tática e pausas', treino: 'Treino', imprensa: 'Imprensa', mercado: 'Compra e venda', comercial: 'Comercial, ingressos e sócio', base: 'Base',
};
export const ATALHOS = { tecnico: ['tatica', 'treino', 'imprensa'] as Area[], gestor: ['mercado', 'comercial', 'base'] as Area[] };

export type Origem = 'Ex-jogador' | 'Estudioso' | 'Formador da base';

/** PROVISORIO (8a): técnico do jogador. Atributos 10, com o bônus da origem; Reputação baixa. */
export const TECNICO_JOGADOR = {
  base: 10,
  reputacao: 5,
  origens: {
    'Ex-jogador': { reputacao: 3, trabalho: { 'Motivação': 4, 'Gestão de Grupo': 2 } },
    'Estudioso': { reputacao: 0, trabalho: { 'Leitura Tática': 3, 'Treino Tático': 3 } },
    'Formador da base': { reputacao: 0, trabalho: { 'Jovens': 5, 'Gestão de Grupo': 1 } },
  } as Record<Origem, { reputacao: number; trabalho: Record<string, number> }>,
  /** Paciência pela Reputação: Confiança inicial 60 + 2 × (técnico − clube), de 35 a 70. */
  confianca: { base: 60, porPonto: 2, min: 35, max: 70 },
  idade: 40,
} as const;

export const TRABALHO = ['Leitura Tática', 'Ajuste nas Pausas', 'Motivação', 'Gestão de Grupo', 'Jovens', 'Disciplina', 'Treino Tático'] as const;

export interface FichaTecnico {
  nome: string;
  origem: Origem;
  estilo: string;
  formacaoComBola: string;
  formacaoSemBola: string;
  temperamento: 'Paizão' | 'Linha-dura' | 'Gestor';
}

export function criarTecnicoDoJogador(f: FichaTecnico): Tecnico {
  const o = TECNICO_JOGADOR.origens[f.origem];
  const trabalho = Object.fromEntries(TRABALHO.map((k) => [k, TECNICO_JOGADOR.base + (o.trabalho[k] ?? 0)]));
  return {
    nome: f.nome, idade: TECNICO_JOGADOR.idade, nacionalidade: 'Brasil', clube: '', clubeId: null, liga: '',
    estilo: f.estilo, formacaoComBola: f.formacaoComBola, formacaoSemBola: f.formacaoSemBola,
    // Reação nas pausas: na 8a o auxiliar decide pelo padrão Adaptável (pausas interativas na 8b).
    reacao: 'Adaptável', temperamento: f.temperamento, imprensa: 'discreto', origem: f.origem, trabalho,
    reputacao: TECNICO_JOGADOR.reputacao + o.reputacao, ambicao: 10, lealdade: 10, historia: '', humano: true,
  };
}

/** O técnico do jogador assume o clube; o técnico do clube vai para os livres. Antes do 1º ano (sem memória). */
export function assumirClube(tecnicos: Tecnico[], clube: Clube, novo: Tecnico): Tecnico | null {
  const velho = tecnicos.find((t) => t.clubeId === clube.id) ?? null;
  if (velho) Object.assign(velho, { clubeId: null, clube: '', liga: '' });
  Object.assign(novo, { clubeId: clube.id, clube: clube.nome, liga: clube.liga });
  tecnicos.push(novo);
  return velho;
}

export function confiancaInicial(tecnico: Tecnico, clube: Clube): number {
  const c = TECNICO_JOGADOR.confianca;
  return Math.max(c.min, Math.min(c.max, c.base + c.porPonto * (tecnico.reputacao - clube.reputacao)));
}

/** Troca de estilo ou formação pelo jogador: o treino passa a contar a tática nova (GDD-gestao 2). */
export function mudarTatica(mem: Memoria, clube: string, tatica: Tatica, novo: Partial<Pick<Tecnico, 'estilo' | 'formacaoComBola' | 'formacaoSemBola'>>): void {
  const g = mem.gestao.get(clube);
  if (!g) return;
  Object.assign(g.tecnico, novo);
  g.semanas = tatica.estilos.find((s) => s.nome === g.tecnico.estilo)?.entrosamentoSemanas || 1;
}

/** Entrosamento de 0 a 100% da tática atual (para a tela). */
export function progressoTatica(mem: Memoria, clube: string): number {
  const g = mem.gestao.get(clube);
  if (!g) return 0;
  return Math.min(1, (g.treino.taticas.get(chaveTatica(g.tecnico))?.progresso ?? 0) / Math.max(1, g.semanas));
}

// ---------- Gancho ----------

export interface InfoJogo { dia: number; competicao: string; adversario: string; casa: boolean; classico: boolean; decisao: boolean }

export interface PedidoEvento {
  modelo: ModeloEvento;
  /** Texto do evento já preenchido. */
  texto: string;
  /** Escolhas possíveis agora (requisito atendido), com a chance do sorteio quando houver. */
  opcoes: { letra: string; texto: string; chance: number | null }[];
}

export interface PedidoColetiva {
  assunto: string;
  pergunta: string;
  respostas: { tom: string; texto: string }[];
  /** Tons das últimas respostas (3 iguais seguidas rendem menos). */
  ultimosTons: string[];
}

export interface PedidoEscalacao {
  jogo: InfoJogo;
  elenco: Jogador[];
  condicao: Record<string, number>;
  poupados: string[];
  desfalques: Desfalques;
}

export interface ControleJogador {
  clube: string;
  /** Resultado do jogo do clube (tela 1 do ciclo). */
  aoJogo?(d: JogoDisputado, r: ResultadoPartida, mem: Memoria): void;
  /** Início do ciclo, antes de notícias e eventos (tela 2). */
  aoCiclo?(jogo: InfoJogo, mem: Memoria): void;
  /** Escolha de evento: a letra, ou null para "Avançar" (opção mais neutra, GDD-gestao 8). */
  evento?(p: PedidoEvento, mem: Memoria): string | null;
  /** Resposta na coletiva: o tom e se é a assessoria (imprensa delegada); null segue o cenário. */
  coletiva?(p: PedidoColetiva, mem: Memoria): { tom: string; assessoria: boolean } | null;
  /** Treino do ciclo (tela 3): null mantém a decisão da IA, que vem em `ia`. */
  treino?(ciclo: Ciclo, ia: { carga: Carga; foco: Foco }, mem: Memoria): { carga: Carga; foco: Foco } | null;
  /** Próximo jogo (tela 5): titulares e ajustes do padrão; null deixa com o auxiliar (IA e adaptação). */
  escalar?(p: PedidoEscalacao, mem: Memoria): { titulares?: string[]; padrao?: Partial<PadraoTime> } | null;
  /** Pausa da partida (8b1): o que mudar; null deixa com o auxiliar (IA). */
  pausa?(info: InfoPausa, jogo: InfoJogo, mem: Memoria): AjustePausa | null;
  /** Nível da meta no início do ano; null deixa a diretoria escolher pela Ambição. */
  meta?(metas: Record<NivelMeta, Meta | null>, mem: Memoria): NivelMeta | null;
}

/** Analista e leitura do auxiliar com o técnico para as pausas do clube do jogador (GDD 7). */
export function controleDaPausa(mem: Memoria, clube: string, lado: 0 | 1, pausa: ControlePausa['pausa']): ControlePausa {
  const g = mem.gestao.get(clube);
  const at = (cargo: Parameters<typeof efetivo>[1], sigla: string): number => (g ? efetivo(g.comissao, cargo, sigla) : 10);
  const lt = g?.tecnico.trabalho?.['Leitura Tática'] ?? 10;
  return {
    lado, pausa,
    analista: { profundidade: at('Analista', 'Prof'), precisao: at('Analista', 'Prec'), aoVivo: at('Analista', 'Vivo') },
    leitura: (at('Auxiliar', 'Lei') + lt) / 2,
  };
}
