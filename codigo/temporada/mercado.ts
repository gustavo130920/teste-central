// Mercado no calendário (etapa 4, 5ª fatia; GDD-gestao 6 e 11): valor a cada 4 semanas, relatórios dos olheiros,
// renovações, janelas com compras, vendas, livres, empréstimos e pré-contratos da IA, compras da Europa e a virada
// (contratos vencidos, pré-contratos, empréstimos de volta, renovação dos elencos europeus e Força).
// Decisões do Gustavo (13/11/2026): a IA decide com neblina; negociação IA x IA resolve as rodadas no mesmo ciclo;
// sul-americanos e europeus pagam com o orçamento da ficha mais as vendas; empréstimo de jovens sem minutos.
import type { Clube, Jogador } from '../motor/dados.ts';
import type { Rng } from '../motor/rng.ts';
import { efetivo } from '../gestao/comissao.ts';
import type { FichaReduzida } from '../gestao/financas.ts';
import { FINANCAS } from '../gestao/financas.ts';
import type { Conhecimento, Empresario } from '../gestao/mercado.ts';
import {
  MERCADO, chanceDoClube, chanceDoJogador, comissaoDoEmpresario, duracaoContrato, estimar, grupoDe, janelaDaSemana, papelDeQuemChega,
  papelNoElenco, pedidoDoClube, pedidoSalarial, politica, posicaoMaisFraca, reacaoAProposta, regiaoDaLiga, salarioReferencia, semanaDoDia, valorDeMercado,
} from '../gestao/mercado.ts';
import { BASE, gerarJogador } from '../gestao/base.ts';
import { criarEvolucao } from '../gestao/evolucao.ts';
import { PERFIL } from '../gestao/evolucao.ts';
import type { Memoria } from './memoria.ts';
import { novoEstado } from './memoria.ts';

const M = MERCADO;
const embaralhar = <T>(xs: T[], rng: Rng): T[] => {
  for (let i = xs.length - 1; i > 0; i--) { const k = rng.int(0, i); [xs[i], xs[k]] = [xs[k], xs[i]]; }
  return xs;
};
const CRIA = 'Cria da casa';
/** PROVISORIO: moral de quem chega (GDD-gestao 3, recém-contratado). */
const MORAL_CHEGADA = 65;

export interface Emprestimo { jogador: string; origem: string; destino: string }
export interface Transferencia { ano: number; semana: number; jogador: string; de: string | null; para: string; valor: number; tipo: 'compra' | 'livre' | 'emprestimo' | 'pre-contrato'; europa: boolean; cria: boolean }

export interface ContagemMercado {
  compras: number; livres: number; emprestimos: number; preContratos: number; renovacoes: number; renovacoesFalhas: number; vencidos: number;
  propostasEuropa: number; europeias: number; recusasClube: number; recusasJogador: number; fechadas: number; aumentos: number; querSair: number;
  comissoes: number; semTeto: number; blefes: number; blefesDescobertos: number; saidasEuropa: number; geradosEuropa: number;
}

export interface EstadoMercado {
  ano: number;
  clubes: Map<string, Clube>;
  europeus: Set<string>;
  livres: Jogador[];
  livreDesde: Map<string, { ano: number; dispensado: boolean }>;
  libertadores: Set<string>;
  /** Relatórios de cada clube sobre cada jogador (`clube>jogador`). */
  conhecimento: Map<string, Conhecimento>;
  /** Últimas 8 notas de cada jogador. */
  notas: Map<string, number[]>;
  empresarios: Empresario[];
  agenteDe: Map<string, Empresario>;
  /** Orçamento e teto dos clubes sem conta (sul-americanos e europeus). */
  reduzidas: Map<string, { perfil: string; orcamento: number; orcamentoAno: number; teto: number }>;
  emprestimos: Emprestimo[];
  preContratos: Map<string, { destino: string; salario: number; contrato: number }>;
  compras: Map<string, number>;
  tentativasEuropa: Map<string, number>;
  fechadas: Set<string>;
  /** Decisão de renovação no ano: 'nao' (sai no vencimento) ou 'ok'. */
  renovacao: Map<string, 'nao' | 'ok'>;
  querSair: Set<string>;
  transferencias: Transferencia[];
  contagem: ContagemMercado;
  /** Valor médio de todos os jogadores no 1º recálculo de cada ano (GDD-gestao 12). */
  valorMedio: number[];
  /** Escala de cada europeu no ano 0: Força da ficha, média das 11 melhores e média do elenco (Força relativa, 14/11/2026). */
  escalaEuropa: Map<string, { forca: number; top: number; media: number }>;
}

export interface ContextoMercado {
  ano: number;
  clubes: Clube[];
  europeus: string[];
  livres: Jogador[];
  livreDesde: Map<string, { ano: number; dispensado: boolean }>;
  libertadores: string[];
  empresarios: Empresario[];
  reduzidas: FichaReduzida[];
}

const zeros = (): ContagemMercado => ({
  compras: 0, livres: 0, emprestimos: 0, preContratos: 0, renovacoes: 0, renovacoesFalhas: 0, vencidos: 0, propostasEuropa: 0, europeias: 0,
  recusasClube: 0, recusasJogador: 0, fechadas: 0, aumentos: 0, querSair: 0, comissoes: 0, semTeto: 0, blefes: 0, blefesDescobertos: 0, saidasEuropa: 0, geradosEuropa: 0,
});

export function criarMercado(ctx: ContextoMercado): EstadoMercado {
  const agenteDe = new Map<string, Empresario>();
  const empresarios = ctx.empresarios.map((e) => ({ ...e, memoria: { ...e.memoria }, clientes: [...e.clientes] }));
  for (const e of empresarios) for (const id of e.clientes) agenteDe.set(id, e);
  const m: EstadoMercado = {
    ano: ctx.ano, clubes: new Map(), europeus: new Set(), livres: ctx.livres, livreDesde: ctx.livreDesde, libertadores: new Set(),
    conhecimento: new Map(), notas: new Map(), empresarios, agenteDe,
    reduzidas: new Map(ctx.reduzidas.map((r) => [r.clubeId, { perfil: r.perfil, orcamento: r.orcamento, orcamentoAno: r.orcamento, teto: r.teto }])),
    emprestimos: [], preContratos: new Map(), compras: new Map(), tentativasEuropa: new Map(), fechadas: new Set(), renovacao: new Map(), querSair: new Set(),
    transferencias: [], contagem: zeros(), valorMedio: [], escalaEuropa: new Map(),
  };
  atualizarContexto(m, ctx);
  return m;
}

