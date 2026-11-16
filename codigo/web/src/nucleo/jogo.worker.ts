/// <reference lib="webworker" />
// Worker do jogo (5d1): o mundo vive aqui; a tela pede ações e recebe o painel pronto.
// O núcleo (motor, gestão, temporada) é o mesmo do terminal, importado de `codigo/`; os JSON de `gerado/` vão no pacote.
import { montarBase } from '../../../temporada/base.ts';
import { concluirAno, criarMundo, iniciarAno, virar } from '../../../temporada/virada.ts';
import type { Mundo } from '../../../temporada/virada.ts';
import { cicloEmPassos, copasDe, tabelaAtual } from '../../../temporada/temporada.ts';
import type { DiaEmPassos, JogoDisputado, RespostaDoDia } from '../../../temporada/temporada.ts';
import type { AoVivo, Contexto } from './partida.ts';
import { ajusteDaResposta, aplicarPreJogo, fimJogo, infoJogoTela, novasLinhas, novoAoVivo, parcial, preJogo, telaPausa } from './partida.ts';
import { estadoTatica, progressoDe } from '../../../temporada/taticaJogador.ts';
import { assumirClube, criarTecnicoDoJogador } from '../../../temporada/jogador.ts';
import { carregar, salvar } from '../../../temporada/salvamento.ts';
import { comprimir, descomprimir, apagar, gravar, ler, listar } from './saves.ts';
import type { Carga, Foco, ElencoTela, TreinoTela, ClubeResumo, Etapa, EscolhaPreJogo, RespostaPausa, InfoSlot, JogoTela, NovoJogo, Painel, Pedido, Pedidos, Resposta, ResumoVirada, Slot, TipoPedido } from './protocolo.ts';

