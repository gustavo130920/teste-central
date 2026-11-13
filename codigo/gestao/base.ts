// Base, aposentadorias e gerador em código (etapa 4, 3ª fatia; GDD-gestao 5 e 11). Contas puras.
// Safras, jovens e livres nascem de um molde do próprio banco (jogador, técnico ou profissional do mesmo tipo),
// para manter o formato do atributo (zagueiro com Fin baixo, por exemplo); só o nível muda.
import type { Atributo, Jogador, Profissional, Tecnico } from '../motor/dados.ts';
import type { Rng } from '../motor/rng.ts';
import { PERFIL, chavesDe, grupoDaPosicao } from './evolucao.ts';

export const BASE = {
  jovens: { min: 3, div: 5 },
  idade: [16, 17],
  pot: { base: 8, estrutura: 0.2, captacao: 0.15, variacao: 4, teto: 16 },
  /** Joia: `2% + (estrutura da base + Captação) × 0,05%` por jovem (peso 0,2 → 0,05 em 13/11/2026, GDD-gestao 12); Pot 18 a 20 (17-19 → 18-20 em 13/11/2026). PROVISORIO: o sorteio comum fica até 16. */
  joia: { base: 2, peso: 0.05, pot: [18, 20] },
  nota: [4, 7],
  /** Aos 20 anos, quem não subiu sai livre. */
  prazo: 20,
  /** Europa e clubes sem o dado: estrutura da base 14, como a comissão (decisão de 13/11/2026). */
  semEstrutura: 14,
  /** Jovem: Compostura, Concentração e Liderança baixas (skill gerador-elenco). */
  jovemMenos: { atributos: ['Comp', 'Conc', 'Lid'] as Atributo[], valor: 3 },
  ocultos: [4, 14],
  /** IA (PROVISORIO): sobe sempre para manter 23 no elenco; por mérito até 28, se a nota chega à do pior da posição − margem. */
  elencoMin: 23,
  elencoMax: 28,
  goleirosMin: 2,
  /** PROVISORIO: elenco-alvo de 26 por grupo de posição; guia a safra e as subidas (sem ele, os goleiros se acumulam). */
  alvo: { GOL: 3, ZAG: 5, LAT: 4, VOL: 3, MC: 3, MO: 2, PON: 3, CA: 3 } as Record<string, number>,
  /** Por mérito, sobe só se o grupo tiver menos que o alvo + 1. */
  folgaGrupo: 1,
  margem: { padrao: 1, jovens: 2, veteranos: 0, gostaJovens: 14, gostaVeteranos: 7 },
} as const;

export const APOSENTADORIA = {
  jogador: [[39, 90], [37, 60], [35, 30], [33, 10]] as [number, number][],
  livre: 2,
  notaBaixa: { nota: 8, fator: 1.5 },
  minutos: { fracao: 0.5, fator: 0.5 },
  goleiroAnos: 3,
  /** Liderança 15 ou mais, ou Ídolo: 30% de virar técnico ou profissional livre. */
  novaCarreira: { lideranca: 15, chance: 30 },
  pessoa: [[75, 70], [70, 35], [65, 15]] as [number, number][],
  contratoAtivo: 0.5,
} as const;

/** Evolução anual de técnicos e profissionais: chance de +1 e de -1 em um atributo do cargo. */
export const EVOLUCAO_ANUAL = {
  faixas: [[39, 50, 0], [54, 20, 5], [Infinity, 5, 20]] as [number, number, number][],
  ct: { minimo: 15, bonus: 10 },
} as const;

export const REPOSICAO = { jogadores: 30, tecnicos: 15, profissionais: 36, nivel: [6, 14], idadeJogador: [19, 33], idadeTecnico: [38, 62], idadePro: [30, 60] } as const;

const limitar = (v: number, a = 1, b = 20): number => Math.max(a, Math.min(b, Math.round(v)));
const sortear = <T>(xs: readonly T[], rng: Rng): T => xs[rng.int(0, xs.length - 1)];

// ---------- Nomes ----------

/** Nomes e sobrenomes por nacionalidade, tirados do banco; nunca repete um nome completo ativo. */
export class Nomes {
  private prenomes = new Map<string, string[]>();
  private sobrenomes = new Map<string, string[]>();
  readonly usados = new Set<string>();

