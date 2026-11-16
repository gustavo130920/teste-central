// Etapa 5, fatia 5d1: temporada passo a passo (um ciclo por vez) e salvar no meio do ano.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { carregarBase } from '../terminal/carregar.ts';
import { concluirAno, criarMundo, iniciarAno, jogarAno } from '../temporada/virada.ts';
import type { Mundo } from '../temporada/virada.ts';
import { assumirClube, criarTecnicoDoJogador } from '../temporada/jogador.ts';
import { avancarCiclo } from '../temporada/temporada.ts';
import { carregar, salvar } from '../temporada/salvamento.ts';

const CLUBE = 'ABA';
function mundo(): Mundo {
  const base = carregarBase();
  const m = criarMundo(base);
  const BR = base.clubes.filter((c) => (c.liga === 'serie-a' || c.liga === 'serie-b') && !c.reserva).map((c) => c.id);
  m.eventos = { modelos: base.eventos, imprensa: base.imprensa, cenario: 'aleatorio', clubes: BR, texto: null };
  const t = criarTecnicoDoJogador({ nome: 'Teste', origem: 'Ex-jogador', estilo: 'Ginga', formacaoComBola: '4-4-2', formacaoSemBola: '4-4-2', temperamento: 'Gestor' });
  assumirClube(m.tecnicos, m.clubes.find((c) => c.id === CLUBE)!, t);
  m.jogador = { clube: CLUBE };
  return m;
}
const placares = (js: { competicao: string; dia: number; mandante: string; visitante: string; placar: number[]; penaltis?: unknown }[]): string[] =>
  js.map((j) => `${j.competicao} ${j.dia} ${j.mandante}-${j.visitante} ${j.placar.join('x')} ${JSON.stringify(j.penaltis ?? null)}`);

test('5d1: ciclo a ciclo, com save e carga no meio do ano, dá o mesmo ano do laço direto', () => {
  const a = jogarAno(mundo(), 5);

  let m = mundo();
  const s = iniciarAno(m, 5);
  let ciclos = 0;
  const fins: number[] = [];
  while (!m.emAndamento!.fim) {
    const antes = m.emAndamento!.dia;
    const feitos = avancarCiclo(m.emAndamento!, { jogador: m.jogador });
    ciclos += 1;
    const fim = m.emAndamento!.dia - 1;
    fins.push(fim);
    // Ciclo = até o fim do dia do jogo do clube, ou uma semana sem jogo (também com o técnico demitido).
    const noClube = m.tecnicos.find((t) => t.humano)?.clubeId === CLUBE;
    const doClube = noClube ? feitos.filter((j) => j.mandante === CLUBE || j.visitante === CLUBE) : [];
    assert.ok(doClube.length <= 1, 'no máximo 1 jogo do clube por ciclo');
    if (doClube.length) assert.equal(doClube[0].dia, fim);
    else if (!m.emAndamento!.fim && noClube) assert.ok(fim - antes < 7 && fim % 7 === 0, `ciclo sem jogo termina no fim da semana (${antes} a ${fim})`);
    // Salvar e carregar no meio do ano (ciclo 20 e no meio da Libertadores).
    if (ciclos === 20 || ciclos === 35) {
      const J = m.jogador!;
      const c = carregar(salvar(m, null)).mundo;
      assert.ok(c.emAndamento, 'ano em andamento vai no save');
      assert.ok(c.emAndamento.copas.every((x) => typeof x.tipo === 'string' && !('jogosDoDia' in x)), 'copas só com dados');
      assert.equal(c.emAndamento.memoria, c.memoria, 'memória do ano é a do mundo');
      c.jogador = { ...J };
      m = c;
    }
  }
  assert.ok(s.dia > 0 && ciclos > 40, `${ciclos} ciclos`);
  const b = concluirAno(m);
  assert.equal(m.emAndamento, undefined);
  assert.deepEqual(placares(b.jogos), placares(a.jogos));
  assert.deepEqual(b.tabelas['serie-a'].map((l) => l.clube), a.tabelas['serie-a'].map((l) => l.clube));
  assert.deepEqual(b.copas.map((c) => c.campeao()), a.copas.map((c) => c.campeao()));
});
