// Etapa 5, fatia 5d2: partida e ciclo em passos (param no pré-jogo e na pausa e retomam com a resposta).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { carregarBase, entradaTime } from '../terminal/carregar.ts';
import { partidaEmPassos, simularPartida } from '../motor/partida.ts';
import type { AjustePausa, InfoPausa } from '../motor/tipos.ts';
import { criarMundo, iniciarAno } from '../temporada/virada.ts';
import type { Mundo } from '../temporada/virada.ts';
import { assumirClube, criarTecnicoDoJogador } from '../temporada/jogador.ts';
import type { PedidoEscalacao } from '../temporada/jogador.ts';
import { avancarCiclo, cicloEmPassos } from '../temporada/temporada.ts';
import type { JogoDisputado, RespostaDoDia } from '../temporada/temporada.ts';
import { planoDoJogo } from '../temporada/taticaJogador.ts';
import type { Memoria } from '../temporada/memoria.ts';

const base = carregarBase();
/** Resposta fixa na pausa: aceita a 1ª sugestão, cobra no intervalo e troca o mais cansado aos 60. */
const responder = (i: InfoPausa): AjustePausa | null => {
  if (i.minuto === 15) return null;
  const aj: AjustePausa = { ...(i.sugestoes.length ? { sugestoes: [0] } : {}), ...(i.intervalo ? { fala: 'Cobrar' as const } : {}) };
  if (i.minuto === 60 && i.trocasRestantes && i.time.banco.length) {
    const sai = [...i.time.escalados].filter((e) => e !== i.time.goleiro).sort((a, b) => a.energia - b.energia)[0];
    aj.trocas = [[sai.j.id, i.time.banco[0].id]];
  }
  return aj;
};

test('5d2: partida em passos dá o mesmo resultado da interface síncrona', () => {
  const ent = () => ({ mandante: entradaTime(base, 'ALA'), visitante: entradaTime(base, 'BAR'), tatica: base.tatica, semente: 21 });
  const ctl = { lado: 0 as const, analista: { profundidade: 15, precisao: 20, aoVivo: 20 }, leitura: 15 };
  const a = simularPartida({ ...ent(), controle: { ...ctl, pausa: responder } });
  const it = partidaEmPassos({ ...ent(), controle: ctl });
  let p = it.next();
  let pausas = 0;
  while (!p.done) { pausas += 1; assert.ok(p.value.estatisticas, 'estatísticas na pausa'); p = it.next(responder(p.value)); }
  assert.equal(pausas, 5);
  assert.deepEqual(p.value.placar, a.placar);
  assert.deepEqual(p.value.lances.map((l) => `${l.minuto} ${l.lance} ${l.jogador}`), a.lances.map((l) => `${l.minuto} ${l.lance} ${l.jogador}`));
});

const CLUBE = 'ABA';
function mundo(): Mundo {
  const b = carregarBase();
  const m = criarMundo(b);
  const t = criarTecnicoDoJogador({ nome: 'Teste', origem: 'Estudioso', estilo: 'Ginga', formacaoComBola: '4-4-2', formacaoSemBola: '4-4-2', temperamento: 'Gestor' });
  assumirClube(m.tecnicos, m.clubes.find((c) => c.id === CLUBE)!, t);
  m.jogador = { clube: CLUBE };
  return m;
}
const escalar = (p: PedidoEscalacao, mem: Memoria) => ({ ...planoDoJogo(mem, CLUBE), titulares: p.elenco.slice(0, 11).map((j) => j.id) });
const placares = (js: JogoDisputado[]): string[] => js.map((j) => `${j.competicao} ${j.dia} ${j.mandante}-${j.visitante} ${j.placar.join('x')} ${JSON.stringify(j.penaltis ?? null)}`);
const CICLOS = 18;

test('5d2: ciclos em passos (pré-jogo e pausas respondidos de fora) dão os mesmos placares dos ganchos síncronos', () => {
  const a = mundo();
  const sa = iniciarAno(a, 9);
  a.jogador = { clube: CLUBE, escalar, pausa: (i) => responder(i) };
  const ja: JogoDisputado[] = [];
  for (let c = 0; c < CICLOS; c++) ja.push(...avancarCiclo(sa, { jogador: a.jogador }));

  const b = mundo();
  const sb = iniciarAno(b, 9);
  const jb: JogoDisputado[] = [];
  const pedidos = { escalar: 0, pausa: 0 };
  for (let c = 0; c < CICLOS; c++) {
    const it = cicloEmPassos(sb, { jogador: b.jogador, interativo: true });
    let p = it.next();
    while (!p.done) {
      const v = p.value;
      pedidos[v.tipo] += 1;
      const r: RespostaDoDia = v.tipo === 'escalar' ? escalar(v.pedido, sb.memoria) : responder(v.info);
      p = it.next(r);
    }
    jb.push(...p.value);
  }
  assert.ok(pedidos.escalar >= 5 && pedidos.pausa > pedidos.escalar * 4, JSON.stringify(pedidos));
  assert.deepEqual(placares(jb), placares(ja));
});
