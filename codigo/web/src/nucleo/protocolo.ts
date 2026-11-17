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
  /** Sem clube: de onde saiu e por quê (aviso grande na tela). */
  semClube: { clube: string; ano: number; motivo: string } | null;
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

export type Carga = 'leve' | 'normal' | 'pesada';
export type Foco = 'tatica' | 'fisico' | 'tecnico' | 'bolaParada' | 'adversario';

// ---------- Telas de gestão (5d3a): elenco e treino ----------

export interface LinhaElenco {
  id: string;
  nome: string;
  posicao: string;
  idade: number;
  nota: number;
  potencial: number;
  /** 0 a 100. */
  condicao: number;
  moral: number;
  estado: 'ok' | 'lesionado' | 'suspenso';
  /** Dia em que volta da lesão. */
  voltaDia: number | null;
  /** Até quando vai o contrato (ano). */
  contrato: number | null;
  /** R$ mil por mês. */
  salario: number;
  /** R$ mi. */
  valor: number;
  tracos: string[];
  qualidades: string[];
  defeitos: string[];
  titularidades: number;
}

export interface TaticaTreino { nome: string; estilo: string; formacao: string; entrosamento: number; ativa: boolean; treinar: boolean }

export interface ElencoTela { clube: string; folhaMes: number; jogadores: LinhaElenco[] }

export interface TreinoTela {
  /** Plano fixo do jogador; null deixa com o auxiliar a cada ciclo. */
  plano: { carga: Carga; foco: Foco } | null;
  /** Último treino aplicado (do jogador ou do auxiliar). */
  ultimo: { carga: Carga; foco: Foco | null };
  taticas: TaticaTreino[];
}

// ---------- Base e comercial (5d3b1) ----------

export interface JovemBase { id: string; nome: string; posicao: string; idade: number; nota: number; pot: [number, number] | null; perfil: string | null; emprestimoPedido: boolean }
export interface BaseTela {
  /** true: o jogador cuida da base; false: o coordenador sobe como a IA. */
  manual: boolean;
  /** Delegada: o coordenador só sobe quem tem esta idade ou mais (null = sem limite). */
  idadeMinima: number | null;
  janela: boolean;
  elenco: number;
  elencoMax: number;
  jovens: JovemBase[];
  avisos: string[];
}
export type PedidoBase =
  | { acao: 'modo'; manual: boolean; idadeMinima?: number | null }
  | { acao: 'subir' | 'dispensar' | 'emprestar'; id: string };

export interface ObraTela { tipo: 'ct' | 'base'; nivel: number; obraAte: number | null; custo: number | null }
export interface CotaTela { tipo: string; marca: string; valor: number; ate: number }
export interface ComercialTela {
  manual: boolean;
  mes: number;
  podeMudarPreco: boolean;
  caixa: number;
  divida: number;
  banco: number;
  cabeMais: number;
  humor: number;
  ingresso: number;
  ingressoRef: number;
  mensalidade: number;
  mensalidadeRef: number;
  socios: number;
  precoMin: number;
  precoMax: number;
  obras: ObraTela[];
  cotas: CotaTela[];
  avisos: string[];
}
export type PedidoComercial =
  | { acao: 'modo'; manual: boolean }
  | { acao: 'precos'; ingresso?: number; mensalidade?: number }
  | { acao: 'emprestimo' | 'amortizar'; valor: number }
  | { acao: 'obra'; tipo: 'ct' | 'base' };

/** Resultado de uma ação: o texto de erro (null = feito) e a tela nova. */
export interface ResultadoBase { erro: string | null; tela: BaseTela }
export interface ResultadoComercial { erro: string | null; tela: ComercialTela }

// ---------- Mercado (5d3b2) ----------

