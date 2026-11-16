// Mensagens entre a tela e o Worker do jogo. A tela só recebe dados prontos para mostrar (nada do mundo vivo).
import type { Origem } from '../../../temporada/jogador.ts';

export type { Origem };

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

export interface Pedidos {
  clubes: { pede: void; volta: ClubeResumo[] };
  novoJogo: { pede: NovoJogo; volta: Painel };
  avancar: { pede: void; volta: Painel };
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
