// Mercado manual do clube do jogador (etapa 4, 8ª fatia, parte 8b2; GDD-gestao 6). Busca com neblina, observados com os
// relatórios dos olheiros, compra (clube e depois jogador), pré-contrato, renovação, transferíveis e resposta às propostas.
// Cada rodada leva 1 ciclo: a ação fica "enviada" e o sorteio sai no ciclo seguinte (`resolverCiclo`), com sorteio próprio.
// Sem o gancho (ou resposta null) o clube fica com a IA: nada aqui roda e os números são os mesmos.
import type { Jogador } from '../motor/dados.ts';
import type { Rng } from '../motor/rng.ts';
import { criarRng, semearDeTexto } from '../motor/rng.ts';
import type { Papel } from '../gestao/mercado.ts';
import {
  MERCADO, chanceDasLuvas, chanceDoClube, chanceDoJogador, comissaoDoEmpresario, grupoDe, janelaDaSemana, margemNota, margemPot,
  papelDeQuemChega, papelNoElenco, pedidoDoClube, pedidoSalarial, politica, reacaoAProposta, ruido, semanaDoDia,
} from '../gestao/mercado.ts';
import { DIRETORIA } from '../gestao/diretoria.ts';
import { avalDaDiretoria } from './diretoria.ts';
import type { Memoria } from './memoria.ts';
import type { Negociacao, PropostaRecebida } from './mercado.ts';
import {
  CRIA, anoCalendario, caixaNegativo, clubeDoJogador, concluir, diretor, estimativa, fecharComJogador, folhaDoClube, mexerMemoria, olheiros,
  orcamentoDe, pagar, perfilDe, recusaComProposta, referencia, semanasDeContrato, tetoDe, todosOsCandidatos, valorEstimado,
} from './mercado.ts';
import type { ControleJogador } from './jogador.ts';

const M = MERCADO;
const limitar = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const r2 = (v: number): number => Math.round(v * 100) / 100;

export interface InfoMercado { dia: number; semana: number; janela: 0 | 1 | null; /** Semana sem jogo do clube (o ciclo é a semana). */ semJogo: boolean }

// ---------- Neblina (o que o clube do jogador enxerga) ----------

export interface Faixa { min: number; max: number }
export interface Visto {
  j: Jogador;
  clube: string | null;
  nota: Faixa;
  /** null = Potencial oculto (sem relatório do olheiro de potencial). */
  pot: Faixa | null;
  valor: number;
  relatorios: number;
  relatoriosPot: number;
}

const faixa = (c: number, m: number): Faixa => ({ min: Math.max(1, Math.round(c - m)), max: Math.min(20, Math.round(c + m)) });

export function ver(mem: Memoria, clube: string, j: Jogador, semana: number): Visto {
  const m = mem.mercado!;
  const o = olheiros(mem, clube);
  const k = m.conhecimento.get(`${clube}>${j.id}`);
  const proprio = j.clubeId === clube;
  const e = estimativa(mem, clube, j);
  if (proprio) {
    // No próprio clube: nota exata e o Potencial com a margem de 1 relatório do olheiro de potencial.
    const mp = margemPot(1, o.precPot)!;
    const pot = limitar(j.potencial + ruido(clube, j.id, 'p') * mp, j.nota, 20);
    const fp = faixa(pot, mp);
    return { j, clube, nota: { min: j.nota, max: j.nota }, pot: { min: Math.max(j.nota, fp.min), max: fp.max }, valor: j.valor, relatorios: 2, relatoriosPot: 1 };
  }
  const mn = margemNota(k?.atual ?? 0, o.precAtual);
  const mp = margemPot(k?.pot ?? 0, o.precPot);
  return {
    j, clube: clubeDoJogador(mem, j.id), nota: faixa(e.nota, mn), pot: mp === null ? null : faixa(e.pot, mp),
    valor: valorEstimado(mem, clube, j, semana), relatorios: k?.atual ?? 0, relatoriosPot: k?.pot ?? 0,
  };
}

