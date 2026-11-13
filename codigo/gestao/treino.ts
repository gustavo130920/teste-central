// Treino do ciclo (etapa 4, 1ª fatia; GDD-gestao 2): carga, foco e entrosamento por tática. Contas puras.
// Ganho de atributos (focos Físico e Técnico) e treino individual dependem da evolução (3ª fatia).
import type { Tecnico } from '../motor/dados.ts';
import type { ComissaoClube } from './comissao.ts';
import { efetivo, naFaixa } from './comissao.ts';

export type Carga = 'leve' | 'normal' | 'pesada';
export type Foco = 'tatica' | 'fisico' | 'tecnico' | 'bolaParada' | 'adversario';
export type Ciclo = 'curto' | 'normal' | 'longo';

export const TREINO = {
  carga: {
    leve: { rec: 8, ganho: 0.6, lesao: 0.8 },
    normal: { rec: 0, ganho: 1, lesao: 1 },
    pesada: { rec: -10, ganho: 1.4, lesao: 1.3 },
  } as Record<Carga, { rec: number; ganho: number; lesao: number }>,
  ciclo: { curto: 0.5, normal: 1, longo: 1.5 } as Record<Ciclo, number>,
  entrosamento: { base: 0.7, peso: 0.3, max: 1 },
  focoTatica: { escolhida: 1, outras: 0.25 },
  porJogo: 0.2,
  desuso: { ciclos: 8, perda: 0.1 },
  maxTaticas: 3,
  /** Treino Tático: ganho × (0,8 + média ÷ 50), média do técnico e do auxiliar. */
  treinoTatico: { base: 0.8, div: 50 },
  /** Técnicos sem o atributo nos dados (Europa e livres). */
  semDado: 10,
} as const;

export interface TaticaTreinada { progresso: number; ciclosSemUso: number }

export interface EstadoTreino {
  /** Até 3 táticas, pela chave estilo + formação. */
  taticas: Map<string, TaticaTreinada>;
  /** Decisão do último ciclo: vale para o jogo seguinte. */
  carga: Carga;
  foco: Foco | null;
}

/** Tática é o par estilo + formação (GDD-gestao 2). */
export const chaveTatica = (t: Pick<Tecnico, 'estilo' | 'formacaoComBola' | 'formacaoSemBola'>): string =>
  `${t.estilo}|${t.formacaoComBola}|${t.formacaoSemBola}`;

/** Decisão do Gustavo (13/11/2026): no ano 1, a tática do técnico começa com entrosamento completo. */
export function criarTreino(chave: string, semanas: number): EstadoTreino {
  return { taticas: new Map([[chave, { progresso: semanas, ciclosSemUso: 0 }]]), carga: 'normal', foco: null };
}

export function entrosamento(progresso: number, semanas: number): number {
  const e = TREINO.entrosamento;
  return Math.min(e.max, e.base + (e.peso * progresso) / Math.max(1, semanas));
}

/**
 * IA (GDD-gestao 2): carga Leve em ciclo Curto e Normal nos demais; foco Tática até completar o entrosamento.
 * Depois, foco Físico (decisão do Gustavo, 13/11/2026).
 */
export function decidirIA(t: EstadoTreino, chave: string, semanas: number, ciclo: Ciclo): { carga: Carga; foco: Foco } {
  const progresso = t.taticas.get(chave)?.progresso ?? 0;
  return { carga: ciclo === 'curto' ? 'leve' : 'normal', foco: progresso < semanas ? 'tatica' : 'fisico' };
}

/** Média de Treino Tático do técnico e do auxiliar (efetivo). */
export function treinoTatico(tecnico: Tecnico, c: ComissaoClube): number {
  return ((tecnico.trabalho?.['Treino Tático'] ?? TREINO.semDado) + efetivo(c, 'Auxiliar', 'TTa')) / 2;
}

/** Aplica o ciclo de treino: entrosamento pelo foco Tática e desgaste das táticas paradas. */
export function treinar(t: EstadoTreino, chave: string, semanas: number, ciclo: Ciclo, carga: Carga, foco: Foco, mediaTT: number): void {
  t.carga = carga;
  t.foco = foco;
  if (!t.taticas.has(chave)) {
    t.taticas.set(chave, { progresso: 0, ciclosSemUso: 0 });
    // Guarda até 3: sai a de menor progresso.
    if (t.taticas.size > TREINO.maxTaticas) {
      const pior = [...t.taticas].filter(([k]) => k !== chave).sort((a, b) => a[1].progresso - b[1].progresso)[0][0];
      t.taticas.delete(pior);
    }
  }
  const tt = TREINO.treinoTatico;
  const ganho = foco === 'tatica' ? TREINO.carga[carga].ganho * TREINO.ciclo[ciclo] * (tt.base + mediaTT / tt.div) : 0;
  for (const [k, x] of t.taticas) {
    const parte = k === chave ? TREINO.focoTatica.escolhida : TREINO.focoTatica.outras;
    if (ganho > 0) {
      x.progresso = Math.min(semanas, x.progresso + ganho * parte);
      x.ciclosSemUso = 0;
    } else if (k !== chave) {
      x.ciclosSemUso += 1;
      if (x.ciclosSemUso > TREINO.desuso.ciclos) x.progresso = Math.max(0, x.progresso - TREINO.desuso.perda);
    }
  }
}

/** Jogar com a tática: +0,2 de progresso, sem precisar do foco. */
export function jogouCom(t: EstadoTreino, chave: string, semanas: number): void {
  const x = t.taticas.get(chave) ?? { progresso: 0, ciclosSemUso: 0 };
  x.progresso = Math.min(semanas, x.progresso + TREINO.porJogo);
  x.ciclosSemUso = 0;
  t.taticas.set(chave, x);
}

/** Bônus do foco do ciclo no jogo seguinte. */
export function bonusDoFoco(t: EstadoTreino, c: ComissaoClube): { menosGasto: number; ensaiadaExtra: number } {
  return {
    menosGasto: t.foco === 'fisico' ? naFaixa('focoFisico', efetivo(c, 'Preparador', 'Cond')) : 0,
    ensaiadaExtra: t.foco === 'bolaParada' ? naFaixa('focoBolaParada', efetivo(c, 'Analista', 'BP')) : 0,
  };
}
