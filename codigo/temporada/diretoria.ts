// Diretoria e torcida no calendário (etapa 4, 6ª fatia; GDD-gestao 9 e 11). IA nos clubes sul-americanos; Europa fora.
// Depois de cada jogo: Humor e Confiança. Copas: eliminação e título. Mês: Humor volta ao 50, Confiança pelo Humor e pelo caixa.
// Semana: vendas de Ídolo e Cria e grandes contratações. Virada: metas, investidor, eleição e contrato do técnico. Demissão na Confiança 0.
import type { Clube, Jogador, Tatica, Tecnico } from '../motor/dados.ts';
import type { Rng } from '../motor/rng.ts';
import { criarRng, semearDeTexto } from '../motor/rng.ts';
import type { EntradaTime } from '../motor/tipos.ts';
import type { Avaliacao, FechoDoAno, FichaDiretoria, Financeiro, Meta, NivelMeta } from '../gestao/diretoria.ts';
import {
  DIRETORIA, PMG, TORCIDA, avaliar, copaNaMeta, efeitoDaMeta, eleger, fatorQueda, metaDoInvestidor, metasGeradas, mexerConfianca, mexerHumor, nivelDaIA, partesDaMeta, voltarHumor,
} from '../gestao/diretoria.ts';
import { efetivo } from '../gestao/comissao.ts';
import { moralDoGrupo } from '../gestao/moral.ts';
import type { Copa } from './copas.ts';
import type { Memoria } from './memoria.ts';
import { trocarTecnico } from './pessoas.ts';
import type { ControleJogador } from './jogador.ts';
import { confiancaInicial } from './jogador.ts';
import { desligarManual } from './mercadoJogador.ts';
import { incluirNaImprensa } from './eventos.ts';
import { janelaDaSemana, semanaDoDia } from '../gestao/mercado.ts';

export interface EstadoDiretoria {
  ficha: FichaDiretoria;
  confianca: number;
  semVencer: number;
  nivel: NivelMeta;
  metas: Record<NivelMeta, Meta | null>;
  /** Falhou a Ousada: metade do bônus no ano seguinte. */
  bonusMetade: boolean;
  /** Investidor cortou o orçamento do ano seguinte. */
  corte: boolean;
  /** Último ano da carreira coberto pelo contrato do técnico. */
  contratoAte: number;
  tecnico: string;
  inicio: number;
  sociosInicio: number;
  dividaInicio: number;
  humorAno: { soma: number; n: number };
  investidor: { receitas: number[]; resultados: number[] };
}

export interface ContagemDiretoria {
  /** Demissões e saídas: ano, clube, motivo e anos no cargo. */
  saidas: { ano: number; clube: string; motivo: Motivo; anos: number }[];
  renovacoes: number;
  metas: Record<Avaliacao, number>;
  niveis: Record<NivelMeta, number>;
  eleicoes: number;
  presidentesNovos: number;
  investidor: { avaliacoes: number; corta: number; troca: number; vende: number; safsNovas: number };
  humor: { soma: number; n: number; extremo: number };
  aval: { estrutura: number; emprestimo: number; venda: number };
  confiancaVirada: number[];
  /** Compras financiadas pelo crédito do Gastador (R$ mi). */
  credito: number;
  /** 7ª fatia: defeitos na torcida (soma do Humor, jogos com efeito) e amostra mensal dos clubes com conta (moral do grupo, Humor, Confiança). */
  defeitos: { soma: number; n: number; tipos: Record<string, number> };
  br: { moral: number; humor: number; confianca: number; n: number };
}

export const novaContagemDiretoria = (): ContagemDiretoria => ({
  saidas: [], renovacoes: 0, metas: { Superou: 0, Cumpriu: 0, Falhou: 0 }, niveis: { 'Padrão': 0, 'Ousada': 0, 'Modesta': 0 }, eleicoes: 0, presidentesNovos: 0,
  investidor: { avaliacoes: 0, corta: 0, troca: 0, vende: 0, safsNovas: 0 }, humor: { soma: 0, n: 0, extremo: 0 }, aval: { estrutura: 0, emprestimo: 0, venda: 0 }, confiancaVirada: [], credito: 0,
  defeitos: { soma: 0, n: 0, tipos: {} }, br: { moral: 0, humor: 0, confianca: 0, n: 0 },
});

