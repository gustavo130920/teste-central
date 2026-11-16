// Etapa 4, 8ª fatia (parte 8b3): demissão, propostas e renovação do técnico do jogador (GDD-gestao 9).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { carregarBase } from '../terminal/carregar.ts';
import { criarMundo, entradas, jogarAno, virar } from '../temporada/virada.ts';
import type { Mundo } from '../temporada/virada.ts';
import type { ControleJogador } from '../temporada/jogador.ts';
import { assumirClube, confiancaInicial, criarTecnicoDoJogador } from '../temporada/jogador.ts';
import type { CtxDiretoria, PropostaTecnico } from '../temporada/diretoria.ts';
import { PROPOSTAS_TECNICO, carreira, cicloDoTecnico, demitir } from '../temporada/diretoria.ts';

const CLUBE = 'ABA';

/** Um ano jogado com o técnico do jogador no CLUBE; propostas respondidas por `resposta`. */
function preparar(resposta: (p: PropostaTecnico) => boolean | null) {
  const base = carregarBase();
  const m = criarMundo(base);
  m.eventos = { modelos: base.eventos, imprensa: base.imprensa, cenario: 'avancar', clubes: [CLUBE], texto: null };
  const t = criarTecnicoDoJogador({ nome: 'Teste', origem: 'Ex-jogador', estilo: 'Ginga', formacaoComBola: '4-4-2', formacaoSemBola: '4-4-2', temperamento: 'Gestor' });
  assumirClube(m.tecnicos, m.clubes.find((c) => c.id === CLUBE)!, t);
  const propostas: PropostaTecnico[] = [];
  const J: ControleJogador = { clube: CLUBE, proposta: (p) => { propostas.push(p); return resposta(p); } };
  m.jogador = J;
  const temp = jogarAno(m, 7);
  return { m, t, J, propostas, temp };
}

const ctxDe = (m: Mundo, J: ControleJogador, dia: number): CtxDiretoria => ({ ano: m.ano, dia, tecnicos: m.tecnicos, entradas: entradas(m), tatica: m.tatica, clubesPorLiga: m.clubesPorLiga, jogador: J });

/** Clube brasileiro da IA com Reputação no alcance do técnico (até a folga acima). */
function alvo(m: Mundo, rep: number, fora: string[] = []): string {
  const c = m.clubes.filter((x) => (x.liga === 'serie-a' || x.liga === 'serie-b') && !fora.includes(x.id) && x.id !== CLUBE && x.reputacao <= rep + PROPOSTAS_TECNICO.folga)
    .sort((a, b) => b.reputacao - a.reputacao)[0];
  return c.id;
}

test('carreira: demitido fica livre, perde Reputação e recebe a proposta de uma vaga aberta', () => {
  const { m, t, J, propostas } = preparar(() => null);
  if (t.clubeId !== CLUBE) return; // já saiu no ano (o teste abaixo cobre o livre)
  const mem = m.memoria!;
  const rep = t.reputacao;
  demitir(mem, ctxDe(m, J, 100), CLUBE, 'demissão');
  assert.equal(t.clubeId, null);
  assert.equal(t.reputacao, rep - 1);
  assert.ok(!mem.imprensa?.clubes.has(CLUBE));
  assert.equal(carreira(mem).de, CLUBE);
  // Vaga num clube da IA; antes das 4 semanas, nada.
  const vaga = alvo(m, t.reputacao);
  demitir(mem, ctxDe(m, J, 105), vaga, 'demissão');
  assert.equal(carreira(mem).vagas.at(-1)?.clube, vaga);
  const interino = mem.gestao.get(vaga)!.tecnico;
  cicloDoTecnico(mem, ctxDe(m, J, 112), () => []);
  assert.equal(propostas.length, 0);
  // Na 4ª semana: proposta, aceita pelo delegado (livre aceita).
  cicloDoTecnico(mem, ctxDe(m, J, 128), () => []);
  assert.equal(propostas.length, 1);
  assert.equal(propostas[0].clube, vaga);
  assert.equal(propostas[0].empregado, false);
  assert.equal(t.clubeId, vaga);
  assert.equal(J.clube, vaga);
  assert.equal(interino.clubeId, null);
  assert.equal(mem.diretoria.get(vaga)!.confianca, confiancaInicial(t, m.clubes.find((c) => c.id === vaga)!));
  assert.ok(mem.imprensa?.clubes.has(vaga));
  assert.equal(carreira(mem).livreDesde, null);
});