/** A cada ano: clubes, livres e vagas da Libertadores do mundo. */
export function atualizarContexto(m: EstadoMercado, ctx: ContextoMercado): void {
  m.ano = ctx.ano;
  m.clubes = new Map(ctx.clubes.map((c) => [c.id, c]));
  m.europeus = new Set(ctx.europeus);
  m.livres = ctx.livres;
  m.livreDesde = ctx.livreDesde;
  m.libertadores = new Set(ctx.libertadores);
}

// ---------- Leitura do clube ----------

const anoCalendario = (m: EstadoMercado): number => FINANCAS.anoInicial + m.ano;
const semanasDeContrato = (m: EstadoMercado, j: Jogador, semana: number): number | null =>
  j.contrato === null ? null : (j.contrato - anoCalendario(m)) * 52 + (52 - semana);

function perfilDe(mem: Memoria, clube: string): string {
  return mem.financas.get(clube)?.perfil ?? mem.mercado!.reduzidas.get(clube)?.perfil ?? 'Tradicional médio';
}
const caixaNegativo = (mem: Memoria, clube: string): boolean => (mem.financas.get(clube)?.caixa ?? 0) < 0;
function orcamentoDe(mem: Memoria, clube: string): number {
  const c = mem.financas.get(clube);
  if (c) return c.caixa < 0 ? 0 : c.orcamento;
  return mem.mercado!.reduzidas.get(clube)?.orcamento ?? 0;
}
function tetoDe(mem: Memoria, clube: string): number {
  return mem.financas.get(clube)?.teto ?? mem.mercado!.reduzidas.get(clube)?.teto ?? Infinity;
}

/** Folha do clube (R$ mil/mês), com os empréstimos: o destino paga 50% e a origem o resto. */
export function folhaDoClube(mem: Memoria, clube: string): number {
  let f = (mem.elencos[clube] ?? []).reduce((s, j) => s + j.salario, 0);
  for (const e of mem.mercado?.emprestimos ?? []) {
    const j = (mem.elencos[e.destino] ?? []).find((x) => x.id === e.jogador);
    if (!j) continue;
    const parte = j.salario * (1 - M.emprestimo.salario);
    if (e.destino === clube) f -= parte;
    if (e.origem === clube) f += parte;
  }
  return f;
}

const regiao = (m: EstadoMercado, clube: string | null) => regiaoDaLiga(clube ? m.clubes.get(clube)?.liga ?? null : null);
const referencia = (mem: Memoria, clube: string, nota: number): number => salarioReferencia(nota, regiao(mem.mercado!, clube), perfilDe(mem, clube) === 'Pequeno sobrevivente');

function olheiros(mem: Memoria, clube: string): { precAtual: number; precPot: number; alcAtual: number; alcPot: number } {
  const g = mem.gestao.get(clube);
  if (!g) return { precAtual: 10, precPot: 10, alcAtual: 10, alcPot: 10 };
  return {
    precAtual: efetivo(g.comissao, 'Olheiro atual', 'Prec'), alcAtual: efetivo(g.comissao, 'Olheiro atual', 'Alc'),
    precPot: efetivo(g.comissao, 'Olheiro potencial', 'Prec'), alcPot: efetivo(g.comissao, 'Olheiro potencial', 'Alc'),
  };
}
const diretor = (mem: Memoria, clube: string, sigla: 'Neg' | 'Rede'): number => {
  const g = mem.gestao.get(clube);
  return g ? efetivo(g.comissao, 'Diretor', sigla) : 10;
};

/** Estimativas da semana (a nota só muda a cada 4 semanas e o conhecimento só nos relatórios). */
const cache = new Map<string, { nota: number; pot: number }>();
const cacheOlheiros = new Map<string, ReturnType<typeof olheiros>>();
const limparCache = (): void => { cache.clear(); cacheOlheiros.clear(); };

function estimativa(mem: Memoria, clube: string, j: Jogador): { nota: number; pot: number } {
  if (j.clubeId === clube) return { nota: j.nota, pot: j.potencial };
  const chave = `${clube}>${j.id}`;
  const c = cache.get(chave);
  if (c) return c;
  const o = cacheOlheiros.get(clube) ?? cacheOlheiros.set(clube, olheiros(mem, clube)).get(clube)!;
  const e = estimar(clube, j, mem.mercado!.conhecimento.get(chave), o.precAtual, o.precPot, false);
  cache.set(chave, e);
  return e;
}

function valorEstimado(mem: Memoria, clube: string, j: Jogador, semana: number): number {
  const m = mem.mercado!;
  const e = estimativa(mem, clube, j);
  return valorDeMercado({ nota: e.nota, pot: e.pot, idade: j.idade, regiao: regiao(m, j.clubeId), semanasDeContrato: semanasDeContrato(m, j, semana), notas: m.notas.get(j.id) ?? [] });
}

const clubeDoJogador = (mem: Memoria, id: string): string | null => {
  for (const [c, js] of Object.entries(mem.elencos)) if (js.some((j) => j.id === id)) return c;
  return null;
};
const emprestado = (m: EstadoMercado, id: string): boolean => m.emprestimos.length > 0 && m.emprestimos.some((e) => e.jogador === id);

// ---------- Recálculo e relatórios (a cada 4 semanas) ----------

export function registrarNota(mem: Memoria, id: string, nota: number): void {
  const m = mem.mercado;
  if (!m) return;
  const xs = m.notas.get(id) ?? [];
  xs.push(nota);
  if (xs.length > M.forma.jogos) xs.shift();
  m.notas.set(id, xs);
}

