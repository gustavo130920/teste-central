// Diretoria e torcida (etapa 4, 6ª fatia; GDD-gestao 9). Contas puras: Confiança no técnico, Humor da torcida,
// metas, meta do investidor da SAF e eleição. O calendário fica em temporada/diretoria.ts.
import type { Rng } from '../motor/rng.ts';

export type Financeiro = 'Gastador' | 'Equilibrado' | 'Austero';
export type NivelMeta = 'Padrão' | 'Ousada' | 'Modesta';

export interface Candidato { nome: string; paciencia: number; ambicao: number; financeiro: Financeiro; interferencia: string; forca: number; troca: boolean }
export interface MetaFicha { texto: string; bonus: number }
export interface MetaInvestidor { tipo: 'receita' | 'prejuizo'; valor: number; prazo: number; falha: 'corta' | 'troca' | 'vende' }

/** Ficha de `dados/diretoria/` (completa nos brasileiros; reduzida nos demais: sem metas, popularidade nem eleição). */
export interface FichaDiretoria {
  clubeId: string;
  liga: string;
  saf: boolean;
  paciencia: number;
  ambicao: number;
  financeiro: Financeiro;
  interferencia: string;
  popularidade: number;
  metas: Record<NivelMeta, MetaFicha | null> | null;
  investidor: MetaInvestidor | null;
  /** Temporada da próxima eleição (associações). */
  eleicao: number | null;
  oposicao: Candidato[];
}

/** P/M/G de Confiança e Humor (tabela única do gerador-eventos, provisória). */
export const PMG = { P: 3, M: 7, G: 15 } as const;

export const DIRETORIA = {
  confianca: {
    inicial: 60, min: 0, max: 100,
    vitoria: 2, derrota: -1, classico: 2, goleada: 1.5, // derrota −2 → −1 (Gustavo, 15/11/2026); vitória 1 → 2 e goleada (3+ gols) ×1,5 pelo feedback de 16/11/2026
    /** 5 jogos seguidos sem vencer: −M (a contagem zera ao aplicar). */
    semVencer: 5,
    /** Quedas × (1,4 − Paciência ÷ 25) × (1 − Blindagem ÷ 50). */
    paciencia: { base: 1.4, div: 25 }, blindagem: 50,
    humorAlto: 70, humorBaixo: 30,
    /** Aval (estrutura, empréstimo, venda acima de 20% do orçamento): Confiança 40+. */
    aval: 40, avalVenda: 0.2,
    /** Novo presidente ou novo investidor: Confiança vira 50; se ele "troca" o técnico, 25% de demissão. */
    novoDono: 50, trocaChance: 25,
  },
  /** Metas da IA pela Ambição do presidente (Gustavo, 15/11/2026): 17+ Ousada, até 8 Modesta. */
  metaIA: { ousada: 17, modesta: 8 },
  popularidade: { superou: 2, cumpriu: 1, falhou: -1, falhouOusada: -2, titulo: 3, queda: -3, min: 1, max: 20 },
  /** Parte das vendas que volta ao orçamento (GDD-gestao 9). */
  vendas: { Gastador: 0.7, Equilibrado: 0.5, Austero: 0.3 } as Record<Financeiro, number>,
  /** Eleição a cada 3 temporadas depois da data da ficha. */
  eleicao: { intervalo: 3 },
  /**
   * PROVISORIO: posição exigida por texto de meta e liga (até a posição). "Libertadores" = 8º e "Brigar pelo título" = 6º na Série A (15/11/2026).
   * Meta gerada (sul-americanos e quem mudou de liga): Padrão = posição esperada pela força; Ousada 3 acima (+10%); Modesta 3 abaixo.
   */
  posicoes: {
    'serie-a': { 'Título': 1, 'Brigar pelo título': 6, 'Libertadores': 8, 'Sul-Americana': 12, 'Meio de tabela': 14, 'Não cair': 16 },
    'serie-b': { 'Título': 1, 'Acesso': 4, 'Brigar pelo acesso': 5, 'Meio de tabela': 6, 'Não cair': 7 },
  } as Record<string, Record<string, number>>,
  gerada: { passo: 3, bonus: 0.1 },
  /** PROVISORIO: "revelar um titular da base" = Cria da casa de até 21 anos titular em metade dos jogos. */
  revelar: { idade: 21, titular: 0.5 },
  /** PROVISORIO: "chegar longe na Libertadores" = quartas ou mais. */
  longe: ['Quartas', 'Semifinal', 'Final', 'Campeão', 'Vice'],
  investidor: {
    /** PROVISORIO: corta o orçamento pela metade no ano seguinte. */
    corte: 0.5,
    /** PROVISORIO: SAF nova = receita 5% acima da atual em 2 anos, falha sorteada. */
    nova: { receita: 1.05, prazo: 2 },
  },
  /** PROVISORIO: técnico com contrato de 1 a 3 anos; renova com Confiança 50+ ou meta cumprida (Gustavo, 15/11/2026). */
  contrato: { anos: [1, 3] as [number, number], renova: 50 },
  /** PROVISORIO: o substituto é o livre de maior Reputação até a do clube + 1 (senão, o de maior Reputação). */
  substituto: { folga: 1 },
};