test('carreira: empregado só recebe na janela, de clube não menor, e recusa por padrão; aceitar troca sem multa', () => {
  const { m, t, J, propostas } = preparar((p) => (p.clube === 'aceitar' ? true : null));
  if (t.clubeId !== CLUBE) return;
  const mem = m.memoria!;
  const meu = m.clubes.find((c) => c.id === CLUBE)!.reputacao;
  const vaga = m.clubes.find((x) => (x.liga === 'serie-a' || x.liga === 'serie-b') && x.id !== CLUBE && x.reputacao >= meu && x.reputacao <= t.reputacao + PROPOSTAS_TECNICO.folga);
  if (!vaga) return;
  demitir(mem, ctxDe(m, J, 100), vaga.id, 'demissão'); // semana 15: fora da janela
  cicloDoTecnico(mem, ctxDe(m, J, 105), () => []);
  assert.equal(propostas.length, 0);
  // Janela do meio do ano (semana 26): oferecida, recusada pelo delegado.
  demitir(mem, ctxDe(m, J, 180), vaga.id, 'demissão');
  cicloDoTecnico(mem, ctxDe(m, J, 182), () => []);
  assert.equal(propostas.length, 1);
  assert.equal(propostas[0].empregado, true);
  assert.equal(t.clubeId, CLUBE);
  // Aceitando: muda de clube e o antigo pega um livre; caixa do antigo sem multa.
  const caixa = mem.financas.get(CLUBE)?.caixa;
  J.proposta = () => true;
  demitir(mem, ctxDe(m, J, 183), vaga.id, 'demissão');
  cicloDoTecnico(mem, ctxDe(m, J, 189), () => []);
  assert.equal(t.clubeId, vaga.id);
  assert.ok(!mem.gestao.get(CLUBE)!.tecnico.humano);
  assert.equal(mem.financas.get(CLUBE)?.caixa, caixa);
  assert.equal(mem.dir.saidas.at(-1)?.motivo, 'proposta');
});

test('carreira: 26 semanas livre sem proposta, o último da Série B oferece', () => {
  const { m, t, J, propostas } = preparar(() => false);
  const mem = m.memoria!;
  if (t.clubeId) demitir(mem, ctxDe(m, J, 10), t.clubeId, 'demissão');
  const c = carreira(mem);
  c.vagas = [];
  const desde = m.ano - 1 + 10 / 364;
  c.ultimaProposta = desde;
  c.proximo = 0;
  const b = m.clubesPorLiga['serie-b'];
  const ordem = [...b];
  propostas.length = 0; // as do ano jogado não contam
  cicloDoTecnico(mem, ctxDe(m, J, 150), () => ordem);
  assert.equal(propostas.length, 0); // 140 dias: ainda não
  c.proximo = 0;
  cicloDoTecnico(mem, ctxDe(m, J, 200), () => ordem);
  assert.equal(propostas.length, 1);
  assert.equal(propostas[0].motivo, 'ultimo-b');
  assert.equal(propostas[0].clube, ordem.filter((x) => x !== c.de).at(-1));
  assert.equal(t.clubeId, null); // recusou
  // Aceitando: assume o último da B.
  J.proposta = () => true;
  c.ultimaProposta = desde; c.proximo = 0;
  cicloDoTecnico(mem, ctxDe(m, J, 210), () => ordem);
  assert.equal(t.clubeId, ordem.filter((x) => x !== c.de).at(-1));
});

test('carreira: renovação na virada (anos escolhidos ou recusa e fica livre)', () => {
  for (const escolha of [2, 0]) {
    const { m, t, J, temp } = preparar(() => false);
    if (t.clubeId !== CLUBE) continue;
    const st = m.memoria!.diretoria.get(CLUBE)!;
    st.contratoAte = m.ano;
    st.confianca = 100;
    let pedido = 0;
    J.renovacao = () => { pedido += 1; return escolha; };
    const ano = m.ano;
    virar(m, temp);
    assert.equal(pedido, 1);
    if (escolha) {
      assert.equal(t.clubeId, CLUBE);
      assert.equal(st.contratoAte, ano + escolha);
    } else {
      assert.equal(t.clubeId, null);
      assert.equal(carreira(m.memoria!).de, CLUBE);
      assert.equal(t.reputacao, criarTecnicoDoJogador({ nome: 'X', origem: 'Ex-jogador', estilo: 'Ginga', formacaoComBola: '4-4-2', formacaoSemBola: '4-4-2', temperamento: 'Gestor' }).reputacao);
    }
  }
});