export interface Filtro { grupo?: string; idadeMin?: number; idadeMax?: number; notaMin?: number; /** Valor estimado máximo (R$ mi). */ valorMax?: number }

/** Busca por posição, idade e nota estimada (com neblina), nos outros clubes do mundo e nos livres. */
export function buscar(mem: Memoria, clube: string, f: Filtro, semana: number, n = 15): Visto[] {
  return todosOsCandidatos(mem, clube)
    .filter((j) => (!f.grupo || grupoDe(j) === f.grupo) && j.idade >= (f.idadeMin ?? 0) && j.idade <= (f.idadeMax ?? 99))
    .map((j) => ({ j, e: estimativa(mem, clube, j).nota }))
    .filter((x) => x.e >= (f.notaMin ?? 0))
    .sort((a, b) => b.e - a.e)
    .map((x) => ver(mem, clube, x.j, semana))
    .filter((v) => v.valor <= (f.valorMax ?? Infinity))
    .slice(0, n);
}

export function acharJogador(mem: Memoria, id: string): Jogador | null {
  for (const js of Object.values(mem.elencos)) { const j = js.find((x) => x.id === id); if (j) return j; }
  return mem.mercado!.livres.find((x) => x.id === id) ?? null;
}

const OCULTOS: [string, string, string, string][] = [
  ['Cons', 'Muito regular, quase não oscila.', 'Oscila muito de um jogo para outro.', 'Regularidade normal.'],
  ['JG', 'Cresce nos jogos grandes.', 'Some nos jogos grandes.', 'Nos jogos grandes, rende o de sempre.'],
  ['Les', 'O histórico de lesões preocupa.', 'Raramente se machuca.', 'Sem histórico de lesões que preocupe.'],
];

/** Relatório do jogador para a tela: faixas pela neblina; traços e ocultos (só frase) com 1 relatório ou mais. */
export function relatorio(mem: Memoria, clube: string, j: Jogador, semana: number): string[] {
  const m = mem.mercado!;
  const v = ver(mem, clube, j, semana);
  const ag = m.agenteDe.get(j.id);
  const f = (x: Faixa): string => (x.min === x.max ? `${x.min}` : `${x.min} a ${x.max}`);
  const out = [
    `${j.nome} · ${j.posicao}, ${j.idade} anos, ${j.nacionalidade} · ${v.clube ? (m.clubes.get(v.clube)?.nomeCurto ?? v.clube) : 'livre'}${j.contrato ? ` · contrato até ${j.contrato}` : ''} · salário R$ ${j.salario} mil`,
    `  Nota ${f(v.nota)} · Potencial ${v.pot ? f(v.pot) : 'oculto (sem relatório do olheiro de potencial)'} · Valor estimado R$ ${v.valor.toFixed(2)} mi · relatórios ${v.relatorios} (potencial ${v.relatoriosPot})`,
    `  Empresário: ${ag ? `${ag.nome} (${ag.perfil}, Ganância ${ag.ganancia})` : 'sem empresário'}`,
  ];
  if (v.relatorios >= 1) {
    const o = olheiros(mem, clube);
    const mn = j.clubeId === clube ? 0 : margemNota(v.relatorios, o.precAtual);
    const atr = Object.entries(j.atributos).filter(([k]) => !['Cons', 'JG', 'Les'].includes(k)).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 6)
      .map(([k, x]) => `${k} ${f(faixa(limitar((x ?? 10) + ruido(clube, j.id, `a${k}`) * mn, 1, 20), mn))}`);
    out.push(`  Melhores atributos: ${atr.join(', ')}`);
    out.push(`  Traços: ${j.tracos.join(', ') || 'nenhum'} · qualidades: ${j.qualidades.join(', ') || 'nenhuma'} · defeitos: ${j.defeitos.join(', ') || 'nenhum'}`);
    out.push('  ' + OCULTOS.map(([k, alto, baixo, meio]) => { const x = j.atributos[k as 'Cons'] ?? 10; return x >= 15 ? alto : x <= 6 ? baixo : meio; }).join(' '));
  } else out.push('  Sem relatório: traços e detalhes ocultos. Ponha na lista de observados.');
  return out;
}