  constructor(pessoas: { nomeCompleto?: string; nome: string; nacionalidade: string }[]) {
    for (const p of pessoas) {
      const partes = (p.nomeCompleto ?? p.nome).split(' ').filter((x) => x.length > 2 && x !== 'dos' && x !== 'das');
      if (partes.length < 2) continue;
      this.usados.add(p.nomeCompleto ?? p.nome);
      const [pre, ...sob] = partes;
      (this.prenomes.get(p.nacionalidade) ?? this.prenomes.set(p.nacionalidade, []).get(p.nacionalidade)!).push(pre);
      (this.sobrenomes.get(p.nacionalidade) ?? this.sobrenomes.set(p.nacionalidade, []).get(p.nacionalidade)!).push(...sob);
    }
  }

  /** Nome completo e nome curto. Com poucos nomes no país, usa o país com mais nomes. */
  gerar(nacionalidade: string, rng: Rng): { nome: string; nomeCompleto: string } {
    const maior = [...this.prenomes].sort((a, b) => b[1].length - a[1].length)[0][0];
    const pais = (this.prenomes.get(nacionalidade)?.length ?? 0) >= 10 ? nacionalidade : maior;
    const pre = this.prenomes.get(pais)!;
    const sob = this.sobrenomes.get(pais)!;
    for (let i = 0; i < 50; i++) {
      const p = sortear(pre, rng);
      const s1 = sortear(sob, rng);
      const s2 = sortear(sob, rng);
      if (s1 === s2 || s1 === p) continue;
      const nomeCompleto = `${p} ${s1} ${s2}`;
      if (this.usados.has(nomeCompleto)) continue;
      this.usados.add(nomeCompleto);
      return { nomeCompleto, nome: rng.pct(50) ? s1 : `${p} ${s1}` };
    }
    const nomeCompleto = `${sortear(pre, rng)} ${sortear(sob, rng)} ${this.usados.size}`;
    this.usados.add(nomeCompleto);
    return { nomeCompleto, nome: nomeCompleto.split(' ')[1] };
  }
}

// ---------- Jogadores gerados ----------

/** Copia o formato dos atributos do molde para a nota pedida, com ruído de ±2. */
export function atributosDoMolde(molde: Jogador, nota: number, rng: Rng, jovem: boolean): Partial<Record<Atributo, number>> {
  const a: Partial<Record<Atributo, number>> = {};
  const ocultos: Atributo[] = ['Cons', 'JG', 'Les'];
  for (const [k, v] of Object.entries(molde.atributos) as [Atributo, number][]) {
    a[k] = ocultos.includes(k) ? rng.int(BASE.ocultos[0], BASE.ocultos[1]) : limitar(v - molde.nota + nota + rng.int(-2, 2));
  }
  if (jovem) for (const k of BASE.jovemMenos.atributos) if (a[k] !== undefined) a[k] = limitar(a[k]! - BASE.jovemMenos.valor);
  // Ajuste fino: a média das chaves fica na nota pedida.
  const chaves = chavesDe(molde.posicao).filter((k) => a[k] !== undefined);
  const media = chaves.reduce((s, k) => s + a[k]!, 0) / chaves.length;
  const d = Math.round(nota - media);
  if (d) for (const k of chaves) a[k] = limitar(a[k]! + d);
  return a;
}

export interface NovoJogador {
  id: string;
  molde: Jogador;
  nota: number;
  potencial: number;
  idade: number;
  clubeId: string | null;
  nacionalidade: string;
  perfilJovem: string | null;
  tipo: string;
}

export function gerarJogador(n: NovoJogador, nomes: Nomes, rng: Rng): Jogador {
  const m = n.molde;
  const nome = nomes.gerar(n.nacionalidade, rng);
  return {
    id: n.id, clubeId: n.clubeId, numero: null, capitao: false, ...nome, idade: n.idade, nacionalidade: n.nacionalidade,
    posicao: m.posicao, secundarias: [], pe: m.pe, peFraco: m.peFraco,
    altura: Math.round((m.altura + rng.int(-4, 4) / 100) * 100) / 100, peso: m.peso + rng.int(-4, 4),
    atributos: atributosDoMolde(m, n.nota, rng, n.idade <= 21), nota: n.nota, potencial: Math.max(n.nota, n.potencial),
    tracos: [], qualidades: [], defeitos: [], perfilJovem: n.perfilJovem,
    ambicao: rng.int(6, 16), lealdade: rng.int(6, 15), salario: 5, valor: 0.3, contrato: null, tipo: n.tipo,
  };
}

/** Jovens da safra: quantos, Potencial, joia e nota (GDD-gestao 5). */
export function quantosNaSafra(estrutura: number): number {
  return BASE.jovens.min + Math.floor(estrutura / BASE.jovens.div);
}

