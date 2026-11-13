import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Profissional } from '../motor/dados.ts';
import { apoioDaComissao, efetivo, naFaixa } from '../gestao/comissao.ts';
import type { ComissaoClube } from '../gestao/comissao.ts';
import { bonusDoFoco, chaveTatica, criarTreino, decidirIA, entrosamento, jogouCom, treinar } from '../gestao/treino.ts';
import { criarRng } from '../motor/rng.ts';
import { criarMemoria, prepararJogo } from '../temporada/memoria.ts';
import { carregarBase } from '../terminal/carregar.ts';

const prof = (cargo: Profissional['cargo'], atributos: Record<string, number>, quimica = 10): Profissional => ({
  cargo, nome: 'X', idade: 40, nacionalidade: 'BRA', atributos, reputacao: 10, ambicao: 10, lealdade: 10, quimica, homemDeConfianca: false, salario: 1, contrato: 2027,
});

test('GDD-gestao 8: atributo efetivo = atributo × estrutura × química, até 20; vago vale 3', () => {
  const c: ComissaoClube = { ct: 20, base: 5, profissionais: [prof('Preparador', { Rec: 15 }, 20), prof('Diretor', { Neg: 12 }, 0)] };
  assert.ok(Math.abs(efetivo(c, 'Preparador', 'Rec') - Math.min(20, 15 * 1.2 * 1.05)) < 1e-9);
  assert.ok(Math.abs(efetivo(c, 'Diretor', 'Neg') - 12 * 0.95) < 1e-9); // diretor sem estrutura
  assert.equal(efetivo(c, 'Médico', 'Trat'), 3);
  assert.equal(efetivo({ ct: null, base: null, profissionais: [], fixo: 14 }, 'Analista', 'BP'), 14);
});

test('faixas do GDD em linha reta do atributo 1 ao 20', () => {
  assert.equal(naFaixa('prevencao', 1), 1.2);
  assert.ok(Math.abs(naFaixa('prevencao', 20) - 0.7) < 1e-9);
  assert.equal(naFaixa('intervalo', 20), 12);
  const a = apoioDaComissao({ ct: 10, base: 10, profissionais: [prof('Goleiros', { Bat: 1 })] });
  assert.equal(a.estudoBatedores, 0);
});

test('GDD-gestao 2: entrosamento, IA e ganho do foco Tática', () => {
  assert.equal(entrosamento(0, 8), 0.7);
  assert.equal(entrosamento(8, 8), 1);
  const t = criarTreino('A', 8);
  assert.equal(t.taticas.get('A')!.progresso, 8); // ano 1 completo
  assert.deepEqual(decidirIA(t, 'A', 8, 'curto'), { carga: 'leve', foco: 'fisico' });
  assert.deepEqual(decidirIA(t, 'B', 8, 'normal'), { carga: 'normal', foco: 'tatica' });
  // Nova tática, ciclo Normal, carga Normal, Treino Tático médio 10: 1,0 × (0,8 + 0,2) = 1,0; a antiga recebe 25%, já está cheia.
  treinar(t, 'B', 8, 'normal', 'normal', 'tatica', 10);
  assert.ok(Math.abs(t.taticas.get('B')!.progresso - 1) < 1e-9);
  jogouCom(t, 'B', 8);
  assert.ok(Math.abs(t.taticas.get('B')!.progresso - 1.2) < 1e-9);
  // Ciclo Curto com Leve: 0,6 × 0,5.
  treinar(t, 'B', 8, 'curto', 'leve', 'tatica', 10);
  assert.ok(Math.abs(t.taticas.get('B')!.progresso - 1.5) < 1e-9);
  const c: ComissaoClube = { ct: 10, base: 10, profissionais: [prof('Preparador', { Cond: 20 }), prof('Analista', { BP: 1 })] };
  t.foco = 'fisico';
  assert.ok(Math.abs(bonusDoFoco(t, c).menosGasto - 0.7) < 1e-9);
  t.foco = 'bolaParada';
  assert.deepEqual(bonusDoFoco(t, c), { menosGasto: 0, ensaiadaExtra: 0.5 });
});

