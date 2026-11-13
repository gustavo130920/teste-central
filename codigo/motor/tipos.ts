import type { Clube, Estilo, Instrucao, Jogador, NotaEstilo, PadraoTime, Posicao, Tatica, Tecnico } from './dados.ts';

export interface Escalado {
  j: Jogador;
  time: 0 | 1;
  vaga: Posicao;
  /** Zonas na visão do próprio time. */
  zonaCom: number;
  zonaSem: number;
  /** Zona sem a bola antes do deslocamento pela nota de Bloco. */
  zonaSemBase: number;
  /** Elos até voltar ao mapa sem a bola (GDD 2). */
  retorno: number;
  forma: number;
  jogosGrandes: number;
  energia: number;
  moral: number;
  /** Energia, moral, ímpeto e casa, calculados no início do bloco (GDD 6). */
  modBloco: number;
  instrCom: Instrucao | null;
  instrSem: Instrucao | null;
  efCom: number;
  efSem: number;
  /** Presença do jogador em cada zona, na visão do próprio time (GDD 2). */
  pesoCom: number[];
  pesoSem: number[];
  pesoContra: number[];
  amarelos: number;
  expulso: 'direto' | 'segundoAmarelo' | null;
  /** Expulso, sacado para o goleiro reserva entrar, ou lesionado sem troca: saiu sem contar como troca comum. */
  saiuSemTroca: boolean;
  /** A pior lesão sofrida neste jogo (GDD 8). */
  lesao: Gravidade | null;
}

export type Gravidade = 'leve' | 'media' | 'grave';

/** O que a etapa 3 precisa para tirar o jogador das próximas rodadas. */
export interface RegistroLesao {
  time: 0 | 1;
  jogador: string;
  gravidade: Gravidade;
  semanas: number;
  minuto: number;
  acrescimo: number;
  bloco: number;
  origem: 'bloco' | 'faltaDura';
  saiu: boolean;
  /** Quem entrou no lugar; null em leve ou quando o time seguiu com um a menos. */
  substituto: string | null;
}

/** Bônus em pontos por zona, na visão do próprio time (GDD 4). */
export interface EfeitosTime {
  chance: number[];
  posse: number[];
  contra: number[];
  recuperacao: number[];
  protecao: number[];
  brechaSem: number[];
  brechaTransicao: number[];
  atrai: number[];
  /** Buracos que cada jogador cobre, para o gasto de energia (GDD 6). */
  coberturas: Map<Escalado, number>;
  combinacaoNaZona: (string | null)[];
  resumo: string[];
  combinacoes: string[];
}

/** Pontos do time como agressor em cada eixo, e viabilidade do estilo (GDD 5). */
export interface ConfrontoTime { pressaoSaida: number; velocidadeCostas: number; criacaoBloco: number; viabilidade: number }

export interface TimeEmCampo {
  indice: 0 | 1;
  clube: Clube;
  tecnico: Tecnico;
  estilo: Estilo;
  padrao: PadraoTime;
  notas: Record<NotaEstilo, number>;
  escalados: Escalado[];
  /** Todos que entraram em campo, para a narração achar quem já saiu. */
  participantes: Escalado[];
  banco: Jogador[];
  trocas: number;
  tecnicoExpulso: boolean;
  /** Mandante fora de campo neutro: só ele tem fator casa, torcida e ganho de ímpeto em casa. */
  emCasa: boolean;
  /** Energia inicial de quem vier do banco. */
  condicao?: Record<string, number>;
  presencaCom: number[];
  presencaContra: number[];
  goleiro: Escalado;
  efeitos: EfeitosTime;
  confronto: ConfrontoTime;
}

/** `padrao` troca instruções do time em relação ao estilo do técnico (GDD 5). */
export interface EntradaTime {
  clube: Clube;
  tecnico: Tecnico;
  /** Só quem pode jogar: lesionados e suspensos já ficam de fora (etapa 3). */
  elenco: Jogador[];
  padrao?: Partial<PadraoTime>;
  /** Energia inicial por jogador (condição física, GDD-gestao 2); quem não estiver aqui começa com 100. */
  condicao?: Record<string, number>;
  /** Titulares que o auxiliar prefere poupar: vão ao banco se houver reserva da posição. */
  poupados?: string[];
}
export interface EntradaPartida {
  mandante: EntradaTime;
  visitante: EntradaTime;
  tatica: Tatica;
  semente: number;
  /** Campo neutro (final da Champions, Mundial): ninguém joga em casa. */
  neutro?: boolean;
}

export interface ContextoLance {
  placar: [number, number];
  tipoJogo: 'classico' | 'normal';
  impeto: number;
  tracos: string[];
  qualidades: string[];
  defeitos: string[];
  perfilJovem: string | null;
  estilo: string;
}

export interface Lance {
  minuto: number;
  acrescimo: number;
  bloco: number;
  cadeia: number;
  tema: string;
  lance: string;
  time: 0 | 1;
  clube: string;
  jogador: string | null;
  jogador2: string | null;
  goleiro: string | null;
  zonaOrigem: string | null;
  zonaDestino: string | null;
  resultado: string;
  chance: number | null;
  contexto: ContextoLance;
  combinacaoAtiva: string | null;
}

export interface EstatTime {
  gols: number;
  finalizacoes: number;
  noAlvo: number;
  chancesEsperadas: number;
  posseSegundos: number;
  passes: number;
  desarmes: number;
  faltas: number;
  cartoes: number;
  amarelos: number;
  vermelhos: number;
  penaltis: number;
  cobrancasDiretas: number;
  golsBolaParada: number;
  escanteios: number;
  impedimentos: number;
  contraAtaques: number;
  calor: number[];
}

export interface FinsCadeia { finalizacao: number; perda: number; falta: number; fora: number; limite: number }

export interface RelatorioTime { finalizacoes: number; possePct: number; energiaMedia: number; impeto: number; ajustes: string[] }
/** O que aparece sempre na pausa (GDD 7). O resto depende do analista e entra com a Gestão. */
export interface RelatorioPausa { minuto: number; placar: [number, number]; times: [RelatorioTime, RelatorioTime] }

export interface EstatInicio { cadeias: number; finalizacoes: number; gols: number }

export interface ResultadoPartida {
  semente: number;
  times: [TimeEmCampo, TimeEmCampo];
  placar: [number, number];
  estatisticas: [EstatTime, EstatTime];
  fins: FinsCadeia;
  cadeias: number;
  cadeiasPorBloco: number[];
  classico: boolean;
  lances: Lance[];
  pausas: RelatorioPausa[];
  lesoes: RegistroLesao[];
  porInicio: Record<string, EstatInicio>;
}
