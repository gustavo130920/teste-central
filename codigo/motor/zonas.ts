// 30 zonas: corredor c (0=PE … 4=PD) e faixa f (1 a 6). Índice = c + (f − 1) × 5.
export const CORREDORES = ['PE', 'ME', 'CE', 'MD', 'PD'] as const;
export const TOTAL_ZONAS = 30;

export const zona = (c: number, f: number): number => c + (f - 1) * 5;
export const corredor = (z: number): number => z % 5;
export const faixa = (z: number): number => Math.floor(z / 5) + 1;
export const codigoZona = (z: number): string => `${CORREDORES[corredor(z)]}${faixa(z)}`;
export function zonaDeCodigo(s: string): number {
  return zona(CORREDORES.indexOf(s.slice(0, 2) as (typeof CORREDORES)[number]), Number(s[2]));
}

/** A F5 de quem ataca é a F2 de quem defende; a ponta esquerda de um é a direita do outro (GDD 2). */
export const espelhar = (z: number): number => zona(4 - corredor(z), 7 - faixa(z));

export const distancia = (a: number, b: number): number =>
  Math.max(Math.abs(corredor(a) - corredor(b)), Math.abs(faixa(a) - faixa(b)));
