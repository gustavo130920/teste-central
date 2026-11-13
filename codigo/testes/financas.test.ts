import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Clube } from '../motor/dados.ts';
import type { Conta, FichaComercial, Marca } from '../gestao/financas.ts';
import {
  FINANCAS, amortizar, andarPerfil, criarConta, custoObra, fecharMes, ocupacao, perfilPelaCondicao, premioLiga, renovarCotas, resultadoCampanha, tentarSaf,
} from '../gestao/financas.ts';
import { fasesDasCopas } from '../temporada/contas.ts';
import { criarRng } from '../motor/rng.ts';
import { carregarBase } from '../terminal/carregar.ts';

const ficha = (x: Partial<FichaComercial> = {}): FichaComercial => ({
  clubeId: 'AAA', perfil: 'Tradicional médio', custoAnual: 13, folha: 700, comissao: 200, tecnico: 100, receita: 13, caixa: 5, divida: 10,
  tvFixa: 4, tvBonus: 2.5, orcamento: 1, teto: 800, cotas: [{ tipo: 'Máster', marca: 'M1', valor: 2.6, ate: 2026 }], ocupacao: 0.5, ingresso: 40,
  socios: 1000, mensalidade: 30, publico: 3, saf: null, atrasados: 0, ...x,
});
const clube = { id: 'AAA', capacidadeMil: 20, torcidaTamanho: 10, estruturaCT: 10, estruturaBase: 10, rivais: [] } as unknown as Clube;
const g10 = { negociacao: 10, ingressos: 10, marketing: 10 };
const mes = (c: Conta, folhaMil = 700) => fecharMes(c, { dia: 28, liga: 'serie-a', torcida: 10, folhaMil, comissaoMil: 200, gerente: g10, niveisAcima: 0 });

test('dados: 30 fichas completas, 46 reduzidas, receita = TV + patrocínio + público', () => {
  const b = carregarBase();
  assert.equal(b.comercial.fichas.length, 30);
  assert.equal(b.comercial.reduzidas.length, 46);
  for (const f of b.comercial.fichas) {
    const soma = f.tvFixa + f.tvBonus + f.cotas.reduce((s, c) => s + c.valor, 0) + f.publico;
    assert.ok(Math.abs(soma - f.receita) < 0.3, f.clubeId);
    assert.equal(f.cotas.length, 3);
  }
  assert.equal(b.comercial.fichas.find((f) => f.clubeId === 'CAR')!.atrasados, 3);
});

test('mês: TV, patrocínio e sócios ÷ 13 meses; folha, comissão, técnico e juros de 0,4%', () => {
  const c = criarConta(ficha(), clube);
  mes(c);
  const entra = (4 + 2.5) / 13 + 2.6 / 13 + (1000 * 30) / 1e6;
  const sai = 0.7 + 0.2 + 0.1 + 10 * 0.004;
  assert.ok(Math.abs(c.caixa - (5 + entra - sai)) < 1e-9);
});

test('caixa negativo: juros × 2, empréstimo até 30% da receita, folha atrasada', () => {
  const c = criarConta(ficha({ caixa: -1, divida: 10 }), clube);
  mes(c, 6000);
  assert.ok(Math.abs(c.ano.juros - 10 * 0.004 * 2) < 1e-9);
  assert.ok(Math.abs(c.banco - 13 * 0.3) < 1e-9); // limite atingido
  assert.ok(c.caixa < 0);
  assert.equal(c.atrasados, 1);
  mes(c, 6000);
  assert.equal(c.atrasados, 2);
  assert.equal(c.negativo8, true);
  assert.equal(c.ano.mesesAtraso, 1);
});

test('bilheteria: ocupação com jogo e Marketing, até 100%', () => {
  const c = criarConta(ficha(), clube);
  const base = { classico: false, decisao: false, libertadores: false, malNaTabela: false };
  assert.ok(Math.abs(ocupacao(c, base, 10) - 0.5) < 1e-9); // Humor 50 = × 1
  assert.ok(Math.abs(ocupacao(c, { ...base, classico: true }, 10) - 0.65) < 1e-9);
  assert.ok(Math.abs(ocupacao(c, base, 20) - 0.5 * 1.05) < 1e-9);
  assert.equal(ocupacao(c, { ...base, classico: true, decisao: true }, 20), 0.5 * 1.3 * 1.4 * 1.05 > 1 ? 1 : 0.5 * 1.3 * 1.4 * 1.05);
});

