import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FechoDoAno, Meta, NivelMeta } from '../gestao/diretoria.ts';
import {
  DIRETORIA, PMG, avaliar, efeitoDaMeta, eleger, fatorCasa, fatorQueda, metaDoInvestidor, metasGeradas, mexerConfianca, mexerHumor, nivelDaIA, partesDaMeta, voltarHumor,
} from '../gestao/diretoria.ts';
import { criarRng } from '../motor/rng.ts';
import { carregarBase } from '../terminal/carregar.ts';
import { criarMundo, jogarAno, virar } from '../temporada/virada.ts';

const fecho = (x: Partial<FechoDoAno> = {}): FechoDoAno => ({ posicao: 10, copa: false, longe: false, socios: false, salarios: true, semPrejuizo: true, divida: false, base: false, ...x });
const metas = (liga: string, p: string, o: string, m: string | null): Record<NivelMeta, Meta | null> => {
  const de = (nivel: NivelMeta, t: string | null): Meta | null => (t ? { nivel, texto: t, partes: partesDaMeta(t, liga)!, bonus: 0 } : null);
  return { 'Padrão': de('Padrão', p), 'Ousada': de('Ousada', o), 'Modesta': de('Modesta', m) };
};

test('dados: 76 diretorias, 30 completas com metas entendidas, 8 SAFs com meta do investidor', () => {
  const b = carregarBase();
  assert.equal(b.diretoria.length, 76);
  const completas = b.diretoria.filter((d) => d.metas);
  assert.equal(completas.length, 30);
  assert.equal(completas.filter((d) => d.saf && d.investidor).length, 8);
  for (const d of completas) for (const m of Object.values(d.metas!)) if (m) assert.ok(partesDaMeta(m.texto, d.liga), `${d.clubeId}: ${m.texto}`);
});

test('Confiança: quedas pela Paciência e pela Blindagem; ganhos cheios; de 0 a 100', () => {
  assert.ok(Math.abs(fatorQueda(10, 0) - 1) < 1e-9);
  assert.ok(Math.abs(fatorQueda(10, 10) - 0.8) < 1e-9);
  assert.ok(fatorQueda(5, 10) > fatorQueda(15, 10));
  assert.equal(mexerConfianca(60, -2, 0.5), 59);
  assert.equal(mexerConfianca(60, 3, 0.5), 63);
  assert.equal(mexerConfianca(1, -10, 1), 0);
  assert.equal(mexerConfianca(99, 10, 1), 100);
});

test('Humor: quedas × 1,2 no Gigante e × 0,8 no Pequeno; volta 1 ponto ao 50; fator casa de 0 a 2', () => {
  assert.equal(mexerHumor(50, -10, 'Gigante rico'), 38);
  assert.equal(mexerHumor(50, -10, 'Pequeno sobrevivente'), 42);
  assert.equal(mexerHumor(50, 10, 'Gigante rico'), 60);
  assert.equal(voltarHumor(60), 59);
  assert.equal(voltarHumor(40), 41);
  assert.equal(voltarHumor(50), 50);
  assert.equal(fatorCasa(50, 1), 1);
  assert.equal(fatorCasa(100, 1), 2);
  assert.ok(Math.abs(fatorCasa(80, 0.5) - 0.8) < 1e-9);
});

test('metas: texto em partes pela liga; Superou = cumprir a de cima; Ousada superada = campeão', () => {
  assert.deepEqual(partesDaMeta('Meio de tabela + revelar um titular da base', 'serie-a'), [{ k: 'pos', ate: 14 }, { k: 'base' }]);
  assert.deepEqual(partesDaMeta('Acesso', 'serie-b'), [{ k: 'pos', ate: 4 }]);
  assert.equal(partesDaMeta('Algo inventado', 'serie-a'), null);
  const m = metas('serie-a', 'Sul-Americana', 'Libertadores', 'Meio de tabela');
  assert.equal(avaliar(m, 'Padrão', fecho({ posicao: 10 })), 'Cumpriu');
  assert.equal(avaliar(m, 'Padrão', fecho({ posicao: 5 })), 'Superou');
  assert.equal(avaliar(m, 'Padrão', fecho({ posicao: 13 })), 'Falhou');
  assert.equal(avaliar(m, 'Modesta', fecho({ posicao: 12 })), 'Superou');
  assert.equal(avaliar(m, 'Ousada', fecho({ posicao: 3 })), 'Cumpriu');
  assert.equal(avaliar(m, 'Ousada', fecho({ posicao: 1 })), 'Superou');
  const comBase = metas('serie-a', 'Meio de tabela + revelar um titular da base', 'Sul-Americana', 'Não cair');
  assert.equal(avaliar(comBase, 'Padrão', fecho({ posicao: 8, base: false })), 'Falhou');
  assert.deepEqual(efeitoDaMeta('Falhou', 'Ousada'), { confianca: -PMG.G, popularidade: DIRETORIA.popularidade.falhouOusada });
});

test('meta da IA pela Ambição; metas geradas pela posição esperada', () => {
  assert.equal(nivelDaIA(17, true), 'Ousada');
  assert.equal(nivelDaIA(16, true), 'Padrão');
  assert.equal(nivelDaIA(8, true), 'Modesta');
  assert.equal(nivelDaIA(8, false), 'Padrão');
  assert.equal(nivelDaIA(12, true), 'Padrão');
  const g = metasGeradas(2, 10);
  assert.deepEqual(g['Ousada'].partes, [{ k: 'pos', ate: 1 }]);
  assert.deepEqual(g['Modesta'].partes, [{ k: 'pos', ate: 5 }]);
  assert.equal(g['Ousada'].bonus, DIRETORIA.gerada.bonus);
});

test('eleição pela Força; meta do investidor na média do prazo', () => {
  const rng = criarRng(7);
  let presidente = 0;
  for (let i = 0; i < 4000; i++) if (eleger(10, [{ nome: 'x', paciencia: 10, ambicao: 10, financeiro: 'Austero', interferencia: 'Delegador', forca: 30, troca: false }], rng) === -1) presidente += 1;
  assert.ok(presidente > 800 && presidente < 1200, String(presidente));
  assert.ok(metaDoInvestidor({ tipo: 'receita', valor: 100, prazo: 2, falha: 'corta' }, [90, 120], [0, 0]));
  assert.ok(!metaDoInvestidor({ tipo: 'prejuizo', valor: 5, prazo: 1, falha: 'corta' }, [100], [-6]));
});

test('carreira de 2 anos: Humor e Confiança nos 60 clubes, técnicos coerentes, orçamento com bônus', () => {
  const b = carregarBase();
  const m = criarMundo(b);
  for (let i = 0; i < 2; i++) virar(m, jogarAno(m, 11));
  const mem = m.memoria!;
  assert.equal(mem.diretoria.size, 60);
  assert.equal(mem.humor.size, 60);
  for (const [c, st] of mem.diretoria) {
    assert.ok(st.confianca >= 0 && st.confianca <= 100, c);
    assert.ok(mem.humor.get(c)! >= 0 && mem.humor.get(c)! <= 100, c);
    // Cada clube tem um técnico só, e é o da gestão.
    const tecs = m.tecnicos.filter((t) => t.clubeId === c);
    assert.equal(tecs.length, 1, c);
    assert.equal(tecs[0], mem.gestao.get(c)!.tecnico, c);
  }
  const d = mem.dir;
  assert.equal(d.metas.Superou + d.metas.Cumpriu + d.metas.Falhou, 120);
  assert.ok(d.eleicoes > 0);
});
