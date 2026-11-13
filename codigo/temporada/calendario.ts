// Calendário de 52 semanas e tabela das ligas de pontos corridos (GDD-gestao, seção 1). Puro: não roda partida.
import type { Rng } from '../motor/rng.ts';

/** Números do calendário. GDD = GDD-gestao seção 1; PROVISORIO = o GDD não dá o número. */
export const CALENDARIO = {
  /** GDD: temporada nas semanas 5 a 48. */
  inicio: 5,
  fim: 48,
  /** PROVISORIO: as 6 semanas livres da Série A (no máximo 2 seguidas; a 48 fica livre para ela terminar até a 47). */
  livresSerieA: [11, 18, 25, 32, 40, 48],
  /** PROVISORIO: Série B e ligas sul-americanas, uma rodada a cada 2 semanas a partir da 5 (5, 7, ..., 39). */
  inicioBienal: 5,
  /** PROVISORIO: dia da semana do jogo, 1 = segunda. Ligas no domingo, copas na quarta (fatia 3). */
  diaLiga: 7,
  diaCopa: 3,
} as const;

export interface Jogo {
  competicao: string;
  rodada: number;
  semana: number;
  /** Dia absoluto do ano (1 a 364), para contar dias entre jogos. */
  dia: number;
  mandante: string;
  visitante: string;
}

/** Semanas das rodadas de uma liga, conforme o número de rodadas. */
export function semanasDaLiga(liga: string, rodadas: number): number[] {
  if (liga === 'serie-a') {
    const livres = new Set<number>(CALENDARIO.livresSerieA);
    const s: number[] = [];
    for (let w = CALENDARIO.inicio; w <= CALENDARIO.fim; w++) if (!livres.has(w)) s.push(w);
    if (s.length !== rodadas) throw new Error(`Série A: ${s.length} semanas para ${rodadas} rodadas`);
    return s;
  }
  return Array.from({ length: rodadas }, (_, i) => CALENDARIO.inicioBienal + 2 * i);
}

/**
 * Turno pelo método do círculo, com a ordem dos clubes sorteada; returno espelha o turno com mando invertido.
 * Devolve uma lista de rodadas, cada uma com pares [mandante, visitante].
 */
export function tabelaPontosCorridos(clubes: string[], rng: Rng): [string, string][][] {
  if (clubes.length % 2 !== 0) throw new Error('Número ímpar de clubes');
  const t = [...clubes];
  for (let i = t.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [t[i], t[j]] = [t[j], t[i]];
  }
  // Pares pelo método do círculo (o último clube fica fixo).
  const n = t.length;
  const m = n - 1;
  const md = (x: number): number => ((x % m) + m) % m;
  const pares: [number, number][][] = [];
  for (let r = 0; r < m; r++) {
    const rod: [number, number][] = [[r, m]];
    for (let k = 1; k < n / 2; k++) rod.push([md(r + k), md(r - k)]);
    pares.push(rod);
  }
  const mando = definirMando(pares, n);
  const turno = pares.map((rod, r) => rod.map(([a, b], p) => (mando[r][p] ? [t[a], t[b]] : [t[b], t[a]]) as [string, string]));
  const returno = turno.map((rod) => rod.map(([a, b]) => [b, a] as [string, string]));
  return [...turno, ...returno];
}

/**
 * Mando de cada par do turno (true = o primeiro joga em casa), por busca com volta atrás:
 * ninguém joga 3 seguidas em casa ou fora, contando a virada para o returno (que inverte o turno), e prefere alternar.
 */
function definirMando(pares: [number, number][][], n: number): boolean[][] {
  const m = pares.length;
  const seq: boolean[][] = Array.from({ length: n }, () => []);
  const tripla = (s: boolean[]): boolean => {
    const k = s.length;
    return k >= 3 && s[k - 1] === s[k - 2] && s[k - 2] === s[k - 3];
  };
  // Na virada a sequência segue com o turno invertido: s[m-2], s[m-1], !s[0], !s[1].
  const viradaOk = (s: boolean[]): boolean => {
    const v = [s[m - 2], s[m - 1], !s[0], !s[1]];
    return !tripla(v.slice(0, 3)) && !tripla(v);
  };
  const res: boolean[][] = pares.map((rod) => rod.map(() => true));
  const passo = (r: number, p: number): boolean => {
    // Com 4 clubes (grupos da Libertadores) a virada sem 3 seguidas é impossível para alguém: vale só dentro do turno.
    if (r === m) return n <= 4 || seq.every(viradaOk);
    if (p === pares[r].length) return passo(r + 1, 0);
    const [a, b] = pares[r][p];
    const ultimoA = seq[a].at(-1);
    // Tenta primeiro a opção em que A alterna.
    for (const casaA of ultimoA === true ? [false, true] : [true, false]) {
      seq[a].push(casaA);
      seq[b].push(!casaA);
      if (!tripla(seq[a]) && !tripla(seq[b])) {
        res[r][p] = casaA;
        if (passo(r, p + 1)) return true;
      }
      seq[a].pop();
      seq[b].pop();
    }
    return false;
  };
  if (!passo(0, 0)) throw new Error('Sem mando possível');
  return res;
}

/** Jogos de uma liga já com semana e dia. */
export function jogosDaLiga(liga: string, clubes: string[], rng: Rng): Jogo[] {
  const tabela = tabelaPontosCorridos(clubes, rng);
  const semanas = semanasDaLiga(liga, tabela.length);
  return tabela.flatMap((rod, i) =>
    rod.map(([mandante, visitante]) => ({
      competicao: liga,
      rodada: i + 1,
      semana: semanas[i],
      dia: (semanas[i] - 1) * 7 + CALENDARIO.diaLiga,
      mandante,
      visitante,
    })),
  );
}