test('memória com Gestão: comissão real chega ao motor; Europa com valor fixo', () => {
  const base = carregarBase();
  const europeu = base.clubes.find((c) => c.liga === 'europa')!.id;
  const ids = ['ALA', europeu];
  const entradas = Object.fromEntries(ids.map((id) => [id, { clube: base.clubes.find((c) => c.id === id)!, tecnico: base.tecnicos.find((t) => t.clubeId === id)! }]));
  const m = criarMemoria(base.elencos, ids, { comissoes: base.comissoes, entradas, tatica: base.tatica });
  assert.equal(m.gestao.get(europeu)!.comissao.fixo, 14);
  const p1 = prepararJogo(m, 'ALA', 7, 'serie-a', criarRng(1));
  assert.equal(p1.apoio!.entrosamento, 1);
  assert.equal(p1.apoio!.menosGasto, 0); // 1º jogo: sem ciclo de treino antes
  m.ultimoJogo.set('ALA', 7);
  const p2 = prepararJogo(m, 'ALA', 14, 'serie-a', criarRng(1));
  assert.ok(p2.apoio!.menosGasto >= 0.3); // foco Físico depois do entrosamento completo
  const tec = base.tecnicos.find((t) => t.clubeId === 'ALA')!;
  assert.equal(chaveTatica(tec), m.gestao.get('ALA')!.treino.taticas.keys().next().value);
  // Comissão copiada: a química que muda na memória não mexe na base.
  m.gestao.get('ALA')!.comissao.profissionais[0].quimica = 99;
  assert.notEqual(base.comissoes['ALA'][0].quimica, 99);
});

import { NOTA, fecharNotas, notaFinal, pontuarLance } from '../motor/notas.ts';
import { MORAL, alvoRespaldo, andarRespaldo, aplicar, deltaDoJogo, moralDoGrupo, quedaPorMinutos, repousar } from '../gestao/moral.ts';
import { simularPartida } from '../motor/partida.ts';
import { entradaTime } from '../terminal/carregar.ts';
import type { Escalado, TimeEmCampo } from '../motor/tipos.ts';

test('GDD 10: nota do jogador pelos lances', () => {
  const e = (vaga: string): Escalado => ({ nota: NOTA.inicial, vaga } as unknown as Escalado);
  const [atk, pas, gol, zag] = [e('CA'), e('MC'), e('GOL'), e('ZAG')];
  const t = [{ escalados: [atk, pas], participantes: [atk, pas] }, { escalados: [gol, zag], participantes: [gol, zag] }] as unknown as [TimeEmCampo, TimeEmCampo];
  pontuarLance(t, { tema: 'gol', lance: 'Gol comum', time: 0, jogador: atk, jogador2: pas, zona: 27 });
  assert.equal(notaFinal(atk), 7);
  assert.equal(notaFinal(pas), 6.6);
  assert.equal(notaFinal(gol), 5.7);
  assert.equal(notaFinal(zag), 5.7);
  pontuarLance(t, { tema: 'goleiro', lance: 'Defesa difícil', time: 1, jogador: atk, goleiro: gol, zona: 27, chance: 30 });
  assert.equal(notaFinal(gol), 6);
  assert.equal(notaFinal(atk), 6.7); // chance alta perdida
  fecharNotas(t, [1, 0]);
  assert.equal(notaFinal(gol), 6); // sofreu gol: sem bônus
  atk.nota = 15;
  assert.equal(notaFinal(atk), 10);
});

test('nota sai do jogo completo, entre 1 e 10', () => {
  const base = carregarBase();
  const r = simularPartida({ mandante: entradaTime(base, 'ALA'), visitante: entradaTime(base, 'BAR'), tatica: base.tatica, semente: 9 });
  const notas = r.times.flatMap((t) => t.participantes.map(notaFinal));
  assert.ok(notas.every((n) => n >= 1 && n <= 10));
  assert.ok(notas.some((n) => n !== 6));
});

test('GDD-gestao 3: moral do jogador e Respaldo', () => {
  const p = { motivacao: 10, quedaPsicologo: 0.8 };
  assert.equal(aplicar(60, 4, p), 64);
  assert.equal(aplicar(60, -4, p), 56.8);
  assert.equal(repousar(60), 58);
  assert.equal(repousar(54), 55);
  const j = { id: 'x', idade: 25, atributos: { DT: 15 }, nota: 15, qualidades: [] } as never;
  assert.equal(deltaDoJogo(j, { resultado: 1, grande: true, nota: 8, titular: true }, null), 4 * 1.5 + 3 + 1);
  assert.equal(deltaDoJogo(j, { resultado: -1, grande: false, nota: 5, titular: false }, 'Linha-dura'), -3 - 3);
  assert.equal(quedaPorMinutos(j, 3, new Set(['x']), 'Paizão'), -3 * 0.75);
  assert.equal(quedaPorMinutos(j, 2, new Set(['x']), null), 0);
  // Exemplo do GDD: moral do grupo 40 e Gestão de Grupo 12 dão alvo 44.
  const tec = { trabalho: { 'Gestão de Grupo': 12 }, reputacao: 10 } as never;
  assert.equal(alvoRespaldo(40, tec, [], false), 44);
  assert.equal(alvoRespaldo(40, tec, [55, 20], true), 59);
  assert.equal(andarRespaldo(50, 60), 52);
  const elenco = [{ id: 'a', qualidades: ['Líder de vestiário'] }, { id: 'b', qualidades: [] }] as never;
  assert.equal(moralDoGrupo(elenco, (id) => (id === 'a' ? 70 : 40), () => 0, 0), (70 * 2 + 40) / 3);
  assert.equal(MORAL.inicial, 60);
});
