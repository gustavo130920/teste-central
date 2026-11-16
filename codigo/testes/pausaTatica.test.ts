// Etapa 5, fatia 5b2: formação, instrução individual e Plano B na pausa (GDD-motor 7).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { simularPartida } from '../motor/partida.ts';
import { custoRadical, custoTroca } from '../motor/pausas.ts';
import { opcoesDoJogador } from '../motor/plano.ts';
import type { AjustePausa, ControlePausa, EntradaTime, InfoPausa, TimeEmCampo } from '../motor/tipos.ts';
import { carregarBase, entradaTime } from '../terminal/carregar.ts';

const base = carregarBase();
const jogo = (controle?: ControlePausa, mandante: EntradaTime = entradaTime(base, 'ALA')) =>
  simularPartida({ mandante, visitante: entradaTime(base, 'BAR'), tatica: base.tatica, semente: 11, ...(controle ? { controle } : {}) });
const ctl = (pausa: (i: InfoPausa) => AjustePausa | null): ControlePausa => ({ lado: 0, analista: { profundidade: 15, precisao: 20, aoVivo: 20 }, leitura: 15, pausa });
const outraFormacao = (t: TimeEmCampo): string => base.tatica.formacoes.find((f) => f.nome !== t.formacaoComBola)!.nome;

test('5b2: troca de formação põe os mesmos jogadores nas vagas da formação nova e conta como radical', () => {
  let nova = '';
  let ids: string[] = [];
  const r = jogo(ctl((i) => {
    if (i.minuto !== 45) return {};
    nova = outraFormacao(i.time);
    ids = i.time.escalados.map((e) => e.j.id).sort();
    return { formacaoComBola: nova, formacaoSemBola: nova };
  }));
  const t = r.times[0];
  assert.equal(t.formacaoComBola, nova);
  const aj = r.pausas[2].times[0].ajustes;
  assert.ok(aj.some((x) => x.startsWith(`formação ${nova}`)), aj.join());
  assert.ok(!aj.some((x) => x.startsWith('Plano B')), 'sem mapa de táticas, sem Plano B');
  // Ninguém entrou nem saiu pela troca de formação: as vagas novas batem com as peças da formação.
  const pecas = base.tatica.formacoes.find((f) => f.nome === nova)!.pecas.map((p) => p.posicao).sort();
  const emCampo = t.escalados.filter((e) => ids.includes(e.j.id));
  if (emCampo.length === 11) assert.deepEqual(t.escalados.map((e) => e.vaga).sort(), pecas);
});

test('5b2: instrução individual na pausa vale no bloco seguinte e null devolve ao auxiliar', () => {
  let alvo = '';
  let escolhida = '';
  let viu = '';
  let voltou = '';
  jogo(ctl((i) => {
    const t = i.time;
    if (i.minuto === 15) {
      const zag = t.escalados.filter((e) => e.vaga === 'ZAG').length;
      for (const e of t.escalados) {
        if (e === t.goleiro) continue;
        const op = opcoesDoJogador(e.vaga, 'Com', base.tatica.instrucoes, t.padrao, zag).find((ins) => ins.id !== e.instrCom?.id);
        if (op) { alvo = e.j.id; escolhida = op.id; voltou = e.instrCom?.id ?? ''; break; }
      }
      return { instrucoes: { [alvo]: { Com: escolhida } } };
    }
    const e = t.escalados.find((x) => x.j.id === alvo);
    if (i.minuto === 30) { viu = e?.instrCom?.id ?? ''; return { instrucoes: { [alvo]: { Com: null } } }; }
    if (i.minuto === 45) assert.equal(e?.instrCom?.id ?? '', voltou, 'null = melhor encaixe de novo');
    return {};
  }));
  assert.ok(escolhida);
  assert.equal(viu, escolhida);
});

test('5b2: Plano B corta a perda radical pela metade e o motor usa o entrosamento da tática nova', () => {
  const t = { tecnicoExpulso: false, tecnico: { trabalho: { 'Ajuste nas Pausas': 10 } } } as never;
  assert.equal(custoRadical(t), 0.75);
  assert.equal(custoTroca(t, 0.85), 0.875);
  assert.equal(custoTroca(t, 0.84), 0.75);
  assert.equal(custoTroca(t, undefined), 0.75);

  const ent = entradaTime(base, 'ALA');
  const nova = base.tatica.formacoes.find((f) => f.nome !== ent.tecnico.formacaoComBola)!.nome;
  const chaveNova = `${ent.tecnico.estilo}|${nova}|${nova}`;
  const comMapa = (taticas: Record<string, number>): EntradaTime => ({ ...ent, apoio: { ...ent.apoio, entrosamento: 1, taticas } });
  const trocar = ctl((i) => (i.minuto === 45 ? { formacaoComBola: nova, formacaoSemBola: nova } : {}));
  const treinada = jogo(trocar, comMapa({ [chaveNova]: 0.9 }));
  assert.equal(treinada.times[0].apoio.entrosamento, 0.9);
  assert.ok(treinada.pausas[2].times[0].ajustes.includes('Plano B (entrosamento 90%)'), treinada.pausas[2].times[0].ajustes.join());
  const crua = jogo(trocar, comMapa({}));
  assert.equal(crua.times[0].apoio.entrosamento, 0.7, 'tática sem treino: entrosamento mínimo');
  assert.ok(!crua.pausas[2].times[0].ajustes.some((x) => x.startsWith('Plano B')));
});

test('5b2: com o mapa de táticas e sem ajuste radical, o jogo é o mesmo da IA', () => {
  const ent = entradaTime(base, 'ALA');
  const comMapa: EntradaTime = { ...ent, apoio: { ...ent.apoio, taticas: { x: 0.9 } } };
  const a = jogo(undefined, ent);
  const b = jogo(ctl(() => null), comMapa);
  assert.deepEqual(b.placar, a.placar);
  assert.deepEqual(b.pausas, a.pausas);
});
