import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criarRng } from '../motor/rng.ts';
import { CALENDARIO, jogosDaLiga, semanasDaLiga, tabelaPontosCorridos } from '../temporada/calendario.ts';
import { classificar } from '../temporada/classificacao.ts';
import type { ResultadoJogo } from '../temporada/classificacao.ts';
import { LIGAS, simularTemporada } from '../temporada/temporada.ts';
import { carregarBase, entradaTime } from '../terminal/carregar.ts';

const nomes = (n: number) => Array.from({ length: n }, (_, i) => `C${i}`);

test('tabela: todos se enfrentam 2 vezes, uma em cada casa, um jogo por rodada', () => {
  for (const n of [10, 20]) {
    const t = tabelaPontosCorridos(nomes(n), criarRng(7));
    assert.equal(t.length, 2 * (n - 1));
    const pares = new Map<string, number>();
    const casa = new Map<string, number>();
    for (const rod of t) {
      const naRodada = rod.flat();
      assert.equal(new Set(naRodada).size, n);
      for (const [a, b] of rod) {
        pares.set(`${a}>${b}`, (pares.get(`${a}>${b}`) ?? 0) + 1);
        casa.set(a, (casa.get(a) ?? 0) + 1);
      }
    }
    assert.equal(pares.size, n * (n - 1));
    for (const v of pares.values()) assert.equal(v, 1);
    for (const v of casa.values()) assert.equal(v, n - 1);
    // Ninguém joga 3 seguidas em casa ou fora, na temporada inteira.
    for (const c of nomes(n)) {
      const seq = t.map((rod) => rod.some(([a]) => a === c));
      for (let i = 2; i < seq.length; i++) assert.ok(!(seq[i] === seq[i - 1] && seq[i] === seq[i - 2]), `${c} 3 seguidas`);
    }
  }
});

test('calendário: Série A em 38 semanas até a 47, no máximo 2 livres seguidas; ligas de 18 a cada 2 semanas', () => {
  const a = semanasDaLiga('serie-a', 38);
  assert.equal(a.length, 38);
  assert.ok(a[0] >= CALENDARIO.inicio && a.at(-1)! <= 47);
  const livres = [];
  for (let w = CALENDARIO.inicio; w <= CALENDARIO.fim; w++) if (!a.includes(w)) livres.push(w);
  assert.equal(livres.length, 6);
  for (let i = 2; i < livres.length; i++) assert.ok(livres[i] - livres[i - 2] > 2);
  const b = semanasDaLiga('serie-b', 18);
  for (let i = 1; i < b.length; i++) assert.equal(b[i] - b[i - 1], 2);
  const jogos = jogosDaLiga('serie-b', nomes(10), criarRng(1));
  assert.equal(jogos.length, 90);
  assert.ok(jogos.every((j) => j.dia === (j.semana - 1) * 7 + CALENDARIO.diaLiga));
});

const r = (m: string, v: string, a: number, b: number, cartoes: [number, number] = [0, 0]): ResultadoJogo =>
  ({ mandante: m, visitante: v, placar: [a, b], amarelos: cartoes, vermelhos: [0, 0] });

test('classificação: pontos, vitórias, saldo, gols pró, confronto direto, cartões', () => {
  // A e B: 4 pontos cada; B tem mais vitórias? Não: A 1V1E, B 1V1E. Saldo e gols iguais; A venceu B.
  const res = [r('A', 'B', 1, 0), r('B', 'C', 1, 0), r('A', 'C', 0, 0), r('C', 'A', 0, 0), r('C', 'B', 0, 0), r('B', 'A', 0, 0)];
  const t = classificar(['A', 'B', 'C'], res, criarRng(1));
  assert.deepEqual(t.map((l) => l.clube), ['A', 'B', 'C']);
  assert.equal(t[0].pontos, 6);
  // Vitórias antes de saldo: X 2V 2D (6 pts), Y 0V 6E (6 pts).
  const v = classificar(['X', 'Y', 'Z'], [
    r('X', 'Z', 1, 0), r('Z', 'X', 1, 0), r('X', 'Z', 1, 0), r('Z', 'X', 5, 0),
    r('Y', 'Z', 0, 0), r('Z', 'Y', 0, 0), r('Y', 'Z', 0, 0), r('Z', 'Y', 0, 0), r('Y', 'Z', 0, 0), r('Z', 'Y', 0, 0),
  ], criarRng(1));
  assert.ok(v.findIndex((l) => l.clube === 'X') < v.findIndex((l) => l.clube === 'Y'));
  // Tudo igual, confronto direto empatado: menos amarelos à frente.
  const c = classificar(['P', 'Q'], [r('P', 'Q', 1, 1, [3, 1]), r('Q', 'P', 0, 0)], criarRng(1));
  assert.equal(c[0].clube, 'Q');
});

