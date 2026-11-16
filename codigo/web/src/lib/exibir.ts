// Textos e cores para as telas.
export const COMPETICAO: Record<string, string> = {
  'serie-a': 'Série A', 'serie-b': 'Série B', argentina: 'Liga argentina', colombia: 'Liga colombiana', chile: 'Liga chilena',
  'copa-do-brasil': 'Copa do Brasil', libertadores: 'Libertadores', champions: 'Champions', mundial: 'Mundial',
};

const CORES: [RegExp, string][] = [
  [/verde/, '#1f8a4c'], [/branc/, '#f1f1ec'], [/pret/, '#141414'], [/vermelh|rubr|encarnad/, '#c62828'], [/celeste/, '#6fb7e6'],
  [/azul|anil/, '#1e5bb8'], [/amarel|ouro|dourad/, '#f2c230'], [/gren|bord|vinho/, '#7a1f2b'], [/laranj/, '#e8772e'],
  [/rox|violet|lil/, '#6b3fa0'], [/cinz|prat/, '#8a8f8c'], [/marrom|caf/, '#6d4c33'], [/rosa/, '#e07aa3'],
];

/** "Verde e branco" → as duas cores, na ordem. */
export function coresDoClube(texto: string): string[] {
  const t = texto.toLowerCase();
  const achadas = CORES.map(([re, hex]) => ({ i: t.search(re), hex })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i).map((x) => x.hex);
  return achadas.length ? achadas.slice(0, 3) : ['#8a8f8c'];
}

export const milhoes = (v: number | null): string => (v === null ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`);
