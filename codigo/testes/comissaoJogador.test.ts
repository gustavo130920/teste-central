// Etapa 5, fatia 5f: comissão do clube do jogador (contratar, demitir, renovar; GDD-gestao 8).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { carregarBase } from '../terminal/carregar.ts';
import { criarMundo, jogarAno } from '../temporada/virada.ts';
import { efetivo } from '../gestao/comissao.ts';
import { contratar, custoDemissao, demitir, pedidoDeRenovacao, renovar } from '../temporada/comissaoJogador.ts';

const CLUBE = 'ABA';

test('demitir custa 50% dos salários restantes; contratar só na janela, com negociação; renovar pede aumento por ambição', () => {
  const base = carregarBase();
  const m = criarMundo(base);
  m.eventos = { modelos: base.eventos, imprensa: base.imprensa, cenario: 'avancar', clubes: [CLUBE], texto: null };
  m.tecnicos.find((t) => t.clubeId === CLUBE)!.humano = true;
  const rep = m.clubes.find((c) => c.id === CLUBE)!.reputacao;
  let foraErro: string | null = null, feito = false;
  m.jogador = {
    clube: CLUBE,
    base(info, mem) {
      const com = mem.gestao.get(CLUBE)!.comissao;
      if (info.janela === null && !foraErro) {
        const livre = m.profissionaisLivres.find((p) => p.cargo === 'Auxiliar')!;
        foraErro = contratar(mem, m, CLUBE, livre.nome, 999, 2, info.dia, rep).erro;
      }
      if (info.janela !== null && !feito) {
        feito = true;
        const atual = com.profissionais.find((p) => p.cargo === 'Preparador')!;
        const caixa = mem.financas.get(CLUBE)!.caixa;
        const custo = custoDemissao(mem, atual, info.dia);
        assert.ok(custo > 0);
        const d = demitir(mem, m, CLUBE, 'Preparador', info.dia);
        assert.equal(d.erro, null);
        assert.ok(Math.abs(mem.financas.get(CLUBE)!.caixa - (caixa - custo)) < 1e-9);
        assert.equal(efetivo(com, 'Preparador', 'Rec'), 3, 'cargo vago vale 3');
        assert.ok(m.profissionaisLivres.some((p) => p.nome === atual.nome && p.contrato === null));
        // cargo ocupado: não contrata
        const outro = m.profissionaisLivres.find((p) => p.cargo === 'Auxiliar')!;
        assert.match(contratar(mem, m, CLUBE, outro.nome, 999, 2, info.dia, rep).erro ?? '', /ocupado/);
        // oferta muito baixa: recusa; contraproposta; aceita
        const cand = m.profissionaisLivres.filter((p) => p.cargo === 'Preparador' && !(p.ambicao >= 12 && p.reputacao - rep >= 4))[0]!;
        assert.equal(contratar(mem, m, CLUBE, cand.nome, Math.floor(cand.salario * 0.5), 2, info.dia, rep).resposta?.tipo, 'recusa');
        const contra = contratar(mem, m, CLUBE, cand.nome, Math.ceil(cand.salario * 0.9), 2, info.dia, rep).resposta;
        assert.equal(contra?.tipo, 'contra');
        assert.ok(contra!.valor > cand.salario * 0.9 && contra!.valor <= cand.salario);
        assert.match(contratar(mem, m, CLUBE, cand.nome, cand.salario, 5, info.dia, rep).erro ?? '', /1 a 4/);
        const ok = contratar(mem, m, CLUBE, cand.nome, cand.salario, 3, info.dia, rep);
        assert.equal(ok.resposta?.tipo, 'aceita');
        const novo = com.profissionais.find((p) => p.cargo === 'Preparador')!;
        assert.equal(novo.nome, cand.nome);
        assert.equal(novo.quimica, 10);
        assert.ok(!m.profissionaisLivres.some((p) => p.nome === cand.nome));
        // renovação: lealdade abaixo da ambição pede aumento
        novo.ambicao = 16; novo.lealdade = 10;
        assert.equal(pedidoDeRenovacao(novo), Math.round(novo.salario * 1.12));
        assert.equal(renovar(mem, CLUBE, 'Preparador', novo.salario, 2).resposta?.tipo, 'contra');
        assert.equal(renovar(mem, CLUBE, 'Preparador', pedidoDeRenovacao(novo), 2).resposta?.tipo, 'aceita');
        assert.equal(novo.lealdade, 11);
      }
      return null;
    },
  };
  jogarAno(m, 5);
  assert.equal(foraErro, 'Contratações só nas janelas de transferência.');
  assert.ok(feito, 'a janela chegou');
});
