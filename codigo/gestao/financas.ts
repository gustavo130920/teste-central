// Finanças e comercial (etapa 4, 4ª fatia; GDD-gestao 7 e 11). Contas puras por clube brasileiro.
// Valores em R$ mi, salvo salários (R$ mil/mês, como em dados/). Sul-americanos e europeus só têm orçamento e teto (ficha reduzida).
import type { Clube } from '../motor/dados.ts';
import type { Rng } from '../motor/rng.ts';
import type { ComissaoClube } from './comissao.ts';
import { efetivo } from './comissao.ts';

export interface Cota { tipo: 'Máster' | 'Material' | 'Secundário'; marca: string; valor: number; ate: number }
export interface Saf { investidor: string; participacao: number; meta: string }
/** Ficha completa de `dados/comercial/` (Séries A e B). */
export interface FichaComercial {
  clubeId: string;
  perfil: string;
  custoAnual: number;
  /** R$ mil/mês. */
  folha: number;
  comissao: number;
  tecnico: number;
  receita: number;
  caixa: number;
  divida: number;
  tvFixa: number;
  tvBonus: number;
  orcamento: number;
  /** Teto de folha, R$ mil/mês. */
  teto: number;
  cotas: Cota[];
  ocupacao: number;
  ingresso: number;
  socios: number;
  mensalidade: number;
  /** Bilheteria e sócio do ano, R$ mi. */
  publico: number;
  saf: Saf | null;
  /** Meses de salário atrasado no início (Obs). */
  atrasados: number;
}
export interface FichaReduzida { clubeId: string; perfil: string; folha: number; teto: number; orcamento: number }
export interface Marca { nome: string; segmento: string; porte: string; teto: number; uso: string[] }
export interface Comercial { fichas: FichaComercial[]; reduzidas: FichaReduzida[]; marcas: Marca[] }

export const PERFIS = ['Gigante rico', 'Gigante endividado', 'Formador', 'Emergente', 'Tradicional médio', 'Pequeno sobrevivente'] as const;

