// Etapa 5, fatia 5a2: comercial, empréstimos e obras do clube do jogador (GDD-gestao 7, 8 e 9).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Clube } from '../motor/dados.ts';
import type { FichaComercial, Marca } from '../gestao/financas.ts';
import { FINANCAS, chanceDesistir, criarConta, custoObra, fecharMes, fecharPatrocinio, lancarBilheteria, mudarMensalidade, ocupacao, propostasPatrocinio } from '../gestao/financas.ts';
import { criarRng } from '../motor/rng.ts';
import { carregarBase } from '../terminal/carregar.ts';
import { criarMundo, jogarAno, virar } from '../temporada/virada.ts';
import { amortizarDivida, estrutura, iniciarObra, limiteEmprestimo, mudarPrecos, tomarEmprestimo } from '../temporada/comercialJogador.ts';

const CLUBE = 'ABA';
const ficha = (x: Partial<FichaComercial> = {}): FichaComercial => ({
  clubeId: 'AAA', perfil: 'Tradicional médio', custoAnual: 13, folha: 700, comissao: 200, tecnico: 100, receita: 13, caixa: 5, divida: 10,
  tvFixa: 4, tvBonus: 2.5, orcamento: 1, teto: 800, cotas: [{ tipo: 'Máster', marca: 'M1', valor: 2.6, ate: 2026 }], ocupacao: 0.5, ingresso: 40,
  socios: 1000, mensalidade: 30, publico: 3, saf: null, atrasados: 0, ...x,
});
const clube = { id: 'AAA', capacidadeMil: 20, torcidaTamanho: 10, estruturaCT: 10, estruturaBase: 10, rivais: [] } as unknown as Clube;
const jogo = { classico: false, decisao: false, libertadores: false, malNaTabela: false };

function mundo(humano = true) {
  const base = carregarBase();
  const m = criarMundo(base);
  m.eventos = { modelos: base.eventos, imprensa: base.imprensa, cenario: 'avancar', clubes: [CLUBE], texto: null };
  m.tecnicos.find((t) => t.clubeId === CLUBE)!.humano = humano;
  return m;
}

test('preço: cada 10% acima do ingresso tira 6% da ocupação; mensalidade +10% tira 4% dos sócios; manual sem bônus do gerente', () => {
  const c = criarConta(ficha(), clube);
  assert.ok(Math.abs(ocupacao(c, jogo, 10) - 0.5) < 1e-9);
  c.ingresso = 44;
  assert.ok(Math.abs(ocupacao(c, jogo, 10) - 0.5 * 0.94) < 1e-9);
  c.ingresso = 36;
  assert.ok(Math.abs(ocupacao(c, jogo, 10) - 0.5 * 1.06) < 1e-9);
  mudarMensalidade(c, 33);
  assert.ok(Math.abs(c.socios - 960) < 1e-9);
  // Bônus do gerente (Ingressos 20 = +5%) só com os preços delegados.
  const g = { negociacao: 10, ingressos: 20, marketing: 10 };
  const a = criarConta(ficha(), clube);
  const b = criarConta(ficha(), clube);
  b.precoManual = true;
  const va = lancarBilheteria(a, jogo, g);
  const vb = lancarBilheteria(b, jogo, g);
  assert.ok(Math.abs(va - vb * 1.05) < 1e-9);
  const mes = { dia: 28, liga: 'serie-a', torcida: 10, folhaMil: 0, comissaoMil: 0, gerente: g, niveisAcima: 0 };
  fecharMes(a, mes);
  fecharMes(b, mes);
  assert.ok(Math.abs(a.ano.socios - b.ano.socios * 1.05) < 1e-9);
});

test('patrocínio: a atual e marcas do mesmo tipo sem rival; pedir mais arrisca a desistência', () => {
  const marcas: Marca[] = [
    { nome: 'M1', segmento: 'banco', porte: 'Nacional', teto: 4, uso: [] },
    { nome: 'M2', segmento: 'banco', porte: 'Nacional', teto: 3, uso: [] },
    { nome: 'M3', segmento: 'banco', porte: 'Nacional', teto: 9, uso: [] },
    { nome: 'M4', segmento: 'banco', porte: 'Nacional', teto: 3.2, uso: [] },
    { nome: 'Bola', segmento: 'material esportivo', porte: 'Nacional', teto: 3, uso: [] },
  ];
  const c = criarConta(ficha(), clube);
  const rival = criarConta(ficha({ clubeId: 'RIV', cotas: [{ tipo: 'Máster', marca: 'M4', valor: 3, ate: 2030 }] }), { ...clube, id: 'RIV' } as Clube);
  const ps = propostasPatrocinio(c, c.cotas[0], [c, rival], marcas, new Set(['RIV']), 0, 10, criarRng(1));
  assert.deepEqual(ps.map((p) => p.marca), ['M1', 'M2']); // M4 é do rival; Bola é material; Negociação 10 = 2 marcas
  assert.ok(Math.abs(ps[0].valor - 2.6 * 1.1) < 1e-9);
  assert.equal(propostasPatrocinio(c, c.cotas[0], [c], marcas, new Set(), 0, 15, criarRng(1)).length, 3);
  assert.equal(chanceDesistir(10, 10), 25);
  assert.equal(chanceDesistir(20, 10), 50);
  assert.equal(chanceDesistir(20, 20), 30);
  assert.equal(chanceDesistir(0, 1), 0);
  // Pedido aceito: +20%, até o teto da marca.
  const cota = { ...c.cotas[0] };
  const rng = { ...criarRng(1), pct: () => false };
  assert.ok(fecharPatrocinio(cota, ps[0], 20, 10, 1, rng));
  assert.equal(cota.valor, 2.6 * 1.1 * 1.2);
  assert.ok(cota.ate >= 2027 && cota.ate <= 2029);
  assert.equal(fecharPatrocinio(cota, ps[1], 10, 10, 1, { ...rng, pct: () => true }), false);
});