export function periodoDeMercado(mem: Memoria, dia: number, rng: Rng): void {
  const m = mem.mercado!;
  const semana = semanaDoDia(dia);
  limparCache();
  // Valor (GDD-gestao 6).
  let soma = 0, n = 0;
  for (const [c, js] of Object.entries(mem.elencos)) {
    for (const j of js) {
      j.valor = valorDeMercado({ nota: j.nota, pot: j.potencial, idade: j.idade, regiao: regiao(m, c), semanasDeContrato: semanasDeContrato(m, j, semana), notas: m.notas.get(j.id) ?? [] });
      soma += j.valor; n += 1;
    }
  }
  for (const j of m.livres) {
    j.valor = valorDeMercado({ nota: j.nota, pot: j.potencial, idade: j.idade, regiao: 'brasil', semanasDeContrato: null, notas: [] });
    soma += j.valor; n += 1;
  }
  if (dia === FINANCAS.diasMes) m.valorMedio.push(n ? soma / n : 0);
  relatorios(mem);
  limparCache();
  renovacoes(mem, semana, rng);
}

/** Cada olheiro entrega `Alcance ÷ 2` relatórios a cada 4 semanas, nos melhores candidatos da posição mais fraca. */
function relatorios(mem: Memoria): void {
  const m = mem.mercado!;
  for (const clube of mem.gestao.keys()) {
    const o = olheiros(mem, clube);
    const europeu = m.europeus.has(clube);
    const alvo = posicaoMaisFraca(mem.elencos[clube]).grupo;
    const forca = m.clubes.get(clube)?.forca ?? 15;
    const candidatos = todosOsCandidatos(mem, clube).filter((j) => (europeu ? j.idade <= M.europa.idade : grupoDe(j) === alvo));
    const ranking = candidatos.map((j) => ({ j, e: estimativa(mem, clube, j) }))
      .filter((x) => !europeu || Math.max(x.e.nota, x.e.pot) >= forca - M.europa.folgaForca)
      .sort((a, b) => b.e.nota - a.e.nota);
    const k = (id: string): Conhecimento => m.conhecimento.get(`${clube}>${id}`) ?? m.conhecimento.set(`${clube}>${id}`, { atual: 0, pot: 0 }).get(`${clube}>${id}`)!;
    for (const x of ranking.filter((x) => k(x.j.id).atual < 2).slice(0, Math.ceil(o.alcAtual / 2))) k(x.j.id).atual += 1;
    for (const x of ranking.filter((x) => x.j.idade <= M.jovem.idade && k(x.j.id).pot < 2).slice(0, Math.ceil(o.alcPot / 2))) k(x.j.id).pot += 1;
  }
}

/** Jogadores de outros clubes do mundo e livres (sem os emprestados e os com pré-contrato). */
function todosOsCandidatos(mem: Memoria, clube: string): Jogador[] {
  const m = mem.mercado!;
  const out: Jogador[] = [];
  for (const [c, js] of Object.entries(mem.elencos)) if (c !== clube) for (const j of js) if (!emprestado(m, j.id) && !m.preContratos.has(j.id)) out.push(j);
  out.push(...m.livres);
  return out;
}

// ---------- Renovações da IA (GDD-gestao 11) ----------

function renovacoes(mem: Memoria, semana: number, rng: Rng): void {
  const m = mem.mercado!;
  for (const clube of mem.gestao.keys()) {
    const elenco = mem.elencos[clube];
    for (const j of elenco) {
      const sem = semanasDeContrato(m, j, semana);
      if (sem === null || sem > M.renovar.semanas || m.renovacao.has(j.id) || m.preContratos.has(j.id) || emprestado(m, j.id)) continue;
      const papel = papelNoElenco(elenco, j);
      const quer = papel === 'titular' || (M.renovar.rotacao > 0 && papel === 'rotacao') || j.potencial >= j.nota + M.renovar.pot;
      if (!quer) { m.renovacao.set(j.id, 'nao'); continue; }
      const ag = m.agenteDe.get(j.id);
      let pedido = pedidoSalarial(j.salario, referencia(mem, clube, j.nota), ag?.ganancia ?? 10);
      // Blefador: 30% de inventar proposta; o diretor descobre com `Rede × 4%` e a memória cai 1.
      if (ag?.perfil === 'Blefador' && rng.pct(M.empresario.blefe)) {
        m.contagem.blefes += 1;
        if (rng.pct(diretor(mem, clube, 'Rede') * M.empresario.rede)) { m.contagem.blefesDescobertos += 1; mexerMemoria(ag, clube, -1); }
        else pedido *= 1 + M.empresario.blefeAumento;
      }
      const memoria = ag?.memoria[clube] ?? 0;
      const aj = { reputacaoDestino: 0, reputacaoAtual: 0, ambicao: j.ambicao, papel: papelNoElenco(elenco, j), libertadores: false, memoria,
        renovacao: { leal: j.lealdade > j.ambicao, parceiro: ag?.perfil === 'Parceiro' && memoria > 0 } };
      // PROVISORIO (5ª fatia): a oferta cabe no teto de folha, mas nunca fica abaixo do salário atual; abaixo do pedido, a chance cai.
      const cabe = Math.max(j.salario, tetoDe(mem, clube) - (folhaDoClube(mem, clube) - j.salario));
      let oferta = Math.min(pedido, cabe);
      if (oferta < pedido) m.contagem.semTeto += 1;
      let ok = false;
      for (let r = 0; r < M.jogador.rodadas && !ok; r++) {
        ok = rng.pct(chanceDoJogador(oferta, pedido, aj));
        if (!ok) oferta = Math.min(cabe, oferta * (1 + M.jogador.passo));
      }
      if (!ok) { m.contagem.renovacoesFalhas += 1; continue; }
      const dur = j.idade >= M.renovar.veterano ? 1 : duracaoContrato(j.idade, (a, b) => rng.int(a, b));
      j.salario = Math.round(oferta);
      j.contrato = (j.contrato ?? anoCalendario(m)) + dur;
      m.renovacao.set(j.id, 'ok');
      m.contagem.renovacoes += 1;
      if (ag) mexerMemoria(ag, clube, 1);
    }
  }
}

