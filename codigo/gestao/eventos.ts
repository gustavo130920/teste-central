// Eventos e imprensa no ciclo (etapa 4, 7ª fatia; GDD-gestao 10). Contas puras e o formato dos dados.
// O calendário (quando sorteia, quem é o alvo, o que cada efeito mexe) fica em temporada/eventos.ts.
import { PMG } from './diretoria.ts';

export type Nivel = 'P' | 'M' | 'G';

/**
 * Um efeito da ficha. `k` é o nome do efeito (`Moral`, `Humor`, `Suspensão`, `Segue`...). Nas escalas P/M/G:
 * `quem` (jogador, jogador2, elenco, grupo, profissional, clube, rival), `sinal` e `nivel`.
 */
export interface Efeito { k: string; quem?: string; sinal?: 1 | -1; nivel?: Nivel; n?: number; id?: string; chance?: number; nome?: string }

export interface Escolha {
  letra: string;
  texto: string;
  requisito: string | null;
  sorteio: { base: number; atributo: string } | null;
  efeitos: Efeito[];
  sucesso: Efeito[];
  falha: Efeito[];
}

export interface ModeloEvento {
  id: string;
  tema: string;
  titulo: string;
  cadeia: { nome: string; elo: number; de: number } | null;
  /** Condições, cada uma no vocabulário do gerador-eventos (avaliadas em temporada/eventos.ts). */
  gatilho: string[];
  alvo: string;
  /** Comum 12 · Incomum 5 · Raro 1; null em elo de cadeia e obrigatório. */
  peso: number | null;
  obrigatorio: boolean;
  mods: { fator: number; cond: string }[];
  /** Temporadas até repetir; null = Único. */
  intervalo: number | null;
  prazo: number;
  delegado: string;
  texto: string;
  escolhas: Escolha[];
}

export interface Reporter { id: string; tipo: string; nome: string; veiculo: string; credibilidade: Credibilidade }
export type Credibilidade = 'Alta' | 'Média' | 'Baixa';

/** Notícia, pergunta de coletiva, resposta ou fala de jogador (`dados/imprensa/`). Campos que não se aplicam ficam vazios. */
export interface ItemImprensa {
  id: string;
  arquivo: string;
  assunto: string;
  reporter: string;
  contexto: string[];
  credibilidade: Credibilidade | null;
  efeitos: Efeito[];
  manchete: string;
  texto: string;
  /** Coletiva: tons aceitos. Resposta: pergunta e tom. Fala: sinal. */
  tons: string[];
  pergunta: string | null;
  tom: string | null;
  sinal: 'Positiva' | 'Negativa' | null;
}

export interface Imprensa { reporteres: Reporter[]; itens: ItemImprensa[] }

/** P/M/G de cada escala (gerador-eventos; Humor e Confiança vêm da tabela única da diretoria). Valores provisórios. */
export const ESCALA: Record<string, Record<Nivel, number>> = {
  Humor: PMG, 'Confiança': PMG,
  Popularidade: { P: 1, M: 2, G: 3 },
  Moral: { P: 5, M: 10, G: 20 },
  Lealdade: { P: 1, M: 2, G: 3 },
  'Química': { P: 1, M: 2, G: 3 },
  'Memória': { P: 1, M: 2, G: 3 },
  /** % do progresso completo da tática. */
  Entrosamento: { P: 2, M: 5, G: 10 },
  /** Ímpeto no início do próximo jogo (−100 a 100). */
  'Ímpeto': { P: 3, M: 5, G: 8 },
  /** Folhas mensais. */
  Caixa: { P: 0.25, M: 0.5, G: 1.5 },
  /** % do orçamento, da folha, das cotas, da ocupação e dos sócios. */
  'Orçamento': { P: 5, M: 10, G: 20 },
  Folha: { P: 1, M: 2, G: 4 },
  'Patrocínio': { P: 2, M: 5, G: 10 },
  'Público': { P: 1, M: 3, G: 6 },
  'Sócios': { P: 1, M: 3, G: 6 },
};

