// Uso: npm run temporada -- [SEMENTE] [LIGA] [rodadas]
// Roda a temporada das 5 ligas e mostra as tabelas finais. LIGA (padrão serie-a) mostra também os resultados rodada a rodada se vier "rodadas".
import { LIGAS, simularTemporada } from '../temporada/temporada.ts';
import type { Linha } from '../temporada/classificacao.ts';
import { carregarBase, entradaTime } from './carregar.ts';

const semente = Number(process.argv[2] ?? 2026);
const foco = process.argv[3] ?? 'serie-a';
const mostrarRodadas = process.argv[4] === 'rodadas';

const base = carregarBase();
const nome = new Map(base.clubes.map((c) => [c.id, c.nomeCurto ?? c.nome]));
const clubesPorLiga = Object.fromEntries(LIGAS.map((l) => [l, base.clubes.filter((c) => c.liga === l && !c.reserva).map((c) => c.id)]));
const europeus = base.clubes.filter((c) => c.liga === 'europa').map((c) => c.id);
const entradas = Object.fromEntries([...Object.values(clubesPorLiga).flat(), ...europeus].map((id) => [id, entradaTime(base, id)]));

const NOMES: Record<string, string> = { 'serie-a': 'Série A', 'serie-b': 'Série B', argentina: 'Liga Argentina', colombia: 'Liga Colombiana', chile: 'Liga Chilena' };
/** Faixas da tabela (PLANEJAMENTO, competições). */
const faixa = (liga: string, pos: number, total: number): string => {
  if (liga === 'serie-a') return pos <= 4 ? 'Libertadores' : pos > total - 4 ? 'rebaixado' : '';
  if (liga === 'serie-b') return pos <= 4 ? 'sobe' : '';
  return pos <= 4 ? 'Libertadores' : '';
};

const inicio = Date.now();
const t = simularTemporada({ semente, clubesPorLiga, europeus, entradas, elencos: base.elencos, tatica: base.tatica, comissoes: base.comissoes });
const segundos = (Date.now() - inicio) / 1000;

if (mostrarRodadas) {
  const daLiga = t.jogos.filter((j) => j.competicao === foco);
  const rodadas = Math.max(...daLiga.map((j) => j.rodada));
  for (let r = 1; r <= rodadas; r++) {
    const js = daLiga.filter((j) => j.rodada === r);
    console.log(`\n${NOMES[foco]}, rodada ${r} (semana ${js[0].semana})`);
    for (const j of js) console.log(`  ${nome.get(j.mandante)!.padStart(22)} ${j.placar[0]} x ${j.placar[1]} ${nome.get(j.visitante)}`);
  }
}

const imprimir = (liga: string, linhas: Linha[]): void => {
  console.log(`\n${NOMES[liga]}`);
  console.log('  #  Clube                    P   J   V   E   D  GP  GC   SG  CA  CV');
  linhas.forEach((l, i) => {
    const n = (v: number, w = 4): string => String(v).padStart(w);
    console.log(`${n(i + 1, 3)}  ${nome.get(l.clube)!.padEnd(22)}${n(l.pontos)}${n(l.jogos)}${n(l.vitorias)}${n(l.empates)}${n(l.derrotas)}${n(l.golsPro)}${n(l.golsContra)}${n(l.saldo, 5)}${n(l.amarelos)}${n(l.vermelhos)}  ${faixa(liga, i + 1, linhas.length)}`);
  });
};

console.log(`Temporada ${semente}: ${t.jogos.length} jogos em ${segundos.toFixed(1)} s`);
imprimir(foco, t.tabelas[foco]);
for (const l of LIGAS) if (l !== foco) imprimir(l, t.tabelas[l]);