test('temporada: 740 jogos, tabelas completas e reproduzível pela semente', () => {
  const base = carregarBase();
  const clubesPorLiga = Object.fromEntries(LIGAS.map((l) => [l, base.clubes.filter((c) => c.liga === l && !c.reserva).map((c) => c.id)]));
  const entradas = Object.fromEntries(Object.values(clubesPorLiga).flat().map((id) => [id, entradaTime(base, id)]));
  const rodar = () => simularTemporada({ semente: 11, clubesPorLiga, entradas, elencos: base.elencos, tatica: base.tatica });
  const t = rodar();
  assert.equal(t.jogos.length, 380 + 4 * 90);
  for (const l of LIGAS) {
    const n = clubesPorLiga[l].length;
    assert.equal(t.tabelas[l].length, n);
    assert.ok(t.tabelas[l].every((x) => x.jogos === 2 * (n - 1)));
    const gp = t.tabelas[l].reduce((s, x) => s + x.golsPro, 0);
    assert.equal(gp, t.tabelas[l].reduce((s, x) => s + x.golsContra, 0));
  }
  // Ninguém joga 2 vezes no mesmo dia.
  const dia = new Set<string>();
  for (const j of t.jogos) for (const c of [j.mandante, j.visitante]) {
    assert.ok(!dia.has(`${c}-${j.dia}`));
    dia.add(`${c}-${j.dia}`);
  }
  assert.deepEqual(rodar().tabelas, t.tabelas);
});

import { criarMemoria, diasFora, prepararJogo, recuperacao, registrarJogo, tipoCiclo, ENTRE_JOGOS } from '../temporada/memoria.ts';
import { simularPartida } from '../motor/partida.ts';
import { montarTime } from '../motor/escalacao.ts';

test('memória: ciclo, recuperação do GDD e tempo de lesão', () => {
  assert.equal(tipoCiclo(3), 'curto');
  assert.equal(tipoCiclo(7), 'normal');
  assert.equal(tipoCiclo(14), 'longo');
  const j = { atributos: { Res: 10 }, idade: 25 } as never;
  // Exemplo do GDD-gestao 2 sem o preparador: 41 + 25 + carga Leve 8 (a IA usa Leve no ciclo Curto).
  assert.equal(recuperacao(j, 'curto'), 33);
  assert.equal(recuperacao({ atributos: { Res: 20 }, idade: 33 } as never, 'normal'), 40 + 3 - 4);
  assert.equal(diasFora(2, 25), 14);
  assert.equal(diasFora(2, 33), Math.round(14 * 1.2));
});