export function observar(mem: Memoria, clube: string, id: string): string | null {
  const m = mem.mercado!;
  const xs = m.observados.get(clube) ?? [];
  if (xs.includes(id)) { m.observados.set(clube, xs.filter((x) => x !== id)); return 'Saiu da lista de observados.'; }
  if (xs.length >= M.manual.observados) return `A lista tem no máximo ${M.manual.observados} nomes.`;
  m.observados.set(clube, [...xs, id]);
  return 'Na lista: os olheiros fazem os relatórios dele primeiro (a cada 4 semanas).';
}

export function alternarTransferivel(mem: Memoria, id: string): boolean {
  const t = mem.mercado!.transferiveis;
  if (t.has(id)) { t.delete(id); return false; }
  t.add(id);
  return true;
}

// ---------- Pedidos e chances ----------

const papelDe = (mem: Memoria, n: Negociacao): Papel => n.papel;
const mercenario = (mem: Memoria, id: string): boolean => mem.mercado!.agenteDe.get(id)?.perfil === 'Mercenário';
/** Luvas em R$ mi: fração do salário anual (13 salários). */
export const luvasEmMi = (n: Pick<Negociacao, 'luvas' | 'salario'>): number => (n.luvas * n.salario * M.manual.meses) / 1000;

/** Pedido do clube vendedor (R$ mi), com os ajustes do GDD-gestao 6. */
function lerClube(mem: Memoria, n: Negociacao, j: Jogador) {
  const m = mem.mercado!;
  const v = n.vendedor!;
  const elV = mem.elencos[v];
  const ag = m.agenteDe.get(j.id);
  const papel = papelNoElenco(elV, j);
  const pedido = pedidoDoClube({ valor: j.valor, papel, negociacao: diretor(mem, n.clube, 'Neg'), influente: (ag?.influencia ?? 0) >= M.clube.influencia.minimo, vendedorEuropeu: m.europeus.has(v) });
  const cComp = m.clubes.get(n.clube)!;
  const cVend = m.clubes.get(v)!;
  const maior = cComp.reputacao > cVend.reputacao;
  const reacao = !maior ? 'fica' : ag?.perfil === 'Mercenário' ? 'sai' : reacaoAProposta(j.lealdade, j.ambicao);
  const aj = {
    titular: papel === 'titular', rival: cComp.rivais.some((r) => r.clubeId === v), caixaNegativo: caixaNegativo(mem, v),
    querSair: reacao === 'sai' || m.querSair.has(j.id), europaTitularJovem: m.europeus.has(v) && papel === 'titular' && j.idade < M.clube.europa.titularIdade,
  };
  const minimo = j.valor * politica(perfilDe(mem, v), caixaNegativo(mem, v)).vende;
  return { pedido, aj, minimo, maior, reacao: reacao as 'fica' | 'aumento' | 'sai', forcada: maior && ag?.perfil === 'Mercenário' };
}

function pedidoDoJogador(mem: Memoria, n: Negociacao, j: Jogador): number {
  const ag = mem.mercado!.agenteDe.get(j.id);
  return pedidoSalarial(j.salario, referencia(mem, n.clube, j.nota), ag?.ganancia ?? 10) * (1 + n.blefe);
}

