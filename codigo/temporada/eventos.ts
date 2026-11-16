// Eventos e imprensa no calendário (etapa 4, 7ª fatia; GDD-gestao 10). Só nos clubes que o jogador teria: para medir,
// os 30 brasileiros, nos cenários "Avançar" (escolha Delegado e assessoria) e Escolha aleatória (decisão de 15/11/2026).
// Por ciclo: eventos (obrigatórios, elos, sorteado; até 2), coletiva, fala de jogador e até 3 notícias (só a manchete pesa).
// Fora do cenário: defeitos mexem no Humor depois de todo jogo (motor, Anexo A).
import type { Jogador, Profissional, Tecnico } from '../motor/dados.ts';
import type { Rng } from '../motor/rng.ts';
import { criarRng, semearDeTexto } from '../motor/rng.ts';
import type { ResultadoPartida } from '../motor/tipos.ts';
import type { Efeito, Escolha, Fase, Imprensa, ItemImprensa, ModeloEvento, Reporter } from '../gestao/eventos.ts';
import { ATRIBUTOS, EVENTOS, IMPRENSA, chanceDaEscolha, chanceDeEvento, faseDe, nivelNoMomento, valorDe } from '../gestao/eventos.ts';
import { PMG } from '../gestao/diretoria.ts';
import { aplicar, moralDoGrupo, pesosDe } from '../gestao/moral.ts';
import { efetivo, quedaMoral } from '../gestao/comissao.ts';
import { chaveTatica } from '../gestao/treino.ts';
import type { Empresario } from '../gestao/mercado.ts';
import { janelaDaSemana, papelNoElenco, semanaDoDia } from '../gestao/mercado.ts';
import { PERFIL } from '../gestao/evolucao.ts';
import type { CtxDiretoria } from './diretoria.ts';
import { confianca, humor } from './diretoria.ts';
import type { Memoria } from './memoria.ts';
import { folhaDoClube } from './mercado.ts';
import type { ControleJogador } from './jogador.ts';

export type Cenario = 'avancar' | 'aleatorio';
export interface DadosEventos {
  modelos: ModeloEvento[];
  imprensa: Imprensa;
  cenario: Cenario;
  /** Clubes que recebem eventos e imprensa. */
  clubes: string[];
  /** Clube com o resumo em texto (null: nenhum). */
  texto?: string | null;
}

/** PROVISORIO (7ª fatia): escolhas da implementação. */
export const CICLO_IMPRENSA = {
  /** Ciclo da pré-temporada (antes do 1º jogo do ano) conta como 10 dias. */
  diasPre: 10,
  /** Marcas "bem/mal trabalhado" mexem 10 no Trabalho do perfil de jovem. */
  trabalho: 10,
  /** Sai do clube: só com mais de 20 jogadores e mais de 2 goleiros. */
  saida: { minimo: 20, goleiros: 2 },
  /** Briga pelo título: até o 4º; contra a queda: nos 6 últimos. */
  briga: { titulo: 4, queda: 6 },
  /** Sequência na notícia: 3 vitórias seguidas. Departamento médico cheio: 4 lesionados. */
  sequencia: 3, dmCheio: 4,
  /** Notícia de demissão até 28 dias depois da troca de técnico. */
  demissaoDias: 28,
} as const;

interface Alvos {
  jogador?: Jogador; jogador2?: Jogador; profissional?: Profissional; profissional2?: Profissional;
  empresario?: Empresario; clube_interessado?: string; reporter?: Reporter; tecnico_rival?: Tecnico;
}
interface Pendente { modelo: ModeloEvento; alvos: Alvos; tipo: 'sorteado' | 'elo' | 'obrigatorio' }
interface Jogo { dia: number; competicao: string; adversario: string; casa: boolean; classico: boolean; decisao: boolean; pro?: number; contra?: number }
export type ProximoJogo = Omit<Jogo, 'pro' | 'contra'>;

interface Fato { tipo: 'lesao' | 'retorno' | 'contratacao' | 'venda' | 'desmentido' | 'repercussao'; jogador?: Jogador; tom?: string; semanas?: number }

export interface ContagemImprensa {
  sorteados: number; elos: number; obrigatorios: number; coletivas: number; perguntas: number; falas: number; manchetes: number;
  /** Confiança (nominal, antes da Paciência) que as respostas da coletiva somaram. */
  confColetiva: number;
  /** Diagnóstico: Humor e Confiança nominais somados por fonte (evento, coletiva, fala, manchete). */
  porFonte: Record<string, { Humor: number; 'Confiança': number }>;
}
const zero = (): ContagemImprensa => ({ sorteados: 0, elos: 0, obrigatorios: 0, coletivas: 0, perguntas: 0, falas: 0, manchetes: 0, confColetiva: 0, porFonte: {} });

export interface EstadoClubeImprensa {
  fila: Pendente[];
  cadeias: { id: string; dia: number; alvos: Alvos }[];
  marcas: Map<string, { ini: number; fim: number }>;
  promessas: number[];
  usados: Map<string, number>;
  /** Salários atrasados já avisados neste episódio (volta a false com a folha em dia). */
  salarioAvisado: boolean;
  ultimoTema: string | null;
  pontos: number[];
  ultimo: Jogo | null;
  jogos: number;
  jogosAno: number;
  ciclo: number;
  ultimaColetiva: number;
  tons: string[];
  jogosDesdeFala: number;
  noticias: Map<string, number>;
  impeto: number;
  impetoRival: number;
  fatos: Fato[];
  respostaRival: Tecnico | null;
  desmentidos: { dia: number; jogador: Jogador }[];
  lesionados: Set<string>;
  transf: number;
  titulo: string | null;
  competicoes: Map<string, number>;
  tecnico: string;
  tecnicoDesde: number;
  ano: ContagemImprensa;
}

export interface ImprensaMundo {
  dados: DadosEventos;
  clubes: Map<string, EstadoClubeImprensa>;
  tabela: Map<string, { p: number; sg: number; gp: number }>;
  historico: ({ ano: number; clube: string; liga: string } & ContagemImprensa)[];
  /** Efeitos sem sistema ainda (contagem) e escolhas tomadas (`ID-letra`). */
  semSistema: Record<string, number>;
  escolhas: Record<string, number>;
  log: string[];
}

export function criarImprensa(mem: Memoria, dados: DadosEventos): ImprensaMundo {
  const I: ImprensaMundo = { dados, clubes: new Map(), tabela: new Map(), historico: [], semSistema: {}, escolhas: {}, log: [] };
  for (const c of dados.clubes) incluirNaImprensa(mem, c, I);
  return I;
}

/** Clube passa a receber eventos e imprensa (8b3: o técnico do jogador assume outro clube). */
export function incluirNaImprensa(mem: Memoria, c: string, I: ImprensaMundo | null = mem.imprensa): void {
  const g = mem.gestao.get(c);
  if (!g || !I || I.clubes.has(c)) return;
  I.clubes.set(c, {
    fila: [], cadeias: [], marcas: new Map(), promessas: [], usados: new Map(), salarioAvisado: false, ultimoTema: null, pontos: [], ultimo: null, jogos: 0, jogosAno: 0,
    ciclo: 0, ultimaColetiva: -9, tons: [], jogosDesdeFala: 99, noticias: new Map(), impeto: 0, impetoRival: 0, fatos: [], respostaRival: null,
    desmentidos: [], lesionados: new Set(), transf: mem.mercado?.transferencias.length ?? 0, titulo: null, competicoes: new Map(), tecnico: g.tecnico.nome, tecnicoDesde: -999, ano: zero(),
  });
}

/** Marcas e promessas no alvo do Respaldo (GDD-gestao 3). */
export function respaldoDasMarcas(mem: Memoria, clube: string): number {
  const st = mem.imprensa?.clubes.get(clube);
  if (!st) return 0;
  const r = EVENTOS.respaldo;
  return (st.marcas.has('grupo rachado') ? r.rachado : 0) + Math.max(r.promessaMax, st.promessas.length * r.promessa);
}

// ---------- Contexto e condições ----------

interface Ctx {
  mem: Memoria; dir: CtxDiretoria; clube: string; st: EstadoClubeImprensa; dia: number; ano: number;
  jogo: Jogo | null; jogador?: Jogador; tom?: string | null; rival?: Tecnico | null; rng: Rng;
}

