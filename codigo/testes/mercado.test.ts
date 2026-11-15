import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Jogador } from '../motor/dados.ts';
import {
  MERCADO, chanceDoClube, chanceDoJogador, estimar, janelaDaSemana, margemNota, margemPot, papelNoElenco, pedidoDoClube, pedidoSalarial,
  politica, posicaoMaisFraca, reacaoAProposta, salarioReferencia, valorDeMercado,
} from '../gestao/mercado.ts';
import { carregarBase } from '../terminal/carregar.ts';
import { criarMundo, jogarAno, virar } from '../temporada/virada.ts';

const jog = (id: string, posicao: string, nota: number, x: Partial<Jogador> = {}): Jogador =>
  ({ id, posicao, nota, potencial: nota, idade: 25, atributos: {}, qualidades: [], defeitos: [], salario: 100, valor: 5, contrato: 2027, clubeId: 'A', ...x } as unknown as Jogador);

test('valor: faixas do gerador-elenco, região, jovem, veterano, contrato curto e forma', () => {
  const base = { pot: 12, idade: 25, regiao: 'brasil' as const, semanasDeContrato: 100, notas: [] };
  assert.ok(Math.abs(valorDeMercado({ ...base, nota: 13.5, pot: 13.5 }) - 12) < 0.01);
  assert.ok(valorDeMercado({ ...base, nota: 16, pot: 16 }) > 35 && valorDeMercado({ ...base, nota: 16, pot: 16 }) < 80);
  const v = valorDeMercado({ ...base, nota: 12 });
  assert.ok(Math.abs(valorDeMercado({ ...base, nota: 12, regiao: 'europa' }) - v * 2) < 0.02);
  assert.ok(valorDeMercado({ ...base, nota: 12, idade: 19, pot: 17 }) >= v * 1.5);
  assert.ok(Math.abs(valorDeMercado({ ...base, nota: 12, idade: 33 }) - v * 0.3) < 0.02);
  assert.ok(Math.abs(valorDeMercado({ ...base, nota: 12, semanasDeContrato: 20 }) - v * 0.6) < 0.02);
  assert.ok(Math.abs(valorDeMercado({ ...base, nota: 12, notas: [8, 8, 8, 8] }) - v * 1.2) < 0.02);
});

test('neblina: margem ± 4 sem relatório, (21 − Precisão) ÷ 4 com um, metade com dois; dono vê exato', () => {
  assert.equal(margemNota(0, 15), 4);
  assert.equal(margemNota(1, 13), 2);
  assert.equal(margemNota(2, 13), 1);
  assert.equal(margemPot(0, 13), null);
  assert.equal(margemPot(1, 15), 2);
  const j = jog('X', 'CA', 14, { potencial: 17 });
  assert.deepEqual(estimar('B', j, undefined, 10, 10, true), { nota: 14, pot: 17 });
  const e = estimar('B', j, { atual: 0, pot: 0 }, 10, 10, false);
  assert.ok(Math.abs(e.nota - 14) <= 4 && e.pot === e.nota);
  // O erro é fixo por par: repetir dá o mesmo.
  assert.deepEqual(estimar('B', j, { atual: 1, pot: 1 }, 10, 10, false), estimar('B', j, { atual: 1, pot: 1 }, 10, 10, false));
});

test('negociação: pedido e chance do clube e do jogador (GDD-gestao 6)', () => {
  assert.ok(Math.abs(pedidoDoClube({ valor: 10, papel: 'titular', negociacao: 10, influente: false, vendedorEuropeu: false }) - 11.7) < 1e-9);
  assert.ok(Math.abs(pedidoDoClube({ valor: 10, papel: 'reserva', negociacao: 0, influente: true, vendedorEuropeu: true }) - 14.85) < 1e-9);
  const sem = { titular: false, rival: false, caixaNegativo: false, querSair: false, europaTitularJovem: false };
  assert.equal(chanceDoClube(10, 10, sem), 50);
  assert.ok(Math.abs(chanceDoClube(11, 10, { ...sem, titular: true, rival: true }) - 40) < 1e-9);
  assert.equal(chanceDoClube(20, 10, sem), 95);
  assert.equal(chanceDoClube(5, 10, sem), 5);
  assert.ok(Math.abs(pedidoSalarial(100, 100, 10) - 120) < 1e-9);
  // O salário atual fica preso entre 1 e 1,5 vez a referência (PROVISORIO).
  assert.ok(Math.abs(pedidoSalarial(5, 100, 0) - 110) < 1e-9);
  assert.ok(Math.abs(pedidoSalarial(1000, 100, 0) - 165) < 1e-9);
  const aj = { reputacaoDestino: 15, reputacaoAtual: 10, ambicao: 14, papel: 'titular' as const, libertadores: true, memoria: 1 };
  assert.equal(chanceDoJogador(1, 1, aj), Math.min(95, 50 + 5 * 3 * 1.4 + 10 + 2 + 5));
  assert.ok(chanceDoJogador(1, 1, { ...aj, renovacao: { leal: true, parceiro: true } }) >= 95);
});