test('memória: suspenso e lesionado ficam fora; quem joga leva a energia final; poupado vai ao banco', () => {
  const base = carregarBase();
  const m = criarMemoria(base.elencos, ['ALA', 'BAR']);
  const rng = criarRng(5);
  const [a, b] = m.elencos.ALA.filter((j) => j.posicao !== 'GOL');
  m.jogadores.get(a.id)!.suspensao['serie-a'] = 1;
  m.jogadores.get(b.id)!.voltaDia = 100;
  const p = prepararJogo(m, 'ALA', 7, 'serie-a', rng);
  assert.ok(!p.elenco.includes(a) && !p.elenco.includes(b));
  assert.deepEqual(p.desfalques.suspensos, [a.id]);
  // Em outra competição o suspenso joga.
  assert.ok(prepararJogo(m, 'ALA', 7, 'copa', criarRng(5)).elenco.includes(a));
  const ent = { ...entradaTime(base, 'ALA'), elenco: p.elenco, condicao: p.condicao };
  const r = simularPartida({ mandante: ent, visitante: entradaTime(base, 'BAR'), tatica: base.tatica, semente: 3 });
  registrarJogo(m, 'ALA', 0, r, 7, 'serie-a', p.desfalques.suspensos, rng);
  assert.equal(m.jogadores.get(a.id)!.suspensao['serie-a'], 0);
  for (const x of r.times[0].participantes) if (!x.expulso) assert.equal(m.jogadores.get(x.j.id)!.condicao, Math.round(x.energia));
  // Rodízio: o titular poupado sai do onze se houver outro da posição.
  const normal = montarTime(0, entradaTime(base, 'ALA'), base.tatica, criarRng(1), false);
  const alvo = normal.escalados.find((e) => e.vaga !== 'GOL')!.j;
  const poupado = montarTime(0, { ...entradaTime(base, 'ALA'), poupados: [alvo.id] }, base.tatica, criarRng(1), false);
  assert.ok(!poupado.escalados.some((e) => e.j.id === alvo.id));
  assert.ok(poupado.banco.some((j) => j.id === alvo.id));
});

test('memória: 3 amarelos dão 1 jogo; vermelho direto dá 2; expulso não soma amarelo', () => {
  const base = carregarBase();
  const m = criarMemoria(base.elencos, ['ALA']);
  const j = m.elencos.ALA[3];
  const falso = (amarelos: number, expulso: 'direto' | 'segundoAmarelo' | null) =>
    ({ times: [{ participantes: [{ j, energia: 50, amarelos, expulso }] }, { participantes: [] }], lesoes: [] }) as never;
  registrarJogo(m, 'ALA', 0, falso(1, null), 7, 'L', [], criarRng(1));
  registrarJogo(m, 'ALA', 0, falso(1, null), 14, 'L', [], criarRng(1));
  assert.equal(m.jogadores.get(j.id)!.suspensao.L ?? 0, 0);
  registrarJogo(m, 'ALA', 0, falso(1, null), 21, 'L', [], criarRng(1));
  assert.equal(m.jogadores.get(j.id)!.suspensao.L, 1);
  assert.equal(m.jogadores.get(j.id)!.amarelos.L, 0);
  registrarJogo(m, 'ALA', 0, falso(1, 'direto'), 28, 'L', [], criarRng(1));
  assert.equal(m.jogadores.get(j.id)!.suspensao.L, 3);
  assert.equal(m.jogadores.get(j.id)!.amarelos.L, 0);
  assert.equal(ENTRE_JOGOS.suspensao.segundoAmarelo, 1);
});

import { chanceCobranca, disputarPenaltis, DISPUTA } from '../motor/penaltis.ts';
import { ANO1 } from '../temporada/copas.ts';

test('pênaltis: termina com vencedor, para quando um lado não alcança, base 72%', () => {
  const base = carregarBase();
  const r = simularPartida({ mandante: entradaTime(base, 'ALA'), visitante: entradaTime(base, 'BAR'), tatica: base.tatica, semente: 9 });
  for (let s = 1; s <= 300; s++) {
    const d = disputarPenaltis(r.times, criarRng(s));
    assert.notEqual(d.placar[0], d.placar[1]);
    assert.equal(d.vencedor, d.placar[0] > d.placar[1] ? 0 : 1);
    const porTime = [0, 1].map((k) => d.cobrancas.filter((c) => c.time === k).length);
    assert.ok(Math.abs(porTime[0] - porTime[1]) <= 1);
    if (porTime[0] > DISPUTA.cobrancas) assert.equal(porTime[0], porTime[1]);
  }
  const t = r.times[0];
  const c = chanceCobranca(t.escalados[5], r.times[1].goleiro);
  assert.ok(c >= 51 && c <= 88);
});