const elenco = (x: Ctx): Jogador[] => x.mem.elencos[x.clube] ?? [];
const gestao = (x: Ctx) => x.mem.gestao.get(x.clube)!;
const nomeClube = (x: Ctx, id: string): string => x.dir.entradas[id]?.clube.nomeCurto ?? x.mem.mercado?.clubes.get(id)?.nomeCurto ?? id;
const ligaDe = (x: Ctx, id: string): string | null => Object.keys(x.dir.clubesPorLiga).find((l) => x.dir.clubesPorLiga[l].includes(id)) ?? null;
const anoEleicao = (x: Ctx): boolean => { const d = x.mem.diretoria.get(x.clube); return !!d && !d.ficha.saf && d.ficha.eleicao === x.ano; };
const ehSaf = (x: Ctx): boolean => !!(x.mem.financas.get(x.clube)?.saf ?? x.mem.diretoria.get(x.clube)?.ficha.saf);
const folhaMi = (x: Ctx): number => folhaDoClube(x.mem, x.clube) / 1000;
const moralGrupo = (x: Ctx): number => moralDoGrupo(elenco(x), (id) => x.mem.jogadores.get(id)?.moral ?? 60, (id) => x.mem.jogadores.get(id)?.titularidades ?? 0, gestao(x).jogos);

function saude(x: Ctx): string {
  const c = x.mem.financas.get(x.clube);
  if (!c) return 'Boa';
  if (c.caixa < 0 || c.atrasados > 0) return 'Crítica';
  return c.divida > c.receitaRef ? 'Média' : 'Boa';
}

function posicao(x: Ctx): { pos: number; n: number } | null {
  const liga = ligaDe(x, x.clube);
  if (!liga) return null;
  const t = x.mem.imprensa!.tabela;
  const ordem = [...x.dir.clubesPorLiga[liga]].sort((a, b) => {
    const p = t.get(a) ?? { p: 0, sg: 0, gp: 0 }, q = t.get(b) ?? { p: 0, sg: 0, gp: 0 };
    return q.p - p.p || q.sg - p.sg || q.gp - p.gp;
  });
  return { pos: ordem.indexOf(x.clube) + 1, n: ordem.length };
}

const seguidas = (pontos: number[], v: number): number => { let n = 0; for (let i = pontos.length - 1; i >= 0 && pontos[i] === v; i--) n++; return n; };

function valorAtributo(x: Ctx, nome: string, alvos?: Alvos): number {
  const a = ATRIBUTOS[nome];
  if (!a) return 10;
  const g = gestao(x);
  if (a.de === 'tecnico') return g.tecnico.trabalho?.[a.chave] ?? 10;
  if (a.de === 'jogador') return (alvos?.jogador ?? x.jogador)?.atributos[a.chave as keyof Jogador['atributos']] ?? 10;
  return efetivo(g.comissao, a.cargo as Profissional['cargo'], a.sigla);
}

const temNome = (j: Jogador, tipo: string, nome: string): boolean => {
  const nomes = nome.split('/');
  if (tipo === 'Qualidade') return nomes.some((n) => j.qualidades.includes(n));
  if (tipo === 'Defeito') return nomes.some((n) => j.defeitos.includes(n));
  return nomes.some((n) => j.perfilJovem === n);
};

/** Filtro de jogador ("Qualidade X", "Defeito X ou Perfil de jovem Y"). null: não é filtro de jogador. */
function filtroJogador(c: string): ((j: Jogador) => boolean) | null {
  const partes = c.split(' ou ');
  const fs = partes.map((p) => { const m = p.match(/^(Qualidade|Defeito|Perfil de jovem) (.+)$/); return m ? (j: Jogador) => temNome(j, m[1], m[2]) : null; });
  return fs.every((f) => f) ? (j) => fs.some((f) => f!(j)) : null;
}

function cumpre(c: string, x: Ctx): boolean {
  const { mem, clube, st } = x;
  const semana = semanaDoDia(x.dia);
  const [ri, rf] = EVENTOS.retaFinal;
  const reta = semana >= ri && semana <= rf;
  let m: RegExpMatchArray | null;
  if (c === 'Sempre') return true;
  if (c === 'Só em cadeia') return false;
  if ((m = c.match(/^Fase (.+)$/))) {
    const f = m[1];
    if (f === 'pré-temporada') return st.jogosAno === 0;
    if (f === 'janela') return janelaDaSemana(semana) !== null;
    if (f === 'temporada') return st.jogosAno > 0;
    if (f === 'reta final') return reta;
    return faseDe(st.pontos) === f;
  }
  if (c === 'na janela') return janelaDaSemana(semana) !== null;
  if (c === 'na reta final') return reta;
  if (c === 'em ano de eleição' || c === 'Eleição ano de eleição') return anoEleicao(x);
  if ((m = c.match(/^(?:Próximo jogo|Jogo) (clássico|decisão|casa)$/))) return !!x.jogo && (m[1] === 'clássico' ? x.jogo.classico : m[1] === 'decisão' ? x.jogo.decisao : x.jogo.casa);
  if ((m = c.match(/^Sequência (\d+)\+ (derrotas|vitórias)$/))) return seguidas(st.pontos, m[2] === 'vitórias' ? 3 : 0) >= Number(m[1]);
  if ((m = c.match(/^Saúde (.+)$/))) return saude(x) === m[1];
  if ((m = c.match(/^(?:Gestão|Clube) (Associação|SAF)$/))) return ehSaf(x) === (m[1] === 'SAF');
  if ((m = c.match(/^Posição (.+)$/))) {
    const p = posicao(x);
    if (!p || st.jogosAno === 0) return false;
    const z = m[1].match(/^([ZG])(\d+)$/);
    if (z) return z[1] === 'G' ? p.pos <= Number(z[2]) : p.pos > p.n - Number(z[2]);
    if (m[1] === 'topo') return p.pos === 1;
    return p.pos > 4 && p.pos <= p.n - 4;
  }
  if ((m = c.match(/^(Humor|Confiança|Popularidade|Moral elenco) (?:até (\d+)|(\d+)\+)$/))) {
    const d = mem.diretoria.get(clube);
    const v = m[1] === 'Humor' ? mem.humor.get(clube) : m[1] === 'Confiança' ? d?.confianca : m[1] === 'Popularidade' ? d?.ficha.popularidade : moralGrupo(x);
    if (v === undefined) return false;
    return m[2] ? v <= Number(m[2]) : v >= Number(m[3]);
  }
  if ((m = c.match(/^Folha atrasada (\d+) meses$/))) return (mem.financas.get(clube)?.atrasados ?? 0) >= Number(m[1]);
  if (c === 'Promessa quebrada') return st.promessas.length > 0;
  if (c === 'Promessa atrasada') return [...st.marcas].some(([k, v]) => k.startsWith('promessa') && x.dia - v.ini >= EVENTOS.marcaDias / 2);
  if (c === 'Competição continental') return !!mem.mercado?.libertadores.has(clube);
  if ((m = c.match(/^Competição (\d+) simultâneas$/))) return [...st.competicoes.values()].filter((d) => x.dia - d <= 28).length >= Number(m[1]);
  if ((m = c.match(/^Liga Série ([AB])$/))) return ligaDe(x, clube) === (m[1] === 'A' ? 'serie-a' : 'serie-b');
  if ((m = c.match(/^Perfil (.+)$/)) && !c.startsWith('Perfil de jovem')) return mem.financas.get(clube)?.perfil === m[1];
  if ((m = c.match(/^Marca: (.+)$/))) return st.marcas.has(m[1]);
  if ((m = c.match(/^Resultado (.+)$/))) {
    const j = x.jogo;
    if (!j || j.pro === undefined) return false;
    const d = j.pro - j.contra!;
    return m[1] === 'vitória' ? d > 0 : m[1] === 'derrota' ? d < 0 : m[1] === 'goleada' ? d >= 3 : d <= -3;
  }
  if ((m = c.match(/^Estilo (.+)$/))) return gestao(x).tecnico.estilo === m[1];
  if ((m = c.match(/^Briga (título|rebaixamento)$/))) {
    const p = posicao(x);
    if (!p || st.jogosAno < 10) return false;
    return m[1] === 'título' ? p.pos <= CICLO_IMPRENSA.briga.titulo : p.pos > p.n - CICLO_IMPRENSA.briga.queda;
  }
  if ((m = c.match(/^Tom (\S+)$/))) return x.tom === m[1];
  if ((m = c.match(/^Imprensa (polêmico|discreto)$/))) return x.rival?.imprensa === m[1];
  if ((m = c.match(/^(.+) (\d+)\+$/)) && ATRIBUTOS[m[1]]) return valorAtributo(x, m[1]) >= Number(m[2]);
  if ((m = c.match(/^Caixa (\d+) folhas?$/))) return (mem.financas.get(clube)?.caixa ?? 0) >= Number(m[1]) * folhaMi(x);
  if ((m = c.match(/^(?:Qualidade )?(.+) no elenco$/))) return elenco(x).some((j) => j.qualidades.includes(m![1]));
  const fj = filtroJogador(c);
  if (fj) return x.jogador ? fj(x.jogador) : elenco(x).some(fj);
  return false;
}