/** Chance (%) dos termos atuais, mostrada antes de confirmar (GDD-gestao 6). */
export function chanceDaNegociacao(mem: Memoria, n: Negociacao): number {
  const m = mem.mercado!;
  const j = acharJogador(mem, n.jogador);
  if (!j) return 0;
  if (n.fase === 'clube') {
    const c = lerClube(mem, n, j);
    if (n.oferta < c.minimo) return 0;
    return chanceDoClube(n.oferta, c.pedido, c.aj);
  }
  const ag = m.agenteDe.get(j.id);
  if (n.tipo === 'compra' && ag?.perfil === 'Protetor' && n.papel === 'reserva') return 0;
  const pedido = pedidoDoJogador(mem, n, j);
  const memoria = ag?.memoria[n.clube] ?? 0;
  const luvas = chanceDasLuvas(n.luvas, mercenario(mem, j.id));
  if (n.tipo === 'renovacao') {
    return chanceDoJogador(n.salario, pedido, { reputacaoDestino: 0, reputacaoAtual: 0, ambicao: j.ambicao, papel: papelDe(mem, n), libertadores: false, memoria, luvas,
      renovacao: { leal: j.lealdade > j.ambicao, parceiro: ag?.perfil === 'Parceiro' && memoria > 0 } });
  }
  const de = n.vendedor ? m.clubes.get(n.vendedor)?.reputacao ?? M.jogador.reputacaoLivre : M.jogador.reputacaoLivre;
  return chanceDoJogador(n.salario, pedido, { reputacaoDestino: m.clubes.get(n.clube)!.reputacao, reputacaoAtual: de, ambicao: j.ambicao, papel: n.papel, libertadores: m.libertadores.has(n.clube), memoria, luvas });
}

// ---------- Abrir negociações ----------

const aberta = (n: Negociacao): boolean => n.estado === 'aberta' || n.estado === 'enviada';

function nova(mem: Memoria, base: Omit<Negociacao, 'id' | 'rodada' | 'estado' | 'valor' | 'contra' | 'blefe' | 'luvas'>): Negociacao {
  const m = mem.mercado!;
  const n: Negociacao = { ...base, id: ++m.seqManual, rodada: 0, estado: 'aberta', valor: 0, contra: null, blefe: 0, luvas: 0 };
  m.negociacoes.push(n);
  return n;
}

/** Compra (ou livre, ou pré-contrato) de um jogador de fora. Devolve a negociação ou o motivo de não abrir. */
export function iniciarCompra(mem: Memoria, clube: string, id: string, dia: number, preContrato = false): Negociacao | string {
  const m = mem.mercado!;
  const semana = semanaDoDia(dia);
  const janela = janelaDaSemana(semana);
  if (janela === null) return 'Mercado fechado: compras só nas janelas (semanas 1 a 8 e 26 a 29).';
  const ja = m.negociacoes.find((n) => n.jogador === id && n.clube === clube && aberta(n));
  if (ja) return ja;
  const j = todosOsCandidatos(mem, clube).find((x) => x.id === id);
  if (!j) return 'Jogador indisponível (emprestado, com pré-contrato ou já no clube).';
  if (m.fechadas.has(`${clube}>${id}`)) return 'Negociação fechada até a próxima janela.';
  if (m.fica.has(id)) return 'O clube dele decidiu que ele fica até o fim da temporada.';
  if (mem.elencos[clube].length >= M.elenco.max) return `Elenco cheio (${M.elenco.max}).`;
  const vendedor = clubeDoJogador(mem, id);
  const sem = semanasDeContrato(m, j, semana);
  if (preContrato && !(vendedor && janela === 1 && sem !== null && sem <= M.preContrato && m.renovacao.get(id) !== 'ok')) return 'Pré-contrato só na janela do meio do ano, com 6 meses ou menos de contrato.';
  if (vendedor && !preContrato) {
    const g = grupoDe(j);
    const elV = mem.elencos[vendedor];
    if (elV.length <= M.elenco.min || elV.filter((x) => grupoDe(x) === g).length <= (M.titulares[g] ?? 1) + (g === 'GOL' ? 1 : 0)) return 'O clube dele não vende: elenco curto na posição.';
  }
  const est = estimativa(mem, clube, j);
  const papel = papelDeQuemChega(mem.elencos[clube], grupoDe(j), est.nota);
  return nova(mem, {
    tipo: 'compra', clube, jogador: id, vendedor, preContrato, fase: vendedor && !preContrato ? 'clube' : 'jogador',
    oferta: r2(valorEstimado(mem, clube, j, semana)), salario: Math.round(j.salario * M.jogador.aumento), papel, anos: j.idade >= M.renovar.veterano ? 1 : 3,
  });
}

