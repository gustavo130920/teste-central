// Etapa 4, 8ª fatia (parte 8a): clube do jogador (GDD-gestao 1 e 8).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { carregarBase } from '../terminal/carregar.ts';
import { criarMundo, jogarAno } from '../temporada/virada.ts';
import type { ControleJogador } from '../temporada/jogador.ts';
import { assumirClube, confiancaInicial, criarTecnicoDoJogador } from '../temporada/jogador.ts';

const CLUBE = 'ABA';

function mundo() {
  const base = carregarBase();
  const m = criarMundo(base);
  m.eventos = { modelos: base.eventos, imprensa: base.imprensa, cenario: 'avancar', clubes: [CLUBE], texto: null };
  return { base, m };
}

test('jogador: técnico pela origem, assumir o clube e paciência pela Reputação', () => {
  const { m } = mundo();
  const t = criarTecnicoDoJogador({ nome: 'Teste', origem: 'Estudioso', estilo: 'Ginga', formacaoComBola: '4-4-2', formacaoSemBola: '4-4-2', temperamento: 'Gestor' });
  assert.equal(t.trabalho!['Leitura Tática'], 13);
  assert.equal(t.trabalho!['Motivação'], 10);
  assert.equal(t.reputacao, 5);
  assert.equal(criarTecnicoDoJogador({ nome: 'X', origem: 'Ex-jogador', estilo: 'Ginga', formacaoComBola: '4-4-2', formacaoSemBola: '4-4-2', temperamento: 'Gestor' }).reputacao, 8);
  const clube = m.clubes.find((c) => c.id === CLUBE)!;
  const velho = assumirClube(m.tecnicos, clube, t)!;
  assert.equal(velho.clubeId, null);
  assert.equal(m.tecnicos.filter((x) => x.clubeId === CLUBE).length, 1);
  assert.equal(confiancaInicial(t, clube), Math.max(35, 60 + 2 * (5 - clube.reputacao)));
  assert.equal(confiancaInicial({ ...t, reputacao: 30 }, clube), 70);
});

test('jogador: delegação total dá os mesmos jogos da IA', () => {
  const a = mundo();
  const ja = jogarAno(a.m, 5);
  const b = mundo();
  // Mesmo técnico (Reputação igual à do clube: Confiança inicial 60, como na IA), marcado como do jogador.
  const tec = b.m.tecnicos.find((t) => t.clubeId === CLUBE)!;
  tec.humano = true;
  assert.equal(tec.reputacao, b.m.clubes.find((c) => c.id === CLUBE)!.reputacao);
  let chamadas = 0;
  const nulo = () => { chamadas += 1; return null; };
  b.m.jogador = { clube: CLUBE, evento: nulo, coletiva: nulo, treino: nulo, escalar: nulo, meta: nulo, aoCiclo: () => { chamadas += 1; } };
  const jb = jogarAno(b.m, 5);
  assert.ok(chamadas > 100);
  assert.equal(jb.jogos.length, ja.jogos.length);
  for (let i = 0; i < ja.jogos.length; i++) assert.deepEqual(jb.jogos[i].placar, ja.jogos[i].placar, `jogo ${i}`);
  assert.equal(b.m.memoria!.diretoria.get(CLUBE)!.confianca, a.m.memoria!.diretoria.get(CLUBE)!.confianca);
});

test('jogador: escolhas manuais valem (meta, treino, titulares, padrão e coletiva)', () => {
  const { m } = mundo();
  const clube = m.clubes.find((c) => c.id === CLUBE)!;
  const t = criarTecnicoDoJogador({ nome: 'Teste', origem: 'Ex-jogador', estilo: 'Ginga', formacaoComBola: '4-2-3-1', formacaoSemBola: '4-4-2', temperamento: 'Paizão' });
  assumirClube(m.tecnicos, clube, t);
  let reserva: string | null = null;
  let jogos = 0, comReserva = 0, cargas = 0, tons = 0, baixa = 0;
  const c: ControleJogador = {
    clube: CLUBE,
    meta: (metas) => (metas['Modesta'] ? 'Modesta' : null),
    treino: () => ({ carga: 'pesada', foco: 'tatica' }),
    escalar: (p) => {
      // Titulares: os 10 melhores de linha, o goleiro principal e o pior de linha no lugar do 11º.
      const gol = p.elenco.filter((j) => j.posicao === 'GOL').sort((x, y) => y.nota - x.nota)[0];
      const linha = p.elenco.filter((j) => j.posicao !== 'GOL').sort((x, y) => y.nota - x.nota);
      reserva = linha[linha.length - 1].id;
      return { titulares: [gol.id, ...linha.slice(0, 9).map((j) => j.id), reserva], padrao: { linha: 'Baixa' } };
    },
    coletiva: (p) => { tons += 1; return { tom: p.respostas[0].tom, assessoria: false }; },
    aoJogo: (d, r, mem) => {
      jogos += 1;
      const k = d.mandante === CLUBE ? 0 : 1;
      if (r.times[k].escalados.length && r.times[k].participantes.slice(0, 11).some((e) => e.j.id === reserva)) comReserva += 1;
      // As pausas (auxiliar, até a 8b) podem mudar a linha durante o jogo.
      if (r.times[k].padrao.linha === 'Baixa') baixa += 1;
      if (mem.gestao.get(CLUBE)!.treino.carga === 'pesada') cargas += 1;
    },
  };
  m.jogador = c;
  jogarAno(m, 5);
  const st = m.memoria!.diretoria.get(CLUBE)!;
  assert.equal(st.nivel, 'Modesta');
  assert.ok(jogos > 30);
  assert.ok(comReserva / jogos > 0.9, `reserva titular em ${comReserva} de ${jogos}`);
  assert.ok(cargas / jogos > 0.9);
  assert.ok(tons > 0);
  console.log(`linha Baixa no fim em ${baixa} de ${jogos}`);
  assert.ok(baixa / jogos > 0.5);
});