// ---------- Alvos ----------

const CARGOS: Record<string, string> = {
  'Preparador físico': 'Preparador', 'Departamento médico': 'Médico', 'Psicólogo esportivo': 'Psicólogo', 'Olheiro de jovens': 'Olheiro jovens',
  'Coordenador da base': 'Coord. base', 'Auxiliar técnico': 'Auxiliar', 'Analista de desempenho': 'Analista',
};

function filtroCamada(x: Ctx, f: string): ((j: Jogador) => boolean) | null {
  const el = elenco(x);
  const cam = EVENTOS.camada;
  let m: RegExpMatchArray | null;
  if ((m = f.match(/^Camada (\w+)$/)) || f === 'titular') {
    const k = m ? m[1] : 'titular';
    if (k === 'craque') { const top = new Set([...el].sort((a, b) => b.nota - a.nota).slice(0, cam.craques).map((j) => j.id)); return (j) => top.has(j.id); }
    if (k === 'titular') return (j) => papelNoElenco(el, j) === 'titular';
    if (k === 'reserva') return (j) => papelNoElenco(el, j) === 'reserva';
    if (k === 'jovem') return (j) => j.idade <= cam.jovem;
    if (k === 'veterano') return (j) => j.idade >= cam.veterano;
    return null;
  }
  if (f === 'Lealdade abaixo da Ambição') return (j) => j.lealdade < j.ambicao;
  if (f === 'sem minutos') return (j) => (x.mem.jogadores.get(j.id)?.ciclosSemTitular ?? 0) >= 3;
  return filtroJogador(f);
}

const sortear = <T>(rng: Rng, xs: T[]): T | undefined => (xs.length ? xs[rng.int(0, xs.length - 1)] : undefined);

/** Resolve o alvo da ficha; null se falta alguém (o evento não entra). */
function resolverAlvos(modelo: ModeloEvento, x: Ctx, anterior?: Alvos): Alvos | null {
  const a: Alvos = {};
  const rng = x.rng;
  const usados = new Set<string>();
  let agente: string | null = null;
  const outros = (): Jogador[] => Object.keys(x.dir.entradas).filter((c) => c !== x.clube).flatMap((c) => x.mem.elencos[c] ?? []);
  const porJogador = (v: string | undefined, js: Jogador[]): boolean => {
    const ok = js.filter((j) => !usados.has(j.id) && (!agente || x.mem.mercado?.agenteDe.get(j.id)?.perfil === agente));
    const j = sortear(rng, ok);
    if (!j) return false;
    usados.add(j.id);
    const k = (v ?? (a.jogador ? 'jogador2' : 'jogador')) as 'jogador' | 'jogador2';
    a[k] = j;
    if (agente) a.empresario = x.mem.mercado?.agenteDe.get(j.id);
    return true;
  };
  for (const seg0 of modelo.alvo.split(' · ').map((s) => s.trim()).filter(Boolean)) {
    let seg = seg0;
    const vm = seg.match(/^(.*?)\s*\(\{(\w+)\}\)$/);
    const v = vm && !seg.startsWith('Clube') ? vm[2] : undefined;
    if (vm && !seg.startsWith('Clube')) seg = vm[1].trim();
    let m: RegExpMatchArray | null;
    if (/^os? mesmos? do elo anterior$/.test(seg)) { if (!anterior) return null; Object.assign(a, anterior); continue; }
    if (seg.startsWith('Clube')) {
      if (seg.includes('{jogador} de {clube_interessado}')) {
        const forca = Math.max(...elenco(x).map((j) => j.nota));
        if (!porJogador('jogador', outros().filter((j) => j.nota >= forca - 3 && j.nota <= forca + 1))) return null;
        a.clube_interessado = a.jogador!.clubeId ?? undefined;
      }
      continue;
    }
    if ((m = seg.match(/^\{(\w+)\}$/))) {
      if (m[1] === 'reporter') a.reporter = sortear(rng, x.mem.imprensa!.dados.imprensa.reporteres);
      if (m[1] === 'profissional') { a.profissional = sortear(rng, gestao(x).comissao.profissionais); if (!a.profissional) return null; }
      if (m[1] === 'tecnico_rival') { if (!x.rival) return null; a.tecnico_rival = x.rival; }
      if (m[1] === 'clube_interessado') a.clube_interessado = sortear(rng, Object.keys(x.dir.entradas).filter((c) => c !== x.clube && (x.dir.entradas[c].clube.reputacao ?? 0) >= (x.dir.entradas[x.clube].clube.reputacao ?? 0)));
      continue;
    }
    if (seg === 'quem venceu a eleição' || seg.startsWith('profissional livre')) continue;
    if ((m = seg.match(/^Repórter (.+)$/))) { a.reporter = x.mem.imprensa!.dados.imprensa.reporteres.find((r) => r.tipo === m![1]); if (!a.reporter) return null; continue; }
    if ((m = seg.match(/^Técnico rival (polêmico|discreto)/))) { if (x.rival?.imprensa !== m[1]) return null; a.tecnico_rival = x.rival; continue; }
    if ((m = seg.match(/^Interferência (\w+)$/))) { if (x.mem.diretoria.get(x.clube)?.ficha.interferencia !== m[1]) return null; continue; }
    if (seg === 'jogador de fora') { if (!porJogador(v, outros().filter((j) => j.nota >= Math.max(...elenco(x).map((y) => y.nota)) - 3))) return null; continue; }
    if (seg === 'jogador livre') { if (!porJogador(v, x.mem.mercado?.livres ?? [])) return null; continue; }
    if ((m = seg.match(/^perfil (\w+)$/))) {
      agente = m[1];
      const ag = elenco(x).map((j) => x.mem.mercado?.agenteDe.get(j.id)).filter((e): e is Empresario => e?.perfil === agente);
      if (!ag.length) return null;
      a.empresario = sortear(rng, ag);
      continue;
    }
    if ((m = seg.match(/^cargo (.+)$/))) {
      const [nome, ...fs] = m[1].split(', ');
      const cargo = CARGOS[nome.trim()];
      let ps = gestao(x).comissao.profissionais.filter((p) => (nome.trim() === 'da comissão' || p.cargo === cargo) && p !== a.profissional);
      for (const f of fs) {
        const q = f.match(/^Química (?:até (\d+)|(\d+)\+)$/);
        if (q) ps = ps.filter((p) => (q[1] ? (p.quimica ?? 10) <= Number(q[1]) : (p.quimica ?? 10) >= Number(q[2])));
        if (f === 'Lealdade abaixo da Ambição') ps = ps.filter((p) => p.lealdade < p.ambicao);
      }
      const p = sortear(rng, ps);
      if (!p) return null;
      if (v === 'profissional2' || (!v && a.profissional)) a.profissional2 = p; else a.profissional = p;
      continue;
    }
    // Filtros de jogador do próprio elenco (ou de outro clube).
    const fs = seg.split(', ').map((f) => f.trim());
    const fora = fs.includes('em outro clube');
    const filtros = fs.filter((f) => f !== 'em outro clube').map((f) => filtroCamada(x, f));
    if (filtros.some((f) => !f)) return null;
    if (!porJogador(v, (fora ? outros() : elenco(x)).filter((j) => filtros.every((f) => f!(j))))) return null;
  }
  return a;
}

// ---------- Efeitos ----------

const limitar = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const contar = (r: Record<string, number>, k: string): void => { r[k] = (r[k] ?? 0) + 1; };

function liberar(mem: Memoria, clube: string, j: Jogador): boolean {
  const el = mem.elencos[clube];
  const s = CICLO_IMPRENSA.saida;
  const m = mem.mercado;
  if (!el.includes(j) || el.length <= s.minimo || (j.posicao === 'GOL' && el.filter((g) => g.posicao === 'GOL').length <= s.goleiros)) return false;
  if (m?.emprestimos.some((e) => e.jogador === j.id)) return false;
  mem.elencos[clube] = el.filter((x) => x !== j);
  j.clubeId = null;
  if (m) { m.livres.push(j); m.livreDesde.set(j.id, { ano: m.ano, dispensado: false }); m.querSair.delete(j.id); }
  return true;
}

