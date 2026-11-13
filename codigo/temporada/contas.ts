// Finanças no calendário (etapa 4, 4ª fatia): bilheteria a cada jogo em casa, fechamento do mês e virada (GDD-gestao 7 e 11).
import type { Clube } from '../motor/dados.ts';
import type { Rng } from '../motor/rng.ts';
import type { Conta } from '../gestao/financas.ts';
import {
  FINANCAS, amortizar, andarPerfil, custoDe, custoObra, fecharMes, gerente, lancarBilheteria, malNaTabela, novoAnoConta, orcamentoETeto,
  perfilPelaCondicao, premioCopa, premioLiga, receitaDe, renovarCotas, resultadoCampanha, tentarSaf,
} from '../gestao/financas.ts';
import { quedaMoral } from '../gestao/comissao.ts';
import type { Memoria } from './memoria.ts';

const folhaMil = (mem: Memoria, id: string): number => (mem.elencos[id] ?? []).reduce((s, j) => s + j.salario, 0);
const comissaoMil = (mem: Memoria, id: string): number => (mem.gestao.get(id)?.comissao.profissionais ?? []).reduce((s, p) => s + p.salario, 0);
const niveisAcima = (c: Conta, clube: Clube): number => Math.max(0, (clube.estruturaCT ?? c.ctInicial) - c.ctInicial) + Math.max(0, (clube.estruturaBase ?? c.baseInicial) - c.baseInicial);

/** Sobe 1 nível de CT ou base no clube e na comissão (que guarda a estrutura para o atributo efetivo). */
function subirEstrutura(mem: Memoria, clube: Clube, tipo: 'ct' | 'base'): void {
  const max = FINANCAS.estrutura.max;
  const g = mem.gestao.get(clube.id);
  if (tipo === 'ct') {
    clube.estruturaCT = Math.min(max, (clube.estruturaCT ?? 10) + 1);
    if (g) g.comissao.ct = clube.estruturaCT;
  } else {
    clube.estruturaBase = Math.min(max, (clube.estruturaBase ?? 10) + 1);
    if (g) g.comissao.base = clube.estruturaBase;
  }
}

/** Depois de cada jogo: bilheteria do mandante (campo neutro não conta) e tabela da liga para o "mal na tabela". */
export function jogoNasContas(mem: Memoria, competicao: string, mandante: Clube, visitante: string, placar: [number, number], neutro: boolean, decisao: boolean, ligaDe: (id: string) => string[]): void {
  const c = mem.financas.get(mandante.id);
  const liga = competicao === 'serie-a' || competicao === 'serie-b';
  if (c && !neutro) {
    const outras = ligaDe(mandante.id).filter((id) => id !== mandante.id).map((id) => mem.financas.get(id)).filter((x): x is Conta => !!x);
    lancarBilheteria(c, {
      classico: mandante.rivais.some((r) => r.clubeId === visitante), decisao, libertadores: competicao === 'libertadores', malNaTabela: malNaTabela(c, outras),
    }, gerente(mem.gestao.get(mandante.id)?.comissao));
  }
  if (!liga) return;
  const lados: [string, number][] = [[mandante.id, 0], [visitante, 1]];
  for (const [id, k] of lados) {
    const x = mem.financas.get(id);
    if (!x) continue;
    const pro = placar[k], contra = placar[1 - k];
    x.liga.pontos += pro > contra ? 3 : pro === contra ? 1 : 0;
    x.liga.saldo += pro - contra;
    x.liga.jogos += 1;
  }
}

export interface ContagemMes { atrasos: number; rescisoes: number }

/** Fechamento do mês para todos os clubes com conta; obras que terminam entram agora. */
export function fecharMesContas(mem: Memoria, dia: number, clubes: (id: string) => Clube): void {
  for (const [id, c] of mem.financas) {
    const clube = clubes(id);
    for (const o of c.obras.filter((x) => x.dia <= dia)) subirEstrutura(mem, clube, o.tipo);
    c.obras = c.obras.filter((x) => x.dia > dia);
    const g = mem.gestao.get(id);
    const r = fecharMes(c, { dia, liga: clube.liga, torcida: clube.torcidaTamanho ?? c.torcidaInicial, folhaMil: folhaMil(mem, id), comissaoMil: comissaoMil(mem, id), gerente: gerente(g?.comissao), niveisAcima: niveisAcima(c, clube) });
    // 2 meses ou mais sem pagar a folha: moral −M por mês (GDD-gestao 7), com o psicólogo (GDD-gestao 3).
    if (r.atrasados >= FINANCAS.atraso.moralApos) {
      const queda = FINANCAS.atraso.moral * (g ? quedaMoral(g.comissao) : 1);
      for (const j of mem.elencos[id] ?? []) {
        const s = mem.jogadores.get(j.id);
        if (s) s.moral = Math.max(0, s.moral - queda);
      }
    }
  }
}

export interface ResumoFinancas {
  /** Caixa negativo na virada (depois da premiação). */
  negativos: string[];
  safs: string[];
  perfis: { clube: string; de: string; para: string }[];
  obras: number;
  cotas: number;
}

export interface MundoContas {
  ano: number;
  clubes: Clube[];
  /** Classificação final das ligas (antes do acesso e da queda). */
  tabelas: Record<string, { clube: string }[]>;
  /** Fase mais longe de cada clube em cada copa ("Campeão", "Vice", "Semifinal", ...). */
  copas: Record<string, Map<string, string>>;
  rng: Rng;
}

const ORDEM = ['1ª fase', 'Grupos', 'Oitavas', 'Quartas', 'Semifinal', 'Final'];