test('lealdade x ambição, política por perfil, janelas e referência salarial', () => {
  assert.equal(reacaoAProposta(12, 10), 'fica');
  assert.equal(reacaoAProposta(6, 10), 'aumento');
  assert.equal(reacaoAProposta(4, 10), 'sai');
  assert.equal(politica('Gigante rico').vende, 1.3);
  assert.equal(politica('Gigante endividado', true).vende, 1);
  assert.equal(politica('Pequeno sobrevivente').compra, false);
  assert.equal(politica('Formador').idadeMax, 23);
  assert.equal(janelaDaSemana(1), 0);
  assert.equal(janelaDaSemana(9), null);
  assert.equal(janelaDaSemana(29), 1);
  assert.ok(Math.abs(salarioReferencia(13.5, 'sul') - 100) < 0.01);
  assert.ok(Math.abs(salarioReferencia(13.5, 'brasil', true) - 140) < 0.01);
});

test('papel e posição mais fraca', () => {
  const el = [jog('G1', 'GOL', 15), jog('G2', 'GOL', 9), jog('Z1', 'ZAG', 14), jog('Z2', 'ZAG', 13), jog('C1', 'CA', 8)];
  assert.equal(papelNoElenco(el, el[0]), 'titular');
  assert.equal(papelNoElenco(el, el[1]), 'rotacao');
  // Sem laterais (falta conta 0), o grupo mais fraco é LAT.
  assert.equal(posicaoMaisFraca(el).grupo, 'LAT');
  // Equilíbrio: elenco no alvo da base (26); goleiro pior titular, mas com 3 goleiros o gol fica de fora.
  const alvo: [string, number][] = [['GOL', 3], ['ZAG', 5], ['LAT', 4], ['VOL', 3], ['MC', 3], ['MO', 2], ['PON', 3], ['CA', 3]];
  const cheio = alvo.flatMap(([p, n]) => Array.from({ length: n }, (_, i) => jog(`${p}${i}`, p, p === 'GOL' ? 5 : p === 'MO' ? 12 : 15)));
  assert.equal(posicaoMaisFraca(cheio).grupo, 'MO');
  assert.equal(posicaoMaisFraca(cheio.slice(1)).grupo, 'GOL');
  // Abaixo do mínimo vai na frente, mesmo com titulares melhores: 3 zagueiros (mínimo 4).
  assert.equal(posicaoMaisFraca(cheio.filter((j) => !['ZAG0', 'ZAG1'].includes(j.id))).grupo, 'ZAG');
  // Grupo no máximo fica de fora: 3 meias (máximo 3) com a pior nota; empate entre os outros fica com o 1º (ZAG).
  assert.equal(posicaoMaisFraca([...cheio, jog('MO9', 'MO', 12)]).grupo, 'ZAG');
  assert.equal(MERCADO.compras[0], 3);
});

test('carreira de 2 anos com mercado: contratos, transferências e Força', () => {
  const m = criarMundo(carregarBase());
  const t = jogarAno(m, 7);
  const mk = m.memoria!.mercado!;
  assert.ok(mk.transferencias.length > 0, 'houve negócios no ano');
  assert.ok(mk.contagem.renovacoes > 0, 'houve renovações');
  const r = virar(m, t);
  assert.ok(r.mercado && r.mercado.vencidos > 0, 'contratos vencidos viram livres');
  for (const [c, js] of Object.entries(m.elencos)) {
    assert.ok(js.length >= MERCADO.elenco.min, `${c} com ${js.length}`);
    for (const j of js) assert.equal(j.clubeId, c);
  }
  const ids = Object.values(m.elencos).flat().map((j) => j.id);
  assert.equal(new Set(ids).size, ids.length, 'ninguém em dois clubes');
  for (const e of m.europeus) assert.ok(m.elencos[e].length >= MERCADO.europa.elenco);
});