export function potencialDaSafra(estrutura: number, captacao: number, rng: Rng): { pot: number; joia: boolean } {
  const b = BASE;
  if (rng.pct(b.joia.base + (estrutura + captacao) * b.joia.peso)) return { pot: rng.int(b.joia.pot[0], b.joia.pot[1]), joia: true };
  const media = b.pot.base + estrutura * b.pot.estrutura + captacao * b.pot.captacao;
  return { pot: limitar(media + (rng.n() * 2 - 1) * b.pot.variacao, 3, b.pot.teto), joia: false };
}

export function gerarSafra(clube: string, estrutura: number, captacao: number, elenco: Jogador[], nacionalidade: string, proximoId: () => string, nomes: Nomes, rng: Rng): { jovens: Jogador[]; joias: number } {
  const jovens: Jogador[] = [];
  let joias = 0;
  const grupos = Object.entries(BASE.alvo).flatMap(([g, n]) => Array<string>(n).fill(g));
  for (let i = 0; i < quantosNaSafra(estrutura); i++) {
    const { pot, joia } = potencialDaSafra(estrutura, captacao, rng);
    if (joia) joias += 1;
    const nota = Math.max(3, pot - rng.int(BASE.nota[0], BASE.nota[1]));
    // Posição sorteada pelo elenco-alvo; o molde é um jogador do elenco nessa posição.
    const grupo = sortear(grupos, rng);
    const daPosicao = elenco.filter((j) => grupoDaPosicao(j.posicao) === grupo);
    jovens.push(gerarJogador({
      id: proximoId(), molde: sortear(daPosicao.length ? daPosicao : elenco, rng), nota, potencial: pot, idade: rng.int(BASE.idade[0], BASE.idade[1]),
      clubeId: clube, nacionalidade, perfilJovem: sortear(PERFIL.nomes, rng), tipo: 'Base',
    }, nomes, rng));
  }
  return { jovens, joias };
}

/** Margem da IA para subir por mérito, pela preferência do técnico (Desenvolvimento de Jovens; PROVISORIO). */
export function margemDoTecnico(t: Tecnico): number {
  const m = BASE.margem;
  const jov = t.trabalho?.['Jovens'] ?? 10;
  return jov >= m.gostaJovens ? m.jovens : jov <= m.gostaVeteranos ? m.veteranos : m.padrao;
}

/**
 * Quem a IA sobe da base (PROVISORIO): primeiro os goleiros mínimos e os grupos abaixo do alvo − 1, depois completa 23
 * pelo grupo mais em falta; por mérito, até 28, se a nota chega à do pior do grupo − margem e o grupo não passou do alvo + 1.
 */
export function escolherSubidas(elenco: Jogador[], base: Jogador[], margem: number): Jogador[] {
  const b = BASE;
  const fila = [...base].sort((x, y) => y.nota - x.nota || y.potencial - x.potencial);
  const sobe: Jogador[] = [];
  const atual = (): Jogador[] => [...elenco, ...sobe];
  const noGrupo = (g: string): number => atual().filter((j) => grupoDaPosicao(j.posicao) === g).length;
  const falta = (g: string): number => (b.alvo[g] ?? 0) - noGrupo(g);
  const tirar = (j: Jogador) => { sobe.push(j); fila.splice(fila.indexOf(j), 1); };
  const melhorDe = (g: string): Jogador | undefined => fila.find((j) => grupoDaPosicao(j.posicao) === g);
  while (noGrupo('GOL') < b.goleirosMin && melhorDe('GOL')) tirar(melhorDe('GOL')!);
  for (const g of Object.keys(b.alvo)) while (falta(g) > 1 && melhorDe(g)) tirar(melhorDe(g)!);
  while (atual().length < b.elencoMin && fila.length) {
    const j = [...fila].sort((x, y) => falta(grupoDaPosicao(y.posicao)) - falta(grupoDaPosicao(x.posicao)) || y.nota - x.nota)[0];
    tirar(j);
  }
  for (const j of [...fila]) {
    if (atual().length >= b.elencoMax) break;
    const g = grupoDaPosicao(j.posicao);
    if (falta(g) + b.folgaGrupo <= 0) continue;
    const mesma = atual().filter((x) => grupoDaPosicao(x.posicao) === g);
    const pior = mesma.length ? Math.min(...mesma.map((x) => x.nota)) : 0;
    if (j.nota >= pior - margem) tirar(j);
  }
  return sobe;
}

// ---------- Aposentadorias ----------