export type PapelTela = 'titular' | 'rotacao' | 'reserva';
export interface VistoTela { id: string; nome: string; posicao: string; idade: number; clube: string | null; nota: string; pot: string; valor: number; relatorios: number; observado: boolean; meu: boolean }
export interface NegTela {
  id: number;
  tipo: 'compra' | 'renovacao';
  /** Texto: Compra (clube), Livre, Pré-contrato ou Renovação. */
  rotulo: string;
  jogador: string;
  jogadorId: string;
  fase: 'clube' | 'jogador';
  rodada: number;
  estado: 'aberta' | 'enviada';
  /** Pedido do outro lado depois da 1ª recusa (R$ mi na fase do clube; R$ mil/mês na do jogador). */
  contra: number | null;
  oferta: number;
  salario: number;
  papel: PapelTela;
  anos: number;
  /** Luvas em % do salário anual. */
  luvas: number;
  chance: number;
}
export interface TermosTela { oferta?: number; salario?: number; papel?: PapelTela; anos?: number; luvas?: number }
export interface PropostaTela { id: number; comprador: string; jogador: string; oferta: number; valor: number; maior: boolean; reacao: string; estado: string }
export interface MeuJogadorMercado { id: string; nome: string; posicao: string; idade: number; nota: number; contrato: number | null; salario: number; valor: number; transferivel: boolean; querSair: boolean; vencendo: boolean }
export interface MercadoTela {
  manual: boolean;
  janela: string;
  podeComprar: boolean;
  orcamento: number;
  folha: number;
  teto: number;
  elenco: number;
  caixa: number | null;
  avisos: string[];
  propostas: PropostaTela[];
  negociacoes: NegTela[];
  observados: VistoTela[];
  meus: MeuJogadorMercado[];
  grupos: string[];
}
export interface FiltroTela { grupo?: string; idadeMax?: number; notaMin?: number; valorMax?: number }
export type PedidoMercado =
  | { acao: 'modo'; manual: boolean }
  | { acao: 'comprar'; id: string; pre: boolean }
  | { acao: 'renovar'; id: string }
  | { acao: 'observar'; id: string }
  | { acao: 'transferivel'; id: string }
  | { acao: 'proposta'; id: number; resposta: 'aceitar' | 'recusar' | number }
  | { acao: 'enviar'; neg: number; termos: TermosTela };
export interface ResultadoMercado { erro: string | null; msg: string | null; tela: MercadoTela }

// ---------- Decisões no meio do ciclo (5d3c) ----------

export type DecisaoTela =
  | { tipo: 'evento'; titulo: string; texto: string; opcoes: { letra: string; texto: string; chance: number | null }[] }
  | { tipo: 'coletiva'; assunto: string; pergunta: string; respostas: { tom: string; texto: string }[]; ultimosTons: string[] }
  | { tipo: 'proposta'; clube: string; liga: string; reputacao: number; confianca: number; empregado: boolean; ultimoB: boolean; suaReputacao: number; clubeAtual: string | null }
  | { tipo: 'renovacao'; clube: string; anos: number; confianca: number; avaliacao: string }
  | { tipo: 'meta'; metas: { nivel: string; texto: string; bonus: number }[] }
  | { tipo: 'patrocinio'; cota: string; marcaAtual: string; valorAtual: number; propostas: { marca: string; valor: number; anos: number; teto: number }[]; desistiram: string[]; chanceDesistir: { 10: number; 20: number } };

/** Resposta: null = o padrão (evento "Avançar", coletiva com a assessoria, proposta como a regra, renovação sorteada, meta da diretoria, patrocínio com o gerente). */
export type RespostaDecisao =
  | { tipo: 'evento'; letra: string | null }
  | { tipo: 'coletiva'; tom: string | null; assessoria: boolean }
  | { tipo: 'proposta'; aceitar: boolean | null }
  | { tipo: 'renovacao'; anos: number | null }
  | { tipo: 'meta'; nivel: string | null }
  | { tipo: 'patrocinio'; escolha: number | null; pedido: 0 | 10 | 20 };

