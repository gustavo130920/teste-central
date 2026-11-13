// Comissão com efeito real (etapa 4, 1ª fatia; GDD-gestao 8). Contas puras.
// Atributo efetivo = atributo × estrutura × química, até 20. Cargo vago vale 3.
import type { Cargo, Profissional } from '../motor/dados.ts';
import type { ApoioComissao } from '../motor/tipos.ts';

export const COMISSAO = {
  vago: 3,
  max: 20,
  /** Cargos que dependem do CT; o coordenador depende da base; os outros, de nada. */
  ct: ['Auxiliar', 'Preparador', 'Goleiros', 'Analista', 'Médico', 'Psicólogo'] as Cargo[],
  base: ['Coord. base'] as Cargo[],
  estrutura: { base: 0.8, div: 50 },
  quimica: { base: 0.95, div: 200 },
  /** Decisão do Gustavo (13/11/2026): a Europa não tem comissão nos dados; todos os atributos valem 14. */
  europa: 14,
  /**
   * PROVISORIO: o GDD dá só a faixa; lida como linha reta do atributo 1 ao 20.
   * Prevenção (motor 8), intervalo (motor 6), ensaiada (motor 8), estudo de batedores (motor 8), foco Físico e foco Bola parada (gestão 2).
   */
  faixas: {
    prevencao: [1.2, 0.7],
    intervalo: [6, 12],
    ensaiada: [0, 3],
    batedores: [0, 3],
    focoFisico: [0.3, 0.7],
    focoBolaParada: [0.5, 1.5],
  } as Record<string, [number, number]>,
} as const;

export interface ComissaoClube {
  /** Estrutura do clube (1 a 20); null = sem dado, vale × 1. */
  ct: number | null;
  base: number | null;
  profissionais: Profissional[];
  /** Sem comissão nos dados (Europa): todos os atributos valem isto, química neutra. */
  fixo?: number;
}

const estrutura = (c: ComissaoClube, cargo: Cargo): number => {
  const e = COMISSAO.estrutura;
  const nivel = COMISSAO.ct.includes(cargo) ? c.ct : COMISSAO.base.includes(cargo) ? c.base : null;
  return nivel === null ? 1 : e.base + nivel / e.div;
};

/** Atributo efetivo de um cargo (GDD-gestao 8). */
export function efetivo(c: ComissaoClube, cargo: Cargo, sigla: string): number {
  if (c.fixo !== undefined) return Math.min(COMISSAO.max, c.fixo * estrutura(c, cargo));
  const p = c.profissionais.find((x) => x.cargo === cargo);
  if (!p) return COMISSAO.vago;
  const q = COMISSAO.quimica;
  const quimica = q.base + (p.quimica ?? 10) / q.div;
  return Math.min(COMISSAO.max, (p.atributos[sigla] ?? COMISSAO.vago) * estrutura(c, cargo) * quimica);
}

/** Linha reta do atributo 1 ao 20 dentro da faixa do GDD. */
export function naFaixa(nome: keyof typeof COMISSAO.faixas | string, atributo: number): number {
  const [a, b] = COMISSAO.faixas[nome];
  const t = (Math.max(1, Math.min(20, atributo)) - 1) / 19;
  return a + (b - a) * t;
}

/** Gestão emocional do psicólogo: quedas de moral × (1 − Gestão emocional ÷ 50) (GDD-gestao 3). */
export const quedaMoral = (c: ComissaoClube): number => 1 - efetivo(c, 'Psicólogo', 'Emo') / 50;

/** O que a comissão entrega ao motor, sem o treino do ciclo. */
export function apoioDaComissao(c: ComissaoClube): Omit<ApoioComissao, 'entrosamento' | 'menosGasto' | 'respaldo'> {
  return {
    quedaMoral: quedaMoral(c),
    recuperacaoIntervalo: naFaixa('intervalo', efetivo(c, 'Preparador', 'Rec')),
    prevencao: naFaixa('prevencao', efetivo(c, 'Preparador', 'Prev')),
    ensaiada: naFaixa('ensaiada', efetivo(c, 'Analista', 'BP')),
    estudoBatedores: naFaixa('batedores', efetivo(c, 'Goleiros', 'Bat')),
  };
}
