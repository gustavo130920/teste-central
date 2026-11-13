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

// ---------- 3ª fatia: evolução, envelhecimento, base e aposentadorias ----------
import { EVOLUCAO, aplicarPontos, chanceEnvelhecer, criarEvolucao, deltaTrabalho, ganho, mediaChaves, resultadoPerfil } from '../gestao/evolucao.ts';
import { BASE, chanceAposentar, chanceAposentarPessoa, escolherSubidas, evoluirPessoa, potencialDaSafra, quantosNaSafra } from '../gestao/base.ts';
import { criarMundo, jogarAno, virar } from '../temporada/virada.ts';

const jogadorTeste = (over: Partial<import('../motor/dados.ts').Jogador> = {}) => {
  const b = carregarBase();
  const j = Object.values(b.elencos).flat().find((x) => x.posicao === 'MC')!;
  return { ...j, atributos: { ...j.atributos }, qualidades: [...j.qualidades], defeitos: [...j.defeitos], ...over };
};

test('GDD-gestao 5: ganho por idade, minutos, comissão, moral e (Pot − Nota) ÷ 2', () => {
  const f = { minutos: 0.6, treino: 1, treinoTecnico: 10, jovens: 10, exemplo: false, moral: 55 };
  // 18 anos, Pot 16, nota 9: 0,6 × 1,2 × 1 × (0,8 + 0,2) × (0,8 + 0,2) × 1 × 1.
  assert.ok(Math.abs(ganho(jogadorTeste({ idade: 18, nota: 9, potencial: 16 }), f) - 0.72) < 1e-9);
  // Pot − Nota = 1: metade; 29 anos: zero; na base: × 1,2 × 0,6.
  assert.ok(Math.abs(ganho(jogadorTeste({ idade: 23, nota: 12, potencial: 13 }), f) - 0.35 * 1.2 * 0.5) < 1e-9);
  assert.equal(ganho(jogadorTeste({ idade: 29, nota: 10, potencial: 15 }), f), 0);
  assert.ok(Math.abs(ganho(jogadorTeste({ idade: 17, nota: 8, potencial: 15 }), { ...f, minutos: null }) - 0.6 * 1.2 * 0.6) < 1e-9);
  // Moral 71+: × 1,1; Exemplo profissional: × 1,1 até 21; menos de 10% dos minutos: × 0,5.
  const j = jogadorTeste({ idade: 20, nota: 9, potencial: 16 });
  assert.ok(Math.abs(ganho(j, { ...f, moral: 80, exemplo: true, minutos: 0.05 }) / ganho(j, f) - (1.1 * 1.1 * 0.5) / 1.2) < 1e-9);
});

test('pontos viram +1 em atributos e a nota anda pela variação das chaves, sem passar do Potencial', () => {
  const j = jogadorTeste({ idade: 18, nota: 10, potencial: 12 });
  const s = criarEvolucao(j);
  const media = mediaChaves(j);
  s.pontos = 30;
  const n = aplicarPontos(j, s, 'fisico', criarRng(7));
  assert.ok(n > 0 && s.pontos < 1);
  assert.ok(mediaChaves(j) > media);
  assert.equal(j.nota, 12); // limitada ao Potencial
});

test('envelhecimento, perfis e resultado aos 22', () => {
  assert.equal(chanceEnvelhecer(29, false, 10), 0);
  assert.equal(chanceEnvelhecer(33, false, 10), 20);
  assert.equal(chanceEnvelhecer(33, true, 10), 10); // goleiro: idade − 3
  assert.ok(Math.abs(chanceEnvelhecer(36, false, 20) - 40 * 0.75) < 1e-9);
  // Psicólogo 16, coordenador 15, mentor, minutos, grupo 62: 3 + 1 + 2 + 1 + 1.
  assert.equal(deltaTrabalho({ naBase: false, psicologo: 16, coordenador: 15, mentor: true, minutos: 0.3, grupo: 62 }), 8);
  assert.equal(deltaTrabalho({ naBase: true, psicologo: 10, coordenador: 10, mentor: true, minutos: 0, grupo: 30 }), -1 + 1 - 2);
  const bem = jogadorTeste({ perfilJovem: 'Marrento', qualidades: [], defeitos: [], potencial: 15, nota: 12 });
  const rng = criarRng(1);
  const r = resultadoPerfil(bem, 95, rng);
  if (r === 'bem') { assert.equal(bem.potencial, 16); assert.ok(['Incendiário', 'Decisivo'].includes(bem.qualidades[0])); }
});

test('base: safra, joia, subidas e aposentadorias', () => {
  assert.equal(quantosNaSafra(14), 5);
  assert.equal(quantosNaSafra(4), 3);
  const rng = criarRng(3);
  let joias = 0;
  for (let i = 0; i < 2000; i++) { const p = potencialDaSafra(10, 10, rng); if (p.joia) { joias += 1; assert.ok(p.pot >= 17); } else assert.ok(p.pot <= 16); }
  assert.ok(joias > 30 && joias < 90); // 3%
  const elenco = Array.from({ length: 22 }, (_, i) => jogadorTeste({ id: `E${i}`, posicao: i < 2 ? 'GOL' : 'MC', nota: 12 }));
  const base = [jogadorTeste({ id: 'B1', posicao: 'CA', nota: 8 }), jogadorTeste({ id: 'B2', posicao: 'MC', nota: 11 }), jogadorTeste({ id: 'B3', posicao: 'GOL', nota: 13 })];
  const sobe = escolherSubidas(elenco, base, 1).map((j) => j.id);
  assert.ok(sobe.includes('B1')); // CA em falta sobe primeiro
  assert.ok(!sobe.includes('B2')); // MC muito acima do alvo
  assert.equal(chanceAposentar(jogadorTeste({ idade: 32, nota: 12 }), false, 0.6), 0);
  assert.equal(chanceAposentar(jogadorTeste({ idade: 35, nota: 8 }), true, 0), Math.min(100, 30 * 2 * 1.5));
  assert.equal(chanceAposentar(jogadorTeste({ idade: 37, nota: 12, posicao: 'GOL' }), false, 0.6), 5); // 37 − 3 = 34: 10% × 0,5
  assert.equal(chanceAposentarPessoa(71, true), 17.5);
  const at = { Lei: 10 };
  evoluirPessoa(at, 30, 16, { n: () => 0.55, int: () => 0, pct: () => false } as never);
  assert.equal(at.Lei, 11); // 50 + 10 do CT
  assert.equal(BASE.prazo, 20);
});

test('carreira com Gestão: 2 anos com evolução, safra e virada de pessoas', () => {
  const m = criarMundo(carregarBase());
  const idade = m.elencos['GUA'][0].idade;
  const id = m.elencos['GUA'][0].id;
  const r1 = virar(m, jogarAno(m, 11));
  assert.ok(r1.pessoas && r1.safra! > 0);
  const j = m.elencos['GUA'].find((x) => x.id === id);
  if (j) assert.equal(j.idade, idade + 1);
  for (const e of Object.values(m.elencos)) {
    assert.ok(e.length >= BASE.elencoMin && e.length <= BASE.elencoMax);
    assert.ok(e.filter((x) => x.posicao === 'GOL').length >= BASE.goleirosMin);
  }
  assert.ok(m.livres.length >= 30);
  assert.ok(m.tecnicos.filter((t) => t.clubeId === null).length >= 15);
  virar(m, jogarAno(m, 11));
  assert.ok(m.memoria!.evo.pontos > 0 && EVOLUCAO.periodoDias === 28);
});
