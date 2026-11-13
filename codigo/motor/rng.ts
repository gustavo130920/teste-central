// Sorteio reproduzível (mulberry32). Mesma semente, mesma sequência.
export interface Rng {
  /** Número em [0, 1). */
  n(): number;
  /** Inteiro de a até b, inclusive. */
  int(a: number, b: number): number;
  /** Verdadeiro com chance de p%. */
  pct(p: number): boolean;
  /** Índice sorteado pelos pesos. */
  peso(pesos: number[]): number;
  /** Item sorteado de forma uniforme. */
  um<T>(itens: T[]): T;
}

export function criarRng(semente: number): Rng {
  let a = semente >>> 0;
  const n = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    n,
    int: (x, y) => x + Math.floor(n() * (y - x + 1)),
    pct: (p) => n() * 100 < p,
    peso(pesos) {
      const total = pesos.reduce((s, p) => s + p, 0);
      let r = n() * total;
      for (let i = 0; i < pesos.length; i++) {
        r -= pesos[i];
        if (r < 0) return i;
      }
      return pesos.length - 1;
    },
    um: (itens) => itens[Math.floor(n() * itens.length)],
  };
}

export const semearDeTexto = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
