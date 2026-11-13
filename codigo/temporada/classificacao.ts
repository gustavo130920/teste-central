// Classificação dos pontos corridos. Desempate aprovado pelo Gustavo em 09/11/2026:
// pontos, vitórias, saldo, gols pró, confronto direto, menos vermelhos, menos amarelos, sorteio.
import type { Rng } from '../motor/rng.ts';

export interface ResultadoJogo {
  mandante: string;
  visitante: string;
  placar: [number, number];
  /** Amarelos e vermelhos de cada lado. */
  amarelos: [number, number];
  vermelhos: [number, number];
}

export interface Linha {
  clube: string;
  jogos: number;
  pontos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  saldo: number;
  amarelos: number;
  vermelhos: number;
}

const linhaVazia = (clube: string): Linha => ({
  clube, jogos: 0, pontos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0, saldo: 0, amarelos: 0, vermelhos: 0,
});

function somar(linhas: Map<string, Linha>, r: ResultadoJogo): void {
  const lados = [r.mandante, r.visitante];
  for (let k = 0; k < 2; k++) {
    const l = linhas.get(lados[k]);
    if (!l) continue;
    const pro = r.placar[k];
    const contra = r.placar[1 - k];
    l.jogos += 1;
    l.golsPro += pro;
    l.golsContra += contra;
    l.saldo = l.golsPro - l.golsContra;
    l.amarelos += r.amarelos[k];
    l.vermelhos += r.vermelhos[k];
    if (pro > contra) { l.vitorias += 1; l.pontos += 3; } else if (pro === contra) { l.empates += 1; l.pontos += 1; } else l.derrotas += 1;
  }
}

/** Tabela dos clubes informados, já ordenada. O sorteio só é usado se tudo empatar. */
export function classificar(clubes: string[], resultados: ResultadoJogo[], rng: Rng): Linha[] {
  const linhas = new Map(clubes.map((c) => [c, linhaVazia(c)]));
  for (const r of resultados) somar(linhas, r);
  const sorteio = new Map(clubes.map((c) => [c, rng.n()]));

  const geral = (a: Linha, b: Linha): number =>
    b.pontos - a.pontos || b.vitorias - a.vitorias || b.saldo - a.saldo || b.golsPro - a.golsPro;
  const ordenadas = [...linhas.values()].sort(geral);

  // Grupos ainda empatados nos 4 primeiros critérios: confronto direto entre eles, depois cartões e sorteio.
  const final: Linha[] = [];
  for (let i = 0; i < ordenadas.length; ) {
    let j = i + 1;
    while (j < ordenadas.length && geral(ordenadas[i], ordenadas[j]) === 0) j++;
    const grupo = ordenadas.slice(i, j);
    if (grupo.length > 1) {
      const nomes = new Set(grupo.map((l) => l.clube));
      const diretos = new Map(grupo.map((l) => [l.clube, linhaVazia(l.clube)]));
      for (const r of resultados) if (nomes.has(r.mandante) && nomes.has(r.visitante)) somar(diretos, r);
      grupo.sort((a, b) =>
        diretos.get(b.clube)!.pontos - diretos.get(a.clube)!.pontos ||
        a.vermelhos - b.vermelhos ||
        a.amarelos - b.amarelos ||
        sorteio.get(a.clube)! - sorteio.get(b.clube)!,
      );
    }
    final.push(...grupo);
    i = j;
  }
  return final;
}