/** Renovação (a qualquer momento, PROVISORIO). O Blefador pode inventar proposta (sorteio próprio do par, uma vez por ano). */
export function iniciarRenovacao(mem: Memoria, clube: string, id: string): Negociacao | string {
  const m = mem.mercado!;
  const j = mem.elencos[clube].find((x) => x.id === id);
  if (!j) return 'Não é do elenco.';
  if (m.emprestimos.some((e) => e.jogador === id)) return 'Emprestado: renova com o clube de origem.';
  if (m.preContratos.has(id)) return 'Já assinou pré-contrato com outro clube.';
  if (m.fechadas.has(`${clube}>${id}`)) return 'Ele não quer conversar até a próxima janela.';
  const ja = m.negociacoes.find((n) => n.jogador === id && aberta(n));
  if (ja) return ja;
  const n = nova(mem, { tipo: 'renovacao', clube, jogador: id, vendedor: null, preContrato: false, fase: 'jogador', oferta: 0, salario: Math.round(j.salario * M.jogador.aumento), papel: papelNoElenco(mem.elencos[clube], j), anos: j.idade >= M.renovar.veterano ? 1 : 3 });
  const ag = m.agenteDe.get(id);
  const rng = criarRng(semearDeTexto(`blefe-${clube}-${id}-${m.ano}`));
  if (ag?.perfil === 'Blefador' && rng.pct(M.empresario.blefe)) {
    m.contagem.blefes += 1;
    if (rng.pct(diretor(mem, clube, 'Rede') * M.empresario.rede)) { m.contagem.blefesDescobertos += 1; mexerMemoria(ag, clube, -1); m.avisos.push(`O diretor descobriu: a "proposta" que ${ag.nome} citou por ${j.nome} não existe.`); }
    else { n.blefe = M.empresario.blefeAumento; m.avisos.push(`${ag.nome} diz que ${j.nome} tem proposta de outro clube.`); }
  }
  return n;
}

export interface Termos { oferta?: number; salario?: number; papel?: Papel; anos?: number; luvas?: number }

/** Confere e envia os termos; o sorteio sai no próximo ciclo. Devolve o motivo se não der. */
export function enviar(mem: Memoria, n: Negociacao, t: Termos): string | null {
  if (!aberta(n)) return 'Negociação encerrada.';
  const j = acharJogador(mem, n.jogador);
  if (!j) return 'Jogador não encontrado.';
  const prox = { ...n, ...Object.fromEntries(Object.entries(t).filter(([, v]) => v !== undefined)) } as Negociacao;
  prox.anos = limitar(Math.round(prox.anos), 1, 5);
  prox.luvas = limitar(prox.luvas, 0, M.manual.luvas.max);
  const orc = orcamentoDe(mem, n.clube);
  const ag = mem.mercado!.agenteDe.get(j.id);
  if (prox.fase === 'clube') {
    const total = prox.oferta + (ag ? comissaoDoEmpresario(prox.oferta, ag.ganancia) : 0);
    if (prox.oferta <= 0) return 'Oferta inválida.';
    if (total > orc) return `Acima do orçamento de transferências (R$ ${orc.toFixed(2)} mi, com a comissão do empresário).`;
  } else {
    const folha = folhaDoClube(mem, n.clube) - (n.tipo === 'renovacao' ? j.salario : 0) + prox.salario;
    if (prox.salario <= 0) return 'Salário inválido.';
    if (folha > tetoDe(mem, n.clube)) return `Acima do teto de folha (R$ ${Math.round(tetoDe(mem, n.clube))} mil; a folha ficaria em ${Math.round(folha)}).`;
    const total = prox.valor + (ag && prox.valor ? comissaoDoEmpresario(prox.valor, ag.ganancia) : 0) + luvasEmMi(prox);
    if (total > orc) return `Valor, comissão e luvas passam do orçamento (R$ ${orc.toFixed(2)} mi).`;
  }
  Object.assign(n, prox, { estado: 'enviada' });
  return null;
}