const mexerMemoria = (e: Empresario, clube: string, d: number): void => { e.memoria[clube] = Math.max(-5, Math.min(5, (e.memoria[clube] ?? 0) + d)); };

// ---------- Semana: janelas e livres ----------

export function semanaDeMercado(mem: Memoria, dia: number, rng: Rng): void {
  const m = mem.mercado!;
  const semana = semanaDoDia(dia);
  const janela = janelaDaSemana(semana);
  limparCache();
  if (janela !== null && semana === M.janelas[janela][0]) {
    m.compras.clear();
    m.fechadas.clear();
    for (const e of m.europeus) m.tentativasEuropa.set(e, M.europa.tentativas[janela]);
  }
  const clubes = embaralhar([...mem.gestao.keys()], rng);
  for (const clube of clubes) {
    const elenco = mem.elencos[clube];
    // Livres a qualquer momento: emergência abaixo de 18 jogadores ou de 2 goleiros.
    if (elenco.length < M.elenco.min || elenco.filter((j) => j.posicao === 'GOL').length < M.elenco.goleiros) assinarLivreDeEmergencia(mem, clube, semana, rng);
    if (janela === null) continue;
    if (m.europeus.has(clube)) { tentativaEuropeia(mem, clube, semana, janela, rng); continue; }
    if ((m.compras.get(clube) ?? 0) >= M.compras[janela] || elenco.length >= M.elenco.max) continue;
    tentarReforco(mem, clube, semana, janela, rng);
  }
}

function assinarLivreDeEmergencia(mem: Memoria, clube: string, semana: number, rng: Rng): void {
  const m = mem.mercado!;
  const elenco = mem.elencos[clube];
  const faltaGol = elenco.filter((j) => j.posicao === 'GOL').length < M.elenco.goleiros;
  const g = faltaGol ? 'GOL' : posicaoMaisFraca(elenco).grupo;
  const j = m.livres.filter((x) => grupoDe(x) === g).sort((a, b) => estimativa(mem, clube, b).nota - estimativa(mem, clube, a).nota)[0];
  if (!j) return;
  const salario = pedidoSalarial(j.salario, referencia(mem, clube, j.nota), m.agenteDe.get(j.id)?.ganancia ?? 10);
  concluir(mem, j, null, clube, { valor: 0, salario, semana, tipo: 'livre' }, rng);
}

interface Alvo { j: Jogador; est: { nota: number; pot: number }; valor: number; livre: boolean; preContrato: boolean }

/** Uma tentativa de reforço do clube da IA na posição mais fraca (GDD-gestao 6 e 11). */
function tentarReforco(mem: Memoria, clube: string, semana: number, janela: 0 | 1, rng: Rng): void {
  const m = mem.mercado!;
  const elenco = mem.elencos[clube];
  const perfil = perfilDe(mem, clube);
  const pol = politica(perfil, caixaNegativo(mem, clube));
  const { grupo, piorTitular } = posicaoMaisFraca(elenco);
  const precisa = elenco.length < M.elenco.ideal;
  const media = elenco.reduce((s, j) => s + j.nota, 0) / elenco.length;
  const doGrupo = elenco.filter((j) => grupoDe(j) === grupo);
  const mediaGrupo = doGrupo.length ? doGrupo.reduce((s, j) => s + j.nota, 0) / doGrupo.length : 0;
  const orc = orcamentoDe(mem, clube);
  const folga = tetoDe(mem, clube) - folhaDoClube(mem, clube);
  const alvos: Alvo[] = [];
  for (const j of todosOsCandidatos(mem, clube)) {
    if (grupoDe(j) !== grupo || j.idade > pol.idadeMax || m.fechadas.has(`${clube}>${j.id}`)) continue;
    const livre = j.clubeId === null;
    const sem = semanasDeContrato(m, j, semana);
    const preContrato = !livre && janela === 1 && sem !== null && sem <= M.preContrato && m.renovacao.get(j.id) !== 'ok';
    if (!livre && !preContrato && !pol.compra) continue;
    const est = estimativa(mem, clube, j);
    // PROVISORIO (5ª fatia): até 26 no elenco, o livre entra se supera a média do grupo (elenco de apoio).
    const apoio = livre && elenco.length < M.europa.elenco && est.nota >= mediaGrupo;
    if (!apoio && (!precisa || !livre)) {
      if (est.nota < piorTitular + M.melhora) continue;
      if (pol.acimaDaMedia && est.nota <= media) continue;
    }
    const valor = livre || preContrato ? 0 : valorEstimado(mem, clube, j, semana);
    if (valor * 0.9 > orc) continue;
    if (pedidoSalarial(j.salario, referencia(mem, clube, est.nota), 10) > folga) continue;
    alvos.push({ j, est, valor, livre, preContrato });
  }
  if (!alvos.length) {
    if (!pol.compra) tentarEmprestimo(mem, clube, grupo, piorTitular, semana, rng);
    return;
  }
  alvos.sort((a, b) => b.est.nota - a.est.nota || a.j.idade - b.j.idade);
  const alvo = alvos[rng.int(0, Math.min(2, alvos.length - 1))];
  negociar(mem, clube, alvo, pol.oferta, semana, rng);
}