export const FINANCAS = {
  /** GDD-gestao 7: mês de 4 semanas, 13 meses no ano. */
  diasMes: 28,
  meses: 13,
  anoInicial: 2025,
  tvFixa: { 'serie-a': 4, 'serie-b': 1.5 } as Record<string, number>,
  /** Os 3 últimos da Série B: TV × 0,75 no ano seguinte. */
  ultimosB: { n: 3, fator: 0.75 },
  /** Humor neutro (sem diretoria na memória). */
  humor: 50,
  bilheteria: {
    humor: { base: 0.6, div: 125 },
    jogo: { classico: 1.3, decisao: 1.4, libertadores: 1.1, malNaTabela: 0.9 },
    /** PROVISORIO: mal na tabela = entre os 4 últimos da liga, depois de 5 jogos. */
    malNaTabela: { ultimos: 4, jogos: 5 },
    marketing: 0.005,
  },
  /** Delegado ao gerente: + (Ingressos e sócio − 10) × 0,5% de receita de bilheteria e sócio. */
  ingressos: 0.005,
  socios: {
    humor: 0.002,
    /** PROVISORIO: "mais Marketing" = × (1 + (Marketing − 10) × 0,1%) por mês. */
    marketing: 0.001,
    maxCapacidade: 3,
  },
  patrocinio: {
    negociacao: 0.01,
    /** PROVISORIO: resultado (−2 a +3) pela posição na liga (até a posição: valor); título de copa +1. */
    resultado: { 'serie-a': [[1, 3], [4, 2], [10, 1], [16, 0], [20, -2]], 'serie-b': [[1, 1], [4, 0], [7, -1], [10, -2]] } as Record<string, [number, number][]>,
    copa: 1,
    min: -2,
    max: 3,
    /** PROVISORIO: contrato novo de 1 a 3 anos; marca em até 3 clubes. */
    duracao: [1, 3] as [number, number],
    maxClubes: 3,
  },
  /** gerador-comercial: premiação da liga (até a posição: R$ mi). */
  premioLiga: { 'serie-a': [[1, 40], [4, 25], [10, 12], [16, 6], [20, 2]], 'serie-b': [[1, 10], [4, 6], [10, 2]] } as Record<string, [number, number][]>,
  /** GDD-gestao 7 (provisório no GDD). PROVISORIO: eliminado na 1ª fase da Copa do Brasil não recebe. */
  premioCopa: {
    'copa-do-brasil': { Campeão: 30, Vice: 15, Semifinal: 8, Quartas: 4, Oitavas: 2 },
    libertadores: { Campeão: 45, Vice: 20, Semifinal: 12, Quartas: 6, Grupos: 3 },
    mundial: { Campeão: 40, Vice: 20 },
  } as Record<string, Record<string, number>>,
  juros: 0.004,
  jurosNegativo: 2,
  /** Decisão do Gustavo (13/11/2026): a IA pede empréstimo para zerar o caixa negativo, até 30% da receita, e amortiza o caixa acima de 200% da receita (50% → 200% em 15/11/2026: o caixa das vendas ia todo para a dívida). */
  emprestimo: 0.3,
  amortizarAcima: 2,
  /** Folha atrasada (PROVISORIO: mês que fecha com caixa negativo); moral −M (10) por mês a partir de 2; rescisão possível com 3 (mercado, 5ª fatia). */
  atraso: { moralApos: 2, moral: 10, rescisao: 3 },
  /** GDD-gestao 8 e 11 (subida de estrutura da IA na virada, aprovada para esta fatia). */
  estrutura: { custo: 0.15, manutencao: 0.02, dias: 26 * 7, caixa: 0.5, max: 20 },
  saf: {
    chance: 15, critica: 50,
    /** PROVISORIO: o presidente aceita com 50%; técnico da IA neutro. Crítica = caixa negativo na virada ou 3+ meses de folha atrasada. */
    aceita: 50,
    aporte: [0.5, 1.5] as [number, number],
    corte: [0.5, 1] as [number, number],
    participacao: [51, 90] as [number, number],
    /** +2 em CT e base em 2 anos: PROVISORIO +1 na entrada e +1 na virada seguinte. */
    estrutura: 2,
    /** Caixa negativo por 8 semanas = 2 fechamentos de mês seguidos. */
    mesesNegativo: 2,
  },
  /** GDD-gestao 11: perfil muda quando a condição vale em 2 viradas seguidas. Emergentes iniciais contam aporte no ano 0 (PROVISORIO). */
  perfil: { emergente: { anos: 5, torcida: 12 }, endividado: { reputacao: 15, divida: 1 }, rico: { reputacao: 16, torcida: 15, divida: 0.5 }, formador: { base: 14, vendas: 0.3 }, pequeno: 1 / 3 },
  /** PROVISORIO (gerador-comercial): orçamento = 75% do caixa (50% → 75% em 15/11/2026: 97% dos reforços cortados pelo orçamento), mínimo 2% da receita, 0 com caixa negativo; Gigante endividado até 2%. */
  orcamento: { caixa: 0.75, minimo: 0.02, endividado: 0.02 },
  /** PROVISORIO (Gustavo, 15/11/2026): diretoria Gastadora com caixa positivo e aval ganha crédito de 15% da receita por ano para reforços (Gigante endividado e Pequeno não compram). */
  credito: 0.15,
  /** PROVISORIO: teto de folha também limitado a esta fração da receita (0,7 → 0,85 em 14/11/2026: com 0,7 todos lucravam). */
  tetoReceita: 0.85,
  teto: { 'Gigante rico': 1.2, Emergente: 1.3, 'Tradicional médio': 1.1, Formador: 1.1, 'Pequeno sobrevivente': 1.025, 'Gigante endividado': 1.1 } as Record<string, number>,
};

