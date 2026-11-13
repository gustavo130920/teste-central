// Uso: npm run carreira -- [ANOS] [SEMENTE] [sem-adaptacao]
// Roda várias temporadas seguidas com a virada entre elas e mostra campeões, acesso e queda, vagas e o mundo ao fim.
import { criarMundo, jogarAno, virar } from '../temporada/virada.ts';
import { carregarBase } from './carregar.ts';

const anos = Number(process.argv[2] ?? 5);
const semente = Number(process.argv[3] ?? 2026);
const adaptacao = process.argv[4] !== 'sem-adaptacao';

const base = carregarBase();
const nome = new Map(base.clubes.map((c) => [c.id, c.nomeCurto]));
const n = (id: string): string => nome.get(id) ?? id;
const m = criarMundo(base);
const NOMES: Record<string, string> = {
  'serie-a': 'Série A', 'serie-b': 'Série B', argentina: 'Argentina', colombia: 'Colômbia', chile: 'Chile',
  'copa-do-brasil': 'Copa do Brasil', libertadores: 'Libertadores', champions: 'Champions', mundial: 'Mundial',
};

const inicio = Date.now();
const titulos = new Map<string, Record<string, number>>();
let jogos = 0;
for (let i = 0; i < anos; i++) {
  const t = jogarAno(m, semente, adaptacao);
  jogos += t.jogos.length;
  const r = virar(m, t);
  console.log(`\nAno ${r.ano}`);
  console.log('  ' + Object.entries(r.campeoes).map(([k, c]) => `${NOMES[k]}: ${n(c)}`).join(' · '));
  console.log(`  Caem: ${r.rebaixados.map(n).join(', ')} · Sobem: ${r.promovidos.map(n).join(', ')}`);
  console.log(`  Libertadores do ano seguinte: ${r.libertadores.map((p) => p.map(n).join(', ')).join(' | ')}`);
  console.log(`  Folgam na Copa do Brasil: ${r.folgasCopaDoBrasil.map(n).join(', ')}`);
  const rep = Object.entries(r.reputacao).map(([c, d]) => `${n(c)} ${d > 0 ? '+' : ''}${d}`);
  const tor = Object.entries(r.torcida).map(([c, d]) => `${n(c)} ${d > 0 ? '+' : ''}${d}`);
  if (rep.length) console.log(`  Reputação: ${rep.join(', ')}`);
  if (tor.length) console.log(`  Torcida: ${tor.join(', ')}`);
  for (const [k, c] of Object.entries(r.campeoes)) {
    const x = titulos.get(c) ?? {};
    x[k] = (x[k] ?? 0) + 1;
    titulos.set(c, x);
  }
}

console.log(`\n${anos} temporadas, ${jogos} jogos em ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
console.log('\nMais títulos');
for (const [c, x] of [...titulos].sort((a, b) => Object.values(b[1]).reduce((s, v) => s + v, 0) - Object.values(a[1]).reduce((s, v) => s + v, 0)).slice(0, 12)) {
  console.log(`  ${n(c).padEnd(16)} ${Object.entries(x).map(([k, v]) => `${NOMES[k]} ${v}`).join(', ')}`);
}
const c = m.memoria!.contagem;
const leituras = c.leiturasCertas + c.leiturasErradas;
console.log(`\nAdaptação entre jogos${adaptacao ? '' : ' (desligada)'}: ${c.adaptacoes} jogos com ajuste · leitura certa ${leituras ? ((c.leiturasCertas / leituras) * 100).toFixed(1) : '0'}% de ${leituras}`);
console.log(`Série A no fim: ${m.clubesPorLiga['serie-a'].map(n).join(', ')}`);