/** O que a diretoria precisa do ano em curso. */
export interface CtxDiretoria {
  ano: number;
  dia: number;
  tecnicos: Tecnico[];
  entradas: Record<string, EntradaTime>;
  tatica: Tatica;
  clubesPorLiga: Record<string, string[]>;
  /** Clube do jogador (8ª fatia). */
  jogador?: ControleJogador;
}

const DIAS_ANO = 364;

/** Saída do técnico; 'proposta' = o técnico do jogador assumiu ou saiu por proposta (8b3). */
export type Motivo = 'demissão' | 'contrato' | 'novo dono' | 'proposta';
const momento = (ano: number, dia: number): number => ano - 1 + dia / DIAS_ANO;

/** Diretoria e Humor de cada clube não europeu com ficha (chamado ao criar a memória). */
export function criarDiretorias(mem: Memoria, fichas: FichaDiretoria[], semente: string): void {
  for (const f of fichas) mem.financeiro.set(f.clubeId, f.financeiro);
  for (const f of fichas) {
    const g = mem.gestao.get(f.clubeId);
    if (f.liga === 'europa' || !g) continue;
    const rng = criarRng(semearDeTexto(`${semente}-contrato-${f.clubeId}`));
    mem.diretoria.set(f.clubeId, {
      ficha: { ...f, oposicao: f.oposicao.map((c) => ({ ...c })), investidor: f.investidor ? { ...f.investidor } : null },
      confianca: DIRETORIA.confianca.inicial, semVencer: 0, nivel: 'Padrão', metas: { 'Padrão': null, 'Ousada': null, 'Modesta': null }, bonusMetade: false, corte: false,
      contratoAte: rng.int(...DIRETORIA.contrato.anos), tecnico: g.tecnico.nome, inicio: 0, sociosInicio: 0, dividaInicio: 0, humorAno: { soma: 0, n: 0 }, investidor: { receitas: [], resultados: [] },
    });
    mem.humor.set(f.clubeId, TORCIDA.humor.inicial);
  }
}

/** Aval da diretoria (GDD-gestao 9): Confiança 40 ou mais. Clubes sem diretoria aprovam. */
export const avalDaDiretoria = (mem: Memoria, clube: string): boolean => (mem.diretoria.get(clube)?.confianca ?? 100) >= DIRETORIA.confianca.aval;

/** Parte das vendas que volta ao orçamento, pelo perfil financeiro (GDD-gestao 9). */
export const parteDasVendas = (mem: Memoria, clube: string): number => DIRETORIA.vendas[mem.financeiro.get(clube) as Financeiro] ?? 1;

const blindagem = (mem: Memoria, clube: string): number => {
  const g = mem.gestao.get(clube);
  return g ? efetivo(g.comissao, 'Diretor', 'Blind') : 10;
};
const fator = (mem: Memoria, clube: string, st: EstadoDiretoria): number => fatorQueda(st.ficha.paciencia, blindagem(mem, clube));
const perfil = (mem: Memoria, clube: string): string | null => mem.financas.get(clube)?.perfil ?? mem.mercado?.reduzidas.get(clube)?.perfil ?? null;

/** Humor do clube (quedas pelo perfil). */
export function humor(mem: Memoria, clube: string, delta: number): void {
  const h = mem.humor.get(clube);
  if (h !== undefined) mem.humor.set(clube, mexerHumor(h, delta, perfil(mem, clube)));
}

/** Confiança no técnico (quedas pela Paciência e pela Blindagem); em 0, demissão. */
export function confianca(mem: Memoria, ctx: CtxDiretoria, clube: string, delta: number): void {
  const st = mem.diretoria.get(clube);
  if (!st) return;
  st.confianca = mexerConfianca(st.confianca, delta, fator(mem, clube, st));
  if (st.confianca <= DIRETORIA.confianca.min) demitir(mem, ctx, clube, 'demissão');
}

const forcaDoElenco = (js: Jogador[]): number => {
  const notas = js.map((j) => j.nota).sort((a, b) => b - a).slice(0, 11);
  return notas.reduce((a, b) => a + b, 0) / Math.max(1, notas.length);
};

const ligaDoClube = (ctx: CtxDiretoria, clube: string): string | null => Object.keys(ctx.clubesPorLiga).find((l) => ctx.clubesPorLiga[l].includes(clube)) ?? null;

