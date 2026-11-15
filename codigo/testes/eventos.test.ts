// Etapa 4, 7ª fatia: eventos e imprensa (GDD-gestao 10).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chanceDaEscolha, chanceDeEvento, faseDe, lerEfeito, nivelNoMomento, valorDe } from '../gestao/eventos.ts';
import { carregarBase } from '../terminal/carregar.ts';
import { criarMundo, jogarAno } from '../temporada/virada.ts';
import { readFileSync } from 'node:fs';

test('eventos: leitura dos efeitos e escala P/M/G', () => {
  assert.deepEqual(lerEfeito('Moral jogador2 −M'), { k: 'Moral', quem: 'jogador2', sinal: -1, nivel: 'M' });
  assert.deepEqual(lerEfeito('Segue: VES-003 em 3 semanas (60%)'), { k: 'Segue', id: 'VES-003', n: 3, chance: 60 });
  assert.deepEqual(lerEfeito('Sai do clube ({profissional})'), { k: 'Sai do clube', quem: 'profissional' });
  assert.equal(lerEfeito('Qualquer coisa'), null);
  assert.equal(valorDe(lerEfeito('Humor +G')!), 15);
  assert.equal(valorDe(lerEfeito('Caixa −P')!), -0.25);
});

test('eventos: chance do sorteado, da escolha, fase e momento da coletiva', () => {
  assert.equal(chanceDeEvento(1), 10);
  assert.equal(chanceDeEvento(4), 20);
  assert.equal(chanceDeEvento(30), 50);
  assert.equal(chanceDaEscolha(50, 15), 60);
  assert.equal(chanceDaEscolha(90, 20), 95);
  assert.equal(faseDe([3, 3, 3, 1, 0]), 'boa');
  assert.equal(faseDe([0, 1, 0, 3, 0]), 'ruim');
  assert.equal(faseDe([3, 3]), 'neutra');
  assert.equal(nivelNoMomento({ k: 'Moral', sinal: -1, nivel: 'P' }, 'ruim', false)!.nivel, 'M');
  assert.equal(nivelNoMomento({ k: 'Moral', sinal: -1, nivel: 'P' }, 'boa', false), null);
  assert.equal(nivelNoMomento({ k: 'Ímpeto', sinal: 1, nivel: 'P' }, 'neutra', true)!.nivel, 'M');
});

test('eventos: dados convertidos sem linha perdida', () => {
  const rel = JSON.parse(readFileSync(new URL('../gerado/_relatorio.json', import.meta.url), 'utf8'));
  assert.equal(rel.contagem.eventos, 122);
  assert.equal(rel.contagem.imprensa, 340);
  assert.equal(rel.problemas.length, 0);
});

test('eventos: uma temporada no cenário Avançar gera eventos, coletivas, falas e o resumo do clube', () => {
  const base = carregarBase();
  const m = criarMundo(base);
  const br = base.clubes.filter((c) => (c.liga === 'serie-a' || c.liga === 'serie-b') && !c.reserva).map((c) => c.id);
  m.eventos = { modelos: base.eventos, imprensa: base.imprensa, cenario: 'avancar', clubes: br, texto: br[0] };
  jogarAno(m, 7);
  const I = m.memoria!.imprensa!;
  const a = I.historico.filter((h) => h.liga === 'serie-a');
  assert.equal(a.length, 20);
  const soma = (k: 'sorteados' | 'coletivas' | 'falas') => a.reduce((s, h) => s + h[k], 0);
  assert.ok(soma('sorteados') > 100 && soma('coletivas') > 100 && soma('falas') > 100);
  assert.ok(I.log.some((l) => l.startsWith('  Evento ')) && I.log.some((l) => l.startsWith('  Coletiva')));
  // Avançar: sempre a escolha Delegado.
  for (const k of Object.keys(I.escolhas)) {
    const [id, letra] = [k.slice(0, 7), k.slice(8)];
    assert.equal(letra, base.eventos.find((e) => e.id === id)!.delegado, k);
  }
});