export function responder(mem: Memoria, p: PropostaRecebida, r: 'aceitar' | 'recusar' | number): void {
  if (p.estado !== 'nova') return;
  if (r === 'aceitar') p.estado = 'aceita';
  else if (r === 'recusar') p.estado = 'recusada';
  else { p.estado = 'contra'; p.contra = r; }
}

// ---------- Ciclo ----------

/** Antes da tela do ciclo: sorteia o que foi enviado no ciclo anterior. */
export function resolverCiclo(mem: Memoria, clube: string, dia: number, rng: Rng): void {
  const m = mem.mercado!;
  const semana = semanaDoDia(dia);
  const janela = janelaDaSemana(semana);
  m.negociacoes = m.negociacoes.filter(aberta);
  m.propostas = m.propostas.filter((p) => p.estado !== 'fim');
  const nomeJ = (id: string): string => acharJogador(mem, id)?.nome ?? id;
  const nomeC = (id: string | null): string => (id ? m.clubes.get(id)?.nomeCurto ?? id : 'livre');
  for (const n of m.negociacoes.filter((x) => x.clube === clube)) {
    if (n.tipo === 'compra' && janela === null) { n.estado = 'fechada'; m.avisos.push(`A janela fechou: a negociação por ${nomeJ(n.jogador)} acabou.`); continue; }
    if (n.estado !== 'enviada') continue;
    n.estado = 'aberta';
    const j = acharJogador(mem, n.jogador);
    const onde = j ? (j.clubeId === null ? null : clubeDoJogador(mem, j.id)) : undefined;
    if (!j || (n.tipo === 'compra' && onde !== n.vendedor) || (n.tipo === 'renovacao' && onde !== clube)) { n.estado = 'fechada'; m.avisos.push(`${nomeJ(n.jogador)} não está mais disponível.`); continue; }
    if (n.fase === 'clube') resolverClube(mem, n, j, rng);
    else resolverJogador(mem, n, j, semana, rng);
  }
  for (const p of m.propostas.filter((x) => x.clube === clube)) {
    const j = mem.elencos[clube].find((x) => x.id === p.jogador);
    if (janela === null || !j) { p.estado = 'fim'; m.avisos.push(`A proposta do ${nomeC(p.comprador)} por ${nomeJ(p.jogador)} expirou.`); continue; }
    if (p.estado === 'contra') {
      if (p.contra! <= p.cap) { p.oferta = p.contra!; p.estado = 'aceita'; }
      else {
        p.rodada += 1;
        const nova = Math.min(p.cap, Math.max(p.oferta * 1.1, (p.oferta + p.contra!) / 2));
        if (p.rodada >= M.clube.rodadas || nova <= p.oferta) { p.estado = 'fim'; m.fechadas.add(`${p.comprador}>${j.id}`); m.avisos.push(`O ${nomeC(p.comprador)} desistiu de ${j.nome}.`); continue; }
        p.oferta = r2(nova); p.estado = 'nova'; m.avisos.push(`O ${nomeC(p.comprador)} subiu a oferta por ${j.nome} para R$ ${p.oferta.toFixed(2)} mi.`);
        continue;
      }
    }
    if (p.estado === 'recusada') {
      p.estado = 'fim';
      m.fechadas.add(`${p.comprador}>${j.id}`);
      if (p.maior) {
        const antes = j.salario;
        recusaComProposta(mem, clube, j, p.reacao, rng);
        m.avisos.push(j.salario > antes ? `${j.nome} pediu aumento para ficar: salário ${antes} → ${j.salario} mil.` : m.querSair.has(j.id) ? `${j.nome} quer sair (moral −10 e −3 por ciclo).` : `${j.nome} aceitou ficar.`);
      }
      continue;
    }
    if (p.estado === 'aceita') {
      p.estado = 'fim';
      if (p.oferta > orcamentoDe(mem, clube) * DIRETORIA.confianca.avalVenda && !avalDaDiretoria(mem, clube)) { mem.dir.aval.venda += 1; m.avisos.push(`A diretoria vetou a venda de ${j.nome} (Confiança abaixo de ${DIRETORIA.confianca.aval}).`); continue; }
      if (p.oferta > orcamentoDe(mem, p.comprador) || mem.elencos[p.comprador].length >= M.elenco.max) { m.avisos.push(`O ${nomeC(p.comprador)} desistiu de ${j.nome}.`); continue; }
      const ok = fecharComJogador(mem, p.comprador, { j, est: p.est, valor: p.oferta, livre: false, preContrato: false }, clube, p.oferta, p.forcada, semana, rng, p.europa);
      if (ok) { m.transferiveis.delete(j.id); m.observados.forEach((xs, c) => m.observados.set(c, xs.filter((x) => x !== j.id))); }
      m.avisos.push(ok ? `Vendido: ${j.nome} para o ${nomeC(p.comprador)} por R$ ${p.oferta.toFixed(2)} mi.` : `${j.nome} não acertou o salário com o ${nomeC(p.comprador)}: fica.`);
    }
  }
}