/** Lançamentos do ano (R$ mi). */
export interface Lancamentos {
  tv: number; patrocinio: number; bilheteria: number; socios: number; premiacao: number;
  folha: number; comissao: number; tecnico: number; manutencao: number; juros: number;
  obras: number; aporte: number; emprestimo: number; amortizacao: number;
  /** Mercado (5ª fatia): compras e vendas (R$ mi), vendas de crias da casa e comissões de empresários. */
  compras: number; vendas: number; vendasCrias: number; comissoes: number;
  mesesNegativo: number; mesesAtraso: number; mesesRescisao: number;
}
const zerados = (): Lancamentos => ({ tv: 0, patrocinio: 0, bilheteria: 0, socios: 0, premiacao: 0, folha: 0, comissao: 0, tecnico: 0, manutencao: 0, juros: 0, obras: 0, aporte: 0, emprestimo: 0, amortizacao: 0, compras: 0, vendas: 0, vendasCrias: 0, comissoes: 0, mesesNegativo: 0, mesesAtraso: 0, mesesRescisao: 0 });

export const receitaDe = (l: Lancamentos): number => l.tv + l.patrocinio + l.bilheteria + l.socios + l.premiacao;
export const custoDe = (l: Lancamentos): number => l.folha + l.comissao + l.tecnico + l.manutencao + l.juros;

/** Retrato de cada virada (medição do GDD-gestao 12). */
export interface AnoConta {
  ano: number; perfil: string; receita: number; custo: number; resultado: number; caixa: number; divida: number;
  folha: number; vendas: number; safNova: boolean; saf: boolean; mudouPerfil: string | null; lanc: Lancamentos;
}

export interface Conta {
  clubeId: string;
  perfil: string;
  /** Perfil que a condição apontou na virada anterior. */
  candidato: string | null;
  caixa: number;
  divida: number;
  /** Empréstimos bancários dentro da dívida (limite de 30% da receita). */
  banco: number;
  tvBonusInicial: number;
  torcidaInicial: number;
  tvFator: number;
  cotas: Cota[];
  ingresso: number;
  mensalidade: number;
  socios: number;
  ocupacaoBase: number;
  /** Lugares no estádio. */
  capacidade: number;
  /** Salário do técnico (R$ mil/mês), da ficha. */
  tecnico: number;
  ctInicial: number;
  baseInicial: number;
  obras: { tipo: 'ct' | 'base'; dia: number }[];
  /** Níveis de SAF ainda por entrar na próxima virada. */
  safEstrutura: number;
  saf: Saf | null;
  aporteAno: number | null;
  atrasados: number;
  negativoSeguidos: number;
  negativo8: boolean;
  orcamento: number;
  /** Linha de crédito do ano para reforços (diretoria Gastadora); o que passa do orçamento vira dívida. */
  credito?: number;
  teto: number;
  receitaRef: number;
  liga: { pontos: number; saldo: number; jogos: number };
  ano: Lancamentos;
  historico: AnoConta[];
}

export function criarConta(f: FichaComercial, clube: Clube): Conta {
  return {
    clubeId: f.clubeId, perfil: f.perfil, candidato: null, caixa: f.caixa, divida: f.divida, banco: 0,
    tvBonusInicial: f.tvBonus, torcidaInicial: clube.torcidaTamanho ?? 10, tvFator: 1,
    cotas: f.cotas.map((c) => ({ ...c })), ingresso: f.ingresso, mensalidade: f.mensalidade, socios: f.socios, ocupacaoBase: f.ocupacao,
    capacidade: (clube.capacidadeMil ?? 0) * 1000, tecnico: f.tecnico,
    ctInicial: clube.estruturaCT ?? 10, baseInicial: clube.estruturaBase ?? 10, obras: [], safEstrutura: 0,
    saf: f.saf ? { ...f.saf } : null, aporteAno: f.perfil === 'Emergente' ? 0 : null,
    atrasados: f.atrasados, negativoSeguidos: 0, negativo8: false, orcamento: f.orcamento, teto: f.teto, receitaRef: f.receita,
    liga: { pontos: 0, saldo: 0, jogos: 0 }, ano: zerados(), historico: [],
  };
}

const faixa = (tabela: [number, number][], pos: number): number => (tabela.find(([ate]) => pos <= ate) ?? tabela[tabela.length - 1])[1];