/** Negociação com o clube (se houver) e depois com o jogador, tudo no mesmo ciclo (decisão de 13/11/2026). */
function negociar(mem: Memoria, comprador: string, alvo: Alvo, teto: number, semana: number, rng: Rng, europa = false): boolean {
  const m = mem.mercado!;
  const j = alvo.j;
  const vendedor = alvo.livre ? null : clubeDoJogador(mem, j.id);
  const cComp = m.clubes.get(comprador)!;
  const ag = m.agenteDe.get(j.id);
  const papelNovo = papelDeQuemChega(mem.elencos[comprador], grupoDe(j), alvo.est.nota);
  if (ag?.perfil === 'Protetor' && papelNovo === 'reserva') { m.contagem.recusasJogador += 1; return false; }
  let valor = 0;
  let forcada = false;
  if (vendedor && !alvo.preContrato) {
    const elV = mem.elencos[vendedor];
    const g = grupoDe(j);
    const minimoGrupo = (M.titulares[g] ?? 1) + (g === 'GOL' ? 1 : 0);
    if (elV.length <= M.elenco.min || elV.filter((x) => grupoDe(x) === g).length <= minimoGrupo) return false;
    const cVend = m.clubes.get(vendedor)!;
    const papel = papelNoElenco(elV, j);
    const pedido = pedidoDoClube({ valor: j.valor, papel, negociacao: diretor(mem, comprador, 'Neg'), influente: (ag?.influencia ?? 0) >= M.clube.influencia.minimo, vendedorEuropeu: m.europeus.has(vendedor) });
    const pol = politica(perfilDe(mem, vendedor), caixaNegativo(mem, vendedor));
    const minimo = j.valor * pol.vende;
    // Lealdade x ambição com proposta maior (destino de reputação maior); Mercenário força a saída.
    const maior = cComp.reputacao > cVend.reputacao;
    const reacao = !maior ? 'fica' : ag?.perfil === 'Mercenário' ? 'sai' : reacaoAProposta(j.lealdade, j.ambicao);
    forcada = maior && ag?.perfil === 'Mercenário';
    const aj = {
      titular: papel === 'titular', rival: cComp.rivais.some((r) => r.clubeId === vendedor), caixaNegativo: caixaNegativo(mem, vendedor),
      querSair: reacao === 'sai' || m.querSair.has(j.id), europaTitularJovem: m.europeus.has(vendedor) && papel === 'titular' && j.idade < M.clube.europa.titularIdade,
    };
    const [a, b] = europa ? M.europa.oferta : [0.9, Math.max(0.9, teto)];
    const cap = alvo.valor * b;
    let oferta = alvo.valor * (a + rng.n() * (b - a));
    const orc = orcamentoDe(mem, comprador);
    let aceitou = false;
    for (let r = 0; r < M.clube.rodadas; r++) {
      if (oferta > orc) break;
      if (oferta >= minimo && rng.pct(chanceDoClube(oferta, pedido, aj))) { aceitou = true; break; }
      // Contraproposta: o comprador vê o pedido e sobe até o seu teto.
      const nova = Math.min(cap, orc, Math.max(oferta * 1.1, (oferta + pedido) / 2));
      if (r === M.clube.rodadas - 1 || nova <= oferta) { if (r === M.clube.rodadas - 1) { m.fechadas.add(`${comprador}>${j.id}`); m.contagem.fechadas += 1; } break; }
      oferta = nova;
    }
    if (!aceitou) {
      m.contagem.recusasClube += 1;
      if (maior) recusaComProposta(mem, vendedor, j, reacao, rng);
      return false;
    }
    valor = oferta;
  }
  // Negociação com o jogador.
  const regiaoComp = referencia(mem, comprador, alvo.est.nota);
  const pedido = pedidoSalarial(j.salario, referencia(mem, comprador, j.nota), ag?.ganancia ?? 10);
  const folga = tetoDe(mem, comprador) - folhaDoClube(mem, comprador);
  let oferta = Math.min(folga, pedidoSalarial(j.salario, regiaoComp, ag?.ganancia ?? 10));
  if (oferta <= 0) { m.contagem.recusasJogador += 1; return false; }
  const de = vendedor ? m.clubes.get(vendedor)?.reputacao ?? M.jogador.reputacaoLivre : M.jogador.reputacaoLivre;
  const aj = { reputacaoDestino: cComp.reputacao, reputacaoAtual: de, ambicao: j.ambicao, papel: papelNovo, libertadores: m.libertadores.has(comprador), memoria: ag?.memoria[comprador] ?? 0 };
  let ok = false;
  for (let r = 0; r < M.jogador.rodadas && !ok; r++) {
    ok = rng.pct(chanceDoJogador(oferta, pedido, aj));
    if (!ok) oferta = Math.min(folga, oferta * (1 + M.jogador.passo));
  }
  if (!ok) { m.contagem.recusasJogador += 1; return false; }
  if (alvo.preContrato) {
    const dur = duracaoContrato(j.idade, (a, b) => rng.int(a, b));
    m.preContratos.set(j.id, { destino: comprador, salario: Math.round(oferta), contrato: anoCalendario(m) + dur });
    m.renovacao.set(j.id, 'nao');
    m.contagem.preContratos += 1;
    m.compras.set(comprador, (m.compras.get(comprador) ?? 0) + 1);
    m.transferencias.push({ ano: m.ano, semana, jogador: j.id, de: vendedor, para: comprador, valor: 0, tipo: 'pre-contrato', europa: false, cria: j.qualidades.includes(CRIA) });
    return true;
  }
  if (ag) {
    if (valor >= j.valor) mexerMemoria(ag, comprador, 1);
    if (forcada && vendedor) mexerMemoria(ag, vendedor, -1);
  }
  concluir(mem, j, vendedor, comprador, { valor, salario: oferta, semana, tipo: vendedor ? 'compra' : 'livre', europa }, rng);
  return true;
}

/** Venda recusada com proposta maior: aumento de 15% a 30% para ficar, ou "quer sair" (Moral −10 e −3 por ciclo). */
function recusaComProposta(mem: Memoria, clube: string, j: Jogador, reacao: 'fica' | 'aumento' | 'sai', rng: Rng): void {
  const m = mem.mercado!;
  if (reacao === 'fica') return;
  if (reacao === 'aumento') {
    const [a, b] = M.lealdade.aumento;
    const novo = j.salario * (1 + a + rng.n() * (b - a));
    if (folhaDoClube(mem, clube) - j.salario + novo <= tetoDe(mem, clube)) { j.salario = Math.round(novo); m.contagem.aumentos += 1; return; }
  }
  if (m.querSair.has(j.id)) return;
  m.querSair.add(j.id);
  m.contagem.querSair += 1;
  const s = mem.jogadores.get(j.id);
  if (s) s.moral = Math.max(0, s.moral + M.lealdade.moral);
}

