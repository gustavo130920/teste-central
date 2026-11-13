// Virada do ano (etapa 3, 4ª fatia; GDD-gestao 11): encerramento, acesso e queda, vagas, reputação e torcida, ano novo.
// Metas, finanças, pessoas, Europa e reposição ficam para a etapa 4 (Gestão).
import type { Clube, Jogador, Profissional, Tatica, Tecnico } from '../motor/dados.ts';
import type { EntradaTime } from '../motor/tipos.ts';
import { ANO1 } from './copas.ts';
import type { Memoria } from './memoria.ts';
import { ENTRE_JOGOS } from './memoria.ts';
import type { Temporada } from './temporada.ts';
import { LIGAS, simularTemporada } from './temporada.ts';
import { Nomes } from '../gestao/base.ts';
import type { ResumoPessoas } from './pessoas.ts';
import { viradaPessoas } from './pessoas.ts';
import { criarRng, semearDeTexto } from '../motor/rng.ts';
import type { Comercial } from '../gestao/financas.ts';
import type { ResumoFinancas } from './contas.ts';
import { fasesDasCopas, viradaContas } from './contas.ts';

export const VIRADA = {
  diasNoAno: 364,
  /** GDD-gestao 11: troca entre Série A e Série B. */
  trocas: 4,
  reputacao: { titulo: 1, queda: -1, semLibertadores: { anos: 3, minimo: 15, delta: -1 }, min: 1, max: 20 },
  torcida: { titulo: 2, libertadores: 1, queda: -2, passo: 5, min: 1, max: 20 },
} as const;

/** País de cada liga sul-americana na Libertadores. */
const PAIS: Record<string, number> = { 'serie-a': 0, 'serie-b': 0, argentina: 1, colombia: 2, chile: 3 };

export interface Resumo {
  ano: number;
  campeoes: Record<string, string>;
  rebaixados: string[];
  promovidos: string[];
  libertadores: string[][];
  folgasCopaDoBrasil: string[];
  reputacao: Record<string, number>;
  torcida: Record<string, number>;
  /** Etapa 6 (Pessoas) e 8 (Reposição); só com a Gestão. */
  pessoas?: ResumoPessoas;
  joias?: number;
  safra?: number;
  /** Etapa 4, 4ª fatia: finanças dos brasileiros. */
  financas?: ResumoFinancas;
}

export interface Mundo {
  ano: number;
  clubes: Clube[];
  tecnicos: Tecnico[];
  elencos: Record<string, Jogador[]>;
  tatica: Tatica;
  /** Comissões por clube (etapa 4); sem elas, comissão neutra. */
  comissoes?: Record<string, Profissional[]>;
  clubesPorLiga: Record<string, string[]>;
  europeus: string[];
  libertadores: string[][];
  folgasCopaDoBrasil: string[];
  memoria: Memoria | null;
  torcidaPontos: Map<string, number>;
  anosSemLibertadores: Map<string, number>;
  historico: Resumo[];
  /** Etapa 4, 3ª fatia: livres, nomes usados no mundo e a semente da carreira. */
  livres: Jogador[];
  profissionaisLivres: Profissional[];
  livreDesde: Map<string, { ano: number; dispensado: boolean }>;
  nomes: Nomes;
  semente: number;
  /** Etapa 4, 4ª fatia: fichas comerciais (as contas vivem na memória). */
  comercial?: Comercial;
}

export interface BaseMundo {
  clubes: Clube[];
  tecnicos: Tecnico[];
  elencos: Record<string, Jogador[]>;
  tatica: Tatica;
  comissoes?: Record<string, Profissional[]>;
  livres?: Jogador[];
  profissionaisLivres?: Profissional[];
  comercial?: Comercial;
}

export function criarMundo(base: BaseMundo): Mundo {
  const clubes = base.clubes.map((c) => ({ ...c }));
  // Cópias: a carreira muda idade, atributos e clube de técnicos e livres.
  const tecnicos = base.tecnicos.map((t) => ({ ...t, trabalho: t.trabalho ? { ...t.trabalho } : null }));
  const livres = (base.livres ?? []).map((j) => ({ ...j, atributos: { ...j.atributos }, qualidades: [...j.qualidades], defeitos: [...j.defeitos] }));
  const profissionaisLivres = (base.profissionaisLivres ?? []).map((p) => ({ ...p, atributos: { ...p.atributos } }));
  const nomes = new Nomes([...Object.values(base.elencos).flat(), ...livres, ...tecnicos, ...profissionaisLivres, ...Object.values(base.comissoes ?? {}).flat()]);
  const clubesPorLiga = Object.fromEntries(LIGAS.map((l) => [l, clubes.filter((c) => c.liga === l && !c.reserva).map((c) => c.id)]));
  const lib = ANO1.libertadores;
  return {
    ano: 1, clubes, tecnicos, elencos: base.elencos, tatica: base.tatica, comissoes: base.comissoes, clubesPorLiga,
    europeus: clubes.filter((c) => c.liga === 'europa').map((c) => c.id),
    libertadores: [lib.brasil, lib.argentina, lib.colombia, lib.chile], folgasCopaDoBrasil: [...ANO1.folgasCopaDoBrasil],
    memoria: null, torcidaPontos: new Map(), anosSemLibertadores: new Map(), historico: [],
    livres, profissionaisLivres, livreDesde: new Map(livres.map((j) => [j.id, { ano: 0, dispensado: false }])), nomes, semente: 0, comercial: base.comercial,
  };
}

