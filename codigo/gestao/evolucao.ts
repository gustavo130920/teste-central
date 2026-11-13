// Evolução, envelhecimento e perfis de jovem (etapa 4, 3ª fatia; GDD-gestao 5). Contas puras.
// A cada 4 semanas o jogador acumula pontos; cada 1,0 vira +1 em um atributo. A nota anda pela variação
// da média das 6 chaves da posição (decisão do Gustavo, 13/11/2026) e nunca passa do Potencial.
import type { Atributo, Jogador, Posicao } from '../motor/dados.ts';
import type { Rng } from '../motor/rng.ts';
import type { Foco } from './treino.ts';

export const EVOLUCAO = {
  periodoDias: 28,
  perfilDias: 91,
  /** Base da idade: até 18, 19 a 21, 22 a 24, 25 a 28; 29 ou mais, 0. */
  // Calibrado em 13/11/2026 (GDD-gestao 12): 0,9 e 0,75 → 0,6 e 0,5.
  idade: [[18, 0.6], [21, 0.5], [24, 0.35], [28, 0.1]] as [number, number][],
  /** Minutos no período: 50% ou mais, 10% a 49%, menos de 10%. */
  minutos: { alto: 0.5, medio: 0.1, fatores: [1.2, 1, 0.5] },
  comissao: { base: 0.8, div: 50 },
  exemplo: { idadeMax: 21, fator: 1.1 },
  moral: { alta: 71, fAlta: 1.1, baixa: 20, fBaixa: 0.8 },
  chaves: 0.7,
  /** Na base: minutos contam como 50% ou mais, com Ganho × 0,6. */
  naBase: 0.6,
  /** Envelhecimento: chance de -1 físico a cada 4 semanas, por idade (30, 32, 34, 36 ou mais). */
  envelhecer: [[36, 40], [34, 30], [32, 20], [30, 10]] as [number, number][],
  condicionamento: { base: 1.25, div: 40 },
  goleiroAnos: 3,
  mental: { idade: 29, chance: 5 },
  max: 20,
  /** PROVISORIO: o motor não guarda o minuto das trocas; quem entra joga 25 minutos e os titulares dividem o resto. */
  minutosReserva: 25,
  semDado: 10,
} as const;

export const ATRIBUTOS = {
  tecnicos: ['Pas', 'Dom', 'Dri', 'Cru', 'Fin', 'Lon', 'Cab', 'Des', 'BP'] as Atributo[],
  goleiro: ['Ref', 'Mao', 'Aer', 'Sai', 'Pes', 'Com'] as Atributo[],
  mentais: ['Vis', 'Dec', 'Pos', 'Mov', 'Conc', 'DT', 'Comp', 'Lid', 'Comb'] as Atributo[],
  fisicos: ['Vel', 'Res', 'For', 'Agi', 'Imp'] as Atributo[],
};

/** As 6 chaves de cada posição (skill gerador-elenco), as mesmas da nota inicial. */
const CHAVES: Record<string, Atributo[]> = {
  GOL: ['Ref', 'Mao', 'Sai', 'Aer', 'Com', 'Conc'],
  ZAG: ['Des', 'Cab', 'Pos', 'Conc', 'For', 'Imp'],
  LAT: ['Des', 'Cru', 'Pos', 'Vel', 'Res', 'Pas'],
  VOL: ['Des', 'Pas', 'Pos', 'Dec', 'Comb', 'Res'],
  MC: ['Pas', 'Dom', 'Vis', 'Dec', 'Res', 'Mov'],
  MO: ['Pas', 'Dom', 'Dri', 'Vis', 'Dec', 'Mov'],
  PON: ['Dri', 'Vel', 'Cru', 'Agi', 'Dom', 'Fin'],
  CA: ['Fin', 'Mov', 'Cab', 'Dom', 'Comp', 'For'],
};

/** LAT-E e LAT-D viram LAT; PON-E e PON-D viram PON. */
export const grupoDaPosicao = (p: Posicao): string => p.replace(/-[ED]$/, '');
export const chavesDe = (p: Posicao): Atributo[] => CHAVES[grupoDaPosicao(p)];

export const mediaChaves = (j: Jogador): number => {
  const c = chavesDe(j.posicao);
  return c.reduce((s, a) => s + (j.atributos[a] ?? EVOLUCAO.semDado), 0) / c.length;
};

/** Estado de evolução de cada jogador; a nota anda pela variação da média das chaves desde o registro. */
export interface EstadoEvolucao {
  pontos: number;
  notaBase: number;
  mediaBase: number;
  /** Trabalho do perfil de jovem (5 a 95); null depois dos 22 ou sem perfil. */
  trabalho: number | null;
  /** Minutos jogados no período de 4 semanas, no de 13 semanas e no ano. */
  min28: number;
  min91: number;
  minAno: number;
  /** Medição (GDD-gestao 12): jovem até 21 abaixo do Potencial, até chegar a ele. */
  acompanhar: boolean;
}