/** Início do ano: técnico trocado na virada, metas (da ficha na liga de origem; geradas no resto), nível pela Ambição e bônus no orçamento. */
export function inicioDoAno(mem: Memoria, ctx: CtxDiretoria): void {
  for (const [clube, st] of mem.diretoria) {
    const g = mem.gestao.get(clube)!;
    if (g.tecnico.nome !== st.tecnico) novoTecnico(mem, ctx, clube, st, g.tecnico, 'contrato');
    const liga = ligaDoClube(ctx, clube);
    if (!liga) continue;
    const ficha = st.ficha.metas;
    if (ficha && liga === st.ficha.liga) {
      const de = (n: NivelMeta): Meta | null => (ficha[n] ? { nivel: n, texto: ficha[n]!.texto, partes: partesDaMeta(ficha[n]!.texto, liga)!, bonus: ficha[n]!.bonus } : null);
      st.metas = { 'Padrão': de('Padrão'), 'Ousada': de('Ousada'), 'Modesta': de('Modesta') };
    } else {
      const ordem = [...ctx.clubesPorLiga[liga]].sort((a, b) => forcaDoElenco(mem.elencos[b]) - forcaDoElenco(mem.elencos[a]));
      st.metas = metasGeradas(ordem.indexOf(clube) + 1, ordem.length);
    }
    const doJogador = ctx.jogador?.clube === clube && g.tecnico.humano ? ctx.jogador.meta?.(st.metas, mem) ?? null : null;
    st.nivel = doJogador ?? nivelDaIA(st.ficha.ambicao, !!st.metas['Modesta']);
    if (!st.metas[st.nivel]) st.nivel = 'Padrão';
    mem.dir.niveis[st.nivel] += 1;
    const bonus = (st.metas[st.nivel]!.bonus) * (st.bonusMetade ? 0.5 : 1);
    const mult = (1 + bonus) * (st.corte ? DIRETORIA.investidor.corte : 1);
    const c = mem.financas.get(clube);
    if (c) c.orcamento *= mult;
    const r = mem.mercado?.reduzidas.get(clube);
    if (!c && r) r.orcamento *= mult;
    st.bonusMetade = false;
    st.corte = false;
    st.semVencer = 0;
    st.sociosInicio = c?.socios ?? 0;
    st.dividaInicio = c?.divida ?? 0;
    st.humorAno = { soma: 0, n: 0 };
  }
  mem.dirCopas.clear();
}

/** Depois de cada jogo oficial, para um lado: Humor e Confiança pelo resultado; 5 sem vencer. */
export function jogoNaDiretoria(mem: Memoria, ctx: CtxDiretoria, clube: Clube, adversario: string, pro: number, contra: number): void {
  const st = mem.diretoria.get(clube.id);
  if (!st && !mem.humor.has(clube.id)) return;
  const classico = clube.rivais.some((r) => r.clubeId === adversario);
  const c = DIRETORIA.confianca;
  const t = TORCIDA;
  const res = pro > contra ? 1 : pro < contra ? -1 : 0;
  if (res) humor(mem, clube.id, (res > 0 ? t.vitoria : t.derrota) * (classico ? t.classico : 1));
  if (!st) return;
  st.semVencer = res > 0 ? 0 : st.semVencer + 1;
  let d = res ? (res > 0 ? c.vitoria : c.derrota) * (classico ? c.classico : 1) : 0;
  if (st.semVencer >= c.semVencer) { d -= PMG.M; st.semVencer = 0; }
  if (d) confianca(mem, ctx, clube.id, d);
}

/** Depois de cada jogo de copa: eliminações (−P fora da meta, −M se era meta) e o título (+G no Humor). */
export function copaNaDiretoria(mem: Memoria, ctx: CtxDiretoria, copa: Copa): void {
  for (const k of copa.confrontos) {
    if (!k.vencedor) continue;
    const chave = `${copa.id}-${k.id}`;
    if (mem.dirCopas.has(chave)) continue;
    mem.dirCopas.add(chave);
    const perdedor = k.vencedor === k.a ? k.b : k.a;
    const st = mem.diretoria.get(perdedor);
    if (st) confianca(mem, ctx, perdedor, copaNaMeta(st.metas[st.nivel], copa.id) ? -PMG.M : -PMG.P);
  }
  const campeao = copa.campeao();
  if (campeao && !mem.dirCopas.has(`${copa.id}-campeao`)) {
    mem.dirCopas.add(`${copa.id}-campeao`);
    humor(mem, campeao, PMG.G);
  }
}