/** Atributos do gerente comercial (sem estrutura; GDD-gestao 8). */
export function gerente(c: ComissaoClube | undefined): { negociacao: number; ingressos: number; marketing: number } {
  if (!c) return { negociacao: 10, ingressos: 10, marketing: 10 };
  return { negociacao: efetivo(c, 'Comercial', 'NegC'), ingressos: efetivo(c, 'Comercial', 'Ing'), marketing: efetivo(c, 'Comercial', 'Mkt') };
}

export interface JogoEmCasa { classico: boolean; decisao: boolean; libertadores: boolean; malNaTabela: boolean }

/** Ocupação do jogo em casa (GDD-gestao 7), com preço na referência (IA). */
export function ocupacao(conta: Conta, jogo: JogoEmCasa, marketing: number, humor: number = FINANCAS.humor): number {
  const b = FINANCAS.bilheteria;
  const j = b.jogo;
  const fJogo = (jogo.classico ? j.classico : 1) * (jogo.decisao ? j.decisao : 1) * (jogo.libertadores ? j.libertadores : 1) * (jogo.malNaTabela ? j.malNaTabela : 1);
  return Math.min(1, conta.ocupacaoBase * (b.humor.base + humor / b.humor.div) * fJogo * (1 + (marketing - 10) * b.marketing));
}

/** Bilheteria de um jogo em casa (R$ mi), lançada na conta. */
export function lancarBilheteria(conta: Conta, jogo: JogoEmCasa, g: ReturnType<typeof gerente>, humor: number = FINANCAS.humor): number {
  const v = (conta.capacidade * ocupacao(conta, jogo, g.marketing, humor) * conta.ingresso) / 1e6 * (1 + (g.ingressos - 10) * FINANCAS.ingressos);
  conta.ano.bilheteria += v;
  conta.caixa += v;
  return v;
}

/** Posição na liga hoje: entre os últimos? */
export function malNaTabela(conta: Conta, outras: Conta[]): boolean {
  const t = FINANCAS.bilheteria.malNaTabela;
  if (conta.liga.jogos < t.jogos) return false;
  const pior = outras.filter((o) => o.liga.pontos < conta.liga.pontos || (o.liga.pontos === conta.liga.pontos && o.liga.saldo < conta.liga.saldo)).length;
  return pior < t.ultimos;
}

export interface Mes {
  dia: number;
  liga: string;
  torcida: number;
  /** Salários do elenco e da comissão, R$ mil/mês. */
  folhaMil: number;
  comissaoMil: number;
  gerente: ReturnType<typeof gerente>;
  /** Níveis de CT e base acima dos iniciais (manutenção). */
  niveisAcima: number;
  /** Humor da torcida (6ª fatia); sem ele, 50. */
  humor?: number;
  /** Aval da diretoria para o empréstimo (Confiança 40+, GDD-gestao 9); sem ele, aprovado. */
  aval?: boolean;
}

/** Fechamento do mês (GDD-gestao 7). Devolve se a folha ficou atrasada e com quantos meses. */
export function fecharMes(c: Conta, m: Mes): { atrasados: number; avalNegado: boolean } {
  const F = FINANCAS;
  const a = c.ano;
  const tv = ((F.tvFixa[m.liga] ?? 0) + c.tvBonusInicial * (m.torcida / c.torcidaInicial)) * c.tvFator / F.meses;
  const pat = c.cotas.reduce((s, x) => s + x.valor, 0) / F.meses;
  const socios = (c.socios * c.mensalidade) / 1e6 * (1 + (m.gerente.ingressos - 10) * F.ingressos);
  const manut = F.estrutura.manutencao * m.niveisAcima;
  const juros = c.divida * F.juros * (c.caixa < 0 ? F.jurosNegativo : 1);
  const folha = m.folhaMil / 1000;
  const comissao = m.comissaoMil / 1000;
  const tecnico = c.tecnico / 1000;
  a.tv += tv; a.patrocinio += pat; a.socios += socios; a.manutencao += manut; a.juros += juros; a.folha += folha; a.comissao += comissao; a.tecnico += tecnico;
  c.caixa += tv + pat + socios - manut - juros - folha - comissao - tecnico;
  // Sócios do mês seguinte: Humor e Marketing, até 3× a capacidade.
  const s = F.socios;
  c.socios = Math.min(c.capacidade * s.maxCapacidade, c.socios * (1 + ((m.humor ?? F.humor) - 50) * s.humor + (m.gerente.marketing - 10) * s.marketing));
  // IA: empréstimo bancário para zerar o caixa, até 30% da receita (Gustavo, 13/11/2026).
  let avalNegado = false;
  if (c.caixa < 0) {
    const pede = Math.min(-c.caixa, Math.max(0, F.emprestimo * c.receitaRef - c.banco));
    if (pede > 0 && m.aval === false) avalNegado = true;
    else if (pede > 0) { c.caixa += pede; c.divida += pede; c.banco += pede; a.emprestimo += pede; }
  }
  if (c.caixa < 0) {
    c.atrasados += 1;
    c.negativoSeguidos += 1;
    a.mesesNegativo += 1;
    if (c.negativoSeguidos >= F.saf.mesesNegativo) c.negativo8 = true;
  } else { c.atrasados = 0; c.negativoSeguidos = 0; }
  if (c.atrasados >= F.atraso.moralApos) a.mesesAtraso += 1;
  if (c.atrasados >= F.atraso.rescisao) a.mesesRescisao += 1;
  return { atrasados: c.atrasados, avalNegado };
}