// ---------- Diretoria (5d3c, leitura) ----------
export interface DiretoriaTela {
  confianca: number;
  humor: number | null;
  semVencer: number;
  nivel: string;
  meta: string | null;
  bonus: number | null;
  paciencia: number;
  ambicao: number;
  financeiro: string;
  interferencia: string;
  popularidade: number;
  eleicao: number | null;
  contratoAte: number;
  saf: boolean;
  investidor: string | null;
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
export interface VagaTela { id: string; nome: string; vaga: string; condicao?: number; /** Zona da formação (5e), no ponto de vista do próprio ataque. */ zona?: string }

export interface TaticaTela { nome: string; estilo: string; formacaoComBola: string; formacaoSemBola: string; entrosamento: number; ajustes: string[]; instrucoes: number; batedores: Batedores; onze: VagaTela[]; /** O onze é fixo (escolhido por você). */ titularesManual: boolean; /** Com onze fixo, o auxiliar troca só quem está cansado. */ poupar: boolean }

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
  /** Onze escolhido no pré-jogo (11 ids); ausente = o da tática ou o auxiliar. */
  titulares?: string[];
  /** Com onze fixo, o auxiliar troca só quem está cansado (condição abaixo de 70). */
  poupar: boolean;
  /** Grava o onze e a opção de poupar na tática, para os próximos jogos. */
  guardar?: boolean;
  /** 'simular': o auxiliar cuida das pausas e a tela vai direto ao resultado. */
  modo: 'aoVivo' | 'simular';
}

// ---------- Editor de táticas (5b4) ----------

/** Jogador na plaquinha do campo: vaga e zona com e sem a bola, instruções (id) e as opções de cada fase. */
export interface PlaqTela {
  id: string; nome: string; nota: number; condicao: number; estado: 'ok' | 'lesionado' | 'suspenso';
  vagaCom: string; zonaCom: string; vagaSem: string; zonaSem: string;
  instrCom: string | null; instrSem: string | null;
  opcoes: { Com: OpcaoInstrucaoTela[]; Sem: OpcaoInstrucaoTela[] };
}
export interface TaticaEditTela {
  nome: string; estilo: string; formacaoComBola: string; formacaoSemBola: string;
  /** Padrão em vigor (estilo mais ajustes) e os ajustes feitos. */
  padrao: Record<string, string>; ajustes: string[];
  entrosamento: number; batedores: Batedores;
  /** true: o onze foi escolhido pelo jogador; false: o auxiliar escolhe. */
  titularesManual: boolean;
  onze: PlaqTela[];
}
export interface ElencoEditTela { id: string; nome: string; posicao: string; nota: number; condicao: number; estado: 'ok' | 'lesionado' | 'suspenso'; BP: number; Comp: number; tracos: string[] }
export interface TaticasTela {
  taticas: TaticaEditTela[];
  ativa: number;
  treinar: number;
  max: number;
  estilos: { nome: string; padrao: Record<string, string>; resumo: string }[];
  formacoes: string[];
  elenco: ElencoEditTela[];
}
export type PedidoTatica =
  | { acao: 'editar'; i: number; nome?: string; estilo?: string; formacaoComBola?: string; formacaoSemBola?: string; padrao?: Record<string, string | null> }
  | { acao: 'instrucao'; i: number; jogador: string; fase: 'Com' | 'Sem'; id: string | null }
  | { acao: 'batedor'; i: number; tipo: TipoBatedor; jogador: string | null }
  /** Põe `entra` no lugar de `sai` no onze da tática; sem os dois, o auxiliar volta a escolher. */
  | { acao: 'titular'; i: number; sai?: string; entra?: string }
  | { acao: 'duplicar' | 'apagar' | 'usar' | 'treinar'; i: number };
export interface ResultadoTatica { erro: string | null; tela: TaticasTela }

export interface Narrada { bloco: number; minuto: string; voz: 'N' | 'C'; texto: string; tema: string; placar: [number, number]; time: 0 | 1; gol: boolean }

/** Lance para o 2D (5e): zonas no ponto de vista de quem ataca (`time`), como o motor registra. */
export interface Lance2D { bloco: number; minuto: number; time: 0 | 1; tema: string; lance: string; de: string | null; para: string | null; resultado: string }

export interface EstatTela { gols: number; finalizacoes: number; noAlvo: number; posse: number; escanteios: number; faltas: number; amarelos: number; vermelhos: number; impedimentos: number }