let fonte = 'evento';

/** Aplica um efeito; `ganho` multiplica só os valores positivos (assessoria, tom repetido). Devolve o valor nominal. */
function aplicarEfeito(e: Efeito, x: Ctx, a: Alvos, proximo: ProximoJogo | null, ganho = 1, mult = 1): number {
  const { mem, clube, st } = x;
  const I = mem.imprensa!;
  let v = valorDe(e) * mult;
  if (v > 0) v *= ganho;
  const g = gestao(x);
  const c = mem.financas.get(clube);
  const jogadores = (): Jogador[] => (e.quem === 'jogador2' ? [a.jogador2] : e.quem === 'jogador' ? [a.jogador] : [a.jogador, a.jogador2]).filter((j): j is Jogador => !!j);
  switch (e.k) {
    case 'Moral': {
      const pesos = pesosDe(g.tecnico, quedaMoral(g.comissao));
      const alvos = e.quem === 'jogador' || e.quem === 'jogador2' ? jogadores()
        : e.quem === 'grupo' ? elenco(x).filter((j) => j !== a.jogador && j !== a.jogador2) : elenco(x);
      for (const j of alvos) { const s = mem.jogadores.get(j.id); if (s) s.moral = aplicar(s.moral, v, pesos); }
      break;
    }
    case 'Humor': case 'Confiança': {
      if (e.k === 'Humor') humor(mem, clube, v); else confianca(mem, x.dir, clube, v);
      const f = (st.ano.porFonte[fonte] ??= { Humor: 0, 'Confiança': 0 });
      f[e.k] += v;
      break;
    }
    case 'Popularidade': { const d = mem.diretoria.get(clube); if (d) d.ficha.popularidade = limitar(d.ficha.popularidade + v, 1, 20); break; }
    case 'Lealdade': {
      if (e.quem?.startsWith('profissional')) { const p = e.quem === 'profissional2' ? a.profissional2 : a.profissional; if (p) p.lealdade = limitar(p.lealdade + v, 1, 20); else contar(I.semSistema, 'Lealdade sem alvo'); }
      else for (const j of jogadores().slice(0, e.quem ? 1 : 2)) j.lealdade = limitar(j.lealdade + v, 1, 20);
      break;
    }
    case 'Química': {
      const p = a.profissional ?? g.comissao.profissionais.find((y) => y.cargo === 'Auxiliar');
      if (p) p.quimica = limitar((p.quimica ?? 10) + v, 1, 20);
      break;
    }
    case 'Memória': {
      const ag = a.empresario ?? (a.jogador ? mem.mercado?.agenteDe.get(a.jogador.id) : undefined);
      if (ag) ag.memoria[clube] = limitar((ag.memoria[clube] ?? 0) + v, -5, 5); else contar(I.semSistema, 'Memória sem empresário');
      break;
    }
    case 'Entrosamento': {
      const t = g.treino.taticas.get(chaveTatica(g.tecnico));
      if (t) t.progresso = limitar(t.progresso + (v / 100) * g.semanas, 0, g.semanas);
      break;
    }
    case 'Ímpeto': if (e.quem === 'rival') st.impetoRival += v; else st.impeto += v; break;
    case 'Caixa': if (c) c.caixa += v * folhaMi(x); break;
    case 'Orçamento': {
      if (c) c.orcamento = Math.max(0, c.orcamento * (1 + v / 100));
      const r = mem.mercado?.reduzidas.get(clube);
      if (!c && r) r.orcamento = Math.max(0, r.orcamento * (1 + v / 100));
      break;
    }
    case 'Folha': for (const j of elenco(x)) j.salario = Math.round(j.salario * (1 + v / 100)); break;
    case 'Patrocínio': if (c) for (const k of c.cotas) k.valor *= 1 + v / 100; break;
    case 'Público': if (c) c.ocupacaoBase = limitar(c.ocupacaoBase * (1 + v / 100), 0, 1); break;
    case 'Sócios': if (c) c.socios = Math.max(0, Math.round(c.socios * (1 + v / 100))); break;
    case 'Suspensão': {
      // PROVISORIO: barrado nos próximos N jogos da competição do próximo jogo.
      const comp = proximo?.competicao;
      if (comp) for (const j of jogadores()) { const s = mem.jogadores.get(j.id); if (s) s.suspensao[comp] = (s.suspensao[comp] ?? 0) + (e.n ?? 1); }
      break;
    }
    case 'Lesão': {
      const j = a.jogador;
      const s = j ? mem.jogadores.get(j.id) : undefined;
      if (s && s.voltaDia === null) { const dias = (e.n ?? 1) * 7; s.voltaDia = x.dia + dias; s.ultimaLesao = { gravidade: (e.n ?? 1) <= 1 ? 'leve' : 'media', dias, recaidaAte: null }; }
      break;
    }
    case 'Treino perdido': g.treinoPerdido = true; break;
    case 'Promessa quebrada': st.promessas.push(x.dia + EVENTOS.marcaDias); break;
    case 'Promessa cumprida': st.promessas.shift(); break;
    case 'Fica até o fim da temporada': if (a.jogador && mem.mercado) { mem.mercado.querSair.delete(a.jogador.id); mem.mercado.fica.add(a.jogador.id); } break;
    case 'Sai do clube': {
      if (e.quem?.startsWith('profissional')) {
        const p = e.quem === 'profissional2' ? a.profissional2 : a.profissional;
        // PROVISORIO: o cargo fica vago (vale 3) até a virada.
        if (p) g.comissao.profissionais = g.comissao.profissionais.filter((y) => y !== p);
      } else {
        const j = e.quem === 'jogador2' ? a.jogador2 : a.jogador;
        if (!j || !liberar(mem, clube, j)) contar(I.semSistema, 'Sai do clube recusado');
      }
      break;
    }
    case 'Marca': {
      const nome = e.nome!;
      st.marcas.set(nome, { ini: x.dia, fim: x.dia + EVENTOS.marcaDias });
      const ev = a.jogador ? mem.evolucao.get(a.jogador.id) : undefined;
      if (ev?.trabalho != null && (nome === 'bem trabalhado' || nome === 'mal trabalhado')) {
        ev.trabalho = limitar(ev.trabalho + (nome === 'bem trabalhado' ? 1 : -1) * CICLO_IMPRENSA.trabalho, PERFIL.min, PERFIL.max);
      }
      break;
    }
    case 'Segue': if (x.rng.pct(e.chance ?? 100)) st.cadeias.push({ id: e.id!, dia: x.dia + (e.n ?? 1) * 7, alvos: a }); break;
    default: contar(I.semSistema, e.k);
  }
  return v;
}

// ---------- Texto ----------

const COMPETICOES: Record<string, string> = {
  'serie-a': 'Série A', 'serie-b': 'Série B', argentina: 'liga argentina', colombia: 'liga colombiana', chile: 'liga chilena',
  'copa-do-brasil': 'Copa do Brasil', libertadores: 'Libertadores', champions: 'Champions', mundial: 'Mundial',
};

function preencher(t: string, x: Ctx, a: Alvos, extra: Record<string, string> = {}): string {
  const g = gestao(x);
  const j = x.jogo;
  const c = x.mem.financas.get(x.clube);
  const mapa: Record<string, string | undefined> = {
    clube: nomeClube(x, x.clube), tecnico: g.tecnico.nome, estilo: g.tecnico.estilo,
    adversario: j ? nomeClube(x, j.adversario) : undefined, rival: j ? nomeClube(x, j.adversario) : undefined, competicao: j ? COMPETICOES[j.competicao] ?? j.competicao : undefined,
    placar: j?.pro !== undefined ? `${j.pro} a ${j.contra}` : undefined, posicao: String(posicao(x)?.pos ?? '—'),
    jogador: a.jogador?.nome ?? x.jogador?.nome, jogador2: a.jogador2?.nome, profissional: a.profissional?.nome, profissional2: a.profissional2?.nome,
    empresario: a.empresario?.nome ?? ((a.jogador ?? x.jogador) ? x.mem.mercado?.agenteDe.get((a.jogador ?? x.jogador)!.id)?.nome ?? 'o empresário' : 'o empresário'), clube_interessado: a.clube_interessado ? nomeClube(x, a.clube_interessado) : undefined,
    reporter: a.reporter?.nome, tecnico_rival: (a.tecnico_rival ?? x.rival)?.nome, presidente: 'a presidência', investidor: 'o investidor', candidato: 'a oposição', representante: 'o representante',
    patrocinador: c?.cotas[0]?.marca, valor: a.jogador ? `R$ ${a.jogador.valor} mi` : undefined, salario: a.jogador ? `R$ ${a.jogador.salario} mil` : undefined, ...extra,
  };
  return t.replace(/\{(\w+)\}/g, (_, k: string) => mapa[k] ?? '—');
}

