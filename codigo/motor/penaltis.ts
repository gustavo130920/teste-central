// Disputa de pênaltis (GDD 8): 5 cobranças alternadas, depois alternadas até decidir. Base de 72%, mesma conta do pênalti.
// Ordem automática por BP e Comp; Gelo e Decisivo valem +2. Cobra quem terminou em campo.
import { chancePenalti } from './bolaparada.ts';
import { temQualidade } from './clima.ts';
import { lerAtributo, valorJogador } from './disputa.ts';
import { GDD } from './parametros.ts';
import type { Rng } from './rng.ts';
import type { Escalado, TimeEmCampo } from './tipos.ts';

export const DISPUTA = { base: 72, cobrancas: 5, bonus: 2 } as const;

export interface Cobranca { time: 0 | 1; batedor: string; goleiro: string; gol: boolean }
export interface ResultadoDisputa { placar: [number, number]; vencedor: 0 | 1; cobrancas: Cobranca[] }

const extra = (e: Escalado): number =>
  (temQualidade(e, 'Gelo') ? DISPUTA.bonus : 0) + (temQualidade(e, 'Decisivo') ? DISPUTA.bonus : 0) + (e.j.tracos.includes('Cobrador de pênalti') ? GDD.bolaParada.penalti.traco : 0);

/** Ordem dos batedores: o de pênalti da tática primeiro (5b1), depois maior média de BP e Comp, goleiro por último. */
export function ordemBatedores(t: TimeEmCampo): Escalado[] {
  const nota = (e: Escalado): number => (lerAtributo(e, 'BP') + lerAtributo(e, 'Comp')) / 2;
  const primeiro = (e: Escalado): number => Number(e.j.id !== t.batedores?.penalti);
  return [...t.escalados].sort((a, b) => Number(a === t.goleiro) - Number(b === t.goleiro) || primeiro(a) - primeiro(b) || nota(b) - nota(a) || a.j.id.localeCompare(b.j.id));
}

export function chanceCobranca(bat: Escalado, gol: Escalado): number {
  const p = GDD.bolaParada.penalti;
  const vBat = valorJogador(bat, ['BP', 'Comp'], extra(bat));
  const vGol = valorJogador(gol, ['Ref', 'Agi'], gol.j.tracos.includes('Pegador de pênalti') ? p.traco : 0);
  return chancePenalti(vBat, vGol) - p.base + DISPUTA.base;
}

export function disputarPenaltis(times: [TimeEmCampo, TimeEmCampo], rng: Rng): ResultadoDisputa {
  const ordem = [ordemBatedores(times[0]), ordemBatedores(times[1])];
  const placar: [number, number] = [0, 0];
  const cobrancas: Cobranca[] = [];
  const cobrar = (k: 0 | 1, n: number): void => {
    const bat = ordem[k][n % ordem[k].length];
    const gol = times[1 - k].goleiro;
    const gol_ = rng.pct(chanceCobranca(bat, gol));
    if (gol_) placar[k] += 1;
    cobrancas.push({ time: k, batedor: bat.j.id, goleiro: gol.j.id, gol: gol_ });
  };
  // Série de 5, parando quando um lado não alcança mais.
  for (let n = 0; n < DISPUTA.cobrancas; n++) {
    for (const k of [0, 1] as const) {
      cobrar(k, n);
      const restam = (lado: 0 | 1): number => DISPUTA.cobrancas - n - (lado === 0 || k === 1 ? 1 : 0);
      if (placar[0] + restam(0) < placar[1] || placar[1] + restam(1) < placar[0]) return { placar, vencedor: placar[0] > placar[1] ? 0 : 1, cobrancas };
    }
  }
  // Alternadas até decidir.
  for (let n = DISPUTA.cobrancas; placar[0] === placar[1]; n++) {
    cobrar(0, n);
    cobrar(1, n);
  }
  return { placar, vencedor: placar[0] > placar[1] ? 0 : 1, cobrancas };
}
