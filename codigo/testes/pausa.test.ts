// Etapa 4, 8ª fatia (parte 8b1): partida interativa, pausas do jogador (GDD-motor 7).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { simularPartida } from '../motor/partida.ts';
import { custoRadical, falaDoJogador, tonsCertos } from '../motor/pausas.ts';
import type { AjustePausa, ControlePausa, InfoPausa } from '../motor/tipos.ts';
import { carregarBase, entradaTime } from '../terminal/carregar.ts';

const base = carregarBase();
const jogo = (controle?: ControlePausa) => simularPartida({ mandante: entradaTime(base, 'ALA'), visitante: entradaTime(base, 'BAR'), tatica: base.tatica, semente: 11, ...(controle ? { controle } : {}) });
const ctl = (pausa: (i: InfoPausa) => AjustePausa | null, analista = { profundidade: 15, precisao: 20, aoVivo: 20 }, leitura = 15): ControlePausa => ({ lado: 0, analista, leitura, pausa });

test('pausa: resposta null dá o mesmo jogo da IA, e o jogador vê 5 pausas com o intervalo aos 45', () => {
  const infos: InfoPausa[] = [];
  const a = jogo();
  const b = jogo(ctl((i) => { infos.push(i); return null; }));
  assert.deepEqual(b.placar, a.placar);
  assert.deepEqual(b.pausas, a.pausas);
  assert.deepEqual(infos.map((i) => i.minuto), [15, 30, 45, 60, 75]);
  assert.deepEqual(infos.map((i) => i.intervalo), [false, false, true, false, false]);
  for (const i of infos) {
    assert.ok(i.sugestoes.length >= 1 && i.sugestoes.length <= 3);
    assert.ok(i.extras.some((x) => x.startsWith('Eixos')), 'Profundidade 14+ mostra os eixos');
  }
});

test('pausa: analista fraco não mostra extras; leitura baixa dá 1 sugestão', () => {
  const infos: InfoPausa[] = [];
  jogo(ctl((i) => { infos.push(i); return null; }, { profundidade: 5, precisao: 5, aoVivo: 0 }, 5));
  for (const i of infos) {
    assert.equal(i.extras.length, 0);
    assert.ok(i.sugestoes.length <= 1);
    assert.deepEqual(i.times[1].ajustes, []);
  }
});

test('pausa: seguir sem mexer não deixa o auxiliar trocar; troca, estilo e fala do jogador valem', () => {
  const parado = jogo(ctl(() => ({})));
  for (const p of parado.pausas) assert.ok(!p.times[0].ajustes.some((x) => x.startsWith('sai ')), 'sem trocas do auxiliar');
  let feita = false;
  const r = jogo(ctl((i) => {
    if (i.minuto === 45) {
      const sai = i.time.escalados.find((e) => e !== i.time.goleiro)!;
      feita = true;
      return { estilo: base.tatica.estilos.find((s) => s.nome !== i.time.estilo.nome)!.nome, trocas: [[sai.j.id, i.time.banco[0].id]], fala: 'Cobrar' };
    }
    return {};
  }));
  assert.ok(feita);
  const aj = r.pausas[2].times[0].ajustes;
  assert.ok(aj.some((x) => x.startsWith('estilo ')), aj.join());
  assert.ok(aj.some((x) => x.startsWith('sai ')), aj.join());
  assert.ok(aj.some((x) => x.startsWith('fala: Cobrar')), aj.join());
});

test('pausa: tom certo pela situação e custo radical pelo Ajuste nas Pausas', () => {
  assert.deepEqual(tonsCertos(-1, 0), ['Cobrar']);
  assert.deepEqual(tonsCertos(1, 10), ['Acalmar', 'Elogiar']);
  assert.deepEqual(tonsCertos(0, 10), []);
  const t = { tecnicoExpulso: false, tecnico: { trabalho: { 'Motivação': 20, 'Ajuste nas Pausas': 10 } } } as never;
  assert.equal(falaDoJogador(t, 'Cobrar', -1, 0), 20);
  assert.equal(falaDoJogador(t, 'Elogiar', -1, 0), -10);
  assert.equal(falaDoJogador(t, 'Elogiar', 0, 10), 0);
  assert.equal(custoRadical(t), 0.75);
  assert.equal(custoRadical({ tecnicoExpulso: false, tecnico: { trabalho: { 'Ajuste nas Pausas': 20 } } } as never), 0.9);
  assert.equal(custoRadical({ tecnicoExpulso: false, tecnico: { trabalho: { 'Ajuste nas Pausas': 1 } } } as never), 1 - 0.385);
});
