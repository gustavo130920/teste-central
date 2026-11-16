// Etapa 4, 8ª fatia (parte 8b2): mercado manual do clube do jogador (GDD-gestao 6).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { carregarBase } from '../terminal/carregar.ts';
import { criarMundo, jogarAno } from '../temporada/virada.ts';
import type { ControleJogador } from '../temporada/jogador.ts';
import { FINANCAS } from '../gestao/financas.ts';
import { posicaoMaisFraca } from '../gestao/mercado.ts';
import type { Negociacao } from '../temporada/mercado.ts';
import { orcamentoDe } from '../temporada/mercado.ts';
import { alternarTransferivel, buscar, chanceDaNegociacao, enviar, iniciarCompra, iniciarRenovacao, observar, relatorio, responder } from '../temporada/mercadoJogador.ts';

const CLUBE = 'ABA';

function mundo() {
  const base = carregarBase();
  const m = criarMundo(base);
  m.eventos = { modelos: base.eventos, imprensa: base.imprensa, cenario: 'avancar', clubes: [CLUBE], texto: null };
  const tec = m.tecnicos.find((t) => t.clubeId === CLUBE)!;
  tec.humano = true;
  return { base, m };
}

test('mercado manual: delegado (null) dá o mesmo mercado da IA', () => {
  const a = mundo();
  a.m.tecnicos.find((t) => t.clubeId === CLUBE)!.humano = false;
  const ja = jogarAno(a.m, 5);
  const b = mundo();
  let chamadas = 0;
  b.m.jogador = { clube: CLUBE, mercado: () => { chamadas += 1; return null; } };
  const jb = jogarAno(b.m, 5);
  assert.ok(chamadas > 30);
  for (let i = 0; i < ja.jogos.length; i++) assert.deepEqual(jb.jogos[i].placar, ja.jogos[i].placar, `jogo ${i}`);
  const ta = ja.memoria.mercado!.transferencias, tb = jb.memoria.mercado!.transferencias;
  assert.deepEqual(tb, ta);
  assert.deepEqual(jb.memoria.elencos[CLUBE].map((j) => [j.id, j.salario, j.contrato]), ja.memoria.elencos[CLUBE].map((j) => [j.id, j.salario, j.contrato]));
  assert.equal(jb.memoria.financas.get(CLUBE)!.caixa, ja.memoria.financas.get(CLUBE)!.caixa);
});