export const TORCIDA = {
  humor: { inicial: 50, min: 0, max: 100, volta: 1 },
  vitoria: 2, derrota: -2, classico: 3, goleada: 1.5, // vitória e derrota 1 → 2 e goleada ×1,5 (feedback de 16/11/2026)
  /** Quedas por perfil (GDD-gestao 9). */
  quedas: { 'Gigante rico': 1.2, 'Gigante endividado': 1.2, 'Pequeno sobrevivente': 0.8 } as Record<string, number>,
  /** PROVISORIO: grande contratação = compra (não livre) com nota acima da média dos 11 melhores do elenco + 1. */
  grande: 1,
  /** Vaia: em casa, com Humor até 25 e o time perdendo (motor, seção 6). */
  vaia: 25,
  /** Decisão do Gustavo (15/11/2026): 0 = fator casa pela torcida × Humor ÷ 50 em todos; 1 = `2 × Humor ÷ 100 × ocupação` (mandante caía para 41%). */
  casaGdd: 0,
};

const limitar = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** Fator das quedas de Confiança: Paciência e Blindagem do diretor (GDD-gestao 8 e 9). */
export function fatorQueda(paciencia: number, blindagem: number): number {
  const c = DIRETORIA.confianca;
  return Math.max(0, c.paciencia.base - paciencia / c.paciencia.div) * Math.max(0, 1 - blindagem / c.blindagem);
}

/** Soma à Confiança: ganhos cheios, quedas com o fator. */
export function mexerConfianca(atual: number, delta: number, fator: number): number {
  const c = DIRETORIA.confianca;
  return limitar(atual + (delta < 0 ? delta * fator : delta), c.min, c.max);
}

/** Soma ao Humor: quedas pelo perfil do clube. */
export function mexerHumor(atual: number, delta: number, perfil: string | null): number {
  const h = TORCIDA.humor;
  return limitar(atual + (delta < 0 ? delta * (TORCIDA.quedas[perfil ?? ''] ?? 1) : delta), h.min, h.max);
}

/** 1 ponto por mês em direção a 50. */
export const voltarHumor = (h: number): number => (h > 50 ? Math.max(50, h - TORCIDA.humor.volta) : Math.min(50, h + TORCIDA.humor.volta));

/** Fator casa (GDD-gestao 9): `2 × Humor ÷ 100 × ocupação`, de 0 a +2. */
export const fatorCasa = (humor: number, ocupacao: number): number => limitar((2 * humor / 100) * ocupacao, 0, 2);

/** Meta da IA pela Ambição do presidente. */
export function nivelDaIA(ambicao: number, temModesta: boolean): NivelMeta {
  const m = DIRETORIA.metaIA;
  if (ambicao >= m.ousada) return 'Ousada';
  if (ambicao <= m.modesta && temModesta) return 'Modesta';
  return 'Padrão';
}

// ---------- Metas ----------

/** Uma parte da meta. `pos`: até a posição na liga. */
export type Parte =
  | { k: 'pos'; ate: number }
  | { k: 'copa' }
  | { k: 'longe' }
  | { k: 'socios' }
  | { k: 'salarios' }
  | { k: 'semPrejuizo' }
  | { k: 'divida' }
  | { k: 'base' };

export interface Meta { nivel: NivelMeta; texto: string; partes: Parte[]; bonus: number }