/** Fechamento do mês: Confiança pelo Humor (70+ / até 30) e pelo caixa negativo; Humor volta 1 ponto ao 50. */
export function mesNaDiretoria(mem: Memoria, ctx: CtxDiretoria): void {
  const c = DIRETORIA.confianca;
  for (const [clube, h] of mem.humor) {
    mem.dir.humor.soma += h;
    mem.dir.humor.n += 1;
    if (h <= 10 || h >= 90) mem.dir.humor.extremo += 1;
    const st = mem.diretoria.get(clube);
    if (st) {
      st.humorAno.soma += h;
      st.humorAno.n += 1;
      let d = h >= c.humorAlto ? PMG.P : h <= c.humorBaixo ? -PMG.P : 0;
      if ((mem.financas.get(clube)?.caixa ?? 0) < 0) d -= PMG.P;
      if (d) confianca(mem, ctx, clube, d);
      const g = mem.gestao.get(clube);
      if (g && mem.financas.has(clube)) {
        const el = mem.elencos[clube] ?? [];
        mem.dir.br.moral += moralDoGrupo(el, (id) => mem.jogadores.get(id)?.moral ?? 60, (id) => mem.jogadores.get(id)?.titularidades ?? 0, g.jogos);
        mem.dir.br.humor += h;
        mem.dir.br.confianca += st.confianca;
        mem.dir.br.n += 1;
      }
    }
    mem.humor.set(clube, voltarHumor(mem.humor.get(clube)!));
  }
}

/** Semana: venda de Ídolo (−G) ou Cria da casa (−M) e grande contratação (+M) no Humor. */
export function semanaNaDiretoria(mem: Memoria): void {
  const m = mem.mercado;
  if (!m) return;
  for (; mem.dirTransf < m.transferencias.length; mem.dirTransf++) {
    const t = m.transferencias[mem.dirTransf];
    if (t.tipo === 'pre-contrato' || t.tipo === 'emprestimo') continue;
    const j = mem.elencos[t.para]?.find((x) => x.id === t.jogador);
    if (!j) continue;
    if (t.de && mem.humor.has(t.de)) {
      if (j.qualidades.includes('Ídolo')) humor(mem, t.de, -PMG.G);
      else if (t.cria) humor(mem, t.de, -PMG.M);
    }
    if (t.tipo === 'compra' && mem.humor.has(t.para) && j.nota >= forcaDoElenco(mem.elencos[t.para].filter((x) => x.id !== j.id)) + TORCIDA.grande) humor(mem, t.para, PMG.M);
  }
}

/** Livre que assume: o de maior Reputação até a do clube + 1; sem ele, o de maior Reputação. */
function escolherSubstituto(ctx: CtxDiretoria, clube: string, fora: Tecnico): Tecnico | null {
  const rep = ctx.entradas[clube]?.clube.reputacao ?? 10;
  const livres = ctx.tecnicos.filter((t) => t.clubeId === null && t !== fora && !t.humano).sort((a, b) => b.reputacao - a.reputacao);
  return livres.find((t) => t.reputacao <= rep + DIRETORIA.substituto.folga) ?? livres[0] ?? null;
}

/** Registra o novo técnico no estado da diretoria (Confiança 60, contrato novo, tempo no cargo do anterior). */
function novoTecnico(mem: Memoria, ctx: CtxDiretoria, clube: string, st: EstadoDiretoria, novo: Tecnico, motivo: Motivo): void {
  const agora = momento(ctx.ano, ctx.dia);
  mem.dir.saidas.push({ ano: ctx.ano, clube, motivo, anos: agora - st.inicio });
  st.tecnico = novo.nome;
  st.inicio = agora;
  st.confianca = DIRETORIA.confianca.inicial;
  st.semVencer = 0;
  const rng = criarRng(semearDeTexto(`contrato-${clube}-${ctx.ano}-${ctx.dia}`));
  // No meio do ano e na virada, o contrato conta a partir da temporada seguinte; no dia 1, desta.
  st.contratoAte = ctx.ano + rng.int(...DIRETORIA.contrato.anos) - (ctx.dia <= 1 ? 1 : 0);
}