/** Lugar na fase mais longe de cada copa → prêmio (R$ mi). */
export function premioCopa(copa: string, chegou: string): number {
  return FINANCAS.premioCopa[copa]?.[chegou] ?? 0;
}

/** Resultado da campanha para o patrocínio, de −2 a +3. */
export function resultadoCampanha(liga: string, posicao: number, copas: number): number {
  const p = FINANCAS.patrocinio;
  return Math.max(p.min, Math.min(p.max, faixa(p.resultado[liga] ?? p.resultado['serie-b'], posicao) + copas * p.copa));
}

export const premioLiga = (liga: string, posicao: number): number => faixa(FINANCAS.premioLiga[liga] ?? [[99, 0]], posicao);

const ehMaterial = (m: Marca): boolean => m.segmento === 'material esportivo';

/**
 * Renova as cotas vencidas (GDD-gestao 7): `cota anterior × (1 + resultado ÷ 10) × (1 + Negociação comercial × 1%)`, até o teto da marca.
 * PROVISORIO: fica a mesma marca; se travar no teto, entra marca do mesmo tipo com teto maior, sem rival e com menos de 3 clubes.
 */
export function renovarCotas(c: Conta, contas: Conta[], marcas: Marca[], rivais: Set<string>, ano: number, resultado: number, negociacao: number, rng: Rng): number {
  const p = FINANCAS.patrocinio;
  let renovadas = 0;
  const usuarios = (nome: string): Conta[] => contas.filter((o) => o.cotas.some((x) => x.marca === nome));
  for (const cota of c.cotas) {
    if (cota.ate > FINANCAS.anoInicial + ano) continue;
    const atual = marcas.find((m) => m.nome === cota.marca);
    const valor = cota.valor * (1 + resultado / 10) * (1 + negociacao * p.negociacao);
    let marca = atual;
    if (atual && valor > atual.teto) {
      const livres = marcas.filter((m) => ehMaterial(m) === ehMaterial(atual) && m.teto > atual.teto && !c.cotas.some((x) => x.marca === m.nome)
        && usuarios(m.nome).length < p.maxClubes && !usuarios(m.nome).some((o) => rivais.has(o.clubeId)))
        .sort((x, y) => x.teto - y.teto);
      marca = livres.find((m) => m.teto >= valor) ?? livres[livres.length - 1] ?? atual;
    }
    cota.marca = marca?.nome ?? cota.marca;
    cota.valor = Math.min(valor, marca?.teto ?? valor);
    cota.ate = FINANCAS.anoInicial + ano + rng.int(...p.duracao);
    renovadas += 1;
  }
  return renovadas;
}

export interface ClubeNaVirada {
  reputacao: number;
  torcida: number;
  base: number;
  /** Receita do ano no terço inferior dos 30 brasileiros. */
  receitaBaixa: boolean;
  /** Vendas de crias ÷ receita, média de 3 anos (mercado: 5ª fatia). */
  vendas: number;
}