/** Queda de −3 por ciclo de quem quer sair e teve a venda recusada. */
export const quedaQuerSair = (mem: Memoria, id: string): number => (mem.mercado?.querSair.has(id) ? M.lealdade.moralCiclo : 0);

interface Fechamento { valor: number; salario: number; semana: number; tipo: Transferencia['tipo']; europa?: boolean }

/** Move o jogador, paga a transferência e a comissão do empresário e registra o negócio. */
function concluir(mem: Memoria, j: Jogador, de: string | null, para: string, f: Fechamento, rng: Rng): void {
  const m = mem.mercado!;
  const cria = j.qualidades.includes(CRIA);
  if (de) mem.elencos[de] = mem.elencos[de].filter((x) => x.id !== j.id);
  else {
    m.livres.splice(m.livres.indexOf(j), 1);
    m.livreDesde.delete(j.id);
  }
  if (f.tipo !== 'emprestimo') {
    j.salario = Math.round(f.salario);
    const dur = j.idade >= M.renovar.veterano ? 1 : duracaoContrato(j.idade, (a, b) => rng.int(a, b));
    j.contrato = anoCalendario(m) + dur - (f.semana <= 26 ? 1 : 0);
    if (cria) j.qualidades = j.qualidades.filter((q) => q !== CRIA);
    m.querSair.delete(j.id);
    m.renovacao.delete(j.id);
  }
  j.clubeId = para;
  mem.elencos[para].push(j);
  const s = mem.jogadores.get(j.id);
  if (s) { s.moral = MORAL_CHEGADA; s.ciclosSemTitular = 0; }
  else mem.jogadores.set(j.id, novoEstado(MORAL_CHEGADA));
  if (!mem.evolucao.has(j.id)) mem.evolucao.set(j.id, criarEvolucao(j));
  // Dinheiro: comprador paga valor + comissão; vendedor recebe o valor (vendas também voltam ao orçamento, PROVISORIO).
  const ag = m.agenteDe.get(j.id);
  const comissao = ag && f.valor > 0 ? comissaoDoEmpresario(f.valor, ag.ganancia) : 0;
  m.contagem.comissoes += comissao;
  pagar(mem, para, f.valor + comissao, f.valor, comissao);
  if (de && f.valor > 0) receber(mem, de, f.valor, cria);
  if (f.tipo === 'compra' || f.tipo === 'livre') m.compras.set(para, (m.compras.get(para) ?? 0) + 1);
  if (f.tipo === 'compra') m.contagem.compras += 1;
  if (f.tipo === 'livre') m.contagem.livres += 1;
  if (f.europa) m.contagem.europeias += 1;
  m.transferencias.push({ ano: m.ano, semana: f.semana, jogador: j.id, de, para, valor: f.valor, tipo: f.tipo, europa: !!f.europa, cria });
}

function pagar(mem: Memoria, clube: string, total: number, valor: number, comissao: number): void {
  const c = mem.financas.get(clube);
  if (c) { c.caixa -= total; c.orcamento = Math.max(0, c.orcamento - total); c.ano.compras += valor; c.ano.comissoes += comissao; return; }
  const r = mem.mercado!.reduzidas.get(clube);
  if (r) r.orcamento = Math.max(0, r.orcamento - total);
}
function receber(mem: Memoria, clube: string, valor: number, cria: boolean): void {
  const c = mem.financas.get(clube);
  if (c) { c.caixa += valor; c.orcamento += valor; c.ano.vendas += valor; if (cria) c.ano.vendasCrias += valor; return; }
  const r = mem.mercado!.reduzidas.get(clube);
  if (r) r.orcamento += valor;
}

// ---------- Empréstimos (PROVISORIO, decisão de 13/11/2026) ----------

function tentarEmprestimo(mem: Memoria, clube: string, grupo: string, piorTitular: number, semana: number, rng: Rng): void {
  const m = mem.mercado!;
  const folga = tetoDe(mem, clube) - folhaDoClube(mem, clube);
  const opcoes: { j: Jogador; origem: string; nota: number }[] = [];
  for (const [origem, js] of Object.entries(mem.elencos)) {
    if (origem === clube || m.europeus.has(origem)) continue;
    const p = mem.periodo.get(origem);
    for (const j of js) {
      if (grupoDe(j) !== grupo || j.idade > M.emprestimo.idade || emprestado(m, j.id) || m.preContratos.has(j.id)) continue;
      const s = mem.evolucao.get(j.id);
      const fr = p && p.jogosAno >= 5 && s ? s.minAno / (p.jogosAno * 90) : papelNoElenco(js, j) === 'titular' ? 1 : 0;
      if (fr >= M.emprestimo.minutos || js.length <= M.elenco.ideal) continue;
      const nota = estimativa(mem, clube, j).nota;
      if (nota < piorTitular + M.melhora || j.salario * M.emprestimo.salario > folga) continue;
      opcoes.push({ j, origem, nota });
    }
  }
  const o = opcoes.sort((a, b) => b.nota - a.nota)[0];
  if (!o) return;
  const papel = papelDeQuemChega(mem.elencos[clube], grupo, o.nota);
  const ag = m.agenteDe.get(o.j.id);
  if (ag?.perfil === 'Protetor' && papel === 'reserva') return;
  const ch = chanceDoJogador(1, 1, { reputacaoDestino: m.clubes.get(clube)!.reputacao, reputacaoAtual: m.clubes.get(o.origem)!.reputacao, ambicao: o.j.ambicao, papel, libertadores: m.libertadores.has(clube), memoria: ag?.memoria[clube] ?? 0 });
  // Sem minutos, o jovem aceita jogar fora: a chance não fica abaixo de 50%.
  if (!rng.pct(Math.max(50, ch))) return;
  m.emprestimos.push({ jogador: o.j.id, origem: o.origem, destino: clube });
  m.contagem.emprestimos += 1;
  concluir(mem, o.j, o.origem, clube, { valor: 0, salario: o.j.salario, semana, tipo: 'emprestimo' }, rng);
  m.compras.set(clube, (m.compras.get(clube) ?? 0) + 1);
}