/** Controle do clube do jogador, se este clube é dele e o técnico é o do jogador (8ª fatia). */
const doJogador = (x: Ctx): ControleJogador | undefined => (x.dir.jogador?.clube === x.clube && gestao(x).tecnico.humano ? x.dir.jogador : undefined);
const log = (x: Ctx, s: string): void => { if (x.mem.imprensa!.dados.texto === x.clube) x.mem.imprensa!.log.push(s); };
const fmtEf = (es: Efeito[]): string => es.map((e) => (e.nivel ? `${e.k}${e.quem ? ' ' + e.quem : ''} ${e.sinal! > 0 ? '+' : '−'}${e.nivel}` : e.k + (e.n ? ` ${e.n}` : '') + (e.nome ? `: ${e.nome}` : '') + (e.id ? ` ${e.id}` : ''))).join(' · ');

// ---------- Eventos ----------

function peso(m: ModeloEvento, x: Ctx): number {
  let p = m.peso ?? 0;
  for (const md of m.mods) if (cumpre(md.cond, x)) p *= md.fator;
  if (anoEleicao(x) && (m.tema === 'diretoria' || m.gatilho.some((g) => g.startsWith('Eleição')))) p *= EVENTOS.eleicao;
  return p;
}

const podeRepetir = (m: ModeloEvento, st: EstadoClubeImprensa, ano: number): boolean => {
  const u = st.usados.get(m.id);
  if (u === undefined) return true;
  if (m.intervalo === null) return false;
  return ano - u >= m.intervalo;
};

function sortearEvento(x: Ctx): Pendente | null {
  const cands: { m: ModeloEvento; a: Alvos; p: number }[] = [];
  for (const m of x.mem.imprensa!.dados.modelos) {
    if (m.obrigatorio || m.peso === null || m.tema === x.st.ultimoTema || !podeRepetir(m, x.st, x.ano)) continue;
    if (!m.gatilho.every((g) => cumpre(g, x))) continue;
    const a = resolverAlvos(m, x);
    if (!a) continue;
    cands.push({ m, a, p: peso(m, x) });
  }
  const total = cands.reduce((s, c) => s + c.p, 0);
  if (total <= 0) return null;
  let r = x.rng.n() * total;
  for (const c of cands) { r -= c.p; if (r <= 0) return { modelo: c.m, alvos: c.a, tipo: 'sorteado' }; }
  const u = cands[cands.length - 1];
  return { modelo: u.m, alvos: u.a, tipo: 'sorteado' };
}

function resolverEvento(p: Pendente, x: Ctx, proximo: ProximoJogo | null): void {
  const I = x.mem.imprensa!;
  const m = p.modelo;
  const xa: Ctx = { ...x, jogador: p.alvos.jogador };
  const ok = m.escolhas.filter((e) => !e.requisito || cumpre(e.requisito, xa));
  // Clube do jogador (8ª fatia): ele escolhe; sem escolha ("Avançar"), vale o cenário.
  const J = doJogador(x);
  const letra = J?.evento?.({
    modelo: m, texto: preencher(m.texto, x, p.alvos),
    opcoes: ok.map((e) => ({ letra: e.letra, texto: preencher(e.texto, x, p.alvos), chance: e.sorteio ? chanceDaEscolha(e.sorteio.base, valorAtributo(x, e.sorteio.atributo, p.alvos)) : null })),
  }, x.mem) ?? null;
  const esc: Escolha = (letra ? ok.find((e) => e.letra === letra) : undefined)
    ?? (I.dados.cenario === 'avancar' ? (m.escolhas.find((e) => e.letra === m.delegado) ?? ok[0]) : ok[x.rng.int(0, ok.length - 1)]);
  let efs = esc.efeitos;
  let sorteio = '';
  if (esc.sorteio) {
    const ch = chanceDaEscolha(esc.sorteio.base, valorAtributo(x, esc.sorteio.atributo, p.alvos));
    const ganhou = x.rng.pct(ch);
    efs = ganhou ? esc.sucesso : esc.falha;
    sorteio = ` (sorteio ${ch.toFixed(0)}%: ${ganhou ? 'sucesso' : 'falha'})`;
  }
  fonte = 'evento';
  for (const e of efs) aplicarEfeito(e, xa, p.alvos, proximo);
  x.st.usados.set(m.id, x.ano);
  x.st.ultimoTema = m.tema;
  contar(I.escolhas, `${m.id}-${esc.letra}`);
  if (p.tipo === 'sorteado') x.st.ano.sorteados += 1; else if (p.tipo === 'elo') x.st.ano.elos += 1; else x.st.ano.obrigatorios += 1;
  log(x, `  Evento ${m.id} · ${m.titulo}: ${preencher(m.texto, x, p.alvos)}`);
  log(x, `    → ${esc.letra}) ${preencher(esc.texto, x, p.alvos)}${sorteio} · ${fmtEf(efs) || 'sem efeito'}`);
}

// ---------- Imprensa ----------

const itens = (x: Ctx, arquivo: string, assunto?: string): ItemImprensa[] =>
  x.mem.imprensa!.dados.imprensa.itens.filter((i) => i.arquivo === arquivo && (!assunto || i.assunto === assunto));

/** Item com contexto atendido, sem repetir em 8 jogos; com filtro de jogador, escolhe um do `pool`. */
function escolherItem(x: Ctx, lista: ItemImprensa[], pool: Jogador[] = elenco(x)): { item: ItemImprensa; jogador?: Jogador } | null {
  const ok: { item: ItemImprensa; jogador?: Jogador }[] = [];
  for (const item of lista) {
    const u = x.st.noticias.get(item.id);
    if (u !== undefined && x.st.jogos - u < IMPRENSA.repete) continue;
    const doJogador = item.contexto.filter((c) => filtroJogador(c));
    const resto = item.contexto.filter((c) => !filtroJogador(c));
    if (!resto.every((c) => cumpre(c, x))) continue;
    if (!doJogador.length) { ok.push({ item }); continue; }
    const js = pool.filter((j) => doJogador.every((c) => filtroJogador(c)!(j)));
    const j = sortear(x.rng, js);
    if (j) ok.push({ item, jogador: j });
  }
  // O contexto mais específico ganha (GDD-gestao 10).
  const especificos = ok.filter((o) => !o.item.contexto.every((c) => c === 'Sempre'));
  const r = sortear(x.rng, especificos.length && x.rng.pct(50) ? especificos : ok);
  if (r) x.st.noticias.set(r.item.id, x.st.jogos);
  return r ?? null;
}

const credito = (i: ItemImprensa): number => IMPRENSA.credibilidade[i.credibilidade ?? 'Alta'];

function emCrise(x: Ctx): boolean {
  const k = EVENTOS.crise;
  return x.st.marcas.has('grupo rachado') || (x.mem.diretoria.get(x.clube)?.confianca ?? 100) <= k.confianca || (x.mem.humor.get(x.clube) ?? 50) <= k.humor || moralGrupo(x) <= k.moral;
}

function sortearPeso<T>(rng: Rng, ops: [T, number][]): T | null {
  const tot = ops.reduce((s, o) => s + o[1], 0);
  if (tot <= 0) return null;
  let r = rng.n() * tot;
  for (const [v, p] of ops) { r -= p; if (r <= 0) return v; }
  return ops[ops.length - 1][0];
}

