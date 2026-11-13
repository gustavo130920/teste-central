// Lesões (GDD 8). Contas puras; quem aplica no jogo é partida.ts.
import { GDD, PROVISORIO } from './parametros.ts';
import type { Rng } from './rng.ts';
import type { Gravidade } from './tipos.ts';

/** × 2 abaixo de 40 e × 3 abaixo de 25: vale o maior, não acumulam. */
export function fatorEnergiaLesao(energia: number): number {
  for (const f of GDD.lesao.energia) if (energia < f.abaixo) return f.fator;
  return 1;
}

/** Chance em %, por jogador e por bloco. */
export function chanceLesao(propensao: number, energia: number, preparador: number = PROVISORIO.preparadorLesao): number {
  const g = GDD.lesao;
  return g.base * (g.propensaoBase + propensao / g.propensaoDiv) * fatorEnergiaLesao(energia) * preparador;
}

/** Falta dura sofrida: a mesma chance, mais 1 ponto percentual (leitura de "1% extra", PROVISORIO). */
export const chanceLesaoFaltaDura = (propensao: number, energia: number): number => chanceLesao(propensao, energia) + GDD.lesao.faltaDuraExtra;

const GRAVIDADES: Gravidade[] = ['leve', 'media', 'grave'];

export const sortearGravidade = (rng: Rng): Gravidade => GRAVIDADES[rng.peso(GRAVIDADES.map((g) => GDD.lesao.gravidade[g]))];

/** Tempo fora, só registrado: quem usa é a etapa 3. */
export function semanasFora(g: Gravidade, rng: Rng): number {
  const [a, b] = GDD.lesao.semanas[g];
  return rng.int(a, b);
}