// ---------- Europa (GDD-gestao 11) ----------

function tentativaEuropeia(mem: Memoria, clube: string, semana: number, janela: 0 | 1, rng: Rng): void {
  const m = mem.mercado!;
  const resta = m.tentativasEuropa.get(clube) ?? 0;
  if (!resta || mem.elencos[clube].length >= M.elenco.max) return;
  const [, fim] = M.janelas[janela];
  if (!rng.pct((resta / (fim - semana + 1)) * 100)) return;
  m.tentativasEuropa.set(clube, resta - 1);
  if (!rng.pct(M.europa.proposta)) return;
  const forca = m.clubes.get(clube)?.forca ?? 15;
  const alvos: Alvo[] = [];
  for (const [c, js] of Object.entries(mem.elencos)) {
    if (m.europeus.has(c)) continue;
    for (const j of js) {
      if (j.idade > M.europa.idade || emprestado(m, j.id) || m.preContratos.has(j.id) || m.fechadas.has(`${clube}>${j.id}`)) continue;
      const est = estimativa(mem, clube, j);
      if (Math.max(est.nota, est.pot) < forca - M.europa.folgaForca) continue;
      const valor = valorEstimado(mem, clube, j, semana);
      if (valor * M.europa.oferta[0] > orcamentoDe(mem, clube)) continue;
      alvos.push({ j, est, valor, livre: false, preContrato: false });
    }
  }
  if (!alvos.length) return;
  alvos.sort((a, b) => Math.max(b.est.nota, b.est.pot) - Math.max(a.est.nota, a.est.pot));
  const alvo = alvos[rng.int(0, Math.min(4, alvos.length - 1))];
  m.contagem.propostasEuropa += 1;
  negociar(mem, clube, alvo, M.europa.oferta[1], semana, rng, true);
}

// ---------- Virada ----------

export interface ResumoMercado {
  vencidos: number; preContratos: number; voltaram: number; saidasEuropa: number; geradosEuropa: number;
  forca: Record<string, number>;
  ano: ContagemMercado;
  /** Transferências do ano. */
  transferencias: Transferencia[];
}

/** Antes das pessoas (etapa 6): empréstimos voltam, pré-contratos mudam de clube e os contratos vencidos viram livres. */
export function viradaContratos(mem: Memoria): { vencidos: number; preContratos: number; voltaram: number } {
  const m = mem.mercado!;
  let voltaram = 0, pre = 0, vencidos = 0;
  for (const e of m.emprestimos) {
    const j = (mem.elencos[e.destino] ?? []).find((x) => x.id === e.jogador);
    if (!j || !mem.elencos[e.origem]) continue;
    mem.elencos[e.destino] = mem.elencos[e.destino].filter((x) => x.id !== j.id);
    j.clubeId = e.origem;
    mem.elencos[e.origem].push(j);
    voltaram += 1;
  }
  m.emprestimos = [];
  const ano = anoCalendario(m);
  const chegam: [string, Jogador][] = [];
  for (const [c, js] of Object.entries(mem.elencos)) {
    const ficam: Jogador[] = [];
    for (const j of js) {
      const pc = m.preContratos.get(j.id);
      if (pc && mem.elencos[pc.destino]) {
        Object.assign(j, { salario: pc.salario, contrato: pc.contrato, clubeId: pc.destino });
        if (j.qualidades.includes(CRIA)) j.qualidades = j.qualidades.filter((q) => q !== CRIA);
        const s = mem.jogadores.get(j.id);
        if (s) s.moral = MORAL_CHEGADA;
        chegam.push([pc.destino, j]);
        pre += 1;
      } else if (j.contrato !== null && j.contrato <= ano) {
        j.clubeId = null;
        j.contrato = null;
        m.livres.push(j);
        m.livreDesde.set(j.id, { ano: m.ano, dispensado: false });
        mem.jogadores.delete(j.id);
        vencidos += 1;
      } else ficam.push(j);
    }
    mem.elencos[c] = ficam;
  }
  for (const [c, j] of chegam) mem.elencos[c].push(j);
  m.preContratos.clear();
  m.querSair.clear();
  m.renovacao.clear();
  m.contagem.vencidos += vencidos;
  return { vencidos, preContratos: pre, voltaram };
}

/**
 * Decisão do Gustavo (14/11/2026): na virada, antes das subidas, a IA completa o elenco até 23 com livres que superam
 * o melhor jovem da base no grupo mais em falta (pelo elenco-alvo), se o salário couber no teto. A base completa o resto.
 */
export function livresAntesDaBase(mem: Memoria, livres: Jogador[], rng: Rng): number {
  const m = mem.mercado!;
  m.livres = livres;
  limparCache();
  let n = 0;
  for (const clube of mem.gestao.keys()) {
    const base = mem.base.get(clube) ?? [];
    const tentados = new Set<string>();
    while (mem.elencos[clube].length < BASE.elencoMin) {
      const el = mem.elencos[clube];
      const falta = (g: string): number => (BASE.alvo[g] ?? 0) - el.filter((j) => grupoDe(j) === g).length;
      const g = Object.keys(BASE.alvo).filter((x) => !tentados.has(x)).sort((a, b) => falta(b) - falta(a))[0];
      if (!g) break;
      tentados.add(g);
      const jovem = Math.max(0, ...base.filter((j) => grupoDe(j) === g).map((j) => j.nota));
      const folga = tetoDe(mem, clube) - folhaDoClube(mem, clube);
      const j = m.livres.filter((x) => grupoDe(x) === g)
        .map((x) => ({ x, nota: estimativa(mem, clube, x).nota, salario: pedidoSalarial(x.salario, referencia(mem, clube, x.nota), m.agenteDe.get(x.id)?.ganancia ?? 10) }))
        .filter((o) => o.nota > jovem && o.salario <= folga)
        .sort((a, b) => b.nota - a.nota)[0];
      if (!j) continue;
      tentados.delete(g);
      concluir(mem, j.x, null, clube, { valor: 0, salario: j.salario, semana: 1, tipo: 'livre' }, rng);
      n += 1;
    }
  }
  return n;
}

