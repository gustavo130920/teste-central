// Copas (etapa 3, 3ª fatia): Copa do Brasil, Libertadores, Champions e Mundial (PLANEJAMENTO, competições; GDD-gestao 1).
// Cada copa gera os jogos do dia conforme os resultados anteriores; o laço da temporada joga e devolve o resultado.
import type { Rng } from '../motor/rng.ts';
import type { Jogo } from './calendario.ts';
import { CALENDARIO, tabelaPontosCorridos } from './calendario.ts';
import type { Linha, ResultadoJogo } from './classificacao.ts';
import { classificar } from './classificacao.ts';

/** Datas das copas (semanas, jogo na quarta). PROVISORIO: o GDD só dá quantas datas e o Mundial na 48. Nenhum clube joga 2 copas na mesma semana. */
export const DATAS_COPAS = {
  copaDoBrasil: { primeiraFase: 7, oitavas: [21, 23], quartas: [31, 33], semi: [37, 39], final: [44, 45] },
  libertadores: { grupos: [8, 10, 12, 14, 16, 18], quartas: [25, 27], semi: [34, 36], final: [41, 43] },
  champions: { oitavas: 20, quartas: 30, semi: 38, final: 46 },
  mundial: 48,
} as const;

/**
 * 1ª temporada (decisão do Gustavo, 13/11/2026): equivalentes dos clubes reais da Libertadores 2026, 4 por país.
 * Brasil pela regra do jogo aplicada a 2025 (campeão da Libertadores, da Copa do Brasil e liga); Argentina, Colômbia e Chile
 * pelos clubes reais da fase de grupos e das fases prévias que existem no jogo; o 4º argentino pela maior reputação.
 * Folgam na Copa do Brasil os campeões de 2025 da Série A e da Copa do Brasil.
 */
export const ANO1 = {
  libertadores: {
    brasil: ['GUA', 'LES', 'GAR', 'ALT'],
    argentina: ['RIA', 'DIA', 'BAR', 'SAA'],
    colombia: ['NUT', 'COM', 'MON', 'BLV'],
    chile: ['HER', 'MNQ', 'CAC', 'ALH'],
  },
  folgasCopaDoBrasil: ['GUA', 'LES'],
};

export interface JogoCopa extends Jogo {
  fase: string;
  /** 0 = jogo único, 1 = ida, 2 = volta. */
  perna: 0 | 1 | 2;
  neutro: boolean;
  confronto: number | null;
}

export interface Confronto {
  id: number;
  fase: string;
  /** Manda o 1º jogo (ou o único). */
  a: string;
  /** Manda o 2º jogo (ou visita no único). */
  b: string;
  unico: boolean;
  neutro: boolean;
  gols: [number, number];
  penaltis: [number, number] | null;
  vencedor: string | null;
  jogos: number;
}

export interface Copa {
  id: string;
  nome: string;
  jogosDoDia(dia: number, rng: Rng): JogoCopa[];
  /** O jogo decide o confronto e o agregado está empatado: vai a pênaltis. */
  precisaPenaltis(j: JogoCopa, placar: [number, number]): boolean;
  registrar(j: JogoCopa, r: ResultadoJogo, penaltis: [number, number] | null): void;
  campeao(): string | null;
  confrontos: Confronto[];
  grupos?: { clubes: string[]; tabela: Linha[] }[];
}

const diaDaSemana = (semana: number): number => (semana - 1) * 7 + CALENDARIO.diaCopa;

