// Uso: npm run partida -- [MANDANTE] [VISITANTE] [SEMENTE]
import { simularPartida } from '../motor/partida.ts';
import { semearDeTexto } from '../motor/rng.ts';
import type { EstatTime } from '../motor/tipos.ts';
import { narrar } from '../narracao/narrar.ts';
import { carregarBase, entradaTime } from './carregar.ts';

const [casa = 'ALA', fora = 'BAR', sementeTxt = '42'] = process.argv.slice(2);
const semente = /^\d+$/.test(sementeTxt) ? Number(sementeTxt) : semearDeTexto(sementeTxt);
const base = carregarBase();
const r = simularPartida({ mandante: entradaTime(base, casa), visitante: entradaTime(base, fora), tatica: base.tatica, semente });
const [a, b] = r.times;

console.log(`\n${a.clube.nomeCurto} x ${b.clube.nomeCurto}${r.classico ? ' (clássico)' : ''} · semente ${semente}`);
for (const t of r.times) {
  console.log(`${t.clube.nomeCurto}: ${t.estilo.nome}, ${t.tecnico.formacaoComBola} / ${t.tecnico.formacaoSemBola} · ${t.escalados.map((e) => e.j.nome).join(', ')}`);
}

// Plano de cada time (2ª fatia). Combinações aqui são só para revisão: no jogo ficam ocultas (GDD 4).
for (const t of r.times) {
  const c = t.confronto;
  console.log(`\n[${t.clube.nomeCurto}] viabilidade ${c.viabilidade.toFixed(1)} · pressão x saída ${c.pressaoSaida.toFixed(1)} · velocidade x costas ${c.velocidadeCostas.toFixed(1)} · criação x bloco ${c.criacaoBloco.toFixed(1)}`);
  for (const e of t.escalados) console.log(`  ${e.vaga.padEnd(6)}${e.j.nome.padEnd(22)}${(e.instrCom?.nome ?? '-').padEnd(26)}${e.efCom.toFixed(2)}  ${(e.instrSem?.nome ?? '-').padEnd(24)}${e.efSem.toFixed(2)}`);
  for (const s of t.efeitos.resumo) console.log(`  · ${s}`);
  if (t.efeitos.combinacoes.length) console.log(`  * Combinações: ${t.efeitos.combinacoes.join(', ')}`);
}

const narradas = narrar(r, base.frases, semente, { competicao: 'Liga' });
for (let bloco = 1; bloco <= 6; bloco++) {
  console.log(`\n--- ${(bloco - 1) * 15}' a ${bloco * 15}' ---`);
  for (const l of narradas.filter((x) => x.bloco === bloco)) console.log(`${l.minuto.padStart(6)} ${l.voz === 'C' ? '  (comentarista) ' : ''}${l.texto}`);
  const p = r.pausas[bloco - 1];
  if (!p) continue;
  console.log(`\n  == Pausa ${p.minuto}' · ${p.placar[0]} x ${p.placar[1]} ==`);
  p.times.forEach((t, i) => console.log(`  ${r.times[i].clube.nomeCurto}: fin ${t.finalizacoes} · posse ${t.possePct}% · energia ${t.energiaMedia} · ímpeto ${t.impeto}${t.ajustes.length ? ` · ${t.ajustes.join('; ')}` : ''}`));
}

console.log(`\nFINAL: ${a.clube.nomeCurto} ${r.placar[0]} x ${r.placar[1]} ${b.clube.nomeCurto}\n`);
const total = r.estatisticas[0].posseSegundos + r.estatisticas[1].posseSegundos;
const linhas: [string, (e: EstatTime) => string][] = [
  ['Finalizações', (e) => `${e.finalizacoes}`],
  ['No alvo', (e) => `${e.noAlvo}`],
  ['Chances esperadas', (e) => e.chancesEsperadas.toFixed(2)],
  ['Posse', (e) => `${Math.round((e.posseSegundos / total) * 100)}%`],
  ['Passes', (e) => `${e.passes}`],
  ['Desarmes', (e) => `${e.desarmes}`],
  ['Faltas', (e) => `${e.faltas}`],
  ['Amarelos', (e) => `${e.amarelos}`],
  ['Vermelhos', (e) => `${e.vermelhos}`],
  ['Pênaltis', (e) => `${e.penaltis}`],
  ['Cobranças diretas', (e) => `${e.cobrancasDiretas}`],
  ['Gols de bola parada', (e) => `${e.golsBolaParada}`],
  ['Escanteios', (e) => `${e.escanteios}`],
  ['Impedimentos', (e) => `${e.impedimentos}`],
  ['Contra-ataques', (e) => `${e.contraAtaques}`],
];
for (const [rotulo, f] of linhas) console.log(`${rotulo.padEnd(20)}${f(r.estatisticas[0]).padStart(6)}${f(r.estatisticas[1]).padStart(6)}`);
for (const t of r.times) for (const e of t.participantes) if (e.expulso) console.log(`Expulso: ${e.j.nome} (${t.clube.nomeCurto}, ${e.expulso === 'direto' ? 'vermelho direto' : 'segundo amarelo'})`);
for (const l of r.lesoes) {
  const t = r.times[l.time];
  const nome = (id: string): string => t.participantes.find((e) => e.j.id === id)?.j.nome ?? id;
  const destino = !l.saiu ? 'continuou' : l.substituto ? `saiu, entrou ${nome(l.substituto)}` : 'saiu, sem troca';
  console.log(`Lesão ${l.minuto}': ${nome(l.jogador)} (${t.clube.nomeCurto}, ${l.gravidade}, ${l.semanas} sem., ${l.origem === 'faltaDura' ? 'falta dura' : 'desgaste'}): ${destino}`);
}
console.log(`\nCadeias: ${r.cadeias} (${r.cadeiasPorBloco.join(', ')})`);