export function chanceAposentar(j: Jogador, livre: boolean, fracaoMinutos: number): number {
  const a = APOSENTADORIA;
  const idade = j.posicao === 'GOL' ? j.idade - a.goleiroAnos : j.idade;
  let c = a.jogador.find(([min]) => idade >= min)?.[1] ?? 0;
  if (livre) c *= a.livre;
  if (j.nota <= a.notaBaixa.nota) c *= a.notaBaixa.fator;
  if (!livre && fracaoMinutos >= a.minutos.fracao) c *= a.minutos.fator;
  return Math.min(100, c);
}

export function chanceAposentarPessoa(idade: number, contratoAtivo: boolean): number {
  const c = APOSENTADORIA.pessoa.find(([min]) => idade >= min)?.[1] ?? 0;
  return contratoAtivo ? c * APOSENTADORIA.contratoAtivo : c;
}

/** Evolução anual em um atributo do cargo, sorteado. Devolve +1, -1 ou 0. */
export function evoluirPessoa(atributos: Record<string, number>, idade: number, ct: number | null, rng: Rng): number {
  const chaves = Object.keys(atributos);
  if (!chaves.length) return 0;
  const e = EVOLUCAO_ANUAL;
  const [, mais, menos] = e.faixas.find(([max]) => idade <= max)!;
  const k = sortear(chaves, rng);
  const x = rng.n() * 100;
  const bonus = ct !== null && ct >= e.ct.minimo ? e.ct.bonus : 0;
  if (x < mais + bonus) {
    if (atributos[k] >= 20) return 0;
    atributos[k] += 1;
    return 1;
  }
  if (x < mais + bonus + menos) {
    if (atributos[k] <= 1) return 0;
    atributos[k] -= 1;
    return -1;
  }
  return 0;
}

// ---------- Técnicos e profissionais gerados ----------

export function gerarTecnico(molde: Tecnico, nomes: Nomes, rng: Rng, nivel: [number, number] = [REPOSICAO.nivel[0], REPOSICAO.nivel[1]], base?: { nome: string; idade: number; nacionalidade: string }): Tecnico {
  const trabalho = Object.fromEntries(Object.keys(molde.trabalho ?? { 'Treino Tático': 10 }).map((k) => [k, rng.int(nivel[0], nivel[1])]));
  return {
    ...molde, nome: base?.nome ?? nomes.gerar(molde.nacionalidade, rng).nomeCompleto, idade: base?.idade ?? rng.int(REPOSICAO.idadeTecnico[0], REPOSICAO.idadeTecnico[1]),
    nacionalidade: base?.nacionalidade ?? molde.nacionalidade, clube: '', clubeId: null, liga: '', trabalho,
    reputacao: rng.int(nivel[0], nivel[1]), ambicao: rng.int(6, 15), lealdade: rng.int(6, 15), origem: base ? 'Ex-jogador' : molde.origem, historia: '',
  };
}

export function gerarProfissional(molde: Profissional, nomes: Nomes, rng: Rng, base?: { nome: string; idade: number; nacionalidade: string }): Profissional {
  const [a, b] = REPOSICAO.nivel;
  return {
    ...molde, nome: base?.nome ?? nomes.gerar(molde.nacionalidade, rng).nomeCompleto, idade: base?.idade ?? rng.int(REPOSICAO.idadePro[0], REPOSICAO.idadePro[1]),
    nacionalidade: base?.nacionalidade ?? molde.nacionalidade, atributos: Object.fromEntries(Object.keys(molde.atributos).map((k) => [k, rng.int(a, b)])),
    reputacao: rng.int(a, b), ambicao: rng.int(6, 15), lealdade: rng.int(6, 15), quimica: null, homemDeConfianca: false, contrato: null,
  };
}

/** Livre gerado: nível de 6 a 14, como os lotes iniciais. */
export function gerarLivre(molde: Jogador, id: string, nomes: Nomes, rng: Rng): Jogador {
  const [a, b] = REPOSICAO.nivel;
  const nota = rng.int(a, b);
  const idade = rng.int(REPOSICAO.idadeJogador[0], REPOSICAO.idadeJogador[1]);
  const pot = idade >= 30 ? nota : Math.min(20, nota + rng.int(0, idade <= 23 ? 4 : 2));
  return gerarJogador({ id, molde, nota, potencial: pot, idade, clubeId: null, nacionalidade: molde.nacionalidade, perfilJovem: idade <= 21 ? sortear(PERFIL.nomes, rng) : null, tipo: 'Dispensado' }, nomes, rng);
}