// Resumo por liga: gols, mando, campeão e lanterna.
console.log('\nResumo           Gols/j  0x0%  Casa% Emp% Fora%  Campeão  Lanterna');
for (const l of LIGAS) {
  const js = t.jogos.filter((j) => j.competicao === l);
  const g = js.reduce((s, j) => s + j.placar[0] + j.placar[1], 0) / js.length;
  const pct = (f: (p: [number, number]) => boolean): string => ((js.filter((j) => f(j.placar)).length / js.length) * 100).toFixed(1).padStart(5);
  const tab = t.tabelas[l];
  console.log(`${NOMES[l].padEnd(16)} ${g.toFixed(2).padStart(6)} ${pct(([a, b]) => a + b === 0)} ${pct(([a, b]) => a > b)}${pct(([a, b]) => a === b)}${pct(([a, b]) => a < b)}  ${String(tab[0].pontos).padStart(4)} pts ${String(tab.at(-1)!.pontos).padStart(5)} pts`);
}

// Memória entre jogos (2ª fatia): desfalques, condição e contagens da temporada.
console.log('\nEntre jogos       Lesion./jogo  Susp./jogo  Poupados/jogo  Condição titulares');
for (const l of LIGAS) {
  const js = t.jogos.filter((j) => j.competicao === l);
  const lados = js.flatMap((j) => [0, 1].map((k) => ({ d: j.desfalques[k], c: j.condicaoTitulares[k] })));
  const media = (f: (x: (typeof lados)[number]) => number): string => (lados.reduce((s, x) => s + f(x), 0) / lados.length).toFixed(2).padStart(8);
  console.log(`${NOMES[l].padEnd(16)} ${media((x) => x.d.lesionados.length)}    ${media((x) => x.d.suspensos.length)}    ${media((x) => x.d.poupados.length)}       ${media((x) => x.c)}`);
}
const c = t.memoria.contagem;
console.log(`Suspensões ${c.suspensoes} · lesões no treino ${c.lesoesTreino} · recaídas ${c.recaidas} · sequelas ${c.sequelas} · jogos sem goleiro disponível ${c.semGoleiro} · jogos com jovem da base por emergência ${c.baseEmergencia}`);

// Copas (3ª fatia).
for (const c of t.copas) {
  console.log(`
${c.nome}`);
  for (const g of c.grupos ?? []) {
    console.log(`  Grupo ${'ABCD'[c.grupos!.indexOf(g)]}: ` + g.tabela.map((l) => `${nome.get(l.clube)} ${l.pontos}`).join(' · '));
  }
  let fase = '';
  for (const x of c.confrontos) {
    if (x.fase !== fase) { fase = x.fase; console.log(`  ${fase}`); }
    if (fase === '1ª fase') continue;
    const pen = x.penaltis ? ` (pên. ${x.penaltis[0]} x ${x.penaltis[1]})` : '';
    console.log(`    ${nome.get(x.a)!.padStart(16)} ${x.gols[0]} x ${x.gols[1]} ${nome.get(x.b)}${pen}${x.unico ? '' : ' (agregado)'}  → ${nome.get(x.vencedor!)}`);
  }
  console.log(`  Campeão: ${nome.get(c.campeao()!)}`);
}
// Desfalques dos clubes da Série A em todos os jogos (meta GDD-gestao 12: lesionados ao mesmo tempo 2, de 1,5 a 3).
const serieA = new Set(clubesPorLiga['serie-a']);
const ladosA = t.jogos.flatMap((j) => [0, 1].filter((k) => serieA.has(k === 0 ? j.mandante : j.visitante)).map((k) => j.desfalques[k]));
const jogosA = ladosA.length / serieA.size;
console.log(`
Série A com copas: ${jogosA.toFixed(1)} jogos por clube · lesionados ${(ladosA.reduce((s, d) => s + d.lesionados.length, 0) / ladosA.length).toFixed(2)} · suspensos ${(ladosA.reduce((s, d) => s + d.suspensos.length, 0) / ladosA.length).toFixed(2)} · poupados ${(ladosA.reduce((s, d) => s + d.poupados.length, 0) / ladosA.length).toFixed(2)}`);
const comPen = t.jogos.filter((j) => j.penaltis);
console.log(`Disputas de pênaltis: ${comPen.length} · jogos no total: ${t.jogos.length}`);