/** Lê o texto da meta ("Meio de tabela + revelar um titular da base") nas partes, para a liga. Devolve null se algo não for entendido. */
export function partesDaMeta(texto: string, liga: string): Parte[] | null {
  const pos = DIRETORIA.posicoes[liga] ?? {};
  const out: Parte[] = [];
  for (const bruto of texto.split('+').map((s) => s.trim())) {
    const p = bruto.replace(/\s*\(.*$/, '');
    if (p === 'Título e uma copa') { out.push({ k: 'pos', ate: 1 }, { k: 'copa' }); continue; }
    if (pos[p] !== undefined) { out.push({ k: 'pos', ate: pos[p] }); continue; }
    const ex: Record<string, Parte> = {
      'título de copa ou estadual': { k: 'copa' }, 'chegar longe na Libertadores': { k: 'longe' }, 'crescer público e sócios': { k: 'socios' },
      'não atrasar salários': { k: 'salarios' }, 'fechar a temporada sem prejuízo': { k: 'semPrejuizo' }, 'reduzir a dívida': { k: 'divida' },
      'revelar um titular da base': { k: 'base' },
    };
    if (!ex[p]) return null;
    out.push(ex[p]);
  }
  return out;
}

/** Metas geradas pela posição esperada (1 = mais forte) numa liga de `n` clubes. */
export function metasGeradas(esperada: number, n: number): Record<NivelMeta, Meta> {
  const g = DIRETORIA.gerada;
  const m = (nivel: NivelMeta, ate: number, bonus = 0): Meta => ({ nivel, texto: `até o ${ate}º`, partes: [{ k: 'pos', ate }], bonus });
  return {
    'Padrão': m('Padrão', esperada),
    'Ousada': m('Ousada', Math.max(1, esperada - g.passo), g.bonus),
    'Modesta': m('Modesta', Math.min(n, esperada + g.passo)),
  };
}

/** O que a avaliação de metas sabe do ano do clube. */
export interface FechoDoAno {
  posicao: number;
  copa: boolean;
  longe: boolean;
  socios: boolean;
  salarios: boolean;
  semPrejuizo: boolean;
  divida: boolean;
  base: boolean;
}

export const cumpriu = (partes: Parte[], f: FechoDoAno): boolean => partes.every((p) => (p.k === 'pos' ? f.posicao <= p.ate : f[p.k]));

export type Avaliacao = 'Superou' | 'Cumpriu' | 'Falhou';

/** Superou = cumprir a meta de cima; Ousada superada = campeão da liga (Gustavo, 15/11/2026). */
export function avaliar(metas: Record<NivelMeta, Meta | null>, escolhida: NivelMeta, f: FechoDoAno): Avaliacao {
  const de = metas[escolhida]!;
  if (!cumpriu(de.partes, f)) return 'Falhou';
  const acima = escolhida === 'Modesta' ? metas['Padrão'] : escolhida === 'Padrão' ? metas['Ousada'] : null;
  const superou = escolhida === 'Ousada' ? f.posicao === 1 : !!acima && cumpriu(acima.partes, f);
  return superou ? 'Superou' : 'Cumpriu';
}

/** Confiança e Popularidade pela avaliação (GDD-gestao 9). */
export function efeitoDaMeta(a: Avaliacao, nivel: NivelMeta): { confianca: number; popularidade: number } {
  const p = DIRETORIA.popularidade;
  if (a === 'Superou') return { confianca: PMG.G, popularidade: p.superou };
  if (a === 'Cumpriu') return { confianca: PMG.M, popularidade: p.cumpriu };
  return { confianca: -PMG.G, popularidade: nivel === 'Ousada' ? p.falhouOusada : p.falhou };
}

/** A copa era meta? (copa, Libertadores longe) */
export const copaNaMeta = (m: Meta | null, copa: string): boolean => !!m && m.partes.some((p) => p.k === 'copa' || (p.k === 'longe' && copa === 'libertadores'));

// ---------- Eleição ----------

/** Sorteio pela Força (`Força ÷ soma`); o presidente entra com a Popularidade. Devolve o índice do candidato ou −1 (presidente). */
export function eleger(popularidade: number, oposicao: Candidato[], rng: Rng): number {
  const forcas = [popularidade, ...oposicao.map((c) => c.forca)];
  const soma = forcas.reduce((a, b) => a + Math.max(0, b), 0);
  let r = rng.n() * soma;
  for (let i = 0; i < forcas.length; i++) {
    r -= Math.max(0, forcas[i]);
    if (r < 0) return i - 1;
  }
  return -1;
}

/** Meta do investidor cumprida? (receita mínima ou prejuízo máximo, na média do prazo) */
export function metaDoInvestidor(m: MetaInvestidor, receitas: number[], resultados: number[]): boolean {
  const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  return m.tipo === 'receita' ? media(receitas) >= m.valor : media(resultados) >= -m.valor;
}