export interface OpcaoInstrucaoTela { id: string; nome: string; encaixe: number; contraria: boolean; combina: boolean; auxiliar: boolean; exige: string | null }

export interface EmCampoTela {
  zona: string;
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
  | { tipo: 'decisao'; decisao: DecisaoTela; painel: Painel }
  | { tipo: 'prejogo'; pre: PreJogo }
  | { tipo: 'pausa'; jogo: InfoJogoTela; nomes: Record<string, string>; linhas: Narrada[]; campo: Lance2D[]; pausa: TelaPausa }
  | { tipo: 'fim'; jogo: InfoJogoTela; nomes: Record<string, string>; linhas: Narrada[]; campo: Lance2D[]; fim: FimJogo; painel: Painel };

export interface Pedidos {
  clubes: { pede: void; volta: ClubeResumo[] };
  novoJogo: { pede: NovoJogo; volta: Painel };
  avancar: { pede: void; volta: Etapa };
  preJogo: { pede: EscolhaPreJogo; volta: Etapa };
  pausa: { pede: RespostaPausa; volta: Etapa };
  decidir: { pede: RespostaDecisao; volta: Etapa };
  painel: { pede: void; volta: Painel | null };
  elenco: { pede: void; volta: ElencoTela };
  treino: { pede: void; volta: TreinoTela };
  base: { pede: void; volta: BaseTela };
  agirBase: { pede: PedidoBase; volta: ResultadoBase };
  comissao: { pede: void; volta: ComissaoTela };
  agirComissao: { pede: PedidoComissao; volta: ResultadoComissao };
  taticas: { pede: void; volta: TaticasTela };
  agirTatica: { pede: PedidoTatica; volta: ResultadoTatica };
  /** Sai do pré-jogo sem jogar: o mundo volta ao início do ciclo (nada do ciclo vale) e o painel reaparece. */
  cancelarPreJogo: { pede: void; volta: Painel };
  comercial: { pede: void; volta: ComercialTela };
  agirComercial: { pede: PedidoComercial; volta: ResultadoComercial };
  mercado: { pede: void; volta: MercadoTela };
  diretoria: { pede: void; volta: DiretoriaTela | null };
  agirMercado: { pede: PedidoMercado; volta: ResultadoMercado };
  buscarMercado: { pede: FiltroTela; volta: VistoTela[] };
  relatorioMercado: { pede: string; volta: string[] };
  chanceMercado: { pede: { neg: number; termos: TermosTela }; volta: { chance: number; luvasMi: number } };
  definirTreino: { pede: { carga: Carga; foco: Foco } | null; volta: TreinoTela };
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

// ---------- Comissão (5f) ----------

export interface ProfTela {
  nome: string; cargo: string; idade: number; nac: string;
  /** Sigla, valor do arquivo e valor efetivo (com estrutura e química; só para quem já é da comissão). */
  atributos: { sigla: string; valor: number; efetivo: number | null }[];
  reputacao: number; ambicao: number; lealdade: number;
  quimica: number | null; confianca: boolean;
  /** R$ mil por mês. */
  salario: number; contrato: number | null;
}
export interface CargoTela {
  cargo: string;
  atual: ProfTela | null;
  /** Demissão (R$ mi) e pedido de renovação (R$ mil/mês), só com profissional no cargo. */
  rescisaoMi: number | null; pedidoRenovacao: number | null;
  livres: ProfTela[];
}
export interface ComissaoTela {
  /** false: clube sem comissão nos dados. */
  temComissao: boolean; janela: boolean; caixa: number | null; folhaMil: number; ano: number;
  ct: number | null; base: number | null; cargos: CargoTela[];
}
export type PedidoComissao =
  | { acao: 'contratar'; nome: string; oferta: number; anos: number }
  | { acao: 'demitir'; cargo: string }
  | { acao: 'renovar'; cargo: string; oferta: number; anos: number };
export interface ResultadoComissao { erro: string | null; aviso: string | null; resposta: { tipo: 'aceita' | 'contra' | 'recusa'; valor: number; texto: string } | null; tela: ComissaoTela }
