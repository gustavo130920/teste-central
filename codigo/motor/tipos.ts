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
  /** Nota do jogo, sem limite enquanto corre (GDD 10; ver notas.ts). */
  nota: number;
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
  /** Formações em uso (mudam na pausa, 5b2). */
  formacaoComBola: string;
  formacaoSemBola: string;
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
  apoio: ApoioComissao;
  /** Moral inicial de quem vier do banco. */
  moral?: Record<string, number>;
  /** Respaldo de 15 a 39: o bloco depois de uma pausa com ajuste rende × 0,9 (GDD 7). */
  ajusteFraco: boolean;
  /** Custo do ajuste da pausa no bloco seguinte (GDD 7): 1 leve, 0,9 médio, radical pelo Ajuste nas Pausas. */
  custoAjuste: number;
  /** Instruções escolhidas pelo jogador (5b1); sem elas, o melhor encaixe. */
  instrucoes?: InstrucoesManuais;
  /** Batedores da tática (GDD 8); sem eles, o maior BP em campo. */
  batedores?: Batedores;
  /** Marcação individual (5b3): vale enquanto os dois estão em campo. */
  marcacao?: MarcacaoIndividual;
  /** Zona do alvo, na visão deste time, fixada no início do bloco (5b3). */
  zonaDoAlvo?: number;
  /** Fator casa vindo da Gestão (Humor e ocupação, GDD-gestao 9); sem ele, o PROVISORIO pela torcida. */
  casa?: number;
  /** Torcida hostil (Humor até 25): vaia em casa no fim do bloco com o time perdendo (GDD-gestao 9). */
  vaia?: boolean;
}

/** Id da instrução por jogador e fase (5b1). Vale enquanto ele joga numa vaga da instrução e a exigência está cumprida. */
export type InstrucoesManuais = Record<string, { Com?: string; Sem?: string }>;
/** Marcação individual (5b3): sem a bola, o marcador segue a zona do alvo e ganha pontos nos duelos com ele. Ids dos jogadores. */
export interface MarcacaoIndividual { marcador: string; alvo: string }
export type TipoBatedor = 'escanteio' | 'falta' | 'penalti';
/** Id do jogador por cobrança (GDD 8). */
export type Batedores = Partial<Record<TipoBatedor, string>>;

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
  /** Efeito da comissão e do treino neste jogo (GDD-gestao 2 e 8); sem ele, valores neutros. */
  apoio?: Partial<ApoioComissao>;
  /** Moral inicial por jogador (GDD-gestao 3); quem não estiver aqui começa com 60. */
  moral?: Record<string, number>;
  /** Fator casa de 0 a +2 (GDD-gestao 9); sem ele, o PROVISORIO pela torcida. */
  fatorCasa?: number;
  /** Humor até 25: vaia em casa com o time perdendo. */
  vaia?: boolean;
  /** Ímpeto no início do jogo (eventos e imprensa, 7ª fatia); sem ele, 0. */
  impeto?: number;
  /** Titulares escolhidos (clube do jogador, 8ª fatia): entram primeiro e sem rodízio; sem ele, os melhores 11. */
  titulares?: string[];
  /** Instruções individuais do jogador (5b1); sem elas, o melhor encaixe. */
  instrucoes?: InstrucoesManuais;
  /** Batedores (5b1); sem eles, o maior BP em campo. */
  batedores?: Batedores;
  /** Marcação individual (5b3); a IA não usa. */
  marcacao?: MarcacaoIndividual;
}

/** O que a comissão e o treino do ciclo entregam ao motor (GDD-gestao 2 e 8). */
export interface ApoioComissao {
  /** 0,7 a 1,0 na eficácia das instruções. */
  entrosamento: number;
  /** Energia recuperada no intervalo (6 a 12, preparador). */
  recuperacaoIntervalo: number;
  /** Multiplicador da chance de lesão (× 1,2 a × 0,7, preparador). */
  prevencao: number;
  /** Bônus de quem cobra bola parada (analista 0 a +3, mais o foco Bola parada). */
  ensaiada: number;
  /** Pontos que o goleiro ganha contra o batedor de pênalti (treinador de goleiros, 0 a 3). */
  estudoBatedores: number;
  /** Gasto de energia a menos por bloco (foco Físico, 0,3 a 0,7). */
  menosGasto: number;
  /** Quedas de moral no jogo × isto (psicólogo, GDD-gestao 3). */
  quedaMoral: number;
  /** Respaldo do elenco, 0 a 100 (GDD 7). */
  respaldo: number;
  /** Entrosamento de cada tática treinada, pela chave estilo|com|sem (Plano B, 5b2); sem ele, a troca radical mantém o entrosamento. */
  taticas?: Record<string, number>;
}
export interface EntradaPartida {
  mandante: EntradaTime;
  visitante: EntradaTime;
  tatica: Tatica;
  semente: number;
  /** Campo neutro (final da Champions, Mundial): ninguém joga em casa. */
  neutro?: boolean;
  /** Clube do jogador (8b1): decide nas pausas no lugar do auxiliar; resposta null = o auxiliar decide (IA). */
  controle?: ControlePausa;
}

export type Tom = 'Cobrar' | 'Acalmar' | 'Elogiar';
/** O que o jogador muda na pausa. `padrao` traz os valores novos; `sugestoes`, os índices aplicados. */
export interface AjustePausa {
  padrao?: Partial<PadraoTime>;
  estilo?: string;
  /** Troca de formação (5b2): radical, como a de estilo. */
  formacaoComBola?: string;
  formacaoSemBola?: string;
  /** Instrução individual por jogador e fase (5b2, ajuste leve); null = o auxiliar escolhe pelo melhor encaixe. */
  instrucoes?: Record<string, { Com?: string | null; Sem?: string | null }>;
  /** Batedores novos (Plano B de uma tática salva); substituem todos. */
  batedores?: Batedores;
  /** Marcação individual (5b3, ajuste leve); null tira a que houver. */
  marcacao?: MarcacaoIndividual | null;
  trocas?: [string, string][];
  fala?: Tom;
  sugestoes?: number[];
}
export interface InfoPausa {
  minuto: number;
  intervalo: boolean;
  lado: 0 | 1;
  placar: [number, number];
  /** Relatório básico; os ajustes do adversário só com a leitura ao vivo do analista. */
  times: [RelatorioTime, RelatorioTime];
  /** Itens do analista pela Profundidade, sujeitos à Precisão. */
  extras: string[];
  sugestoes: string[];
  /** Lances do bloco que acabou. */
  lances: Lance[];
  time: TimeEmCampo;
  /** Adversário em campo, para escolher o alvo da marcação individual (5b3). */
  rival: TimeEmCampo;
  trocasRestantes: number;
}
export interface ControlePausa {
  lado: 0 | 1;
  analista: { profundidade: number; precisao: number; aoVivo: number };
  /** Média entre a Leitura de jogo do auxiliar e a Leitura Tática do técnico. */
  leitura: number;
  pausa(info: InfoPausa): AjustePausa | null;
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