/** Técnico sai (demissão com multa e Reputação −1, contrato vencido ou novo dono); o livre escolhido assume. */
export function demitir(mem: Memoria, ctx: CtxDiretoria, clube: string, motivo: Motivo): void {
  const st = mem.diretoria.get(clube);
  const g = mem.gestao.get(clube);
  if (!st || !g) return;
  const velho = g.tecnico;
  const novo = escolherSubstituto(ctx, clube, velho);
  if (!novo) return;
  if (motivo === 'demissão' || motivo === 'novo dono') {
    const c = mem.financas.get(clube);
    if (c) {
      // Multa: salários restantes do contrato (PROVISORIO: o salário da ficha, 13 meses por ano).
      const meses = Math.max(0, (st.contratoAte - ctx.ano) * 13 + Math.ceil((DIAS_ANO - ctx.dia) / 28));
      const multa = (c.tecnico / 1000) * meses;
      c.caixa -= multa;
      c.ano.tecnico += multa;
    }
  }
  if (motivo === 'demissão') velho.reputacao = Math.max(1, velho.reputacao - 1);
  assumir(mem, ctx, clube, st, g, novo, motivo);
  if (velho.humano) largouClube(mem, ctx, clube, true);
  else abrirVaga(mem, ctx, clube);
}

type GestaoClube = NonNullable<ReturnType<Memoria['gestao']['get']>>;

/** O novo técnico assume o clube e o anterior vai para os livres. */
function assumir(mem: Memoria, ctx: CtxDiretoria, clube: string, st: EstadoDiretoria, g: GestaoClube, novo: Tecnico, motivo: Motivo): void {
  const velho = g.tecnico;
  Object.assign(novo, { clubeId: clube, clube: velho.clube, liga: velho.liga });
  Object.assign(velho, { clubeId: null, clube: '', liga: '' });
  trocarTecnico(g, novo, ctx.tatica);
  if (ctx.entradas[clube]) ctx.entradas[clube] = { ...ctx.entradas[clube], tecnico: novo };
  for (const k of [...mem.leituras.keys()]) if (k.startsWith(`${clube}>`)) mem.leituras.delete(k);
  novoTecnico(mem, ctx, clube, st, novo, motivo);
}

// ---------- 8b3: carreira do técnico do jogador (GDD-gestao 9) ----------

/** PROVISORIO (8b3): propostas ao técnico do jogador. */
export const PROPOSTAS_TECNICO = {
  /** Clube com vaga oferece se a Reputação dele for até esta folga acima da do técnico. */
  folga: 3,
  /** A vaga fica aberta ao técnico do jogador por 4 semanas depois da saída. */
  vagaDias: 28,
  /** Livre: propostas a cada 4 semanas; sem proposta em 26 semanas, o último da Série B oferece. */
  livreDias: 28,
  ultimoBDias: 182,
} as const;

export interface EstadoCarreira {
  vagas: { clube: string; quando: number; oferecida: boolean }[];
  /** Livre desde (momento) e de qual clube saiu; null = empregado. */
  livreDesde: number | null;
  de: string | null;
  proximo: number;
  ultimaProposta: number;
  /** Histórico da carreira: ano, clube e o que houve. */
  historico: { ano: number; clube: string; fato: string }[];
}

export interface PropostaTecnico {
  clube: string;
  reputacao: number;
  liga: string;
  /** Vaga aberta ou o último da Série B (26 semanas sem proposta). */
  motivo: 'vaga' | 'ultimo-b';
  /** O técnico está empregado (aceitar = sair sem multa). */
  empregado: boolean;
  /** Confiança inicial da diretoria nele. */
  confianca: number;
}

export function carreira(mem: Memoria): EstadoCarreira {
  mem.carreira ??= { vagas: [], livreDesde: null, de: null, proximo: 0, ultimaProposta: 0, historico: [] };
  return mem.carreira;
}

const brasileiro = (ctx: CtxDiretoria, clube: string): boolean => ['serie-a', 'serie-b'].some((l) => ctx.clubesPorLiga[l]?.includes(clube));

