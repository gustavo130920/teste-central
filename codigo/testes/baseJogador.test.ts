// Etapa 5, fatia 5a1: base manual e promessa de papel do clube do jogador (GDD-gestao 3, 5, 6 e 8).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { carregarBase } from '../terminal/carregar.ts';
import { criarMundo, jogarAno, virar } from '../temporada/virada.ts';
import { dispensarJovem, pedirEmprestimo, subirJovem } from '../temporada/baseJogador.ts';

const CLUBE = 'ABA';

function mundo(humano = true) {
  const base = carregarBase();
  const m = criarMundo(base);
  m.eventos = { modelos: base.eventos, imprensa: base.imprensa, cenario: 'avancar', clubes: [CLUBE], texto: null };
  m.tecnicos.find((t) => t.clubeId === CLUBE)!.humano = humano;
  return m;
}

test('base delegada (null) dá os mesmos jogos, base e subidas da IA', () => {
  const a = mundo(false);
  const ta = jogarAno(a, 5);
  virar(a, ta);
  const b = mundo();
  let chamadas = 0;
  b.jogador = { clube: CLUBE, base: () => { chamadas += 1; return null; } };
  const tb = jogarAno(b, 5);
  virar(b, tb);
  assert.ok(chamadas > 30);
  for (let i = 0; i < ta.jogos.length; i++) assert.deepEqual(tb.jogos[i].placar, ta.jogos[i].placar, `jogo ${i}`);
  assert.deepEqual(tb.memoria.elencos[CLUBE].map((j) => j.id), ta.memoria.elencos[CLUBE].map((j) => j.id));
  assert.deepEqual(tb.memoria.base.get(CLUBE)!.map((j) => j.id), ta.memoria.base.get(CLUBE)!.map((j) => j.id));
});

test('base delegada com idade mínima: o coordenador só sobe quem tem a idade', () => {
  const m = mundo();
  m.jogador = { clube: CLUBE, base: () => ({ idadeMinima: 19 }) };
  const t = jogarAno(m, 5);
  const antes = new Set(t.memoria.base.get(CLUBE)!.map((j) => j.id));
  virar(m, t);
  const subiram = t.memoria.elencos[CLUBE].filter((j) => antes.has(j.id));
  // Na virada a idade já subiu 1: quem tinha 18 no ano chega a 19.
  for (const j of subiram) assert.ok(j.idade >= 19, `${j.nome} ${j.idade}`);
});

test('base manual: subir, dispensar e emprestar; sem subidas na virada; o emprestado volta para a base', () => {
  const m = mundo();
  let subido = '', dispensado = '', pedido = '', erroForaJanela: string | null = null;
  m.jogador = {
    clube: CLUBE,
    base(info, mem) {
      const base = mem.base.get(CLUBE)!;
      if (info.janela === null && !erroForaJanela && base.length) erroForaJanela = pedirEmprestimo(mem, CLUBE, base[0].id, info.dia);
      if (info.janela !== null && base.length >= 3 && !subido) {
        const [a, b, c] = [...base].sort((x, y) => y.nota - x.nota);
        subido = a.id; dispensado = c.id; pedido = b.id;
        assert.equal(subirJovem(mem, CLUBE, a.id), null);
        assert.equal(dispensarJovem(mem, CLUBE, c.id), null);
        assert.equal(pedirEmprestimo(mem, CLUBE, b.id, info.dia), null);
      }
      return 'manual';
    },
  };
  const t = jogarAno(m, 5);
  const mem = t.memoria;
  assert.equal(erroForaJanela, 'Fora da janela.');
  assert.ok(mem.elencos[CLUBE].some((j) => j.id === subido && j.qualidades.includes('Cria da casa')));
  assert.ok(![...Object.values(mem.elencos).flat(), ...[...mem.base.values()].flat()].some((j) => j.id === dispensado));
  const emp = mem.mercado!.emprestimos.find((e) => e.jogador === pedido);
  const recusou = mem.baseJogador!.avisos.some((a) => a.includes('recusou') || a.includes('nenhum clube'));
  assert.ok(emp || recusou, 'empréstimo sorteado');
  if (emp) {
    assert.equal(emp.base, true);
    assert.ok(mem.elencos[emp.destino].some((j) => j.id === pedido));
  }
  const baseAntes = new Set(mem.base.get(CLUBE)!.map((j) => j.id));
  const elencoAntes = new Set(mem.elencos[CLUBE].map((j) => j.id));
  virar(m, t);
  // Manual: nenhum jovem sobe sozinho na virada.
  assert.ok(!mem.elencos[CLUBE].some((j) => baseAntes.has(j.id) && !elencoAntes.has(j.id)));
  if (emp) {
    const j = [...mem.base.get(CLUBE)!].find((x) => x.id === pedido);
    // Volta para a base (ou saiu aos 20).
    assert.ok(j || !mem.evolucao.has(pedido));
    assert.ok(!mem.elencos[emp.destino].some((x) => x.id === pedido));
  }
});

test('promessa de papel: Titular prometido ao pior do elenco quebra; ao melhor, não', () => {
  const m = mundo();
  let pior = '', melhor = '';
  m.jogador = {
    clube: CLUBE,
    aoCiclo(_j, mem) {
      if (pior || !mem.mercado) return;
      const el = [...mem.elencos[CLUBE]].filter((j) => j.posicao !== 'GOL').sort((a, b) => a.nota - b.nota);
      pior = el[0].id; melhor = el[el.length - 1].id;
      mem.mercado.promessas.set(pior, 'titular');
      mem.mercado.promessas.set(melhor, 'titular');
    },
  };
  const t = jogarAno(m, 5);
  const mem = t.memoria;
  assert.ok(!mem.mercado!.promessas.has(pior), 'promessa ao pior quebrou');
  assert.ok(mem.baseJogador!.quebradas >= 1);
  assert.ok(mem.baseJogador!.avisos.some((a) => a.startsWith('Promessa quebrada')));
  assert.ok(mem.mercado!.promessas.has(melhor) || !mem.elencos[CLUBE].some((j) => j.id === melhor), 'promessa ao melhor segue');
});
