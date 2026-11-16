// Etapa 5, fatia 5c: salvar e carregar na virada.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { carregarBase } from '../terminal/carregar.ts';
import { criarMundo, jogarAno, virar } from '../temporada/virada.ts';
import type { Mundo } from '../temporada/virada.ts';
import { assumirClube, criarTecnicoDoJogador } from '../temporada/jogador.ts';
import type { ControleJogador } from '../temporada/jogador.ts';
import { VERSAO_SAVE, carregar, codificar, decodificar, salvar } from '../temporada/salvamento.ts';
import { Nomes } from '../gestao/base.ts';

test('5c: grafo com referências, Map, Set, classe e números especiais volta igual', () => {
  const comum = { id: 'x', v: [1, 2] };
  const nomes = new Nomes([{ nome: 'Ana Souza Lima', nacionalidade: 'BRA' }]);
  const o = { a: comum, b: [comum, comum], m: new Map<string, unknown>([['k', comum]]), s: new Set([3, 4]), n: nomes, inf: Infinity, u: undefined, $estranho: 1 };
  o.b.push(o.a);
  const d = decodificar(JSON.parse(JSON.stringify(codificar(o)))) as typeof o;
  assert.equal(d.a, d.b[0], 'mesma referência');
  assert.equal(d.m.get('k'), d.a);
  assert.deepEqual([...d.s], [3, 4]);
  assert.ok(d.n instanceof Nomes);
  assert.ok(d.n.usados.has('Ana Souza Lima'));
  assert.equal(d.inf, Infinity);
  assert.ok('u' in d && d.u === undefined);
  assert.equal(d.$estranho, 1);
  assert.throws(() => codificar({ f: () => 1 }), /função/);
});

test('5c: versão diferente é recusada', () => {
  const texto = JSON.stringify(codificar({ versao: VERSAO_SAVE + 1, ano: 2, mundo: {}, extra: null }));
  assert.throws(() => carregar(texto), /versão/);
});

const CLUBE = 'ABA';
function mundoComJogador(): { m: Mundo; J: ControleJogador } {
  const base = carregarBase();
  const m = criarMundo(base);
  const BR = base.clubes.filter((c) => (c.liga === 'serie-a' || c.liga === 'serie-b') && !c.reserva).map((c) => c.id);
  m.eventos = { modelos: base.eventos, imprensa: base.imprensa, cenario: 'aleatorio', clubes: BR, texto: null };
  const t = criarTecnicoDoJogador({ nome: 'Teste', origem: 'Ex-jogador', estilo: 'Ginga', formacaoComBola: '4-4-2', formacaoSemBola: '4-4-2', temperamento: 'Gestor' });
  assumirClube(m.tecnicos, m.clubes.find((c) => c.id === CLUBE)!, t);
  const J: ControleJogador = { clube: CLUBE };
  m.jogador = J;
  return { m, J };
}

test('5c: carregar na virada e jogar o ano seguinte dá o mesmo ano de quem não salvou', () => {
  const { m, J } = mundoComJogador();
  virar(m, jogarAno(m, 5));
  const texto = salvar(m, { semente: 5 });
  const s = carregar<{ semente: number }>(texto);
  assert.equal(s.ano, m.ano);
  assert.equal(s.extra.semente, 5);
  const c = s.mundo;
  c.jogador = { ...J };
  const tecnicos = new Set(c.tecnicos);
  for (const [id, g] of c.memoria!.gestao) assert.ok(tecnicos.has(g.tecnico) || !c.tecnicos.some((t) => t.clubeId === id), `${id}: técnico da gestão é o mesmo objeto da lista`);
  const a = jogarAno(m, 5);
  const b = jogarAno(c, 5);
  assert.equal(b.jogos.length, a.jogos.length);
  assert.deepEqual(b.jogos.map((j) => j.placar), a.jogos.map((j) => j.placar));
  const ra = virar(m, a);
  const rb = virar(c, b);
  assert.deepEqual(rb.campeoes, ra.campeoes);
  assert.equal(salvar(c, null).length, salvar(m, null).length, 'mundos iguais depois de mais um ano');
  console.log(`  save: ${(texto.length / 1e6).toFixed(1)} MB`);
});