function abrirVaga(mem: Memoria, ctx: CtxDiretoria, clube: string): void {
  if (!ctx.jogador?.proposta || !brasileiro(ctx, clube)) return;
  carreira(mem).vagas.push({ clube, quando: momento(ctx.ano, ctx.dia), oferecida: false });
}

/** O técnico do jogador deixou o clube: o mercado manual e os eventos de lá acabam; demitido ou sem renovar, fica livre. */
function largouClube(mem: Memoria, ctx: CtxDiretoria, clube: string, livre: boolean): void {
  if (mem.mercado?.manual.has(clube)) desligarManual(mem, clube);
  mem.imprensa?.clubes.delete(clube);
  if (!livre) return;
  const c = carreira(mem);
  const agora = momento(ctx.ano, ctx.dia);
  Object.assign(c, { livreDesde: agora, de: clube, proximo: agora + PROPOSTAS_TECNICO.livreDias / DIAS_ANO, ultimaProposta: agora });
  c.historico.push({ ano: ctx.ano, clube, fato: mem.dir.saidas[mem.dir.saidas.length - 1]?.motivo ?? 'saída' });
}

/** O técnico do jogador assume `clube`; o de lá vai para os livres e, se ele estava empregado, o clube antigo pega um livre (sem multa). */
export function contratarJogador(mem: Memoria, ctx: CtxDiretoria, clube: string, t: Tecnico): boolean {
  const st = mem.diretoria.get(clube);
  const g = mem.gestao.get(clube);
  if (!st || !g || g.tecnico === t) return false;
  const antigo = t.clubeId;
  if (antigo) {
    const sa = mem.diretoria.get(antigo);
    const ga = mem.gestao.get(antigo);
    const sub = escolherSubstituto(ctx, antigo, t);
    if (!sa || !ga || !sub) return false;
    assumir(mem, ctx, antigo, sa, ga, sub, 'proposta');
    largouClube(mem, ctx, antigo, false);
    carreira(mem).historico.push({ ano: ctx.ano, clube: antigo, fato: 'saiu por proposta' });
  }
  assumir(mem, ctx, clube, st, g, t, 'proposta');
  st.confianca = confiancaInicial(t, ctx.entradas[clube].clube);
  const c = carreira(mem);
  Object.assign(c, { livreDesde: null, de: null });
  c.historico.push({ ano: ctx.ano, clube, fato: 'assumiu' });
  if (ctx.jogador) ctx.jogador.clube = clube;
  incluirNaImprensa(mem, clube);
  return true;
}

/**
 * Propostas ao técnico do jogador (só com o gancho `proposta`). Empregado: na janela e na virada (dia 1), de clubes com vaga,
 * Reputação até a folga acima da dele e não menor que a do clube atual. Livre: a cada 4 semanas (e no dia 1), vagas pela
 * Reputação; sem proposta em 26 semanas, o último da Série B. Resposta null = aceita se livre, recusa se empregado.
 */
export function cicloDoTecnico(mem: Memoria, ctx: CtxDiretoria, ultimoB: () => string[]): void {
  const J = ctx.jogador;
  const t = ctx.tecnicos.find((x) => x.humano);
  if (!J?.proposta || !t) return;
  const P = PROPOSTAS_TECNICO;
  const c = carreira(mem);
  const agora = momento(ctx.ano, ctx.dia);
  const eps = 1e-9;
  c.vagas = c.vagas.filter((v) => agora - v.quando <= P.vagaDias / DIAS_ANO + eps);
  const livre = t.clubeId === null;
  if (livre) {
    if (agora < c.proximo - eps && ctx.dia > 1) return;
    c.proximo = agora + P.livreDias / DIAS_ANO;
  } else if (ctx.dia > 1 && janelaDaSemana(semanaDoDia(ctx.dia)) === null) return;
  const rep = (id: string): number => ctx.entradas[id]?.clube.reputacao ?? 0;
  const minimo = livre ? 0 : rep(t.clubeId!);
  const oferecer = (clube: string, motivo: PropostaTecnico['motivo']): boolean => {
    c.ultimaProposta = agora;
    const p: PropostaTecnico = { clube, reputacao: rep(clube), liga: ctx.entradas[clube]?.clube.liga ?? '', motivo, empregado: !livre, confianca: confiancaInicial(t, ctx.entradas[clube].clube) };
    const r = J.proposta!(p, mem) ?? livre;
    if (!r) c.historico.push({ ano: ctx.ano, clube, fato: 'proposta recusada' });
    return r && contratarJogador(mem, ctx, clube, t);
  };
  for (const v of c.vagas) {
    if (v.oferecida || v.clube === t.clubeId || v.clube === c.de || rep(v.clube) > t.reputacao + P.folga || rep(v.clube) < minimo) continue;
    if (!mem.gestao.get(v.clube) || mem.gestao.get(v.clube)!.tecnico.humano) continue;
    v.oferecida = true;
    if (oferecer(v.clube, 'vaga')) return;
  }
  if (livre && agora - c.ultimaProposta >= P.ultimoBDias / DIAS_ANO - eps) {
    const alvo = ultimoB().filter((x) => x !== c.de && mem.gestao.has(x)).pop();
    if (alvo) oferecer(alvo, 'ultimo-b');
  }
}