const arquivos = import.meta.glob('../../../gerado/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
/** Base nova a cada jogo: a carreira muda elencos e fichas (o mundo não copia tudo). */
const novaBase = () => montarBase(<T,>(arq: string): T => {
  const v = arquivos[`../../../gerado/${arq}`];
  if (v === undefined) throw new Error(`Dado não encontrado: ${arq}`);
  return structuredClone(v) as T;
});
const base = novaBase();

/** O que o save da web guarda além do mundo. */
interface ExtraWeb { semente: number; clubeTela: string; treino?: { carga: Carga; foco: Foco } | null }

let m: Mundo | null = null;
let extra: ExtraWeb = { semente: 0, clubeTela: '' };
let ultimos: JogoDisputado[] = [];
let virada: ResumoVirada | null = null;

const ligaCurta = (l: string): l is 'serie-a' | 'serie-b' => l === 'serie-a' || l === 'serie-b';
const tecnicoDoJogador = (w: Mundo) => w.tecnicos.find((t) => t.humano)!;

function clubes(): ClubeResumo[] {
  return base.clubes.filter((c) => ligaCurta(c.liga) && !c.reserva).map((c) => {
    const t = base.tecnicos.find((x) => x.clubeId === c.id);
    return {
      id: c.id, nome: c.nome, nomeCurto: c.nomeCurto, liga: c.liga as 'serie-a' | 'serie-b', cidade: c.cidade, cores: c.cores, estadio: c.estadio,
      reputacao: c.reputacao, torcida: c.torcidaTamanho, perfil: c.perfil,
      tecnico: { nome: t?.nome ?? '—', estilo: t?.estilo ?? '—', formacao: t?.formacaoComBola ?? '—' },
      caixa: base.comercial.fichas.find((f) => f.clubeId === c.id)?.caixa ?? null,
    };
  }).sort((a, b) => a.liga.localeCompare(b.liga) || b.reputacao - a.reputacao || a.nome.localeCompare(b.nome));
}

function novoJogo(p: NovoJogo): Painel {
  const b = novaBase();
  const w = criarMundo(b);
  const clube = w.clubes.find((c) => c.id === p.clube);
  if (!clube || !ligaCurta(clube.liga)) throw new Error('Escolha um clube da Série A ou da Série B.');
  const antigo = w.tecnicos.find((t) => t.clubeId === clube.id);
  // Decisão do Gustavo (5d1): nome e origem; estilo e formações do técnico do clube; temperamento Gestor.
  const t = criarTecnicoDoJogador({
    nome: p.nome.trim() || 'Técnico', origem: p.origem, estilo: antigo?.estilo ?? 'Ginga',
    formacaoComBola: antigo?.formacaoComBola ?? '4-4-2', formacaoSemBola: antigo?.formacaoSemBola ?? '4-4-2', temperamento: 'Gestor',
  });
  assumirClube(w.tecnicos, clube, t);
  w.jogador = { clube: clube.id };
  w.eventos = { modelos: b.eventos, imprensa: b.imprensa, cenario: 'avancar', clubes: [clube.id], texto: null };
  iniciarAno(w, p.semente);
  abandonarCiclo();
  m = w;
  extra = { semente: p.semente, clubeTela: clube.id };
  ultimos = [];
  virada = null;
  return painel(w);
}

// ---------- Ciclo em passos e partida ao vivo (5d2) ----------

/** Ciclo em andamento: só existe entre o pré-jogo e o fim da partida do clube do jogador. */
let ciclo: { it: DiaEmPassos; aoVivo: AoVivo | null } | null = null;

function abandonarCiclo(): void {
  ciclo?.it.return([]);
  ciclo = null;
}

function contexto(w: Mundo): Contexto {
  return { mem: w.emAndamento!.memoria, tatica: w.tatica, elencos: w.elencos, frases: base.frases, clube: w.jogador!.clube };
}

const nomesDe = (w: Mundo) => Object.fromEntries(w.clubes.map((x) => [x.id, x.nomeCurto]));

function avancar(): Promise<Etapa> {
  const w = exigir();
  if (ciclo) throw new Error('Há uma partida em andamento.');
  virada = null;
  const s = w.emAndamento ?? iniciarAno(w, extra.semente);
  const J = w.jogador!;
  // O controle do jogador não vai no save (5c): o gancho do fim do jogo é posto aqui a cada ciclo.
  J.aoJogo = (d, r) => { if (ciclo?.aoVivo) ciclo.aoVivo.final = { d, r }; };
  // Treino (5d3a): plano fixo do jogador, ou o auxiliar decide (null).
  J.treino = () => extra.treino ?? null;
  ciclo = { it: cicloEmPassos(s, { jogador: J, interativo: true }), aoVivo: null };
  return conduzir(undefined);
}

/** Roda o ciclo até o próximo pedido (pré-jogo ou pausa) ou até o fim. */
async function conduzir(resposta: RespostaDoDia | undefined): Promise<Etapa> {
  const w = exigir();
  const s = w.emAndamento!;
  const c = ciclo!;
  let p;
  try { p = c.it.next(resposta as RespostaDoDia); } catch (e) { ciclo = null; throw e; }
  while (!p.done) {
    const v = p.value;
    const ctx = contexto(w);
    if (v.tipo === 'escalar') {
      const clube = w.clubes.find((x) => x.id === w.jogador!.clube)!;
      const fase = copasDe(s).flatMap((cp) => cp.previstos(s.dia)).find((j) => j.dia === v.pedido.jogo.dia && (j.mandante === clube.id || j.visitante === clube.id))?.fase;
      const jogo = infoJogoTela(v.pedido.jogo, v.lado, clube.id, v.lado === 0 ? clube.estadio : w.clubes.find((x) => x.id === v.pedido.jogo.adversario)?.estadio ?? null, fase);
      c.aoVivo = novoAoVivo(jogo, v.pedido.jogo.dia);
      return { tipo: 'prejogo', pre: preJogo(ctx, v.pedido, jogo, nomesDe(w)) };
    }
    const a = c.aoVivo!;
    a.lances.push(...v.info.lances);
    a.info = v.info;
    if (a.simular) { p = c.it.next(null); continue; }
    return { tipo: 'pausa', jogo: a.jogo, nomes: nomesDe(w), linhas: novasLinhas(ctx, a, parcial(v.info, a), v.info.minuto / 15), pausa: telaPausa(ctx, v.info) };
  }
  ciclo = null;
  ultimos = p.value;
  const a = c.aoVivo;
  let linhas: ReturnType<typeof novasLinhas> = [];
  if (a?.final) {
    if (a.simular) a.narrados = 0;
    linhas = novasLinhas(contexto(w), a, a.final.r, 99);
  }
  if (s.fim) {
    const r = virar(w, concluirAno(w));
    virada = { ano: r.ano, campeoes: r.campeoes, rebaixados: r.rebaixados, promovidos: r.promovidos };
    iniciarAno(w, extra.semente);
    // Slot automático gravado em toda virada (decisão do Gustavo, 5d1).
    await salvarEm('auto');
  }
  const pn = painel(w);
  if (a?.final) return { tipo: 'fim', jogo: a.jogo, nomes: pn.nomes, linhas, fim: fimJogo(a, ultimos), painel: pn };
  return { tipo: 'painel', painel: pn };
}


function responderPreJogo(e: EscolhaPreJogo): Promise<Etapa> {
  const w = exigir();
  if (!ciclo?.aoVivo || ciclo.aoVivo.info) throw new Error('Nenhum pré-jogo aberto.');
  ciclo.aoVivo.simular = e.modo === 'simular';
  return conduzir(aplicarPreJogo(contexto(w), e));
}

function responderPausa(r: RespostaPausa): Promise<Etapa> {
  const w = exigir();
  const a = ciclo?.aoVivo;
  if (!a?.info) throw new Error('Nenhuma pausa aberta.');
  if (r.simularResto) a.simular = true;
  return conduzir(ajusteDaResposta(contexto(w), a.info, r));
}

function exigir(): Mundo {
  if (!m) throw new Error('Nenhum jogo aberto.');
  return m;
}

const semanaDe = (dia: number): number => Math.ceil(dia / 7);
const paraTela = (j: { dia: number; competicao: string; mandante: string; visitante: string; fase?: string; placar?: [number, number]; penaltis?: [number, number] | null }): JogoTela => ({
  dia: j.dia, semana: semanaDe(j.dia), competicao: j.competicao, mandante: j.mandante, visitante: j.visitante,
  ...(j.fase ? { fase: j.fase } : {}), ...(j.placar ? { placar: j.placar } : {}), ...(j.penaltis !== undefined ? { penaltis: j.penaltis } : {}),
});

function painel(w: Mundo): Painel {
  const s = w.emAndamento!;
  const t = tecnicoDoJogador(w);
  if (t.clubeId) extra.clubeTela = t.clubeId;
  const id = extra.clubeTela;
  const c = w.clubes.find((x) => x.id === id)!;
  const doClube = (j: { mandante: string; visitante: string }) => j.mandante === id || j.visitante === id;
  const jogados = s.jogos.filter(doClube).map(paraTela);
  const futuros = [
    ...s.dasLigas.filter((j) => j.dia >= s.dia && doClube(j)),
    ...copasDe(s).flatMap((cp) => cp.previstos(s.dia)).filter(doClube),
  ].map(paraTela).sort((a, b) => a.dia - b.dia);
  const liga = Object.keys(w.clubesPorLiga).find((l) => w.clubesPorLiga[l].includes(id)) ?? c.liga;
  const linhas = (w.clubesPorLiga[liga] ? tabelaAtual(s, liga) : []).map((l, i) => ({
    pos: i + 1, clube: l.clube, j: l.jogos, v: l.vitorias, e: l.empates, d: l.derrotas, gp: l.golsPro, gc: l.golsContra, sg: l.saldo, pts: l.pontos,
  }));
  const mem = s.memoria;
  return {
    ano: w.ano, dia: s.dia, semana: semanaDe(s.dia),
    nomes: Object.fromEntries(w.clubes.map((x) => [x.id, x.nomeCurto])),
    tecnico: { nome: t.nome, reputacao: t.reputacao, clube: t.clubeId },
    clube: { id, nome: c.nome, nomeCurto: c.nomeCurto, cores: c.cores, cidade: c.cidade, estadio: c.estadio, liga },
    proximo: t.clubeId ? futuros[0] ?? null : null,
    ultimos: ultimos.filter(doClube).map(paraTela),
    calendario: [...jogados, ...futuros],
    tabela: { liga, linhas },
    confianca: mem.diretoria.get(id)?.confianca ?? null,
    humor: mem.humor.get(id) ?? null,
    caixa: mem.financas.get(id)?.caixa ?? null,
    virada,
  };
}

// ---------- Elenco e treino (5d3a) ----------
function elencoTela(w: Mundo): ElencoTela {
  const mem = w.emAndamento!.memoria;
  const id = extra.clubeTela;
  const dia = w.emAndamento!.dia;
  const jogadores = (mem.elencos[id] ?? []).map((j) => {
    const e = mem.jogadores.get(j.id);
    const lesionado = !!e && e.voltaDia !== null && e.voltaDia > dia;
    const suspenso = !!e && Object.values(e.suspensao).some((n) => n > 0);
    return {
      id: j.id, nome: j.nome, posicao: j.posicao, idade: j.idade, nota: j.nota, potencial: j.potencial,
      condicao: Math.round(e?.condicao ?? 100), moral: Math.round(e?.moral ?? 50),
      estado: lesionado ? 'lesionado' as const : suspenso ? 'suspenso' as const : 'ok' as const,
      voltaDia: lesionado ? e!.voltaDia : null, contrato: j.contrato, salario: j.salario, valor: j.valor,
      tracos: j.tracos, qualidades: j.qualidades, defeitos: j.defeitos, titularidades: e?.titularidades ?? 0,
    };
  }).sort((a, b) => b.nota - a.nota || a.nome.localeCompare(b.nome));
  return { clube: id, folhaMes: jogadores.reduce((s, j) => s + j.salario, 0), jogadores };
}

function treinoTela(w: Mundo): TreinoTela {
  const mem = w.emAndamento!.memoria;
  const id = extra.clubeTela;
  const g = mem.gestao.get(id);
  const est = estadoTatica(mem, id);
  return {
    plano: extra.treino ?? null,
    ultimo: { carga: g?.treino.carga ?? 'normal', foco: g?.treino.foco ?? null },
    taticas: est.taticas.map((x, i) => ({ nome: x.nome, estilo: x.estilo, formacao: `${x.formacaoComBola} / ${x.formacaoSemBola}`, entrosamento: progressoDe(mem, id, w.tatica, x), ativa: i === est.ativa, treinar: i === est.treinar })),
  };
}

function definirTreino(p: { carga: Carga; foco: Foco } | null): TreinoTela {
  const w = exigir();
  extra.treino = p;
  return treinoTela(w);
}

// ---------- Saves ----------
function infoDe(w: Mundo, slot: Slot, tamanho: number, criado = new Date().toISOString()): InfoSlot {
  const t = tecnicoDoJogador(w);
  return { slot, clube: w.clubes.find((c) => c.id === extra.clubeTela)?.nomeCurto ?? '—', tecnico: t.nome, ano: w.ano, semana: semanaDe(w.emAndamento?.dia ?? 1), criado, tamanho };
}

async function salvarEm(slot: Slot): Promise<InfoSlot> {
  const w = exigir();
  if (ciclo) throw new Error('Termine a partida antes de salvar.');
  const dados = await comprimir(salvar<ExtraWeb>(w, extra));
  const info = infoDe(w, slot, dados.size);
  await gravar(info, dados);
  return info;
}

async function abrirSave(dados: Blob): Promise<{ mundo: Mundo; extra: ExtraWeb }> {
  const s = carregar<ExtraWeb>(await descomprimir(dados));
  if (!s.mundo.emAndamento) throw new Error('Este save não tem um ano em andamento.');
  const t = tecnicoDoJogador(s.mundo);
  // O controle do jogador não vai no save: volta aqui, com tudo delegado ao auxiliar (5d1).
  s.mundo.jogador = { clube: t.clubeId ?? s.extra.clubeTela };
  return { mundo: s.mundo, extra: s.extra };
}

async function carregarSlot(slot: Slot): Promise<Painel> {
  const r = await ler(slot);
  if (!r) throw new Error('Slot vazio.');
  const a = await abrirSave(r.dados);
  abandonarCiclo();
  m = a.mundo;
  extra = a.extra;
  ultimos = [];
  virada = null;
  return painel(m);
}

async function exportar(slot: Slot): Promise<{ nome: string; dados: Blob }> {
  const r = await ler(slot);
  if (!r) throw new Error('Slot vazio.');
  const nome = `central-${r.info.clube}-ano${r.info.ano}-sem${r.info.semana}.save`.toLowerCase().normalize('NFD').replace(/[^a-z0-9.-]+/g, '-');
  return { nome, dados: r.dados };
}

async function importar(slot: Slot, dados: Blob): Promise<InfoSlot> {
  let a: { mundo: Mundo; extra: ExtraWeb };
  try { a = await abrirSave(dados); } catch (e) {
    throw new Error(`Arquivo não reconhecido como save do jogo (${e instanceof Error ? e.message : String(e)}).`);
  }
  const antes = extra;
  extra = a.extra;
  const info = infoDe(a.mundo, slot, dados.size);
  extra = antes;
  await gravar(info, dados);
  return info;
}

// ---------- Mensagens ----------
type Tratador = { [T in TipoPedido]: (d: Pedidos[T]['pede']) => Pedidos[T]['volta'] | Promise<Pedidos[T]['volta']> };
const tratar: Tratador = {
  clubes: () => clubes(),
  novoJogo: (p) => novoJogo(p),
  avancar: () => avancar(),
  preJogo: (e) => responderPreJogo(e),
  pausa: (r) => responderPausa(r),
  painel: () => (m ? painel(m) : null),
  elenco: () => elencoTela(exigir()),
  treino: () => treinoTela(exigir()),
  definirTreino: (p) => definirTreino(p),
  slots: () => listar(),
  salvar: (slot) => salvarEm(slot),
  carregar: (slot) => carregarSlot(slot),
  apagar: async (slot) => { await apagar(slot); },
  exportar: (slot) => exportar(slot),
  importar: ({ slot, dados }) => importar(slot, dados),
};

self.onmessage = async (ev: MessageEvent<Pedido>) => {
  const { id, tipo, dados } = ev.data;
  let r: Resposta;
  try {
    r = { id, ok: true, resultado: await (tratar[tipo] as (d: unknown) => unknown)(dados) };
  } catch (e) {
    console.error(e);
    r = { id, ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
  self.postMessage(r);
};