export const valorDe = (e: Efeito): number => (e.nivel ? ESCALA[e.k][e.nivel] * (e.sinal ?? 1) : 0);

export const EVENTOS = {
  maxPorCiclo: 2,
  /** Sorteado: 5% × dias até o próximo jogo, entre 10% e 50%. */
  chance: { porDia: 5, min: 10, max: 50 },
  pesos: { Comum: 12, Incomum: 5, Raro: 1 } as Record<string, number>,
  /** Ano de eleição (associações): tema diretoria e gatilho Eleição × 1,5. */
  eleicao: 1.5,
  /** Sorteio da escolha: base + (atributo − 10) × 2, entre 5% e 95%. */
  sorteio: { porPonto: 2, min: 5, max: 95 },
  /** Marcas duram 12 semanas, se nenhum evento as encerrar antes (GDD-gestao 3). */
  marcaDias: 84,
  respaldo: { rachado: -15, promessa: -5, promessaMax: -15 },
  /** Fase boa: 10+ pontos nos últimos 5 jogos; ruim: até 4. Crise: rachado, Confiança até 40, Humor até 30, moral do grupo até 35. */
  fase: { jogos: 5, boa: 10, ruim: 4 },
  crise: { confianca: 40, humor: 30, moral: 35 },
  retaFinal: [41, 48] as [number, number],
  /** Obrigatórios: ultimato com Confiança até 20, salários com 2 meses de atraso. */
  ultimato: { id: 'DIR-021', confianca: 20 },
  salarios: { id: 'FIN-011', meses: 2 }, // uma vez por episódio de atraso
  /** PROVISORIO: camadas do alvo. Craque = 3 melhores notas do elenco; jovem até 21; veterano 32+. */
  camada: { craques: 3, jovem: 21, veterano: 32 },
} as const;

export const IMPRENSA = {
  credibilidade: { Alta: 1, 'Média': 0.7, Baixa: 0.4 } as Record<Credibilidade, number>,
  /** Rumor verdadeiro ao publicar, pela credibilidade. */
  verdade: { Alta: 85, 'Média': 55, Baixa: 25 } as Record<Credibilidade, number>,
  ambiente: { chance: 50, rumor: 3, rumorJanela: 2, crise: 4, eleicao: 4, provocacao: 1 },
  /** Modelo não repete em 8 jogos. */
  repete: 8,
  coletiva: { crise: 50, normal: 50, perguntasGrande: 2, perguntas: 1 }, // normal 30 → 50 (Gustavo, 15/11/2026)
  assunto: { posJogo: 3, preJogo: 2, pressao: 4, mercado: 2, escalacao: 1, diretoria: 1 },
  /** Assessoria: ganhos × 0,35 (Gustavo, 15/11/2026; era 0,5). Tom repetido (3ª coletiva seguida com o mesmo tom): × 0,5. Não acumulam. */
  assessoria: 0.35, tomRepetido: { seguidas: 3, fator: 0.5 },
  rival: { polemico: 70, discreto: 20 },
  falas: { intervalo: 3, chance: 40, crise: 60, sinal: { boa: 75, neutra: 50, ruim: 25 } },
  eleicao: 1.5,
} as const;

/** Chance de um sorteado no ciclo, em %. */
export const chanceDeEvento = (dias: number): number => {
  const c = EVENTOS.chance;
  return Math.max(c.min, Math.min(c.max, c.porDia * dias));
};

/** Chance de sucesso da escolha com sorteio, em %. */
export const chanceDaEscolha = (base: number, atributo: number): number => {
  const s = EVENTOS.sorteio;
  return Math.max(s.min, Math.min(s.max, base + (atributo - 10) * s.porPonto));
};