test('temporada com copas: número de jogos, campeões, grupos um por país, mata-mata coerente', () => {
  const base = carregarBase();
  const clubesPorLiga = Object.fromEntries(LIGAS.map((l) => [l, base.clubes.filter((c) => c.liga === l && !c.reserva).map((c) => c.id)]));
  const europeus = base.clubes.filter((c) => c.liga === 'europa').map((c) => c.id);
  const entradas = Object.fromEntries([...Object.values(clubesPorLiga).flat(), ...europeus].map((id) => [id, entradaTime(base, id)]));
  const t = simularTemporada({ semente: 3, clubesPorLiga, europeus, entradas, elencos: base.elencos, tatica: base.tatica });
  const conta = (c: string) => t.jogos.filter((j) => j.competicao === c).length;
  assert.equal(conta('copa-do-brasil'), 14 + 16 + 8 + 4 + 2);
  assert.equal(conta('libertadores'), 48 + 8 + 4 + 2);
  assert.equal(conta('champions'), 15);
  assert.equal(conta('mundial'), 1);
  const [cdb, lib, cha, mun] = t.copas;
  for (const c of t.copas) assert.ok(c.campeao());
  assert.ok(!t.jogos.some((j) => j.competicao === 'copa-do-brasil' && j.fase === '1ª fase' && ANO1.folgasCopaDoBrasil.includes(j.mandante)));
  const pais = new Map(Object.entries(ANO1.libertadores).flatMap(([p, cs]) => cs.map((c) => [c, p])));
  for (const g of lib.grupos!) assert.equal(new Set(g.clubes.map((c) => pais.get(c))).size, 4);
  for (const g of lib.grupos!) assert.ok(g.tabela.every((l) => l.jogos === 6));
  for (const c of [...cdb.confrontos, ...lib.confrontos, ...cha.confrontos]) {
    if (c.penaltis) assert.equal(c.gols[0], c.gols[1]);
    else assert.equal(c.vencedor, c.gols[0] > c.gols[1] ? c.a : c.b);
  }
  // Volta da Libertadores na casa da melhor campanha nos grupos.
  const pontos = (c: string) => lib.grupos!.flatMap((g) => g.tabela).find((l) => l.clube === c)!.pontos;
  for (const c of lib.confrontos) assert.ok(pontos(c.b) >= pontos(c.a));
  assert.ok(t.jogos.filter((j) => j.competicao === 'mundial' || (j.competicao === 'champions' && j.fase === 'Final')).every((j) => j.neutro));
  assert.deepEqual([mun.confrontos[0].a, mun.confrontos[0].b], [lib.campeao(), cha.campeao()]);
  // Ninguém joga 2 vezes no mesmo dia, nem 3 vezes na mesma semana.
  const porDia = new Set<string>();
  const porSemana = new Map<string, number>();
  for (const j of t.jogos) for (const c of [j.mandante, j.visitante]) {
    assert.ok(!porDia.has(`${c}-${j.dia}`));
    porDia.add(`${c}-${j.dia}`);
    porSemana.set(`${c}-${j.semana}`, (porSemana.get(`${c}-${j.semana}`) ?? 0) + 1);
  }
  assert.ok([...porSemana.values()].every((v) => v <= 2));
});

import { adaptar, ADAPTACAO } from '../temporada/adaptacao.ts';
import { criarMundo, folgasCopaDoBrasil, jogarAno, novoAnoMemoria, vagasLibertadores, virar } from '../temporada/virada.ts';

const linha = (clube: string) => ({ clube }) as never;
const temporadaFalsa = (tabs: Record<string, string[]>, campeoes: Record<string, string>) =>
  ({ tabelas: Object.fromEntries(Object.entries(tabs).map(([k, v]) => [k, v.map(linha)])), copas: Object.entries(campeoes).map(([id, c]) => ({ id, campeao: () => c })) }) as never;

