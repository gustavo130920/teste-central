// Mensagens entre a tela e o Worker do jogo. A tela só recebe dados prontos para mostrar (nada do mundo vivo).
import type { Origem } from '../../../temporada/jogador.ts';
import type { AjustePausa, Batedores, MarcacaoIndividual, TipoBatedor, Tom } from '../../../motor/tipos.ts';

export type { AjustePausa, Batedores, MarcacaoIndividual, Origem, TipoBatedor, Tom };

export interface ClubeResumo {
  id: string;
  nome: string;
  nomeCurto: string;
  liga: 'serie-a' | 'serie-b';
  cidade: string;
  cores: string;
  estadio: string | null;
  reputacao: number;
  torcida: number | null;
  perfil: string | null;
  tecnico: { nome: string; estilo: string; formacao: string };
  caixa: number | null;
}

export interface JogoTela {
  dia: number;
  semana: number;
  competicao: string;
  fase?: string;
  mandante: string;
  visitante: string;
  placar?: [number, number];
  penaltis?: [number, number] | null;
}

export interface LinhaTela {
  pos: number;
  clube: string;
  j: number;
  v: number;
  e: number;
  d: number;
  gp: number;
  gc: number;
  sg: number;
  pts: number;
}

export interface ResumoVirada {
  ano: number;
  campeoes: Record<string, string>;
  rebaixados: string[];
  promovidos: string[];
}

export interface Painel {
  ano: number;
  /** Próximo dia a jogar (1 a 364). */
  dia: number;
  semana: number;
  /** Nome curto de cada clube citado. */
  nomes: Record<string, string>;
  tecnico: { nome: string; reputacao: number; clube: string | null };
  /** Clube da tela: o do técnico, ou o último dele se estiver livre. */
  clube: { id: string; nome: string; nomeCurto: string; cores: string; cidade: string; estadio: string | null; liga: string };
  proximo: JogoTela | null;
  /** Jogos do clube no último ciclo. */
  ultimos: JogoTela[];
  calendario: JogoTela[];
  tabela: { liga: string; linhas: LinhaTela[] };
  confianca: number | null;
  humor: number | null;
  caixa: number | null;
  /** Preenchido no ciclo em que o ano virou. */
  virada: ResumoVirada | null;
}

export type Slot = 'auto' | '1' | '2' | '3' | '4' | '5';
export const SLOTS_MANUAIS: Slot[] = ['1', '2', '3', '4', '5'];

export interface InfoSlot {
  slot: Slot;
  clube: string;
  tecnico: string;
  ano: number;
  semana: number;
  criado: string;
  /** Bytes com gzip. */
  tamanho: number;
}

export interface NovoJogo { clube: string; nome: string; origem: Origem; semente: number }

// ---------- Partida ao vivo (5d2) ----------

export interface InfoJogoTela {
  competicao: string;
  fase?: string;
  semana: number;
  mandante: string;
  visitante: string;
  /** Lado do clube do jogador (0 = mandante). */
  lado: 0 | 1;
  classico: boolean;
  decisao: boolean;
  estadio: string | null;
}

export interface JogadorTela { id: string; nome: string; posicao: string; nota: number; condicao?: number; atributos?: Record<string, number>; tracos?: string[] }
export interface VagaTela { id: string; nome: string; vaga: string; condicao?: number }

export interface TaticaTela { nome: string; estilo: string; formacaoComBola: string; formacaoSemBola: string; entrosamento: number; ajustes: string[]; instrucoes: number; batedores: Batedores; onze: VagaTela[] }

export interface PreJogo {
  jogo: InfoJogoTela;
  nomes: Record<string, string>;
  taticas: TaticaTela[];
  ativa: number;
  /** Quem pode jogar (sem lesionados e suspensos), para batedores e marcador. */
  elenco: JogadorTela[];
  fora: { nome: string; motivo: string }[];
  poupados: string[];
  /** Provável time do adversário (sem saber desfalques). */
  rival: VagaTela[];
}

export interface EscolhaPreJogo {
  tatica: number;
  batedores: Batedores;
  marcacao: MarcacaoIndividual | null;
  /** 'simular': o auxiliar cuida das pausas e a tela vai direto ao resultado. */
  modo: 'aoVivo' | 'simular';
}