export type Fase = 'boa' | 'neutra' | 'ruim';
/** Fase pelos pontos dos últimos 5 jogos oficiais (menos de 5 jogos: neutra). */
export function faseDe(pontos: number[]): Fase {
  const f = EVENTOS.fase;
  if (pontos.length < f.jogos) return 'neutra';
  const s = pontos.slice(-f.jogos).reduce((a, b) => a + b, 0);
  return s >= f.boa ? 'boa' : s <= f.ruim ? 'ruim' : 'neutra';
}

/** Momento da coletiva: em fase ruim, efeito negativo sobe um nível; em fase boa, desce (P vira 0); no clássico, Ímpeto sobe. */
export function nivelNoMomento(e: Efeito, fase: Fase, classico: boolean): Efeito | null {
  if (!e.nivel) return e;
  const ordem: Nivel[] = ['P', 'M', 'G'];
  let i = ordem.indexOf(e.nivel);
  if ((e.sinal ?? 1) < 0 && fase === 'ruim') i = Math.min(2, i + 1);
  if ((e.sinal ?? 1) < 0 && fase === 'boa') i -= 1;
  if (e.k === 'Ímpeto' && classico) i = Math.min(2, i + 1);
  return i < 0 ? null : { ...e, nivel: ordem[i] };
}

// ---------- Leitura dos efeitos (conversor e testes) ----------

const ESCALAS = Object.keys(ESCALA).join('|');
const RE_ESCALA = new RegExp(`^(${ESCALAS})(?: (jogador2?|elenco|grupo|profissional2?|clube|rival))? ([+−-])([PMG])$`);

/** Lê um efeito (`Moral jogador +P`, `Suspensão 1 jogos`, `Segue: VES-003 em 3 semanas (60%)`); null se não reconhece. */
export function lerEfeito(tok: string): Efeito | null {
  const t = tok.trim();
  let m = t.match(RE_ESCALA);
  if (m) return { k: m[1], ...(m[2] ? { quem: m[2] } : {}), sinal: m[3] === '+' ? 1 : -1, nivel: m[4] as Nivel };
  if ((m = t.match(/^Suspensão (\d+) jogos?$/))) return { k: 'Suspensão', n: Number(m[1]) };
  if ((m = t.match(/^Lesão (\d+) semanas?$/))) return { k: 'Lesão', n: Number(m[1]) };
  if ((m = t.match(/^Segue: ([A-Z]{3}-\d{3}) em (\d+) semanas? \((\d+)%\)$/))) return { k: 'Segue', id: m[1], n: Number(m[2]), chance: Number(m[3]) };
  if ((m = t.match(/^Marca: (.+)$/))) return { k: 'Marca', nome: m[1] };
  if ((m = t.match(/^Sai do clube(?: \(\{(\w+)\}\))?$/))) return { k: 'Sai do clube', quem: m[1] ?? 'jogador' };
  if ((m = t.match(/^Interesse de \{(\w+)\}$/))) return { k: 'Interesse', quem: m[1] };
  if (['Multa', 'Treino perdido', 'Promessa cumprida', 'Promessa quebrada', 'Fica até o fim da temporada'].includes(t)) return { k: t };
  return null;
}

/** Coluna Humor/Confiança da imprensa (`-P`, `+M`, `0`). */
export function lerColuna(k: 'Humor' | 'Confiança', v: string): Efeito | null {
  const m = v.trim().match(/^([+−-])([PMG])$/);
  return m ? { k, sinal: m[1] === '+' ? 1 : -1, nivel: m[2] as Nivel } : null;
}