export function criarEvolucao(j: Jogador): EstadoEvolucao {
  return { pontos: 0, notaBase: j.nota, mediaBase: mediaChaves(j), trabalho: j.perfilJovem && j.idade <= 21 ? 50 : null, min28: 0, min91: 0, minAno: 0, acompanhar: j.idade <= 21 && j.potencial > j.nota };
}

export const baseDaIdade = (idade: number): number => EVOLUCAO.idade.find(([max]) => idade <= max)?.[1] ?? 0;

export function fatorMinutos(fracao: number): number {
  const m = EVOLUCAO.minutos;
  return fracao >= m.alto ? m.fatores[0] : fracao >= m.medio ? m.fatores[1] : m.fatores[2];
}

export interface FatoresGanho {
  /** Fração dos minutos do clube no período (0 a 1); null na base. */
  minutos: number | null;
  /** Média do ganho de treino dos ciclos (carga × ciclo). */
  treino: number;
  /** Treino técnico do auxiliar (efetivo). */
  treinoTecnico: number;
  /** Desenvolvimento de Jovens do técnico. */
  jovens: number;
  /** Há Exemplo profissional no elenco (outro jogador). */
  exemplo: boolean;
  moral: number;
}

/** `Ganho = base da idade × minutos × treino × comissão × moral × (Pot − Nota) ÷ 2`, com o último fator limitado a 1. */
export function ganho(j: Jogador, f: FatoresGanho): number {
  const e = EVOLUCAO;
  const resto = Math.max(0, Math.min(1, (j.potencial - j.nota) / 2));
  if (!resto) return 0;
  let com = e.comissao.base + f.treinoTecnico / e.comissao.div;
  if (j.idade <= e.exemplo.idadeMax) com *= e.comissao.base + f.jovens / e.comissao.div;
  const exemplo = f.exemplo && j.idade <= e.exemplo.idadeMax ? e.exemplo.fator : 1;
  const moral = f.moral >= e.moral.alta ? e.moral.fAlta : f.moral <= e.moral.baixa ? e.moral.fBaixa : 1;
  const minutos = f.minutos === null ? e.minutos.fatores[0] * e.naBase : fatorMinutos(f.minutos);
  return baseDaIdade(j.idade) * minutos * f.treino * com * exemplo * moral * resto;
}

const evoluiveis = (j: Jogador): Atributo[] =>
  (j.posicao === 'GOL' ? [...ATRIBUTOS.goleiro, ...ATRIBUTOS.mentais, ...ATRIBUTOS.fisicos] : [...ATRIBUTOS.tecnicos, ...ATRIBUTOS.mentais, ...ATRIBUTOS.fisicos])
    .filter((a) => j.atributos[a] !== undefined);

/**
 * Para onde vão os 30% fora das chaves: o foco mais usado puxa para a área (Técnico: técnicos e mentais; Físico: físicos).
 * PROVISORIO: com foco Técnico ou Físico, os 30% vão só para a área; com os outros focos, para todos os demais.
 */
function areaDoFoco(j: Jogador, foco: Foco | null): Atributo[] {
  const chaves = new Set(chavesDe(j.posicao));
  const resto = evoluiveis(j).filter((a) => !chaves.has(a));
  const area = foco === 'fisico' ? ATRIBUTOS.fisicos : foco === 'tecnico' ? [...ATRIBUTOS.tecnicos, ...ATRIBUTOS.goleiro, ...ATRIBUTOS.mentais] : null;
  const naArea = area ? resto.filter((a) => area.includes(a)) : [];
  return naArea.length ? naArea : resto;
}

/** Transforma os pontos acumulados em +1 nos atributos; devolve quantos foram aplicados. */
export function aplicarPontos(j: Jogador, s: EstadoEvolucao, foco: Foco | null, rng: Rng): number {
  let n = 0;
  while (s.pontos >= 1) {
    s.pontos -= 1;
    const chaves = chavesDe(j.posicao).filter((a) => (j.atributos[a] ?? 0) < EVOLUCAO.max);
    const outros = areaDoFoco(j, foco).filter((a) => (j.atributos[a] ?? 0) < EVOLUCAO.max);
    const lista = (rng.pct(EVOLUCAO.chaves * 100) && chaves.length) || !outros.length ? chaves : outros;
    if (!lista.length) break;
    const a = lista[rng.int(0, lista.length - 1)];
    j.atributos[a] = (j.atributos[a] ?? EVOLUCAO.semDado) + 1;
    n += 1;
  }
  atualizarNota(j, s);
  return n;
}

/** A nota anda pela variação da média das chaves, entre 1 e o Potencial. */
export function atualizarNota(j: Jogador, s: EstadoEvolucao): void {
  const nota = s.notaBase + Math.round(mediaChaves(j) - s.mediaBase);
  j.nota = Math.max(1, Math.min(j.potencial, EVOLUCAO.max, nota));
}

export function chanceEnvelhecer(idade: number, goleiro: boolean, condicionamento: number): number {
  const e = EVOLUCAO;
  const id = goleiro ? idade - e.goleiroAnos : idade;
  const base = e.envelhecer.find(([min]) => id >= min)?.[1] ?? 0;
  return base * (e.condicionamento.base - condicionamento / e.condicionamento.div);
}