function coletiva(x: Ctx, proximo: ProximoJogo, dias: number, fase: Fase, crise: boolean): void {
  const st = x.st;
  const grande = proximo.classico || proximo.decisao;
  const k = IMPRENSA.coletiva;
  let n = 0;
  if (grande) n = k.perguntasGrande;
  else if (dias > 3 && st.ciclo - st.ultimaColetiva > 1 && x.rng.pct(crise ? k.crise : k.normal)) n = k.perguntas;
  if (!n) return;
  st.ultimaColetiva = st.ciclo;
  st.ano.coletivas += 1;
  const xj: Ctx = { ...x, jogo: { ...proximo } };
  const xu: Ctx = { ...x, jogo: st.ultimo };
  const a = IMPRENSA.assunto;
  const el = anoEleicao(x) ? IMPRENSA.eleicao : 1;
  const usados = new Set<string>();
  for (let i = 0; i < n; i++) {
    let assunto: string | null = proximo.classico && !usados.has('Clássico') ? 'Clássico' : null;
    const ult = st.ultimo;
    if (!assunto) assunto = sortearPeso(x.rng, ([
      [ult && ult.pro! > ult.contra! ? 'Pós-vitória' : 'Pós-derrota', ult && ult.pro !== ult.contra ? a.posJogo : 0],
      ['Pré-jogo', a.preJogo], ['Pressão', crise || fase === 'ruim' ? a.pressao * el : 0],
      ['Mercado', janelaDaSemana(semanaDoDia(x.dia)) !== null ? a.mercado : 0], ['Escalação', a.escalacao], ['Diretoria', a.diretoria * el],
    ] as [string, number][]).filter(([s]) => !usados.has(s)));
    if (!assunto) break;
    usados.add(assunto);
    const xx = assunto.startsWith('Pós') ? xu : xj;
    const p = escolherItem({ ...xx, rival: x.rival }, itens(x, 'coletiva', assunto));
    if (!p) continue;
    const respostas = itens(x, 'respostas').filter((r) => r.pergunta === p.item.id);
    if (!respostas.length) continue;
    const J = doJogador(x);
    const pedido = J?.coletiva?.({ assunto, pergunta: preencher(p.item.texto, xx, {}, { jogador: p.jogador?.nome ?? '—' }), respostas: respostas.map((y) => ({ tom: y.tom!, texto: preencher(y.texto, xx, {}) })), ultimosTons: st.tons.slice(-3) }, x.mem) ?? null;
    const escolhida = pedido ? respostas.find((y) => y.tom === pedido.tom) : undefined;
    const assessoria = escolhida ? pedido!.assessoria : x.mem.imprensa!.dados.cenario === 'avancar';
    const r = escolhida ?? (assessoria ? (respostas.find((y) => y.tom === 'Humildade') ?? respostas[0]) : respostas[x.rng.int(0, respostas.length - 1)]);
    const repetido = st.tons.length >= IMPRENSA.tomRepetido.seguidas - 1 && st.tons.slice(-(IMPRENSA.tomRepetido.seguidas - 1)).every((t) => t === r.tom);
    const ganho = assessoria ? IMPRENSA.assessoria : repetido ? IMPRENSA.tomRepetido.fator : 1;
    st.tons.push(r.tom!);
    st.ano.perguntas += 1;
    const aplicados: Efeito[] = [];
    for (const e0 of r.efeitos) {
      const e1 = nivelNoMomento(e0, fase, proximo.classico);
      if (!e1) continue;
      const e = { ...e1, quem: e1.k === 'Ímpeto' ? 'rival' : e1.k === 'Moral' ? 'elenco' : e1.quem };
      fonte = 'coletiva';
      const v = aplicarEfeito(e, xx, {}, proximo, ganho);
      if (e.k === 'Confiança') st.ano.confColetiva += v;
      aplicados.push(e);
    }
    log(x, `  Coletiva (${assunto}) ${preencher(p.item.texto, xx, {}, { jogador: p.jogador?.nome ?? '—' })}`);
    log(x, `    → ${r.tom}${assessoria ? ' (assessoria)' : ''}: "${preencher(r.texto, xx, {})}" · ${fmtEf(aplicados) || 'sem efeito'}${ganho < 1 ? ` · ganhos × ${ganho}` : ''}`);
    if (r.tom === 'Provocar' || r.tom === 'Arbitragem') st.fatos.push({ tipo: 'repercussao', tom: r.tom });
    if (r.tom === 'Provocar') provocou(x);
  }
}

function provocou(x: Ctx): void {
  const t = x.rival;
  if (t && x.rng.pct(t.imprensa === 'polêmico' ? IMPRENSA.rival.polemico : IMPRENSA.rival.discreto)) x.st.respostaRival = t;
}

function fala(x: Ctx, fase: Fase, crise: boolean, proximo: ProximoJogo): void {
  const st = x.st;
  const f = IMPRENSA.falas;
  if (st.jogosDesdeFala < f.intervalo || !x.rng.pct(crise ? f.crise : f.chance)) return;
  const sinal = x.rng.pct(f.sinal[fase]) ? 'Positiva' : 'Negativa';
  const xj: Ctx = { ...x, jogo: { ...proximo } };
  const p = escolherItem(xj, itens(x, 'falas_jogador').filter((i) => i.sinal === sinal));
  if (!p) return;
  st.jogosDesdeFala = 0;
  st.ano.falas += 1;
  const a: Alvos = { jogador: p.jogador };
  const efs = p.item.efeitos.map((e) => ({ ...e, quem: e.k === 'Ímpeto' ? (sinal === 'Positiva' ? 'clube' : 'rival') : e.k === 'Moral' ? 'elenco' : e.quem }));
  fonte = 'fala';
  for (const e of efs) aplicarEfeito(e, xj, a, proximo);
  log(x, `  Fala de ${p.jogador?.nome ?? '—'} (${p.item.assunto}, ${sinal}): "${preencher(p.item.texto, xj, a)}" · ${fmtEf(efs) || 'sem efeito'}`);
  if (p.item.assunto === 'Provocação') provocou(x);
}

interface Noticia { item: ItemImprensa; jogador?: Jogador; x: Ctx; semEfeito?: boolean; extra?: Record<string, string> }

function noticiaDoResultado(x: Ctx): Noticia | null {
  const u = x.st.ultimo;
  if (!u || u.pro === undefined) return null;
  const xu: Ctx = { ...x, jogo: u };
  const d = u.pro - u.contra!;
  const seq = seguidas(x.st.pontos, 3);
  let assunto = x.st.titulo ? 'Título ou acesso' : u.classico ? 'Clássico' : Math.abs(d) >= 3 ? 'Goleada' : seq >= CICLO_IMPRENSA.sequencia ? 'Sequência' : d > 0 ? 'Vitória' : d < 0 ? 'Derrota' : 'Empate';
  let lista = itens(x, 'resultados', assunto);
  if (assunto === 'Goleada') lista = lista.filter((i) => i.contexto.includes('Resultado goleado') === d < 0);
  if (assunto === 'Clássico') lista = lista.filter((i) => !i.contexto.includes(d > 0 ? 'Resultado derrota' : 'Resultado vitória') || d === 0);
  if (assunto === 'Clássico' && d < 0) lista = lista.filter((i) => i.contexto.includes('Resultado derrota'));
  const p = escolherItem(xu, lista);
  if (!p && assunto !== 'Vitória' && assunto !== 'Derrota' && assunto !== 'Empate') {
    assunto = d > 0 ? 'Vitória' : d < 0 ? 'Derrota' : 'Empate';
    const q = escolherItem(xu, itens(x, 'resultados', assunto));
    return q ? { ...q, x: xu, semEfeito: true } : null;
  }
  const comp = x.st.titulo;
  x.st.titulo = null;
  return p ? { ...p, x: xu, semEfeito: ['Vitória', 'Derrota', 'Empate'].includes(assunto), extra: { sequencia: `${seq} vitórias seguidas`, ...(comp ? { competicao: COMPETICOES[comp] ?? comp } : {}) } } : null;
}

function noticiaDoFato(x: Ctx): Noticia | null {
  const xu: Ctx = { ...x, jogo: x.st.ultimo };
  for (const f of x.st.fatos) {
    const pool = f.jogador ? [f.jogador] : undefined;
    const mapa: Record<Fato['tipo'], [string, string]> = {
      lesao: ['lesoes', 'Lesão confirmada'], retorno: ['lesoes', 'Retorno'], contratacao: ['mercado', 'Contratação fechada'], venda: ['mercado', 'Venda fechada'],
      desmentido: ['mercado', 'Desmentido'], repercussao: ['declaracoes', 'Repercussão da coletiva'],
    };
    let [arq, assunto] = mapa[f.tipo];
    if (f.tipo === 'lesao' && x.st.lesionados.size >= CICLO_IMPRENSA.dmCheio) assunto = 'Departamento médico cheio';
    const p = escolherItem({ ...xu, tom: f.tom ?? null }, itens(x, arq, assunto), pool);
    if (p) return { ...p, jogador: p.jogador ?? f.jogador, x: xu, extra: { semanas: String(f.semanas ?? 2) } };
  }
  return null;
}