function entradas(m: Mundo): Record<string, EntradaTime> {
  const ids = [...Object.values(m.clubesPorLiga).flat(), ...m.europeus];
  return Object.fromEntries(ids.map((id) => {
    const clube = m.clubes.find((c) => c.id === id)!;
    const tecnico = m.tecnicos.find((t) => t.clubeId === id)!;
    return [id, { clube, tecnico, elenco: m.elencos[id] }];
  }));
}

export function jogarAno(m: Mundo, semente: number, adaptacao = true): Temporada {
  const t = simularTemporada({
    semente: semente * 1000 + m.ano, clubesPorLiga: m.clubesPorLiga, europeus: m.europeus, entradas: entradas(m), elencos: m.elencos, tatica: m.tatica,
    libertadores: m.libertadores, folgasCopaDoBrasil: m.folgasCopaDoBrasil, memoria: m.memoria ?? undefined, adaptacao, comissoes: m.comissoes, nomes: m.nomes, comercial: m.comercial,
  });
  m.memoria = t.memoria;
  // A memória guarda os elencos vivos (evolução, subidas, aposentadorias).
  m.elencos = t.memoria.elencos;
  m.semente = semente;
  return t;
}

/** Vagas da Libertadores (PLANEJAMENTO): 4 por país; campeão da Libertadores, campeão da Copa do Brasil (Brasil), depois a liga. */
export function vagasLibertadores(t: Temporada, m: Mundo): string[][] {
  const campeao = (id: string): string | null => t.copas.find((c) => c.id === id)?.campeao() ?? null;
  const ligaDe = (c: string): string => Object.keys(m.clubesPorLiga).find((l) => m.clubesPorLiga[l].includes(c))!;
  const vagas: string[][] = [[], [], [], []];
  const lib = campeao('libertadores');
  if (lib) vagas[PAIS[ligaDe(lib)]].push(lib);
  const cdb = campeao('copa-do-brasil');
  if (cdb && !vagas[0].includes(cdb)) vagas[0].push(cdb);
  const ligaDoPais = ['serie-a', 'argentina', 'colombia', 'chile'];
  ligaDoPais.forEach((liga, p) => {
    for (const l of t.tabelas[liga]) if (vagas[p].length < 4 && !vagas[p].includes(l.clube)) vagas[p].push(l.clube);
  });
  return vagas;
}

/** Folgam na 1ª fase os campeões da Série A e da Copa do Brasil; se forem o mesmo, folga o vice da Série A. */
export function folgasCopaDoBrasil(t: Temporada): string[] {
  const [campeao, vice] = t.tabelas['serie-a'].map((l) => l.clube);
  const cdb = t.copas.find((c) => c.id === 'copa-do-brasil')?.campeao() ?? null;
  return !cdb || cdb === campeao ? [campeao, vice] : [campeao, cdb];
}