/** Novo presidente ou investidor: Confiança vira 50; se ele "troca" o técnico, 25% de demissão. */
function novoDono(mem: Memoria, ctx: CtxDiretoria, clube: string, st: EstadoDiretoria, troca: boolean, rng: Rng): void {
  st.confianca = DIRETORIA.confianca.novoDono;
  if (troca && rng.pct(DIRETORIA.confianca.trocaChance)) demitir(mem, ctx, clube, 'novo dono');
}

export interface FechoVirada {
  tabelas: Record<string, { clube: string }[]>;
  campeoes: Record<string, string>;
  rebaixados: string[];
  /** Fase mais longe de cada clube em cada copa. */
  copas: Record<string, Map<string, string>>;
  rng: Rng;
}

/** Virada (GDD-gestao 9 e 11), depois das finanças e antes das pessoas: metas, investidor, eleição, demissão e contrato. */
export function viradaDiretoria(mem: Memoria, ctx: CtxDiretoria, w: FechoVirada): void {
  const p = DIRETORIA.popularidade;
  const limitarPop = (v: number): number => Math.max(p.min, Math.min(p.max, v));
  const ultimosB = (w.tabelas['serie-b'] ?? []).slice(-3).map((l) => l.clube);
  const titulos = new Set(Object.values(w.campeoes));
  for (const [clube, h] of mem.humor) if (Object.keys(ctx.clubesPorLiga).some((l) => w.campeoes[l] === clube)) mem.humor.set(clube, mexerHumor(h, PMG.G, perfil(mem, clube)));
  for (const [clube, st] of mem.diretoria) {
    const liga = ligaDoClube(ctx, clube);
    if (!liga) continue;
    const c = mem.financas.get(clube);
    const hist = c?.historico[c.historico.length - 1];
    const g = mem.gestao.get(clube)!;
    const f: FechoDoAno = {
      posicao: (w.tabelas[liga] ?? []).findIndex((l) => l.clube === clube) + 1,
      copa: ['copa-do-brasil', 'libertadores', 'mundial'].some((k) => w.campeoes[k] === clube),
      longe: DIRETORIA.longe.includes(w.copas['libertadores']?.get(clube) ?? ''),
      socios: !!c && c.socios > st.sociosInicio,
      salarios: !hist || hist.lanc.mesesAtraso === 0,
      semPrejuizo: !hist || hist.resultado >= 0,
      divida: !!c && c.divida < st.dividaInicio,
      base: (mem.elencos[clube] ?? []).some((j) => j.qualidades.includes('Cria da casa') && j.idade <= DIRETORIA.revelar.idade
        && g.jogos > 0 && (mem.jogadores.get(j.id)?.titularidades ?? 0) / g.jogos >= DIRETORIA.revelar.titular),
    };
    // Metas.
    const a = avaliar(st.metas, st.nivel, f);
    mem.dir.metas[a] += 1;
    const ef = efeitoDaMeta(a, st.nivel);
    st.bonusMetade = a === 'Falhou' && st.nivel === 'Ousada';
    let dConf = ef.confianca;
    if (ultimosB.includes(clube)) dConf -= PMG.M;
    st.ficha.popularidade = limitarPop(st.ficha.popularidade + ef.popularidade + (titulos.has(clube) ? p.titulo : 0) + (w.rebaixados.includes(clube) ? p.queda : 0));
    confianca(mem, ctx, clube, dConf);
    // SAF nova (finanças): o investidor assume, com meta gerada e sem eleição.
    if (c?.saf && !st.ficha.saf) {
      st.ficha.saf = true;
      st.ficha.eleicao = null;
      const n = DIRETORIA.investidor.nova;
      st.ficha.investidor = { tipo: 'receita', valor: (hist?.receita ?? 0) * n.receita, prazo: n.prazo, falha: (['corta', 'troca', 'vende'] as const)[w.rng.int(0, 2)] };
      st.investidor = { receitas: [], resultados: [] };
      mem.dir.investidor.safsNovas += 1;
      novoDono(mem, ctx, clube, st, w.rng.pct(50), w.rng);
    } else if (st.ficha.saf && st.ficha.investidor && hist) {
      // Meta do investidor, avaliada a cada prazo.
      const inv = st.ficha.investidor;
      st.investidor.receitas.push(hist.receita);
      st.investidor.resultados.push(hist.resultado);
      if (st.investidor.receitas.length >= inv.prazo) {
        mem.dir.investidor.avaliacoes += 1;
        if (!metaDoInvestidor(inv, st.investidor.receitas, st.investidor.resultados)) {
          mem.dir.investidor[inv.falha] += 1;
          if (inv.falha === 'corta') st.corte = true;
          else novoDono(mem, ctx, clube, st, inv.falha === 'vende' || w.rng.pct(50), w.rng);
        }
        st.investidor = { receitas: [], resultados: [] };
      }
    }
    // Eleição nas associações: na data da ficha, depois a cada 3 temporadas.
    if (!st.ficha.saf && st.ficha.eleicao === ctx.ano) {
      mem.dir.eleicoes += 1;
      st.ficha.eleicao = ctx.ano + DIRETORIA.eleicao.intervalo;
      const venceu = eleger(st.ficha.popularidade, st.ficha.oposicao, w.rng);
      if (venceu >= 0) {
        const novo = st.ficha.oposicao[venceu];
        mem.dir.presidentesNovos += 1;
        // PROVISORIO: o ex-presidente vai para a oposição com a Popularidade como Força; o eleito começa com a Força como Popularidade.
        st.ficha.oposicao.splice(venceu, 1, { nome: 'Ex-presidente', paciencia: st.ficha.paciencia, ambicao: st.ficha.ambicao, financeiro: st.ficha.financeiro, interferencia: st.ficha.interferencia, forca: st.ficha.popularidade, troca: false });
        Object.assign(st.ficha, { paciencia: novo.paciencia, ambicao: novo.ambicao, financeiro: novo.financeiro, interferencia: novo.interferencia, popularidade: limitarPop(novo.forca) });
        mem.financeiro.set(clube, novo.financeiro);
        novoDono(mem, ctx, clube, st, novo.troca, w.rng);
      }
    }
    // Contrato vencido: renova com Confiança 50+ ou meta cumprida (Gustavo, 15/11/2026).
    if (mem.gestao.get(clube)!.tecnico.nome === st.tecnico && st.contratoAte <= ctx.ano) {
      if (st.confianca >= DIRETORIA.contrato.renova || a !== 'Falhou') {
        const anos = w.rng.int(...DIRETORIA.contrato.anos);
        // 8b3: o técnico do jogador aceita (escolhe de 1 a 3 anos) ou recusa e fica livre; null aceita a duração sorteada.
        const pedido = g.tecnico.humano && ctx.jogador?.renovacao ? ctx.jogador.renovacao({ clube, anos, confianca: st.confianca, avaliacao: a }, mem) : null;
        const n = pedido === null ? anos : Math.max(0, Math.min(DIRETORIA.contrato.anos[1], Math.round(pedido)));
        if (n > 0) {
          st.contratoAte = ctx.ano + n;
          mem.dir.renovacoes += 1;
        } else demitir(mem, ctx, clube, 'contrato');
      } else demitir(mem, ctx, clube, 'contrato');
    }
    mem.dir.confiancaVirada.push(st.confianca);
  }
}

/** Humor médio do ano (para os pontos de torcida na virada). */
export const humorMedioDoAno = (mem: Memoria, clube: string): number | null => {
  const st = mem.diretoria.get(clube);
  return st && st.humorAno.n ? st.humorAno.soma / st.humorAno.n : null;
};
