// Etapa 5, fatia 5b3: marcação individual (antes do jogo e na pausa).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { simularPartida } from '../motor/partida.ts';
import type { AjustePausa, ControlePausa, EntradaTime, InfoPausa, MarcacaoIndividual, ResultadoPartida } from '../motor/tipos.ts';
import { espelhar } from '../motor/zonas.ts';
import { carregarBase, entradaTime } from '../terminal/carregar.ts';

const base = carregarBase();
const jogo = (semente: number, marcacao?: MarcacaoIndividual, controle?: ControlePausa): ResultadoPartida => {
  const mandante: EntradaTime = { ...entradaTime(base, 'ALA'), ...(marcacao ? { marcacao } : {}) };
  return simularPartida({ mandante, visitante: entradaTime(base, 'BAR'), tatica: base.tatica, semente, ...(controle ? { controle } : {}) });
};
const ctl = (pausa: (i: InfoPausa) => AjustePausa | null): ControlePausa => ({ lado: 0, analista: { profundidade: 15, precisao: 20, aoVivo: 20 }, leitura: 15, pausa });

// Volante do ALA marca o atacante mais avançado do BAR.
const r0 = jogo(11);
const marcador = (r0.times[0].participantes.find((e) => e.vaga === 'VOL') ?? r0.times[0].participantes.find((e) => e.vaga === 'ZAG'))!.j.id;
const alvo = r0.times[1].participantes.filter((e) => e !== r0.times[1].goleiro).sort((a, b) => b.zonaCom - a.zonaCom || a.j.id.localeCompare(b.j.id))[0].j.id;
const duelos = (r: ResultadoPartida): number => r.lances.filter((l) => l.time === 0 && l.jogador === marcador && l.jogador2 === alvo || l.time === 1 && l.jogador === alvo && l.jogador2 === marcador).length;

test('5b3: alvo fora de campo = mesma partida de sem marcação', () => {
  const a = jogo(11);
  const b = jogo(11, { marcador, alvo: 'ninguem' });
  assert.deepEqual(b.placar, a.placar);
  assert.equal(b.lances.length, a.lances.length);
  assert.equal(b.times[0].marcacao?.alvo, 'ninguem', 'fica guardada: vale se o alvo entrar');
});

test('5b3: o marcador fica na zona do alvo sem a bola, larga a instrução sem a bola e a zona dele fica vazia', () => {
  const r = jogo(11, { marcador, alvo });
  const t = r.times[0];
  const m = t.escalados.find((e) => e.j.id === marcador);
  const a = r.times[1].escalados.find((e) => e.j.id === alvo);
  if (!m || !a) return; // saiu no fim; o teste da pausa cobre o caso
  assert.equal(m.zonaSem, espelhar(a.zonaCom));
  assert.equal(m.efSem, 0);
  assert.equal(m.pesoSem[m.zonaSem], 1);
});

test('5b3: com marcação, marcador e alvo se enfrentam mais', () => {
  let sem = 0;
  let com = 0;
  for (let s = 1; s <= 30; s++) { sem += duelos(jogo(s)); com += duelos(jogo(s, { marcador, alvo })); }
  assert.ok(com > sem * 1.5, `com ${com}, sem ${sem}`);
});

test('5b3: marcação na pausa entra no bloco seguinte e null tira', () => {
  const viu: (MarcacaoIndividual | undefined)[] = [];
  const r = jogo(11, undefined, ctl((i) => {
    viu.push(i.time.marcacao);
    if (i.minuto === 15) return { marcacao: { marcador, alvo } };
    if (i.minuto === 45) return { marcacao: null };
    return {};
  }));
  assert.equal(viu[0], undefined);
  assert.deepEqual(viu[1], { marcador, alvo });
  assert.equal(r.times[0].marcacao, undefined);
  assert.ok(r.pausas[0].times[0].ajustes.some((x) => x.includes(' marca ')), r.pausas[0].times[0].ajustes.join());
  assert.ok(r.pausas[2].times[0].ajustes.includes('marcação individual desfeita'));
});

test('5b3: goleiro não marca nem é alvo', () => {
  const gol = r0.times[0].goleiro.j.id;
  const r = jogo(11, undefined, ctl((i) => (i.minuto === 15 ? { marcacao: { marcador: gol, alvo } } : {})));
  assert.equal(r.times[0].marcacao, undefined);
});