test('virada: vagas da Libertadores pela prioridade e folgas da Copa do Brasil', () => {
  const m = { clubesPorLiga: { 'serie-a': ['A1', 'A2', 'A3', 'A4', 'A5'], 'serie-b': ['B1'], argentina: ['R1', 'R2', 'R3', 'R4', 'R5'], colombia: ['C1', 'C2', 'C3', 'C4'], chile: ['H1', 'H2', 'H3', 'H4'] } } as never;
  // Campeão da Libertadores argentino fora do G4; Copa do Brasil com clube da Série B.
  const t = temporadaFalsa({ 'serie-a': ['A1', 'A2', 'A3', 'A4', 'A5'], argentina: ['R1', 'R2', 'R3', 'R4', 'R5'], colombia: ['C1', 'C2', 'C3', 'C4'], chile: ['H1', 'H2', 'H3', 'H4'] },
    { libertadores: 'R5', 'copa-do-brasil': 'B1' });
  const v = vagasLibertadores(t, m);
  assert.deepEqual(v[0], ['B1', 'A1', 'A2', 'A3']);
  assert.deepEqual(v[1], ['R5', 'R1', 'R2', 'R3']);
  // Campeão já classificado pela liga: a vaga desce.
  const t2 = temporadaFalsa({ 'serie-a': ['A1', 'A2', 'A3', 'A4', 'A5'], argentina: ['R1', 'R2', 'R3', 'R4', 'R5'], colombia: ['C1', 'C2', 'C3', 'C4'], chile: ['H1', 'H2', 'H3', 'H4'] },
    { libertadores: 'A2', 'copa-do-brasil': 'A1' });
  assert.deepEqual(vagasLibertadores(t2, m)[0], ['A2', 'A1', 'A3', 'A4']);
  assert.deepEqual(folgasCopaDoBrasil(t2), ['A1', 'A2']);
  assert.deepEqual(folgasCopaDoBrasil(t), ['A1', 'B1']);
});

test('virada: lesão atravessa o ano, amarelo zera, suspensão fica', () => {
  const base = carregarBase();
  const mem = criarMemoria(base.elencos, ['ALA']);
  const [a, b] = mem.elencos.ALA;
  const sa = mem.jogadores.get(a.id)!;
  sa.voltaDia = 370; sa.amarelos = { L: 2 }; sa.suspensao = { L: 1 }; sa.condicao = 30;
  const sb = mem.jogadores.get(b.id)!;
  sb.voltaDia = 360; sb.condicao = 40;
  novoAnoMemoria(mem);
  assert.equal(sa.voltaDia, 6);
  assert.deepEqual(sa.amarelos, {});
  assert.equal(sa.suspensao.L, 1);
  assert.equal(sb.voltaDia, null);
  assert.equal(sb.condicao, ENTRE_JOGOS.preTemporada);
});

test('adaptação: sem trocar de estilo, no máximo 1 degrau do padrão e 2 mudanças', () => {
  const base = carregarBase();
  for (const tec of base.tecnicos.filter((t) => t.reacao)) {
    const estilo = base.tatica.estilos.find((s) => s.nome === tec.estilo)!;
    const aj = adaptar(tec, estilo, { planoAdversario: 'x', repeticoes: 9, eixoPerdido: 'velocidadeCostas', brechaAdversario: 'transicao', dif: -3 }, criarRng(1));
    assert.ok(aj.mudancas.length <= ADAPTACAO.maxMudancas);
    const difs = (Object.keys(estilo.padrao) as (keyof typeof estilo.padrao)[]).filter((k) => aj.padrao[k] !== estilo.padrao[k]);
    assert.equal(difs.length, aj.mudancas.length);
  }
});

test('carreira: 2 anos com virada, 4 trocam de série e as vagas valem no ano seguinte', () => {
  const base = carregarBase();
  const m = criarMundo(base);
  const t1 = jogarAno(m, 5);
  const a1 = new Set(m.clubesPorLiga['serie-a']);
  const r = virar(m, t1);
  assert.equal(m.ano, 2);
  assert.ok(r.rebaixados.every((c) => !m.clubesPorLiga['serie-a'].includes(c) && m.clubesPorLiga['serie-b'].includes(c)));
  assert.ok(r.promovidos.every((c) => m.clubesPorLiga['serie-a'].includes(c) && !a1.has(c)));
  assert.equal(m.clubesPorLiga['serie-a'].length, 20);
  assert.ok(r.libertadores.every((p) => p.length === 4 && new Set(p).size === 4));
  const t2 = jogarAno(m, 5);
  const lib = t2.copas.find((c) => c.id === 'libertadores')!;
  assert.deepEqual(new Set(lib.grupos!.flatMap((g) => g.clubes)), new Set(r.libertadores.flat()));
  assert.ok(t2.memoria.contagem.adaptacoes > 0);
});