/** Perfil que a condição aponta (GDD-gestao 11), de cima para baixo. */
export function perfilPelaCondicao(c: Conta, x: ClubeNaVirada, ano: number, receita: number): string {
  const p = FINANCAS.perfil;
  if (c.aporteAno !== null && ano - c.aporteAno < p.emergente.anos && x.torcida <= p.emergente.torcida) return 'Emergente';
  if (x.reputacao >= p.endividado.reputacao && c.divida > receita * p.endividado.divida) return 'Gigante endividado';
  if (x.reputacao >= p.rico.reputacao && x.torcida >= p.rico.torcida && c.divida < receita * p.rico.divida) return 'Gigante rico';
  if (x.base >= p.formador.base && x.vendas > p.formador.vendas) return 'Formador';
  if (x.receitaBaixa) return 'Pequeno sobrevivente';
  return 'Tradicional médio';
}

/** Muda o perfil só quando a condição vale em 2 viradas seguidas. */
export function andarPerfil(c: Conta, candidato: string): string | null {
  const anterior = c.candidato;
  c.candidato = candidato;
  if (candidato !== c.perfil && candidato === anterior) {
    const de = c.perfil;
    c.perfil = candidato;
    return de;
  }
  return null;
}

export const custoObra = (alvo: number): number => alvo * alvo * FINANCAS.estrutura.custo;

/** SAF na virada (GDD-gestao 7). Devolve true se o clube virou SAF. */
export function tentarSaf(c: Conta, receita: number, ano: number, rng: Rng): boolean {
  const s = FINANCAS.saf;
  if (c.saf) return false;
  const pode = c.perfil === 'Pequeno sobrevivente' || c.divida > receita || c.negativo8;
  if (!pode) return false;
  const critica = c.caixa < 0 || c.atrasados >= FINANCAS.atraso.rescisao;
  if (!rng.pct(critica ? s.critica : s.chance) || !rng.pct(s.aceita)) return false;
  const sorteio = ([a, b]: [number, number]): number => a + (b - a) * rng.n();
  const aporte = receita * sorteio(s.aporte);
  c.caixa += aporte;
  c.ano.aporte += aporte;
  c.divida *= 1 - sorteio(s.corte);
  c.banco = Math.min(c.banco, c.divida);
  c.saf = { investidor: 'Investidor novo', participacao: rng.int(...s.participacao), meta: 'definida na 6ª fatia' };
  c.aporteAno = ano;
  c.safEstrutura = s.estrutura;
  return true;
}

/** Orçamento de transferências e teto de folha do ano seguinte. */
export function orcamentoETeto(c: Conta, receita: number, folhaMil: number): void {
  const o = FINANCAS.orcamento;
  let orc = c.caixa < 0 ? 0 : Math.max(c.caixa * o.caixa, receita * o.minimo);
  if (c.perfil === 'Gigante endividado') orc = Math.min(orc, receita * o.endividado);
  c.orcamento = orc;
  // PROVISORIO (5ª fatia): o teto também fica preso a 70% da receita (sem isso, teto e folha sobem juntos todo ano).
  c.teto = Math.min(folhaMil * (FINANCAS.teto[c.perfil] ?? 1.1), (receita * FINANCAS.tetoReceita * 1000) / FINANCAS.meses);
}

/** Amortiza o caixa acima de `amortizarAcima` (200%) da receita (Gustavo, 13/11/2026; 50% → 200% em 15/11/2026). */
export function amortizar(c: Conta, receita: number): number {
  const paga = Math.min(Math.max(0, c.caixa - receita * FINANCAS.amortizarAcima), c.divida);
  if (paga <= 0) return 0;
  c.caixa -= paga;
  c.divida -= paga;
  c.banco = Math.max(0, c.banco - paga);
  c.ano.amortizacao += paga;
  return paga;
}

export const novoAnoConta = (c: Conta): void => { c.ano = zerados(); c.liga = { pontos: 0, saldo: 0, jogos: 0 }; c.negativo8 = false; };