test('premiação e resultado da campanha', () => {
  assert.equal(premioLiga('serie-a', 1), 40);
  assert.equal(premioLiga('serie-a', 17), 2);
  assert.equal(premioLiga('serie-b', 3), 6);
  assert.equal(resultadoCampanha('serie-a', 1, 1), 3);
  assert.equal(resultadoCampanha('serie-b', 10, 0), -2);
  const fases = fasesDasCopas([
    { competicao: 'libertadores', fase: 'Grupo A', mandante: 'X', visitante: 'Y' },
    { competicao: 'libertadores', fase: 'Final', mandante: 'X', visitante: 'Z' },
  ], () => 'Z');
  assert.equal(fases.libertadores.get('X'), 'Vice');
  assert.equal(fases.libertadores.get('Y'), 'Grupos');
  assert.equal(fases.libertadores.get('Z'), 'Campeão');
});

test('patrocínio: cota × (1 + resultado ÷ 10) × (1 + Negociação × 1%), até o teto; troca para marca maior sem rival', () => {
  const marcas: Marca[] = [
    { nome: 'M1', segmento: 'banco', porte: 'Regional', teto: 3, uso: [] },
    { nome: 'M2', segmento: 'banco', porte: 'Nacional', teto: 10, uso: [] },
  ];
  const c = criarConta(ficha(), clube);
  renovarCotas(c, [c], marcas, new Set(), 1, 0, 10, criarRng(1));
  assert.ok(Math.abs(c.cotas[0].valor - 2.6 * 1.1) < 1e-9);
  assert.equal(c.cotas[0].marca, 'M1');
  const d = criarConta(ficha(), clube);
  renovarCotas(d, [d], marcas, new Set(), 1, 3, 10, criarRng(1));
  assert.equal(d.cotas[0].marca, 'M2');
  const rival = criarConta(ficha({ clubeId: 'RIV', cotas: [{ tipo: 'Máster', marca: 'M2', valor: 5, ate: 2030 }] }), clube);
  const e = criarConta(ficha(), clube);
  renovarCotas(e, [e, rival], marcas, new Set(['RIV']), 1, 3, 10, criarRng(1));
  assert.equal(e.cotas[0].marca, 'M1');
  assert.equal(e.cotas[0].valor, 3);
});

test('perfil: condição do GDD-gestao 11, muda só em 2 viradas seguidas', () => {
  const c = criarConta(ficha({ divida: 30 }), clube);
  const x = { reputacao: 16, torcida: 16, base: 10, receitaBaixa: false, vendas: 0 };
  assert.equal(perfilPelaCondicao(c, x, 1, 20), 'Gigante endividado');
  assert.equal(perfilPelaCondicao(c, { ...x, reputacao: 12 }, 1, 20), 'Tradicional médio');
  assert.equal(andarPerfil(c, 'Gigante endividado'), null);
  assert.equal(andarPerfil(c, 'Gigante endividado'), 'Tradicional médio');
  assert.equal(c.perfil, 'Gigante endividado');
  const em = criarConta(ficha({ perfil: 'Emergente' }), clube);
  assert.equal(perfilPelaCondicao(em, { ...x, torcida: 8 }, 4, 20), 'Emergente');
  assert.equal(perfilPelaCondicao(em, { ...x, torcida: 8 }, 5, 20), 'Tradicional médio');
});

test('SAF: aporte, corte de dívida e participação; amortização acima de 50% da receita; custo da obra', () => {
  const rng = criarRng(3);
  let entrou = 0;
  for (let i = 0; i < 400; i++) {
    const c = criarConta(ficha({ caixa: -5, divida: 30 }), clube);
    if (tentarSaf(c, 20, 1, rng)) {
      entrou += 1;
      assert.ok(c.caixa >= -5 + 10 && c.caixa <= -5 + 30);
      assert.ok(c.divida <= 15);
      assert.ok(c.saf!.participacao >= 51 && c.saf!.participacao <= 90);
    }
  }
  assert.ok(entrou > 60 && entrou < 140, `${entrou}`); // crítica: 50% × 50%
  const r = criarConta(ficha({ caixa: 30, divida: 8 }), clube);
  assert.equal(amortizar(r, 20), 8);
  assert.equal(r.caixa, 22);
  assert.ok(Math.abs(custoObra(6) - 5.4) < 1e-9);
  assert.equal(FINANCAS.meses * FINANCAS.diasMes, 364);
});