const media11 = (js: Jogador[]): number => {
  const top = js.map((j) => j.nota).sort((a, b) => b - a).slice(0, 11);
  return top.reduce((a, b) => a + b, 0) / Math.max(1, top.length);
};

/** Guarda a escala do ano 0 de cada europeu (chamar ao criar o mercado; sem isso, vale a do 1º uso). */
export function registrarEscalaEuropa(mem: Memoria): void {
  const m = mem.mercado!;
  for (const id of m.europeus) {
    const el = mem.elencos[id];
    if (!el?.length || m.escalaEuropa.has(id)) continue;
    m.escalaEuropa.set(id, { forca: m.clubes.get(id)?.forca ?? 15, top: media11(el), media: el.reduce((a, j) => a + j.nota, 0) / el.length });
  }
}

/**
 * Depois das pessoas: contrato para quem subiu da base, renovação dos elencos europeus (31+ com 50% de sair, sempre, decisão de 14/11/2026;
 * gerador completa 26 na escala do elenco: nota = média do elenco no ano 0 + variação da Força ± 3, um jovem com
 * essa média − 3 e Pot + 2) e Força relativa (decisão de 14/11/2026): Força da ficha + variação da média das 11
 * melhores desde o ano 0, ± 1 por ano. A ficha (14 a 19) não está na escala do elenco (11 melhores 18,6 a 19,4);
 * com "Força = média das 11 melhores" todos iam a 20 e o gerador criava craques.
 */
export function viradaEuropaEContratos(mem: Memoria, moldes: Jogador[], rng: Rng): { saidasEuropa: number; geradosEuropa: number; forca: Record<string, number> } {
  const m = mem.mercado!;
  const proximo = anoCalendario(m) + 1;
  for (const js of Object.values(mem.elencos)) for (const j of js) if (j.contrato === null) j.contrato = proximo + 2;
  let saidas = 0, gerados = 0;
  const forca: Record<string, number> = {};
  const E = M.europa;
  registrarEscalaEuropa(mem);
  for (const id of m.europeus) {
    const clube = m.clubes.get(id)!;
    const el = mem.elencos[id];
    if (!el) continue;
    const f = clube.forca ?? 15;
    const esc = m.escalaEuropa.get(id) ?? { forca: f, top: media11(el), media: f };
    const centro = Math.round(esc.media + f - esc.forca);
    for (const j of embaralhar(el.filter((x) => x.idade >= E.saida.idade), rng)) {
      if (!rng.pct(E.saida.chance)) continue;
      mem.elencos[id] = mem.elencos[id].filter((x) => x.id !== j.id);
      j.clubeId = null;
      j.contrato = null;
      m.livres.push(j);
      m.livreDesde.set(j.id, { ano: m.ano, dispensado: false });
      mem.jogadores.delete(j.id);
      saidas += 1;
    }
    let jovem = true;
    while (mem.elencos[id].length < E.elenco) {
      const doClube = mem.elencos[id];
      const g = posicaoMaisFraca(doClube).grupo;
      const molde = moldes.filter((x) => grupoDe(x) === g)[rng.int(0, Math.max(0, moldes.filter((x) => grupoDe(x) === g).length - 1))] ?? moldes[0];
      const idade = jovem ? 18 : rng.int(18, 28);
      const nota = Math.max(1, Math.min(20, jovem ? centro - E.nota : centro + rng.int(-E.nota, E.nota)));
      const pot = jovem ? Math.min(20, centro + E.jovem) : Math.min(20, Math.max(nota, nota + (idade <= 23 ? rng.int(0, 3) : 0)));
      const j = gerarJogador({ id: `EUR-${++mem.seq}`, molde, nota, potencial: pot, idade, clubeId: id, nacionalidade: molde.nacionalidade, perfilJovem: idade <= 21 ? PERFIL.nomes[rng.int(0, PERFIL.nomes.length - 1)] : null, tipo: jovem ? 'Jovem' : 'Contratado' }, mem.nomes, rng);
      j.salario = Math.round(salarioReferencia(nota, 'europa'));
      j.contrato = proximo + rng.int(1, 4);
      mem.elencos[id].push(j);
      mem.jogadores.set(j.id, novoEstado());
      mem.evolucao.set(j.id, criarEvolucao(j));
      jovem = false;
      gerados += 1;
    }
    const alvo = Math.round(esc.forca + media11(mem.elencos[id]) - esc.top);
    const nova = f + Math.max(-E.forcaPasso, Math.min(E.forcaPasso, alvo - f));
    if (nova !== f) forca[id] = nova - f;
    clube.forca = nova;
  }
  m.contagem.saidasEuropa += saidas;
  m.contagem.geradosEuropa += gerados;
  // Ninguém começa o ano abaixo de 18 jogadores ou de 2 goleiros: completa com livres (GDD-gestao 6).
  for (const c of mem.gestao.keys()) {
    for (let i = 0; i < M.elenco.min; i++) {
      const el = mem.elencos[c];
      if (el.length >= M.elenco.min && el.filter((j) => j.posicao === 'GOL').length >= M.elenco.goleiros) break;
      const antes = el.length;
      assinarLivreDeEmergencia(mem, c, 1, rng);
      if (mem.elencos[c].length === antes) break;
    }
  }
  // Limpeza: relatórios e notas de quem saiu do mundo.
  const vivos = new Set([...Object.values(mem.elencos).flat(), ...m.livres].map((j) => j.id));
  for (const k of m.conhecimento.keys()) if (!vivos.has(k.slice(k.indexOf('>') + 1))) m.conhecimento.delete(k);
  for (const k of m.notas.keys()) if (!vivos.has(k)) m.notas.delete(k);
  // Orçamento do ano seguinte dos clubes sem conta: o da ficha (decisão de 13/11/2026); sobra não acumula (PROVISORIO).
  for (const r of m.reduzidas.values()) r.orcamento = r.orcamentoAno;
  return { saidasEuropa: saidas, geradosEuropa: gerados, forca };
}
