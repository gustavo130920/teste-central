// Etapa 5, fatia 5b1: instruções individuais, batedores e táticas salvas do clube do jogador (GDD 3, 7 e 8; GDD-gestao 2).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escolherBatedor } from '../motor/bolaparada.ts';
import { montarTime, prepararTime } from '../motor/escalacao.ts';
import { ordemBatedores } from '../motor/penaltis.ts';
import { simularPartida } from '../motor/partida.ts';
import { opcoesDoJogador } from '../motor/plano.ts';
import { criarRng } from '../motor/rng.ts';
import type { EntradaTime } from '../motor/tipos.ts';
import { chaveTatica, criarTreino } from '../gestao/treino.ts';
import type { Memoria } from '../temporada/memoria.ts';
import { alvoDoTreino, apagarTatica, definirBatedor, definirInstrucao, estadoTatica, mudarEstiloFormacao, novaTatica, opcoesNaVaga, planoDoJogo, taticaAtiva, usarTatica } from '../temporada/taticaJogador.ts';
import { carregarBase, entradaTime } from '../terminal/carregar.ts';
import { criarMundo, jogarAno } from '../temporada/virada.ts';

const base = carregarBase();
const time = (ent: EntradaTime) => montarTime(0, ent, base.tatica, criarRng(1), false);

test('5b1: instrução do jogador entra no lugar do melhor encaixe; inválida na vaga cai no encaixe', () => {
  const ent = entradaTime(base, 'ALA');
  const t0 = time(ent);
  const e = t0.escalados.find((x) => x !== t0.goleiro && opcoesDoJogador(x.vaga, 'Com', base.tatica.instrucoes, t0.padrao, 4).length > 1)!;
  const outra = opcoesDoJogador(e.vaga, 'Com', base.tatica.instrucoes, t0.padrao, 4).find((i) => i.id !== e.instrCom?.id)!;
  const t1 = time({ ...ent, instrucoes: { [e.j.id]: { Com: outra.id } } });
  assert.equal(t1.escalados.find((x) => x.j.id === e.j.id)!.instrCom!.id, outra.id);
  // Instrução de outra posição: ignorada.
  const deOutraPosicao = base.tatica.instrucoes.find((i) => i.fase === 'Com' && i.posicao !== outra.posicao)!;
  const t2 = time({ ...ent, instrucoes: { [e.j.id]: { Com: deOutraPosicao.id } } });
  assert.equal(t2.escalados.find((x) => x.j.id === e.j.id)!.instrCom?.id, e.instrCom?.id);
});

test('5b1: instrução que exige Linha Alta sai com a linha baixa e volta quando a linha sobe', () => {
  const exigente = base.tatica.instrucoes.find((i) => i.exige === 'Linha Alta')!;
  const achar = (id: string) => {
    const ent = entradaTime(base, id);
    const t = time({ ...ent, padrao: { linha: 'Alta' } });
    return { ent, t, e: t.escalados.find((x) => opcoesDoJogador(x.vaga, exigente.fase, base.tatica.instrucoes, t.padrao, 4).includes(exigente)) };
  };
  const { ent, t, e } = base.clubes.filter((c) => !c.reserva).map((c) => achar(c.id)).find((x) => x.e)!;
  assert.ok(e);
  const ins = base.tatica.instrucoes.find((i) => i.exige === 'Linha Alta' && opcoesDoJogador(e.vaga, i.fase, base.tatica.instrucoes, t.padrao, 4).includes(i))!;
  const t1 = time({ ...ent, padrao: { linha: 'Alta' }, instrucoes: { [e.j.id]: { [ins.fase]: ins.id } } });
  const e1 = t1.escalados.find((x) => x.j.id === e.j.id)!;
  const campo = ins.fase === 'Com' ? 'instrCom' : 'instrSem';
  assert.equal(e1[campo]!.id, ins.id);
  t1.padrao = { ...t1.padrao, linha: 'Baixa' };
  prepararTime(t1, base.tatica);
  assert.notEqual(e1[campo]?.id, ins.id);
  t1.padrao = { ...t1.padrao, linha: 'Alta' };
  prepararTime(t1, base.tatica);
  assert.equal(e1[campo]!.id, ins.id);
});

test('5b1: batedor da tática cobra se está em campo; fora dele, o maior BP; abre a disputa de pênaltis', () => {
  const ent = entradaTime(base, 'ALA');
  const t0 = time(ent);
  const maior = escolherBatedor(t0);
  const outro = t0.escalados.find((x) => x !== maior && x !== t0.goleiro)!;
  const t = time({ ...ent, batedores: { penalti: outro.j.id, falta: 'ninguem' } });
  assert.equal(escolherBatedor(t, 'penalti').j.id, outro.j.id);
  assert.equal(escolherBatedor(t, 'falta').j.id, maior.j.id);
  assert.equal(escolherBatedor(t, 'escanteio').j.id, maior.j.id);
  assert.equal(ordemBatedores(t)[0].j.id, outro.j.id);
});