function noticiaDoAmbiente(x: Ctx, crise: boolean): Noticia | null {
  const xu: Ctx = { ...x, jogo: x.st.ultimo };
  if (x.st.respostaRival) {
    const rival = x.st.respostaRival;
    x.st.respostaRival = null;
    const p = escolherItem({ ...xu, rival }, itens(x, 'declaracoes', 'Resposta do técnico rival'));
    return p ? { ...p, x: { ...xu, rival } } : null;
  }
  const A = IMPRENSA.ambiente;
  if (!x.rng.pct(A.chance)) return null;
  const el = anoEleicao(x) ? IMPRENSA.eleicao : 1;
  const janela = janelaDaSemana(semanaDoDia(x.dia)) !== null;
  const d = x.mem.diretoria.get(x.clube);
  const k = EVENTOS.crise;
  const crises: string[] = [];
  if (x.st.marcas.has('grupo rachado') || moralGrupo(x) <= k.moral) crises.push('Vestiário');
  if ((d?.confianca ?? 100) <= k.confianca) crises.push('Técnico pressionado');
  if ((x.mem.humor.get(x.clube) ?? 50) <= k.humor) crises.push('Protesto da torcida');
  if ((x.mem.financas.get(x.clube)?.atrasados ?? 0) > 0) crises.push('Salários atrasados');
  if (x.dia - x.st.tecnicoDesde <= CICLO_IMPRENSA.demissaoDias) crises.push('Demissão');
  const tipo = sortearPeso(x.rng, [
    ['rumor', A.rumor * (janela ? A.rumorJanela : 1) * el], ['crise', crises.length && crise ? A.crise * el : crises.length ? A.crise * el : 0],
    ['eleicao', anoEleicao(x) ? A.eleicao * el : 0], ['provocacao', A.provocacao],
  ]);
  if (tipo === 'crise') { const p = escolherItem(xu, itens(x, 'crises', sortear(x.rng, crises))); return p ? { ...p, x: xu } : null; }
  if (tipo === 'eleicao') { const p = escolherItem(xu, itens(x, 'eleicao').filter((i) => i.assunto !== 'Resultado da eleição')); return p ? { ...p, x: xu } : null; }
  if (tipo === 'provocacao') {
    const p = escolherItem(xu, itens(x, 'declaracoes').filter((i) => i.assunto === 'Provocação' || i.assunto === 'Crítica à arbitragem'));
    return p ? { ...p, x: xu } : null;
  }
  // Rumor: saída de um titular ou chegada de alguém de fora; a verdade é sorteada ao publicar.
  const saida = x.rng.pct(50);
  const pool = saida ? elenco(x).filter((j) => papelNoElenco(elenco(x), j) === 'titular')
    : Object.keys(x.dir.entradas).filter((c) => c !== x.clube).flatMap((c) => x.mem.elencos[c] ?? []).filter((j) => Math.abs(j.nota - Math.max(...elenco(x).map((y) => y.nota)) + 1) <= 2);
  const p = escolherItem(xu, itens(x, 'mercado', saida ? 'Rumor de saída' : 'Rumor de chegada'), pool);
  if (!p) return null;
  const j = p.jogador ?? sortear(x.rng, pool);
  const verdade = x.rng.pct(IMPRENSA.verdade[p.item.credibilidade ?? 'Média']);
  if (!verdade && j) x.st.desmentidos.push({ dia: x.dia + x.rng.int(7, 28), jogador: j });
  return { ...p, jogador: j, x: xu, extra: { clube_interessado: sortear(x.rng, Object.keys(x.dir.entradas).filter((c) => c !== x.clube)) ?? '—' } };
}

function noticias(x: Ctx, crise: boolean): void {
  const ns = [noticiaDoResultado(x), noticiaDoFato(x), noticiaDoAmbiente(x, crise)].filter((n): n is Noticia => !!n);
  x.st.fatos = [];
  const forca = (n: Noticia): number => (n.semEfeito ? 0 : n.item.efeitos.reduce((s, e) => s + Math.abs(valorDe(e)), 0) * credito(n.item));
  const manchete = ns.reduce<Noticia | null>((m, n) => (forca(n) > (m ? forca(m) : 0) ? n : m), null);
  for (const n of ns) {
    const a: Alvos = { jogador: n.jogador };
    const extra = { ...(n.extra ?? {}), ...(n.extra?.clube_interessado ? { clube_interessado: nomeClube(x, n.extra.clube_interessado) } : {}) };
    const rep = x.mem.imprensa!.dados.imprensa.reporteres.find((r) => r.tipo === n.item.reporter);
    log(x, `  ${n === manchete ? 'MANCHETE' : 'Notícia'} (${rep ? rep.veiculo : 'Redação'}): ${preencher(n.item.manchete, n.x, a, extra)}`
      + (n === manchete ? ` · ${fmtEf(n.item.efeitos)} × ${credito(n.item)}` : ''));
  }
  if (manchete) {
    x.st.ano.manchetes += 1;
    fonte = 'manchete';
    for (const e of manchete.item.efeitos) aplicarEfeito(e, manchete.x, { jogador: manchete.jogador }, null, 1, credito(manchete.item));
  }
}

// ---------- Ciclo ----------

const ctxDe = (mem: Memoria, dir: CtxDiretoria, clube: string, dia: number, jogo: Jogo | null, st: EstadoClubeImprensa): Ctx => ({
  mem, dir, clube, st, dia, ano: dir.ano, jogo, rival: jogo ? dir.entradas[jogo.adversario]?.tecnico ?? null : null,
  rng: criarRng(semearDeTexto(`${dir.ano}-${clube}-${dia}-imprensa-${st.ciclo}`)),
});

/** Etapa 2 da tela do ciclo, antes do próximo jogo do clube: eventos, coletiva, fala e notícias. */
export function cicloNaImprensa(mem: Memoria, dir: CtxDiretoria, clube: string, proximo: ProximoJogo): void {
  const I = mem.imprensa;
  const st = I?.clubes.get(clube);
  if (!I || !st || !mem.gestao.has(clube)) return;
  const ultimo = mem.ultimoJogo.get(clube);
  const dias = ultimo === undefined ? CICLO_IMPRENSA.diasPre : proximo.dia - ultimo;
  st.ciclo += 1;
  const x = ctxDe(mem, dir, clube, proximo.dia, { ...proximo }, st);
  const g = gestao(x);
  if (g.tecnico.nome !== st.tecnico) {
    // Técnico novo: deixa para trás cadeias e marcas (GDD-gestao 10).
    st.tecnico = g.tecnico.nome; st.tecnicoDesde = proximo.dia; st.cadeias = []; st.marcas.clear(); st.promessas = []; st.fila = [];
  }
  for (const [k, v] of [...st.marcas]) if (v.fim <= x.dia) st.marcas.delete(k);
  st.promessas = st.promessas.filter((d) => d > x.dia);
  // Fatos do ciclo: retornos, transferências e desmentidos vencidos.
  const lesionados = new Set(elenco(x).filter((j) => mem.jogadores.get(j.id)?.voltaDia != null).map((j) => j.id));
  for (const id of st.lesionados) if (!lesionados.has(id)) { const j = elenco(x).find((y) => y.id === id); if (j) st.fatos.push({ tipo: 'retorno', jogador: j }); }
  st.lesionados = lesionados;
  const tr = mem.mercado?.transferencias ?? [];
  for (; st.transf < tr.length; st.transf++) {
    const t = tr[st.transf];
    const j = mem.elencos[t.para]?.find((y) => y.id === t.jogador);
    if (!j || t.tipo === 'pre-contrato') continue;
    if (t.para === clube) st.fatos.push({ tipo: 'contratacao', jogador: j });
    else if (t.de === clube) st.fatos.push({ tipo: 'venda', jogador: j });
  }
  for (const d of st.desmentidos.filter((y) => y.dia <= x.dia)) st.fatos.push({ tipo: 'desmentido', jogador: d.jogador });
  st.desmentidos = st.desmentidos.filter((y) => y.dia > x.dia);

  const fase = faseDe(st.pontos);
  const crise = emCrise(x);
  log(x, `Semana ${semanaDoDia(x.dia)} · próximo: ${nomeClube(x, proximo.adversario)} (${proximo.competicao}${proximo.classico ? ', clássico' : ''}${proximo.decisao ? ', decisão' : ''}) · fase ${fase}${crise ? ' · CRISE' : ''}`
    + ` · Confiança ${(mem.diretoria.get(clube)?.confianca ?? 0).toFixed(0)} · Humor ${(mem.humor.get(clube) ?? 0).toFixed(0)} · moral do grupo ${moralGrupo(x).toFixed(0)}`);

  noticias(x, crise);

  // Eventos: obrigatórios, elos e um sorteado; até 2, o resto passa para o ciclo seguinte.
  const novos: Pendente[] = [];
  const modelo = (id: string) => I.dados.modelos.find((m) => m.id === id);
  const ult = modelo(EVENTOS.ultimato.id);
  if (ult && (mem.diretoria.get(clube)?.confianca ?? 100) <= EVENTOS.ultimato.confianca && podeRepetir(ult, st, x.ano)) novos.push({ modelo: ult, alvos: {}, tipo: 'obrigatorio' });
  const sal = modelo(EVENTOS.salarios.id);
  // Salários atrasados: uma vez por episódio de atraso (decisão de 15/11/2026).
  const atraso = mem.financas.get(clube)?.atrasados ?? 0;
  if (atraso === 0) st.salarioAvisado = false;
  if (sal && atraso >= EVENTOS.salarios.meses && !st.salarioAvisado) { const a = resolverAlvos(sal, x); if (a) { novos.push({ modelo: sal, alvos: a, tipo: 'obrigatorio' }); st.salarioAvisado = true; } }
  for (const c of st.cadeias.filter((y) => y.dia <= x.dia)) {
    const m = modelo(c.id);
    // Se o alvo deixou o clube, a cadeia termina sem efeito.
    const saiu = [c.alvos.jogador, c.alvos.jogador2].some((j) => j && j.clubeId !== clube && !(c.alvos.clube_interessado && j.clubeId === c.alvos.clube_interessado));
    if (m && !saiu) novos.push({ modelo: m, alvos: c.alvos, tipo: 'elo' });
  }
  st.cadeias = st.cadeias.filter((y) => y.dia > x.dia);
  const fila = [...novos.filter((p) => p.tipo === 'obrigatorio'), ...st.fila, ...novos.filter((p) => p.tipo !== 'obrigatorio')];
  if (fila.length < EVENTOS.maxPorCiclo && x.rng.pct(chanceDeEvento(dias))) { const s = sortearEvento(x); if (s) fila.push(s); }
  st.fila = fila.slice(EVENTOS.maxPorCiclo);
  for (const p of fila.slice(0, EVENTOS.maxPorCiclo)) resolverEvento(p, x, proximo);

  coletiva(x, proximo, dias, fase, crise);
  fala(x, fase, crise, proximo);
}