/** Atributo de requisito e sorteio → de onde vem (técnico, jogador alvo ou cargo e sigla da comissão). */
export const ATRIBUTOS: Record<string, { de: 'tecnico'; chave: string } | { de: 'jogador'; chave: string } | { de: 'comissao'; cargo: string; sigla: string }> = {
  'Leitura Tática': { de: 'tecnico', chave: 'Leitura Tática' },
  'Ajuste nas Pausas': { de: 'tecnico', chave: 'Ajuste nas Pausas' },
  'Motivação': { de: 'tecnico', chave: 'Motivação' },
  'Gestão de Grupo': { de: 'tecnico', chave: 'Gestão de Grupo' },
  'Desenvolvimento de Jovens': { de: 'tecnico', chave: 'Jovens' },
  Disciplina: { de: 'tecnico', chave: 'Disciplina' },
  'Treino Tático': { de: 'tecnico', chave: 'Treino Tático' },
  'Liderança': { de: 'jogador', chave: 'Lid' },
  Compostura: { de: 'jogador', chave: 'Comp' },
  Combatividade: { de: 'jogador', chave: 'Comb' },
  'Gestão emocional': { de: 'comissao', cargo: 'Psicólogo', sigla: 'Emo' },
  'Formação de jovens': { de: 'comissao', cargo: 'Psicólogo', sigla: 'Jov' },
  'Amenizar defeitos': { de: 'comissao', cargo: 'Psicólogo', sigla: 'Def' },
  'Negociação': { de: 'comissao', cargo: 'Diretor', sigla: 'Neg' },
  'Rede de contatos': { de: 'comissao', cargo: 'Diretor', sigla: 'Rede' },
  'Gestão de elenco': { de: 'comissao', cargo: 'Diretor', sigla: 'Elen' },
  'Blindagem do técnico': { de: 'comissao', cargo: 'Diretor', sigla: 'Blind' },
  'Negociação comercial': { de: 'comissao', cargo: 'Comercial', sigla: 'NegC' },
  Marketing: { de: 'comissao', cargo: 'Comercial', sigla: 'Mkt' },
  'Ingressos e sócio': { de: 'comissao', cargo: 'Comercial', sigla: 'Ing' },
  Tratamento: { de: 'comissao', cargo: 'Médico', sigla: 'Trat' },
  'Integração ao profissional': { de: 'comissao', cargo: 'Coord. base', sigla: 'Integ' },
};

/**
 * Condições aceitas em gatilho, modificador, requisito e contexto da imprensa. O conversor recusa o que não casar;
 * temporada/eventos.ts avalia cada uma.
 */
export const CONDICOES: RegExp[] = [
  /^Sempre$/, /^Só em cadeia$/, /^Fase (pré-temporada|janela|temporada|reta final|boa|ruim)$/, /^na janela$/, /^na reta final$/, /^em ano de eleição$/,
  /^Eleição ano de eleição$/, /^Próximo jogo (clássico|decisão)$/, /^Jogo (casa|clássico|decisão)$/, /^Sequência \d+\+ (derrotas|vitórias)$/,
  /^Saúde (Boa|Média|Crítica)$/, /^(Gestão|Clube) (Associação|SAF)$/, /^Posição (Z\d+|G\d+|meio da tabela|topo)$/,
  /^(Humor|Confiança|Popularidade|Moral elenco) (até \d+|\d+\+)$/, /^Folha atrasada \d+ meses$/, /^Promessa (atrasada|quebrada)$/,
  /^Competição (continental|\d+ simultâneas)$/, /^Liga Série [AB]$/, /^Perfil .+$/, /^Marca: .+$/, /^Resultado (vitória|derrota|goleada|goleado)$/,
  /^Estilo .+$/, /^(Qualidade|Defeito|Perfil de jovem) .+$/, /^Briga (título|rebaixamento)$/, /^Tom \S+$/, /^Imprensa (polêmico|discreto)$/,
  new RegExp(`^(${Object.keys(ATRIBUTOS).join('|')}) \\d+\\+$`), /^.+ no elenco$/, /^Caixa \d+ folhas?$/, /^Popularidade \d+\+$/,
];
export const condicaoConhecida = (c: string): boolean => CONDICOES.some((r) => r.test(c.trim()));