const limitar = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** Processa a virada e prepara o ano seguinte. */
export function virar(m: Mundo, t: Temporada): Resumo {
  const v = VIRADA;
  // 1. Encerramento.
  const campeoes: Record<string, string> = {};
  for (const l of Object.keys(m.clubesPorLiga)) campeoes[l] = t.tabelas[l][0].clube;
  for (const c of t.copas) campeoes[c.id] = c.campeao()!;
  // 3. Acesso e queda.
  const a = t.tabelas['serie-a'].map((l) => l.clube);
  const b = t.tabelas['serie-b'].map((l) => l.clube);
  const rebaixados = a.slice(-v.trocas);
  const promovidos = b.slice(0, v.trocas);
  // 4. Vagas.
  const libertadores = vagasLibertadores(t, m);
  const folgas = folgasCopaDoBrasil(t);
  // 5. Clube: reputação e torcida (Humor ainda não existe: conta como neutro, PROVISORIO).
  const titulos = new Map<string, number>();
  for (const c of Object.values(campeoes)) titulos.set(c, (titulos.get(c) ?? 0) + 1);
  const jogouLib = new Set(m.libertadores.flat());
  const sulAmericanos = new Set(Object.values(m.clubesPorLiga).flat());
  const reputacao: Record<string, number> = {};
  const torcida: Record<string, number> = {};
  for (const c of m.clubes) {
    if (!sulAmericanos.has(c.id) && !m.europeus.includes(c.id)) continue;
    const caiu = rebaixados.includes(c.id);
    let dRep = (titulos.get(c.id) ? v.reputacao.titulo : 0) + (caiu ? v.reputacao.queda : 0);
    if (sulAmericanos.has(c.id)) {
      const anos = jogouLib.has(c.id) ? 0 : (m.anosSemLibertadores.get(c.id) ?? 0) + 1;
      m.anosSemLibertadores.set(c.id, anos);
      if (anos > 0 && anos % v.reputacao.semLibertadores.anos === 0 && c.reputacao >= v.reputacao.semLibertadores.minimo) dRep += v.reputacao.semLibertadores.delta;
    }
    const novaRep = limitar(c.reputacao + dRep, v.reputacao.min, v.reputacao.max);
    if (novaRep !== c.reputacao) reputacao[c.id] = novaRep - c.reputacao;
    c.reputacao = novaRep;
    let pts = (m.torcidaPontos.get(c.id) ?? 0) + (titulos.get(c.id) ?? 0) * v.torcida.titulo + (jogouLib.has(c.id) ? v.torcida.libertadores : 0) + (caiu ? v.torcida.queda : 0);
    if (Math.abs(pts) >= v.torcida.passo) {
      const d = Math.sign(pts);
      const tam = limitar((c.torcidaTamanho ?? 10) + d, v.torcida.min, v.torcida.max);
      if (tam !== c.torcidaTamanho) torcida[c.id] = d;
      c.torcidaTamanho = tam;
      pts = 0;
    }
    m.torcidaPontos.set(c.id, pts);
  }
  // 1, 3 e 5. Finanças (etapa 4, 4ª fatia): premiação, TV, perfil, patrocínios, SAF, estrutura, orçamento.
  let financas: ResumoFinancas | undefined;
  if (m.memoria?.financas.size) {
    const copas = fasesDasCopas(t.jogos, (id) => t.copas.find((c) => c.id === id)?.campeao() ?? null);
    financas = viradaContas(m.memoria, { ano: m.ano, clubes: m.clubes, tabelas: t.tabelas, copas, rng: criarRng(semearDeTexto(`${m.semente}-financas-${m.ano}`)) });
  }
  // 6. Pessoas e 8. Reposição (etapa 4, 3ª fatia; só com a Gestão).
  let pessoas: ResumoPessoas | undefined;
  const mem = m.memoria;
  const joias = mem?.evo.joias;
  const safra = mem?.evo.safra;
  if (mem && mem.gestao.size) {
    const w = { ano: m.ano, tecnicos: m.tecnicos, tatica: m.tatica, livres: m.livres, profissionaisLivres: m.profissionaisLivres, livreDesde: m.livreDesde, estruturaCT: new Map(m.clubes.map((c) => [c.id, c.estruturaCT])) };
    pessoas = viradaPessoas(mem, w, criarRng(semearDeTexto(`${m.semente}-pessoas-${m.ano}`)));
    m.livres = w.livres;
    m.profissionaisLivres = w.profissionaisLivres;
    mem.evo.joias = 0;
    mem.evo.safra = 0;
  }
  // 9. Ano novo.
  m.clubesPorLiga = { ...m.clubesPorLiga, 'serie-a': [...a.slice(0, -v.trocas), ...promovidos], 'serie-b': [...rebaixados, ...b.slice(v.trocas)] };
  for (const c of m.clubes) {
    if (m.clubesPorLiga['serie-a'].includes(c.id)) c.liga = 'serie-a';
    if (m.clubesPorLiga['serie-b'].includes(c.id)) c.liga = 'serie-b';
  }
  m.libertadores = libertadores;
  m.folgasCopaDoBrasil = folgas;
  if (m.memoria) novoAnoMemoria(m.memoria);
  const resumo: Resumo = { ano: m.ano, campeoes, rebaixados, promovidos, libertadores, folgasCopaDoBrasil: folgas, reputacao, torcida, pessoas, joias, safra, financas };
  m.historico.push(resumo);
  m.ano += 1;
  return resumo;
}

/** Amarelos zeram, suspensões ficam (Gustavo, 13/11/2026); lesões seguem contando dias; quem está bem volta da pré-temporada. */
export function novoAnoMemoria(mem: Memoria): void {
  const d = VIRADA.diasNoAno;
  mem.ultimoJogo.clear();
  for (const s of mem.jogadores.values()) {
    s.amarelos = {};
    s.ciclosSemJogar = 0;
    if (s.voltaDia !== null) {
      s.voltaDia -= d;
      if (s.voltaDia <= 0) s.voltaDia = null;
    }
    if (s.ultimaLesao?.recaidaAte != null) s.ultimaLesao.recaidaAte -= d;
    if (s.voltaDia === null) s.condicao = ENTRE_JOGOS.preTemporada;
  }
  for (const s of mem.jogadores.values()) s.titularidades = 0;
  for (const s of mem.evolucao.values()) s.minAno = 0;
  for (const p of mem.periodo.values()) p.jogosAno = 0;
  for (const g of mem.gestao.values()) { g.jogos = 0; g.titulo = false; }
  // GDD-gestao 8: a química com o técnico sobe 1 por ano de trabalho junto.
  for (const g of mem.gestao.values()) for (const p of g.comissao.profissionais) if (p.quimica !== null) p.quimica = Math.min(20, p.quimica + 1);
}