/** Fase mais longe de cada clube nas copas com prêmio; na final, Campeão ou Vice. */
export function fasesDasCopas(jogos: { competicao: string; fase?: string; mandante: string; visitante: string }[], campeao: (copa: string) => string | null): Record<string, Map<string, string>> {
  const out: Record<string, Map<string, string>> = {};
  for (const copa of Object.keys(FINANCAS.premioCopa)) {
    const m = new Map<string, string>();
    for (const j of jogos.filter((x) => x.competicao === copa && x.fase)) {
      const f = j.fase!.startsWith('Grupo') ? 'Grupos' : j.fase!;
      for (const id of [j.mandante, j.visitante]) if (ORDEM.indexOf(f) > ORDEM.indexOf(m.get(id) ?? '')) m.set(id, f);
    }
    const c = campeao(copa);
    for (const [id, f] of m) if (f === 'Final') m.set(id, id === c ? 'Campeão' : 'Vice');
    out[copa] = m;
  }
  return out;
}

/** Virada (GDD-gestao 11): premiação, TV, perfil, patrocínios, SAF, estrutura, amortização, orçamento e teto. */
export function viradaContas(mem: Memoria, w: MundoContas): ResumoFinancas {
  const F = FINANCAS;
  const contas = [...mem.financas.values()];
  const clube = (id: string): Clube => w.clubes.find((c) => c.id === id)!;
  const resumo: ResumoFinancas = { negativos: [], safs: [], perfis: [], obras: 0, cotas: 0 };
  const posicao = new Map<string, { liga: string; pos: number }>();
  for (const liga of ['serie-a', 'serie-b']) (w.tabelas[liga] ?? []).forEach((l, i) => posicao.set(l.clube, { liga, pos: i + 1 }));
  // 1. Premiação.
  for (const c of contas) {
    const p = posicao.get(c.clubeId);
    let premio = p ? premioLiga(p.liga, p.pos) : 0;
    for (const [copa, fases] of Object.entries(w.copas)) premio += premioCopa(copa, fases.get(c.clubeId) ?? '');
    c.ano.premiacao += premio;
    c.caixa += premio;
  }
  // Retrato do ano, antes das decisões da virada.
  const receitas = contas.map((c) => receitaDe(c.ano)).sort((a, b) => a - b);
  const corte = receitas[Math.floor(receitas.length * F.perfil.pequeno) - 1] ?? 0;
  for (const c of contas) {
    const receita = receitaDe(c.ano);
    const custo = custoDe(c.ano);
    if (c.caixa < 0) resumo.negativos.push(c.clubeId);
    c.historico.push({ ano: w.ano, perfil: c.perfil, receita, custo, resultado: receita - custo, caixa: c.caixa, divida: c.divida, folha: c.ano.folha, vendas: 0, safNova: false, saf: !!c.saf, mudouPerfil: null, lanc: { ...c.ano } });
  }
  // 3. Os 3 últimos da Série B: TV × 0,75 no ano seguinte.
  const b = (w.tabelas['serie-b'] ?? []).map((l) => l.clube);
  for (const c of contas) c.tvFator = b.slice(-F.ultimosB.n).includes(c.clubeId) ? F.ultimosB.fator : 1;
  // 5. Clube: perfil, patrocínios, SAF e estrutura.
  for (const c of contas) {
    const k = clube(c.clubeId);
    const h = c.historico[c.historico.length - 1];
    const receita = h.receita;
    const candidato = perfilPelaCondicao(c, { reputacao: k.reputacao, torcida: k.torcidaTamanho ?? 10, base: k.estruturaBase ?? 10, receitaBaixa: receita <= corte, vendas: 0 }, w.ano, receita);
    const de = andarPerfil(c, candidato);
    if (de) { resumo.perfis.push({ clube: c.clubeId, de, para: c.perfil }); h.mudouPerfil = c.perfil; k.perfil = c.perfil; }
    const p = posicao.get(c.clubeId);
    const titulos = Object.values(w.copas).filter((f) => f.get(c.clubeId) === 'Campeão').length;
    const rivais = new Set(k.rivais.map((r) => r.clubeId).filter((x): x is string => !!x));
    resumo.cotas += renovarCotas(c, contas, mem.marcas, rivais, w.ano, resultadoCampanha(p?.liga ?? 'serie-b', p?.pos ?? 10, titulos), gerente(mem.gestao.get(c.clubeId)?.comissao).negociacao, w.rng);
    // SAF: níveis pendentes da entrada; depois a chance do ano.
    if (c.safEstrutura > 0) { subirEstrutura(mem, k, 'ct'); subirEstrutura(mem, k, 'base'); c.safEstrutura -= 1; }
    if (tentarSaf(c, receita, w.ano, w.rng)) {
      resumo.safs.push(c.clubeId);
      h.safNova = true;
      subirEstrutura(mem, k, 'ct');
      subirEstrutura(mem, k, 'base');
      c.safEstrutura -= 1;
    }
    // IA: sobe 1 nível se o caixa passa de 50% da receita e cobre o custo; Formador prioriza a base (GDD-gestao 11).
    const tipo: 'ct' | 'base' = c.perfil === 'Formador' ? 'base' : 'ct';
    const atual = (tipo === 'ct' ? k.estruturaCT : k.estruturaBase) ?? 10;
    const obra = custoObra(atual + 1);
    if (atual < F.estrutura.max && c.caixa > receita * F.estrutura.caixa && c.caixa >= obra) {
      c.caixa -= obra;
      h.lanc.obras += obra;
      c.obras.push({ tipo, dia: F.estrutura.dias });
      resumo.obras += 1;
    }
    amortizar(c, receita);
    orcamentoETeto(c, receita, folhaMil(mem, c.clubeId));
    c.receitaRef = receita;
  }
  for (const c of contas) novoAnoConta(c);
  return resumo;
}