test('comercial delegado (null) dá os mesmos jogos e as mesmas contas da IA', () => {
  const a = mundo(false);
  const ta = jogarAno(a, 5);
  virar(a, ta);
  const b = mundo();
  let chamadas = 0;
  b.jogador = { clube: CLUBE, comercial: () => { chamadas += 1; return null; }, patrocinio: () => null };
  const tb = jogarAno(b, 5);
  virar(b, tb);
  assert.ok(chamadas > 30);
  for (let i = 0; i < ta.jogos.length; i++) assert.deepEqual(tb.jogos[i].placar, ta.jogos[i].placar, `jogo ${i}`);
  const ca = ta.memoria.financas.get(CLUBE)!, cb = tb.memoria.financas.get(CLUBE)!;
  assert.equal(cb.caixa, ca.caixa);
  assert.deepEqual(cb.cotas, ca.cotas);
});

test('manual: preços 1 vez por mês, empréstimo até 30% com aval, amortização, obra de 26 semanas e patrocínio na virada', () => {
  const m = mundo();
  let primeiro = true;
  const log: string[] = [];
  let pedidos = 0;
  m.jogador = {
    clube: CLUBE,
    comercial: (info, mem) => {
      // Sem demissão no teste: a diretoria segue confiando no técnico.
      mem.diretoria.get(CLUBE)!.confianca = 100;
      if (primeiro) {
        primeiro = false;
        const c = mem.financas.get(CLUBE)!;
        assert.match(mudarPrecos(mem, CLUBE, info.dia, { ingresso: c.ingressoRef * 3 }) ?? '', /entre/);
        assert.equal(mudarPrecos(mem, CLUBE, info.dia, { ingresso: c.ingressoRef * 1.3 }), null);
        assert.match(mudarPrecos(mem, CLUBE, info.dia, { mensalidade: c.mensalidadeRef }) ?? '', /neste mês/);
        const lim = limiteEmprestimo(c);
        assert.ok(lim > 0);
        assert.match(tomarEmprestimo(mem, CLUBE, lim + 1) ?? '', /Limite/);
        const antes = c.divida;
        assert.equal(tomarEmprestimo(mem, CLUBE, 2), null);
        assert.equal(c.divida, antes + 2);
        assert.equal(amortizarDivida(mem, CLUBE, 1), null);
        assert.equal(c.divida, antes + 1);
        const e = estrutura(mem, CLUBE, 'ct');
        c.caixa += custoObra(e.nivel + 1);
        assert.equal(iniciarObra(mem, CLUBE, 'ct', info.dia), null);
        assert.match(iniciarObra(mem, CLUBE, 'ct', info.dia) ?? '', /andamento/);
        log.push(`ct ${e.nivel}`);
      }
      return 'manual';
    },
    patrocinio: () => { pedidos += 1; return { escolha: 0, pedido: 0 }; },
  };
  const t = jogarAno(m, 5);
  const mem = t.memoria;
  const c = mem.financas.get(CLUBE)!;
  const nivel = Number(log[0].split(' ')[1]);
  assert.equal(estrutura(mem, CLUBE, 'ct').nivel, nivel + 1); // a obra terminou dentro do ano
  assert.equal(c.precoManual, true);
  assert.ok(Math.abs(c.ingresso - c.ingressoRef * 1.3) < 1e-9);
  const vencida = c.cotas[0];
  vencida.ate = FINANCAS.anoInicial; // força a cota a vencer nesta virada
  const amort = c.ano.amortizacao;
  virar(m, t);
  assert.ok(pedidos >= 1);
  assert.ok(vencida.ate > FINANCAS.anoInicial + 1);
  assert.equal(c.obras.length, 0); // manual: sem a obra automática da IA
  assert.equal(c.historico[c.historico.length - 1].lanc.amortizacao, amort); // manual: sem a amortização da IA
});