function embaralhar<T>(itens: T[], rng: Rng): T[] {
  const t = [...itens];
  for (let i = t.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

interface Fase {
  nome: string;
  semanas: number[];
  neutroNaUltima?: boolean;
  /** Pares [manda o 1º, manda o 2º] gerados quando a fase começa. */
  sortear: (rng: Rng) => [string, string][];
}

/** Mata-mata genérico: fase a fase, ida e volta ou jogo único; desempate por saldo agregado e pênaltis (PLANEJAMENTO). */
function mataMata(id: string, competicao: string, fases: Fase[], extras: Partial<Copa> = {}): Copa & { vencedores(fase: string): string[] } {
  const confrontos: Confronto[] = [];
  const gerada = new Set<string>();
  const daFase = (f: string): Confronto[] => confrontos.filter((c) => c.fase === f);
  const copa = {
    id,
    nome: competicao,
    confrontos,
    vencedores: (f: string): string[] => daFase(f).map((c) => c.vencedor!),
    jogosDoDia(dia: number, rng: Rng): JogoCopa[] {
      const jogos: JogoCopa[] = extras.jogosDoDia?.(dia, rng) ?? [];
      for (const f of fases) {
        const perna = f.semanas.findIndex((s) => diaDaSemana(s) === dia);
        if (perna < 0) continue;
        if (!gerada.has(f.nome)) {
          gerada.add(f.nome);
          const unico = f.semanas.length === 1;
          for (const [a, b] of f.sortear(rng)) {
            confrontos.push({ id: confrontos.length, fase: f.nome, a, b, unico, neutro: unico && !!f.neutroNaUltima, gols: [0, 0], penaltis: null, vencedor: null, jogos: 0 });
          }
        }
        for (const c of daFase(f.nome)) {
          const volta = perna === 1;
          jogos.push({
            competicao: id, rodada: 0, semana: f.semanas[perna], dia, fase: f.nome, perna: c.unico ? 0 : volta ? 2 : 1, neutro: c.neutro, confronto: c.id,
            mandante: volta ? c.b : c.a, visitante: volta ? c.a : c.b,
          });
        }
      }
      return jogos;
    },
    precisaPenaltis(j: JogoCopa, placar: [number, number]): boolean {
      if (j.confronto === null) return false;
      const c = confrontos[j.confronto];
      if (j.perna === 0) return placar[0] === placar[1];
      if (j.perna === 1) return false;
      const ga = c.gols[0] + (j.mandante === c.a ? placar[0] : placar[1]);
      const gb = c.gols[1] + (j.mandante === c.b ? placar[0] : placar[1]);
      return ga === gb;
    },
    registrar(j: JogoCopa, r: ResultadoJogo, penaltis: [number, number] | null): void {
      if (j.confronto === null) return extras.registrar?.(j, r, penaltis);
      const c = confrontos[j.confronto];
      c.gols[0] += j.mandante === c.a ? r.placar[0] : r.placar[1];
      c.gols[1] += j.mandante === c.b ? r.placar[0] : r.placar[1];
      c.jogos += 1;
      if (j.perna === 1) return;
      if (penaltis) {
        // Pênaltis na visão do mandante deste jogo.
        c.penaltis = j.mandante === c.a ? penaltis : [penaltis[1], penaltis[0]];
        c.vencedor = c.penaltis[0] > c.penaltis[1] ? c.a : c.b;
      } else c.vencedor = c.gols[0] > c.gols[1] ? c.a : c.b;
    },
    campeao(): string | null {
      const ultima = daFase(fases.at(-1)!.nome);
      return ultima[0]?.vencedor ?? null;
    },
  };
  return { ...extras, ...copa };
}

const pares = (clubes: string[]): [string, string][] => {
  const res: [string, string][] = [];
  for (let i = 0; i < clubes.length; i += 2) res.push([clubes[i], clubes[i + 1]]);
  return res;
};

/** Copa do Brasil: 28 na 1ª fase em jogo único (mando sorteado), depois 16 em ida e volta com sorteio livre e mando do 2º jogo sorteado. */
export function criarCopaDoBrasil(clubes: string[], folgas: string[]): Copa {
  const d = DATAS_COPAS.copaDoBrasil;
  let copa: ReturnType<typeof mataMata>;
  const sorteioLivre = (anterior: string) => (rng: Rng) => pares(embaralhar(copa.vencedores(anterior), rng));
  copa = mataMata('copa-do-brasil', 'Copa do Brasil', [
    { nome: '1ª fase', semanas: [d.primeiraFase], sortear: (rng) => pares(embaralhar(clubes.filter((c) => !folgas.includes(c)), rng)) },
    { nome: 'Oitavas', semanas: [...d.oitavas], sortear: (rng) => pares(embaralhar([...copa.vencedores('1ª fase'), ...folgas], rng)) },
    { nome: 'Quartas', semanas: [...d.quartas], sortear: sorteioLivre('Oitavas') },
    { nome: 'Semifinal', semanas: [...d.semi], sortear: sorteioLivre('Quartas') },
    { nome: 'Final', semanas: [...d.final], sortear: sorteioLivre('Semifinal') },
  ]);
  return copa;
}

/** Libertadores: 4 grupos de 4, um clube de cada país; 2 por grupo; mata-mata cruzado, melhor campanha decide em casa. */
export function criarLibertadores(porPais: string[][], rngSorteio: Rng, rngDesempate: () => Rng): Copa {
  const d = DATAS_COPAS.libertadores;
  const potes = porPais.map((p) => embaralhar(p, rngSorteio));
  const grupos = [0, 1, 2, 3].map((g) => ({ clubes: potes.map((p) => p[g]), tabela: [] as Linha[] }));
  const resultados: ResultadoJogo[][] = grupos.map(() => []);
  const tabelas = grupos.map((g) => tabelaPontosCorridos(g.clubes, rngSorteio));
  const atualizar = (): void => grupos.forEach((g, i) => { g.tabela = classificar(g.clubes, resultados[i], rngDesempate()); });
  atualizar();
  // Melhor campanha entre os 8 classificados: pontos, vitórias, saldo, gols pró (PROVISORIO: o resto como sorteio fixo).
  const campanha = (c: string): Linha => grupos.flatMap((g) => g.tabela).find((l) => l.clube === c)!;
  const melhor = (x: string, y: string): number => {
    const a = campanha(x);
    const b = campanha(y);
    return b.pontos - a.pontos || b.vitorias - a.vitorias || b.saldo - a.saldo || b.golsPro - a.golsPro;
  };
  /** Par [manda o 1º, manda o 2º]: o de melhor campanha fica com o 2º jogo. */
  const ordenar = (x: string, y: string): [string, string] => (melhor(x, y) <= 0 ? [y, x] : [x, y]);
  const pos = (g: number, p: number): string => grupos[g].tabela[p].clube;
  let copa: ReturnType<typeof mataMata>;
  copa = mataMata('libertadores', 'Libertadores', [
    { nome: 'Quartas', semanas: [...d.quartas], sortear: () => [ordenar(pos(0, 0), pos(1, 1)), ordenar(pos(1, 0), pos(0, 1)), ordenar(pos(2, 0), pos(3, 1)), ordenar(pos(3, 0), pos(2, 1))] },
    { nome: 'Semifinal', semanas: [...d.semi], sortear: () => { const v = copa.vencedores('Quartas'); return [ordenar(v[0], v[1]), ordenar(v[2], v[3])]; } },
    { nome: 'Final', semanas: [...d.final], sortear: () => { const v = copa.vencedores('Semifinal'); return [ordenar(v[0], v[1])]; } },
  ], {
    grupos,
    jogosDoDia(dia: number): JogoCopa[] {
      const r = d.grupos.findIndex((s) => diaDaSemana(s) === dia);
      if (r < 0) return [];
      return tabelas.flatMap((t, g) => t[r].map(([mandante, visitante]) => ({
        competicao: 'libertadores', rodada: r + 1, semana: d.grupos[r], dia, fase: `Grupo ${'ABCD'[g]}`, perna: 0 as const, neutro: false, confronto: null, mandante, visitante,
      })));
    },
    registrar(j: JogoCopa, r: ResultadoJogo): void {
      resultados[grupos.findIndex((g) => g.clubes.includes(j.mandante))].push(r);
      atualizar();
    },
  });
  return copa;
}

/** Champions: só simulada, mata-mata em jogo único com chave sorteada no início; mando sorteado; final em campo neutro. */
export function criarChampions(clubes: string[], rng: Rng): Copa {
  const d = DATAS_COPAS.champions;
  const chave = embaralhar(clubes, rng);
  let copa: ReturnType<typeof mataMata>;
  const seguir = (anterior: string) => (r: Rng) => pares(copa.vencedores(anterior)).map(([a, b]) => (r.pct(50) ? [a, b] : [b, a]) as [string, string]);
  copa = mataMata('champions', 'Champions', [
    { nome: 'Oitavas', semanas: [d.oitavas], sortear: (r) => pares(chave).map(([a, b]) => (r.pct(50) ? [a, b] : [b, a]) as [string, string]) },
    { nome: 'Quartas', semanas: [d.quartas], sortear: seguir('Oitavas') },
    { nome: 'Semifinal', semanas: [d.semi], sortear: seguir('Quartas') },
    { nome: 'Final', semanas: [d.final], neutroNaUltima: true, sortear: seguir('Semifinal') },
  ]);
  return copa;
}

/** Mundial: campeão da Libertadores contra campeão da Champions, jogo único em campo neutro. */
export function criarMundial(libertadores: Copa, champions: Copa): Copa {
  return mataMata('mundial', 'Mundial', [
    { nome: 'Final', semanas: [DATAS_COPAS.mundial], neutroNaUltima: true, sortear: () => [[libertadores.campeao()!, champions.campeao()!]] },
  ]);
}