test('mercado manual: busca, relatório, compra em rodadas, renovação e propostas', () => {
  const { m } = mundo();
  const abertas: Negociacao[] = [];
  let ciclos = 0, relatorios = 0, observado = '', renovando = '', vistasPropostas = 0, foraDaJanela = '';
  const c: ControleJogador = {
    clube: CLUBE,
    mercado(info, mem) {
      ciclos += 1;
      const mm = mem.mercado!;
      if (process.env.DEBUG) for (const a of mm.avisos) console.log(info.semana, a);
      mm.avisos.length = 0;
      if (info.janela === null) {
        if (!foraDaJanela) { const x = buscar(mem, CLUBE, {}, info.semana, 1)[0]; const r = iniciarCompra(mem, CLUBE, x.j.id, info.dia); foraDaJanela = typeof r === 'string' ? r : 'abriu'; }
      } else {
        const g = posicaoMaisFraca(mem.elencos[CLUBE]).grupo;
        const vs = buscar(mem, CLUBE, { grupo: g, idadeMax: 30 }, info.semana);
        if (!observado && vs.length) { observado = vs[0].j.id; observar(mem, CLUBE, observado); }
        if (vs.length) relatorios += relatorio(mem, CLUBE, vs[0].j, info.semana).length;
        // Uma compra por vez: oferta alta ao clube e salário alto ao jogador, cada rodada no ciclo seguinte.
        if (!mm.negociacoes.some((n) => n.tipo === 'compra' && (n.estado === 'aberta' || n.estado === 'enviada'))) {
          const orc = orcamentoDe(mem, CLUBE);
          for (const v of buscar(mem, CLUBE, { grupo: g, idadeMax: 30 }, info.semana, 200).filter((x) => x.valor * 1.5 <= orc).sort((x, y) => Number(!!x.clube) - Number(!!y.clube))) {
            const n = iniciarCompra(mem, CLUBE, v.j.id, info.dia);
            if (typeof n !== 'string') { abertas.push(n); break; }
          }
        }
        for (const n of mm.negociacoes.filter((x) => x.tipo === 'compra' && x.estado === 'aberta')) {
          const erro = n.fase === 'clube' ? enviar(mem, n, { oferta: Math.min(orcamentoDe(mem, CLUBE) * 0.9, (n.contra ?? n.oferta) * 1.3) }) : enviar(mem, n, { salario: Math.round((n.contra ?? n.salario) * 1.5), papel: 'titular', anos: 3, luvas: 0.2 });
          if (erro && n.fase === 'clube') n.estado = 'fechada'; // sem orçamento: desiste
        }
        // Transferíveis: 4 dos melhores de linha; a 1ª proposta recebe contraproposta, as outras são aceitas.
        if (!mm.transferiveis.size) for (const j of [...mem.elencos[CLUBE]].filter((x) => x.posicao !== 'GOL').sort((x, y) => y.nota - x.nota).slice(1, 5)) alternarTransferivel(mem, j.id);
        for (const p of mm.propostas.filter((x) => x.clube === CLUBE && x.estado === 'nova')) { vistasPropostas += 1; responder(mem, p, vistasPropostas === 1 ? p.oferta * 1.05 : 'aceitar'); }
      }
      // Renovação de quem tem contrato até o fim do ano.
      const ano = FINANCAS.anoInicial + m.ano;
      const alvo = mem.elencos[CLUBE].find((j) => j.contrato === ano && mm.renovacao.get(j.id) !== 'ok' && !mm.negociacoes.some((n) => n.jogador === j.id && n.estado !== 'fechada'));
      if (alvo && !renovando) { const n = iniciarRenovacao(mem, CLUBE, alvo.id); if (typeof n !== 'string') renovando = alvo.id; }
      for (const n of mm.negociacoes.filter((x) => x.tipo === 'renovacao' && x.estado === 'aberta')) {
        const erro = enviar(mem, n, { salario: Math.round((n.contra ?? n.salario) * 1.3), anos: 2, luvas: 0.3 });
        assert.ok(erro === null || erro.includes('teto') || erro.includes('orçamento'), erro ?? '');
        assert.ok(chanceDaNegociacao(mem, n) > 0);
      }
      return true;
    },
  };
  m.jogador = c;
  const t = jogarAno(m, 5);
  const mm = t.memoria.mercado!;
  assert.ok(ciclos > 30 && relatorios > 0);
  assert.ok(foraDaJanela.startsWith('Mercado fechado'), foraDaJanela);
  // A IA não mexe no mercado do clube: toda chegada é negociação do jogador ou emergência do diretor.
  const nossas = new Set(abertas.map((n) => n.jogador));
  const chegadas = mm.transferencias.filter((x) => x.para === CLUBE);
  for (const x of chegadas) assert.ok(nossas.has(x.jogador) || x.tipo === 'livre', `chegada de ${x.jogador} (${x.tipo})`);
  const compras = chegadas.filter((x) => nossas.has(x.jogador)).length;
  console.log(`negociações ${abertas.length}, compras ${compras}, propostas recusadas ${vistasPropostas}, renovado ${renovando ? mm.renovacao.get(renovando) : '-'}`);
  assert.ok(abertas.length > 0);
  const vendas = mm.transferencias.filter((x) => x.de === CLUBE).length;
  console.log(`propostas ${vistasPropostas}, vendas ${vendas}`);
  assert.ok(vistasPropostas > 0 && vendas > 0, 'sem propostas ou vendas');
  assert.ok(compras > 0, 'nenhuma compra fechada');
  // Rodadas: cada envio é sorteado no ciclo seguinte; ninguém passa de 3 recusas.
  for (const n of abertas) assert.ok(n.rodada <= 3);
  // O observado recebe relatório.
  assert.ok((mm.conhecimento.get(`${CLUBE}>${observado}`)?.atual ?? 0) >= 1);
  if (renovando) assert.ok(mm.renovacao.has(renovando));
});