function resolverClube(mem: Memoria, n: Negociacao, j: Jogador, rng: Rng): void {
  const m = mem.mercado!;
  const c = lerClube(mem, n, j);
  const v = n.vendedor!;
  const nomeV = m.clubes.get(v)?.nomeCurto ?? v;
  let aceitou = n.oferta >= c.minimo && rng.pct(chanceDoClube(n.oferta, c.pedido, c.aj));
  if (aceitou && n.oferta > orcamentoDe(mem, v) * DIRETORIA.confianca.avalVenda && !avalDaDiretoria(mem, v)) { mem.dir.aval.venda += 1; aceitou = false; m.avisos.push(`A diretoria do ${nomeV} vetou a venda.`); }
  if (aceitou) {
    Object.assign(n, { valor: n.oferta, fase: 'jogador', rodada: 0, contra: null });
    const ag = m.agenteDe.get(j.id);
    if (ag && c.forcada) mexerMemoria(ag, v, -1);
    m.avisos.push(`O ${nomeV} aceitou R$ ${n.oferta.toFixed(2)} mi por ${j.nome}. Agora o salário com o jogador.`);
    return;
  }
  n.rodada += 1;
  n.contra = r2(Math.max(c.pedido, c.minimo, n.oferta * 1.1));
  if (n.rodada >= M.clube.rodadas) {
    n.estado = 'fechada';
    m.fechadas.add(`${n.clube}>${j.id}`);
    m.contagem.fechadas += 1;
    m.contagem.recusasClube += 1;
    if (c.maior) recusaComProposta(mem, v, j, c.reacao, rng);
    m.avisos.push(`O ${nomeV} recusou pela 3ª vez e fechou a negociação por ${j.nome} até a próxima janela.`);
  } else m.avisos.push(`O ${nomeV} recusou R$ ${n.oferta.toFixed(2)} mi por ${j.nome} e pede R$ ${n.contra.toFixed(2)} mi (rodada ${n.rodada} de ${M.clube.rodadas}).`);
}

