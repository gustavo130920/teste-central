// Energia, moral, ímpeto e fator casa (GDD 6). Contas puras; o valor vira modificador no início de cada bloco.
import type { Clube } from './dados.ts';
import { limitar } from './disputa.ts';
import { GDD, PROVISORIO } from './parametros.ts';
import type { Escalado, TimeEmCampo } from './tipos.ts';
import { distancia } from './zonas.ts';

export const temQualidade = (e: Escalado, q: string): boolean => e.j.qualidades.includes(q);
const noCampo = (t: TimeEmCampo, q: string): boolean => t.escalados.some((e) => temQualidade(e, q));

/** Gasto por bloco. Com instrução com e sem a bola, vale o maior custo (PROVISORIO). */
export function gastoBloco(e: Escalado, t: TimeEmCampo): number {
  const g = GDD.energia;
  const custo = Math.max(g.custo[e.instrCom?.custo.energia ?? '0'] ?? 0, g.custo[e.instrSem?.custo.energia ?? '0'] ?? 0);
  const fisico = g.base * (g.fisicoBase + g.fisicoPasso * (t.notas.Fisico - 1));
  const resistencia = ((e.j.atributos.Res ?? 10) - 10) * g.resistencia;
  const cobrir = (t.efeitos.coberturas.get(e) ?? 0) * g.cobrir;
  const longe = Math.max(0, distancia(e.zonaCom, e.zonaSem) - 2) * g.distancia;
  const preguica = e.j.defeitos.includes('Preguiçoso sem a bola') ? g.preguicoso : 0;
  const bruto = Math.max(g.minimo, fisico + custo + cobrir + longe - resistencia - preguica - t.apoio.menosGasto);
  // O desgaste depende da posição: goleiro quase não corre, lateral e ponta correm o jogo todo.
  return bruto * (e === t.goleiro ? g.goleiro : g.posicao[e.vaga] ?? 1);
}

/** -1 para cada 15 pontos abaixo de 70. */
export const modEnergia = (energia: number): number =>
  energia >= GDD.energia.limiarEfeito ? 0 : -Math.floor((GDD.energia.limiarEfeito - energia) / GDD.energia.passoEfeito);

export function modMoral(m: number): number {
  if (m <= 20) return -2;
  if (m <= 40) return -1;
  if (m <= 70) return 0;
  return m <= 90 ? 1 : 2;
}

export function modImpeto(v: number): number {
  const a = Math.abs(v);
  const m = a < 25 ? 0 : a < 50 ? 1 : a < 75 ? 2 : 2.5;
  return v < 0 ? -m : m;
}

/** De 0 a +2, só o mandante. Humor e ocupação ainda não existem: usa o tamanho da torcida (PROVISORIO). */
export const modCasa = (c: Clube): number => limitar(PROVISORIO.fatorCasaBase + ((c.torcidaTamanho ?? 10) - 10) * PROVISORIO.fatorCasaPorTorcida, 0, 2);

/** Energia, moral, ímpeto, casa e lesão leve de um jogador. */
export function calcularMod(e: Escalado, t: TimeEmCampo, difPlacar: number, bloco: number, impeto: number): number {
  const casa = t.emCasa ? t.casa ?? modCasa(t.clube) : 0;
  const racudo = temQualidade(e, 'Raçudo');
  const energia = racudo ? Math.min(0, modEnergia(e.energia) + 1) : modEnergia(e.energia);
  const lesao = e.lesao === 'leve' ? GDD.lesao.levePena : 0;
  return energia + modMoral(e.moral) + modImpeto(impeto) + casa + lesao + (racudo && bloco >= 5 && difPlacar < 0 ? 1 : 0);
}

/** Calculado no início do bloco (GDD 1 e 6). */
export function atualizarMods(t: TimeEmCampo, difPlacar: number, bloco: number, impeto: number): void {
  for (const e of t.escalados) e.modBloco = calcularMod(e, t, difPlacar, bloco, impeto);
}

/** Em casa, ganhos × 1,25. Com Gelo em campo, perdas × 0,75. */
export function aplicarImpeto(impeto: [number, number], t: TimeEmCampo, delta: number): void {
  let d = delta;
  if (d > 0 && t.emCasa) d *= GDD.impeto.ganhoCasa;
  if (d < 0 && noCampo(t, 'Gelo')) d *= GDD.impeto.perdaGelo;
  impeto[t.indice] = limitar(impeto[t.indice] + d, -100, 100);
}

export function decairImpeto(v: number): number {
  return v > 0 ? Math.max(0, v - GDD.impeto.decaimento) : Math.min(0, v + GDD.impeto.decaimento);
}

/** Quedas valem × 0,75 com Líder de vestiário em campo. Gelo não perde moral com vaia. */
export function mudarMoral(t: TimeEmCampo, alvos: Escalado[], delta: number): void {
  const lider = delta < 0 && noCampo(t, 'Líder de vestiário') ? GDD.liderQuedaMoral : 1;
  const d = delta < 0 ? delta * lider * t.apoio.quedaMoral : delta;
  for (const e of alvos) e.moral = limitar(e.moral + d, 0, 100);
}