test('5b1: partida sem instruções nem batedores é a mesma de antes; com eles, roda até o fim', () => {
  const a = entradaTime(base, 'ALA');
  const b = entradaTime(base, 'BAR');
  const r1 = simularPartida({ mandante: a, visitante: b, tatica: base.tatica, semente: 7 });
  const r2 = simularPartida({ mandante: { ...a, instrucoes: {}, batedores: {} }, visitante: b, tatica: base.tatica, semente: 7 });
  assert.deepEqual(r1.placar, r2.placar);
  assert.deepEqual(r1.estatisticas, r2.estatisticas);
  const t0 = time(a);
  const r3 = simularPartida({ mandante: { ...a, batedores: { penalti: t0.escalados[5].j.id, escanteio: t0.escalados[6].j.id } }, visitante: b, tatica: base.tatica, semente: 7 });
  assert.equal(r3.placar.length, 2);
});

function memoriaFalsa(): Memoria {
  const tecnico = { ...base.tecnicos.find((t) => t.clubeId === 'ALA')! };
  const semanas = base.tatica.estilos.find((s) => s.nome === tecnico.estilo)!.entrosamentoSemanas;
  return { gestao: new Map([['ALA', { tecnico, semanas, treino: criarTreino(chaveTatica(tecnico), semanas) }]]) } as unknown as Memoria;
}

test('5b1: até 3 táticas, usar, apagar e escolher qual treinar', () => {
  const mem = memoriaFalsa();
  const g = mem.gestao.get('ALA')!;
  const s = estadoTatica(mem, 'ALA');
  assert.equal(s.taticas.length, 1);
  assert.equal(novaTatica(mem, 'ALA'), null);
  assert.equal(s.ativa, 1);
  const outroEstilo = base.tatica.estilos.find((e) => e.nome !== g.tecnico.estilo)!.nome;
  mudarEstiloFormacao(mem, 'ALA', base.tatica, { estilo: outroEstilo, formacaoComBola: g.tecnico.formacaoComBola, formacaoSemBola: g.tecnico.formacaoSemBola });
  assert.equal(g.tecnico.estilo, outroEstilo);
  assert.equal(novaTatica(mem, 'ALA', 'Reserva'), null);
  assert.ok(novaTatica(mem, 'ALA'));
  assert.ok(apagarTatica(mem, 'ALA', s.ativa));
  usarTatica(mem, 'ALA', base.tatica, 0);
  assert.notEqual(g.tecnico.estilo, outroEstilo);
  s.treinar = 1;
  assert.equal(alvoDoTreino(mem, 'ALA', base.tatica).chave, chaveTatica(s.taticas[1]));
  assert.equal(apagarTatica(mem, 'ALA', 1), null);
  assert.equal(s.taticas.length, 2);
  assert.equal(s.treinar, 0);
  assert.equal(s.taticas[1].nome, 'Reserva');
});

test('5b1: instruções e batedores da ativa vão para o plano do jogo; tela lista as opções com a do auxiliar', () => {
  const mem = memoriaFalsa();
  assert.deepEqual(planoDoJogo(mem, 'ALA'), {});
  definirInstrucao(mem, 'ALA', 'X1', 'Com', 'I1');
  definirInstrucao(mem, 'ALA', 'X1', 'Sem', 'I2');
  definirInstrucao(mem, 'ALA', 'X1', 'Com', null);
  definirBatedor(mem, 'ALA', 'penalti', 'X2');
  assert.deepEqual(planoDoJogo(mem, 'ALA'), { instrucoes: { X1: { Sem: 'I2' } }, batedores: { penalti: 'X2' } });
  definirInstrucao(mem, 'ALA', 'X1', 'Sem', null);
  assert.equal(planoDoJogo(mem, 'ALA').instrucoes, undefined);
  const j = base.elencos.ALA.find((x) => x.posicao === 'MC')!;
  const ops = opcoesNaVaga(j, 'MC', 'Com', base.tatica, taticaAtiva(mem, 'ALA'));
  assert.ok(ops.length > 0);
  assert.equal(ops.filter((o) => o.auxiliar).length, 1);
  assert.ok(ops.every((o, i) => i === 0 || ops[i - 1].encaixe >= o.encaixe));
});

test('5b1: no ano, o foco Tática vai para a tática marcada para treino', () => {
  const m = criarMundo(base);
  const tec = m.tecnicos.find((t) => t.clubeId === 'ABA')!;
  tec.humano = true;
  const outro = base.tatica.estilos.find((e) => e.nome !== tec.estilo)!.nome;
  let chaveB = '';
  let jogou = '';
  m.jogador = {
    clube: 'ABA',
    treino: () => ({ carga: 'normal', foco: 'tatica' }),
    escalar: (_p, mem) => {
      const s = estadoTatica(mem, 'ABA');
      if (s.taticas.length === 1) {
        novaTatica(mem, 'ABA', 'B');
        const g = mem.gestao.get('ABA')!.tecnico;
        mudarEstiloFormacao(mem, 'ABA', base.tatica, { estilo: outro, formacaoComBola: g.formacaoComBola, formacaoSemBola: g.formacaoSemBola });
        chaveB = chaveTatica(s.taticas[1]);
        s.treinar = 1;
        usarTatica(mem, 'ABA', base.tatica, 0);
        jogou = chaveTatica(s.taticas[0]);
      }
      return planoDoJogo(mem, 'ABA');
    },
  };
  jogarAno(m, 3);
  const g = m.memoria!.gestao.get('ABA')!;
  assert.equal(chaveTatica(g.tecnico), jogou);
  const semanasB = base.tatica.estilos.find((e) => e.nome === outro)!.entrosamentoSemanas;
  assert.ok((g.treino.taticas.get(chaveB)?.progresso ?? 0) >= semanasB * 0.99, 'tática B treinada até completar');
});
