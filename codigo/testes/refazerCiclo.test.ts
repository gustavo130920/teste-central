// Etapa 5, fatia 5d3c: refazer o ciclo com a resposta (a tela web para em eventos, coletivas, metas e propostas)
// dá o mesmo mundo de quem respondeu na hora.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { carregarBase } from '../terminal/carregar.ts';
import { criarMundo, iniciarAno } from '../temporada/virada.ts';
import type { Mundo } from '../temporada/virada.ts';
import { avancarCiclo } from '../temporada/temporada.ts';
import { assumirClube, criarTecnicoDoJogador } from '../temporada/jogador.ts';
import type { ControleJogador } from '../temporada/jogador.ts';
import { carregar, salvar } from '../temporada/salvamento.ts';

const CLUBE = 'ABA';
class Pendencia extends Error {}

function mundo(): Mundo {
  const base = carregarBase();
  const m = criarMundo(base);
  const BR = base.clubes.filter((c) => (c.liga === 'serie-a' || c.liga === 'serie-b') && !c.reserva).map((c) => c.id);
  m.eventos = { modelos: base.eventos, imprensa: base.imprensa, cenario: 'avancar', clubes: BR, texto: null };
  assumirClube(m.tecnicos, m.clubes.find((c) => c.id === CLUBE)!, criarTecnicoDoJogador({ nome: 'Teste', origem: 'Ex-jogador', estilo: 'Ginga', formacaoComBola: '4-4-2', formacaoSemBola: '4-4-2', temperamento: 'Gestor' }));
  m.jogador = { clube: CLUBE };
  iniciarAno(m, 5);
  return m;
}

/** Resposta de teste à n-ésima pergunta (varia para pegar caminhos diferentes). */
const resposta = (n: number, tipo: string): unknown => (tipo === 'evento' ? (n % 2 ? null : 'A') : tipo === 'coletiva' ? (n % 3 ? null : { tom: 'Humildade', assessoria: false }) : tipo === 'proposta' ? null : null);

function ligar(m: Mundo, pergunta: (tipo: string) => unknown): void {
  const J: ControleJogador = m.jogador!;
  J.evento = () => pergunta('evento') as string | null;
  J.coletiva = () => pergunta('coletiva') as { tom: string; assessoria: boolean } | null;
  J.proposta = () => pergunta('proposta') as boolean | null;
  J.meta = () => pergunta('meta') as null;
}

const impressao = (m: Mundo): string => JSON.stringify(m.emAndamento!.jogos.map((j) => j.placar)) + '|' + salvar(m, null).length;

test('5d3c: refazer o ciclo com a resposta dá o mesmo mundo de quem respondeu na hora', () => {
  // A: responde direto.
  const a = mundo();
  let na = 0;
  ligar(a, (t) => resposta(na++, t));
  // B: o gancho lança se faltar resposta; o ciclo é refeito do início com as respostas dadas.
  let b = mundo();
  let respostas: unknown[] = [];
  let nb = 0;
  let pendencias = 0;
  const ligarB = (w: Mundo) => ligar(w, (t) => { if (nb < respostas.length) return respostas[nb++]; throw Object.assign(new Pendencia(t), { tipo: t }); });
  ligarB(b);
  for (let ciclo = 0; ciclo < 14; ciclo++) {
    const na0 = na;
    avancarCiclo(a.emAndamento!, { jogador: a.jogador! });
    const snap = salvar(b, null);
    respostas = [];
    for (;;) {
      nb = 0;
      try { avancarCiclo(b.emAndamento!, { jogador: b.jogador! }); break; } catch (e) {
        if (!(e instanceof Pendencia)) throw e;
        pendencias += 1;
        respostas.push(resposta(na0 + respostas.length, (e as unknown as { tipo: string }).tipo));
        const c = carregar<null>(snap).mundo;
        c.jogador = { clube: CLUBE };
        b = c;
        ligarB(b);
      }
    }
    assert.equal(impressao(b), impressao(a), `ciclo ${ciclo + 1}`);
  }
  assert.ok(pendencias > 0, 'o teste precisa passar por perguntas');
  console.log(`  ${pendencias} perguntas refeitas em 14 ciclos`);
});