/** Ímpeto de início dos dois lados (efeitos de eventos e imprensa), zerado depois do uso. */
export function impetoDoJogo(mem: Memoria, a: string, b: string): [number, number] {
  const sa = mem.imprensa?.clubes.get(a), sb = mem.imprensa?.clubes.get(b);
  const v: [number, number] = [(sa?.impeto ?? 0) + (sb?.impetoRival ?? 0), (sb?.impeto ?? 0) + (sa?.impetoRival ?? 0)];
  for (const s of [sa, sb]) if (s) { s.impeto = 0; s.impetoRival = 0; }
  return [limitar(v[0], -100, 100), limitar(v[1], -100, 100)];
}

/** Depois do jogo de um clube com imprensa: pontos, último jogo, tabela da liga e lesões do jogo. */
export function jogoNaImprensa(mem: Memoria, clube: string, lado: 0 | 1, r: ResultadoPartida, j: Jogo, liga: boolean): void {
  const I = mem.imprensa;
  if (!I) return;
  if (liga) {
    const t = I.tabela.get(clube) ?? { p: 0, sg: 0, gp: 0 };
    t.p += j.pro! > j.contra! ? 3 : j.pro === j.contra ? 1 : 0;
    t.sg += j.pro! - j.contra!;
    t.gp += j.pro!;
    I.tabela.set(clube, t);
  }
  const st = I.clubes.get(clube);
  if (!st) return;
  st.pontos.push(j.pro! > j.contra! ? 3 : j.pro === j.contra ? 1 : 0);
  if (st.pontos.length > 10) st.pontos.shift();
  st.ultimo = j;
  st.jogos += 1;
  st.jogosAno += 1;
  st.jogosDesdeFala += 1;
  st.competicoes.set(j.competicao, j.dia);
  for (const l of r.lesoes) {
    if (l.time !== lado || l.gravidade === 'leve') continue;
    const jog = mem.elencos[clube].find((y) => y.id === l.jogador);
    if (jog) st.fatos.push({ tipo: 'lesao', jogador: jog, semanas: l.semanas });
  }
}

/** Título de copa: a próxima notícia de resultado é de conquista. */
export function tituloNaImprensa(mem: Memoria, clube: string, competicao: string): void {
  const st = mem.imprensa?.clubes.get(clube);
  if (st) st.titulo = competicao;
}

/**
 * Defeitos na torcida (motor, Anexo A), para todo clube com Humor, com teto de M por jogador:
 * Fominha perde a bola em F5/F6 −P · Esquentado expulso −M · Indisciplinado, por cartão −P ·
 * Preguiçoso sem a bola, derrota em casa −P · Firuleiro perde no drible em F1 a F3 −P, goleada a favor +P.
 */
export function torcidaDosDefeitos(mem: Memoria, clube: string, lado: 0 | 1, r: ResultadoPartida, emCasa: boolean): void {
  if (!mem.humor.has(clube)) return;
  const t = r.times[lado];
  const [pro, contra] = lado === 0 ? r.placar : [r.placar[1], r.placar[0]];
  const soma = new Map<string, number>();
  const tipos = mem.dir.defeitos.tipos;
  const vistos = new Set<string>();
  const add = (id: string, v: number, tipo = ''): void => {
    if (DEFEITOS_TORCIDA.umaVez && vistos.has(`${id}-${tipo}`)) return;
    vistos.add(`${id}-${tipo}`);
    soma.set(id, (soma.get(id) ?? 0) + v);
    if (tipo) tipos[tipo] = (tipos[tipo] ?? 0) + v;
  };
  const def = new Map(t.participantes.map((e) => [e.j.id, e]));
  const tem = (id: string | null, d: string): boolean => !!id && !!def.get(id)?.j.defeitos.includes(d);
  for (const l of r.lances) {
    const faixa = Number((l.zonaDestino ?? l.zonaOrigem ?? 'xx0')[2]);
    // Zonas na visão de quem tinha a bola. PROVISORIO: "com companheiro livre" não é registrado; vale a perda no drible ou na condução (desarme).
    const perdeu = l.lance === 'Desarme' && l.time !== lado ? l.jogador2 : null;
    if (perdeu && tem(perdeu, 'Fominha') && faixa >= 5) add(perdeu, -PMG.P, 'Fominha');
    if (perdeu && tem(perdeu, 'Firuleiro') && faixa <= 3) add(perdeu, -PMG.P, 'Firuleiro');
  }
  for (const e of t.participantes) {
    if (e.j.defeitos.includes('Esquentado') && e.expulso) add(e.j.id, -PMG.M, 'Esquentado');
    if (e.j.defeitos.includes('Indisciplinado')) add(e.j.id, -PMG.P * (e.amarelos + (e.expulso === 'direto' ? 1 : 0)), 'Indisciplinado');
    if (e.j.defeitos.includes('Preguiçoso sem a bola') && emCasa && pro < contra) add(e.j.id, -PMG.P, 'Preguiçoso');
    if (e.j.defeitos.includes('Firuleiro') && pro - contra >= 3) add(e.j.id, PMG.P, 'Firuleiro goleada');
  }
  let total = 0;
  for (const v of soma.values()) total += limitar(v, -PMG.M, PMG.M);
  if (!total) return;
  total *= DEFEITOS_TORCIDA.fator;
  humor(mem, clube, total);
  mem.dir.defeitos.soma += total;
  mem.dir.defeitos.n += 1;
}

/** PROVISORIO: cada defeito conta uma vez por jogador e por jogo (teste: false conta cada lance, até M). Fator 0,15 (Gustavo, 15/11/2026; 1 derrubava o Humor e as demissões até no cenário IA). */
export const DEFEITOS_TORCIDA = { umaVez: true, fator: 0.15 };

/** Fim da temporada: contagem do ano por clube e liga; elos pendentes entram no 1º ciclo da pré-temporada. */
export function fecharAnoImprensa(mem: Memoria, clubesPorLiga: Record<string, string[]>, ano: number): void {
  const I = mem.imprensa;
  if (!I) return;
  for (const [clube, st] of I.clubes) {
    const liga = Object.keys(clubesPorLiga).find((l) => clubesPorLiga[l].includes(clube)) ?? '';
    I.historico.push({ ano, clube, liga, ...st.ano });
    st.ano = zero();
    st.jogosAno = 0;
    for (const c of st.cadeias) c.dia = 0;
    st.competicoes.clear();
  }
  I.tabela.clear();
  mem.mercado?.fica.clear();
}