function resolverJogador(mem: Memoria, n: Negociacao, j: Jogador, semana: number, rng: Rng): void {
  const m = mem.mercado!;
  const ag = m.agenteDe.get(j.id);
  const pedido = pedidoDoJogador(mem, n, j);
  if (!rng.pct(chanceDaNegociacao(mem, n))) {
    n.rodada += 1;
    n.contra = Math.round(Math.max(pedido, n.salario * 1.05));
    if (n.rodada >= M.jogador.rodadas) {
      n.estado = 'fechada';
      m.fechadas.add(`${n.clube}>${j.id}`);
      if (n.tipo === 'renovacao') { m.contagem.renovacoesFalhas += 1; m.renovacao.set(j.id, 'nao'); } else m.contagem.recusasJogador += 1;
      m.avisos.push(`${j.nome} recusou pela 3ª vez: ${n.tipo === 'renovacao' ? 'sem renovação até a próxima janela' : 'negociação encerrada até a próxima janela'}.`);
    } else m.avisos.push(`${j.nome} recusou ${n.salario} mil e pede ${n.contra} mil (rodada ${n.rodada} de ${M.jogador.rodadas}).`);
    return;
  }
  // Aceitou: confere o dinheiro de novo (o orçamento pode ter mudado no ciclo).
  const luvas = luvasEmMi(n);
  const total = n.valor + (ag && n.valor ? comissaoDoEmpresario(n.valor, ag.ganancia) : 0) + luvas;
  if (total > orcamentoDe(mem, n.clube) || (n.tipo === 'compra' && !n.preContrato && mem.elencos[n.clube].length >= M.elenco.max)) {
    n.estado = 'fechada'; m.avisos.push(`${j.nome} aceitou, mas o orçamento ou o elenco não comportam mais: negócio desfeito.`); return;
  }
  n.estado = 'concluida';
  m.promessas.set(j.id, n.papel);
  if (luvas > 0) pagar(mem, n.clube, luvas, luvas, 0);
  if (n.tipo === 'renovacao') {
    j.salario = Math.round(n.salario);
    j.contrato = (j.contrato ?? anoCalendario(m)) + n.anos;
    m.renovacao.set(j.id, 'ok');
    m.querSair.delete(j.id);
    m.contagem.renovacoes += 1;
    if (ag) mexerMemoria(ag, n.clube, 1);
    m.avisos.push(`${j.nome} renovou até ${j.contrato} com salário de ${j.salario} mil.`);
    return;
  }
  if (n.preContrato) {
    m.preContratos.set(j.id, { destino: n.clube, salario: Math.round(n.salario), contrato: anoCalendario(m) + n.anos });
    m.renovacao.set(j.id, 'nao');
    m.contagem.preContratos += 1;
    m.transferencias.push({ ano: m.ano, semana, jogador: j.id, de: n.vendedor, para: n.clube, valor: 0, tipo: 'pre-contrato', europa: false, cria: j.qualidades.includes(CRIA) });
    m.avisos.push(`${j.nome} assinou pré-contrato: chega na virada.`);
    return;
  }
  if (ag && n.valor >= j.valor) mexerMemoria(ag, n.clube, 1);
  concluir(mem, j, n.vendedor, n.clube, { valor: n.valor, salario: n.salario, semana, tipo: n.vendedor ? 'compra' : 'livre', anos: n.anos }, rng);
  m.observados.set(n.clube, (m.observados.get(n.clube) ?? []).filter((x) => x !== j.id));
  m.avisos.push(`Contratado: ${j.nome}${n.valor ? ` por R$ ${n.valor.toFixed(2)} mi` : ' (livre)'}, ${n.salario} mil por mês até ${j.contrato}.`);
}

/** O jogador delegou o mercado: o que estava aberto acaba e a IA volta a cuidar do clube. */
export function desligarManual(mem: Memoria, clube: string): void {
  const m = mem.mercado!;
  m.manual.delete(clube);
  for (const n of m.negociacoes) if (n.clube === clube && aberta(n)) n.estado = 'fechada';
  for (const p of m.propostas) if (p.clube === clube) p.estado = 'fim';
}

/** Chamado no ciclo do clube do jogador: resolve as rodadas e abre a tela; null = delegado (a IA cuida). */
export function cicloDoMercado(mem: Memoria, clube: string, dia: number, J: ControleJogador, rng: Rng, semJogo = false): void {
  const m = mem.mercado;
  if (!m || !J.mercado) return;
  if (m.manual.has(clube)) resolverCiclo(mem, clube, dia, rng);
  const semana = semanaDoDia(dia);
  const r = J.mercado({ dia, semana, janela: janelaDaSemana(semana), semJogo }, mem);
  if (r === null) { if (m.manual.has(clube)) desligarManual(mem, clube); }
  else m.manual.add(clube);
}