export interface Narrada { bloco: number; minuto: string; voz: 'N' | 'C'; texto: string; tema: string; placar: [number, number]; time: 0 | 1; gol: boolean }

export interface EstatTela { gols: number; finalizacoes: number; noAlvo: number; posse: number; escanteios: number; faltas: number; amarelos: number; vermelhos: number; impedimentos: number }

export interface OpcaoInstrucaoTela { id: string; nome: string; encaixe: number; contraria: boolean; combina: boolean; auxiliar: boolean; exige: string | null }

export interface EmCampoTela {
  id: string;
  nome: string;
  vaga: string;
  goleiro: boolean;
  energia: number;
  amarelos: number;
  lesao: string | null;
  instrCom: string | null;
  instrSem: string | null;
  /** Opções de instrução individual na vaga (tática em campo), da melhor para a pior. */
  opcoes: { Com: OpcaoInstrucaoTela[]; Sem: OpcaoInstrucaoTela[] } | null;
}

export interface TelaPausa {
  minuto: number;
  intervalo: boolean;
  placar: [number, number];
  relatorio: { finalizacoes: number; posse: number; energia: number; impeto: number }[];
  estatisticas: EstatTela[];
  /** Ajustes do adversário que o analista leu ao vivo. */
  adversario: string[];
  extras: string[];
  sugestoes: string[];
  estilo: string;
  formacaoComBola: string;
  formacaoSemBola: string;
  padrao: Record<string, string>;
  marcacao: MarcacaoIndividual | null;
  trocasRestantes: number;
  emCampo: EmCampoTela[];
  banco: JogadorTela[];
  rival: VagaTela[];
  estilos: string[];
  formacoes: string[];
  planoB: { nome: string; estilo: string; formacaoComBola: string; formacaoSemBola: string; entrosamento: number; planoB: boolean; perda: number }[];
  custoRadical: number;
}

export interface RespostaPausa {
  /** null: o auxiliar decide nesta pausa (como a IA). */
  ajuste: AjustePausa | null;
  /** Índice em `TelaPausa.planoB`: a tática salva entra inteira. */
  planoB?: number | null;
  /** O auxiliar cuida das pausas que faltam e a tela vai ao resultado. */
  simularResto?: boolean;
}

export interface FimJogo {
  placar: [number, number];
  penaltis: [number, number] | null;
  gols: { minuto: string; nome: string; time: 0 | 1; obs: string }[];
  estatisticas: EstatTela[];
  notas: { nome: string; vaga: string; nota: number; entrou: boolean }[];
  lesoes: { nome: string; gravidade: string; semanas: number }[];
  rodada: { mandante: string; visitante: string; placar: [number, number]; penaltis?: [number, number] | null }[];
}

/** Para onde o Avançar levou: painel, pré-jogo, pausa ou fim da partida (com o trecho de narração desde o último passo). */
export type Etapa =
  | { tipo: 'painel'; painel: Painel }
  | { tipo: 'prejogo'; pre: PreJogo }
  | { tipo: 'pausa'; jogo: InfoJogoTela; nomes: Record<string, string>; linhas: Narrada[]; pausa: TelaPausa }
  | { tipo: 'fim'; jogo: InfoJogoTela; nomes: Record<string, string>; linhas: Narrada[]; fim: FimJogo; painel: Painel };

export interface Pedidos {
  clubes: { pede: void; volta: ClubeResumo[] };
  novoJogo: { pede: NovoJogo; volta: Painel };
  avancar: { pede: void; volta: Etapa };
  preJogo: { pede: EscolhaPreJogo; volta: Etapa };
  pausa: { pede: RespostaPausa; volta: Etapa };
  painel: { pede: void; volta: Painel | null };
  slots: { pede: void; volta: InfoSlot[] };
  salvar: { pede: Slot; volta: InfoSlot };
  carregar: { pede: Slot; volta: Painel };
  apagar: { pede: Slot; volta: void };
  exportar: { pede: Slot; volta: { nome: string; dados: Blob } };
  importar: { pede: { slot: Slot; dados: Blob }; volta: InfoSlot };
}
export type TipoPedido = keyof Pedidos;

export interface Pedido<T extends TipoPedido = TipoPedido> { id: number; tipo: T; dados: Pedidos[T]['pede'] }
export type Resposta = { id: number; ok: true; resultado: unknown } | { id: number; ok: false; erro: string };
