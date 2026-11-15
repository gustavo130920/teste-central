// Tipos dos dados de referência, gerados pelo conversor em gerado/*.json.

export type Atributo =
  | 'Pas' | 'Dom' | 'Dri' | 'Cru' | 'Fin' | 'Lon' | 'Cab' | 'Des' | 'BP'
  | 'Ref' | 'Mao' | 'Aer' | 'Sai' | 'Pes' | 'Com'
  | 'Vis' | 'Dec' | 'Pos' | 'Mov' | 'Conc' | 'DT' | 'Comp' | 'Lid' | 'Comb'
  | 'Vel' | 'Res' | 'For' | 'Agi' | 'Imp'
  | 'Cons' | 'JG' | 'Les';

export type Posicao = 'GOL' | 'ZAG' | 'LAT-E' | 'LAT-D' | 'VOL' | 'MC' | 'MO' | 'PON-E' | 'PON-D' | 'CA' | 'LAT' | 'PON';

export interface PosicaoSecundaria { posicao: Posicao; nota: number }

export interface Jogador {
  id: string;
  clubeId: string | null;
  numero: number | null;
  capitao: boolean;
  nome: string;
  nomeCompleto: string;
  idade: number;
  nacionalidade: string;
  posicao: Posicao;
  secundarias: PosicaoSecundaria[];
  pe: string;
  peFraco: number;
  altura: number;
  peso: number;
  atributos: Partial<Record<Atributo, number>>;
  nota: number;
  potencial: number;
  tracos: string[];
  qualidades: string[];
  defeitos: string[];
  perfilJovem: string | null;
  ambicao: number;
  lealdade: number;
  salario: number;
  valor: number;
  contrato: number | null;
  tipo: string | null;
}

export interface Rival { nome: string; clubeId: string | null; classico: string | null; intensidade: number | null }

export interface Clube {
  id: string;
  nome: string;
  nomeCurto: string;
  liga: string;
  reserva: boolean;
  apelido: string | null;
  cidade: string;
  fundacao: number | null;
  cores: string;
  mascote: string;
  escudo: string | null;
  estadio: string | null;
  capacidadeMil: number | null;
  torcida: string | null;
  torcidaTamanho: number | null;
  torcidaExigencia: number | null;
  perfil: string | null;
  reputacao: number;
  forca: number | null;
  estruturaCT: number | null;
  estruturaBase: number | null;
  estiloTradicional: string;
  rivais: Rival[];
  historia: string | null;
}

export interface Tecnico {
  nome: string;
  idade: number;
  nacionalidade: string;
  clube: string;
  clubeId: string | null;
  liga: string;
  estilo: string;
  formacaoComBola: string;
  formacaoSemBola: string;
  reacao: string | null;
  temperamento: string | null;
  /** Jeito com a imprensa (polêmico ou discreto); só nos técnicos com ficha completa. */
  imprensa?: string | null;
  origem: string | null;
  trabalho: Record<string, number> | null;
  reputacao: number;
  ambicao: number | null;
  lealdade: number | null;
  historia: string;
}

export type NotaEstilo = 'Bloco' | 'Pressao' | 'Posse' | 'Verticalidade' | 'Risco' | 'Fisico';

export interface PadraoTime {
  linha: 'Alta' | 'Média' | 'Baixa';
  pressao: 'Alta' | 'Média' | 'Baixa';
  largura: 'Aberta' | 'Normal' | 'Estreita';
  ritmo: 'Rápido' | 'Normal' | 'Lento';
  saida: 'Curta' | 'Mista' | 'Direta';
}

export interface Estilo {
  id: string;
  nome: string;
  notas: Record<NotaEstilo, number>;
  padrao: PadraoTime;
  formacaoComBola: string;
  formacaoSemBola: string;
  forca: string;
  brecha: string;
  favorece: { posicao: string; atributos: Atributo[] }[];
  entrosamentoSemanas: number;
  resumo: string;
}

export interface PecaFormacao { posicao: Posicao; zona: string }
export interface Formacao { id: string; nome: string; pecas: PecaFormacao[] }

export interface Etiqueta { tipo: string; corredor: string; faixas: number[] }
export interface Instrucao {
  id: string;
  posicao: string;
  nome: string;
  fase: 'Com' | 'Sem';
  etiquetas: Etiqueta[];
  chaves: Atributo[];
  tracos: string[];
  custo: { energia: string; risco: string; posse: string };
  exige: string | null;
  combina: string[];
  contraria: string[];
  resumo: string;
}

export interface Combinacao {
  id: string;
  nome: string;
  pecas: string[];
  zona: string;
  condicao: string | null;
  bonusTipo: string;
  bonusValor: number;
  pista: string;
  revelacao: string;
}

export interface Tatica {
  estilos: Estilo[];
  formacoes: Formacao[];
  instrucoes: Instrucao[];
  combinacoes: Combinacao[];
}

export interface FraseNarracao {
  id: string;
  tema: string;
  lance: string;
  voz: 'N' | 'C';
  contexto: string[];
  texto: string;
}

/** Comissão (bloco 5): os 12 cargos de cada clube. */
export const CARGOS = ['Auxiliar', 'Preparador', 'Goleiros', 'Analista', 'Olheiro atual', 'Olheiro potencial', 'Olheiro jovens', 'Coord. base', 'Médico', 'Psicólogo', 'Diretor', 'Comercial'] as const;
export type Cargo = typeof CARGOS[number];

export interface Profissional {
  cargo: Cargo;
  nome: string;
  idade: number;
  nacionalidade: string;
  /** Siglas do arquivo (Lei, TTe, Rec, Prev, Trat...), de 1 a 20. */
  atributos: Record<string, number>;
  reputacao: number;
  ambicao: number;
  lealdade: number;
  /** Química com o técnico; null para os livres. */
  quimica: number | null;
  homemDeConfianca: boolean;
  salario: number;
  contrato: number | null;
}