/** Envelhecimento das 4 semanas: chance de -1 físico; de 29 anos em diante, 5% de +1 mental. */
export function envelhecer(j: Jogador, s: EstadoEvolucao, condicionamento: number, rng: Rng): { menos: boolean; mais: boolean } {
  const r = { menos: false, mais: false };
  if (rng.pct(chanceEnvelhecer(j.idade, j.posicao === 'GOL', condicionamento))) {
    const f = ATRIBUTOS.fisicos.filter((a) => (j.atributos[a] ?? 0) > 1);
    if (f.length) {
      const a = f[rng.int(0, f.length - 1)];
      j.atributos[a] = j.atributos[a]! - 1;
      r.menos = true;
    }
  }
  if (j.idade >= EVOLUCAO.mental.idade && rng.pct(EVOLUCAO.mental.chance)) {
    const m = ATRIBUTOS.mentais.filter((a) => j.atributos[a] !== undefined && j.atributos[a]! < EVOLUCAO.max);
    if (m.length) {
      const a = m[rng.int(0, m.length - 1)];
      j.atributos[a] = j.atributos[a]! + 1;
      r.mais = true;
    }
  }
  if (r.menos || r.mais) atualizarNota(j, s);
  return r;
}

// ---------- Perfis de jovem ----------

export const PERFIL = {
  min: 5,
  max: 95,
  inicial: 50,
  base: -1,
  psicologo: 0.5,
  coordenador: 0.2,
  mentor: 2,
  minutos: { corte: 0.1, sim: 1, nao: -1 },
  grupo: { alto: 60, sim: 1, baixo: 35, nao: -2 },
  /** Integração do coordenador na subida: (Integração − 10) × 1. */
  integracao: 1,
  idadeResultado: 22,
  bem: 0.7,
  mal: 0.5,
  /** Bloco 4. Ídolo exige 5 anos de clube e jogos marcantes: fica de fora do sorteio. "Sem traço marcante" = sem defeito. */
  qualidades: {
    Marrento: ['Incendiário', 'Decisivo'],
    'Pé no chão': ['Exemplo profissional', 'Líder de vestiário'],
    Deslumbrado: ['Carismático'],
    Inseguro: ['Gelo', 'Decisivo'],
  } as Record<string, string[]>,
  defeitos: {
    Marrento: ['Esquentado', 'Indisciplinado'],
    'Pé no chão': [],
    Deslumbrado: ['Firuleiro', 'Preguiçoso sem a bola'],
    Inseguro: ['Some em jogo grande'],
  } as Record<string, string[]>,
  nomes: ['Marrento', 'Pé no chão', 'Deslumbrado', 'Inseguro'],
} as const;

export interface FatoresPerfil {
  naBase: boolean;
  /** Formação de jovens do psicólogo e Formação do coordenador (efetivos). */
  psicologo: number;
  coordenador: number;
  mentor: boolean;
  /** Fração dos minutos nas 13 semanas; ignorada na base (conta como 50% ou mais). */
  minutos: number;
  grupo: number;
}

/** Variação do Trabalho a cada 13 semanas. */
export function deltaTrabalho(f: FatoresPerfil): number {
  const p = PERFIL;
  let d = (f.psicologo - 10) * p.psicologo + (f.coordenador - 10) * p.coordenador;
  if (f.naBase) d += p.base;
  if (f.mentor && !f.naBase) d += p.mentor;
  d += f.naBase || f.minutos >= p.minutos.corte ? p.minutos.sim : p.minutos.nao;
  if (f.grupo >= p.grupo.alto) d += p.grupo.sim;
  else if (f.grupo <= p.grupo.baixo) d += p.grupo.nao;
  return d;
}

export const limitarTrabalho = (t: number): number => Math.max(PERFIL.min, Math.min(PERFIL.max, t));

/** Sorteio único aos 22 anos. */
export function resultadoPerfil(j: Jogador, trabalho: number, rng: Rng): 'bem' | 'mal' | 'nenhum' {
  const p = PERFIL;
  const perfil = j.perfilJovem ?? '';
  const x = rng.n() * 100;
  if (x < trabalho * p.bem) {
    const opcoes = (p.qualidades[perfil] ?? []).filter((q) => !j.qualidades.includes(q));
    if (opcoes.length) j.qualidades.push(opcoes[rng.int(0, opcoes.length - 1)]);
    j.potencial = Math.min(EVOLUCAO.max, j.potencial + 1);
    return 'bem';
  }
  if (x < trabalho * p.bem + (100 - trabalho) * p.mal) {
    const opcoes = (p.defeitos[perfil] ?? []).filter((d) => !j.defeitos.includes(d));
    if (opcoes.length) j.defeitos.push(opcoes[rng.int(0, opcoes.length - 1)]);
    j.potencial = Math.max(j.nota, j.potencial - 1);
    return 'mal';
  }
  return 'nenhum';
}
