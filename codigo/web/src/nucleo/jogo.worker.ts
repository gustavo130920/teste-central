/// <reference lib="webworker" />
// Worker do jogo (5d1): o mundo vive aqui; a tela pede ações e recebe o painel pronto.
// O núcleo (motor, gestão, temporada) é o mesmo do terminal, importado de `codigo/`; os JSON de `gerado/` vão no pacote.
import { montarBase } from '../../../temporada/base.ts';
import { concluirAno, criarMundo, iniciarAno, virar } from '../../../temporada/virada.ts';
import type { Mundo } from '../../../temporada/virada.ts';
import { cicloEmPassos, copasDe, tabelaAtual } from '../../../temporada/temporada.ts';
import type { DiaEmPassos, JogoDisputado, RespostaDoDia } from '../../../temporada/temporada.ts';
import type { AoVivo, Contexto } from './partida.ts';
import type { PedidoColetiva, PedidoEscalacao, PedidoEvento } from '../../../temporada/jogador.ts';
import type { PedidoPatrocinio, RespostaPatrocinio } from '../../../temporada/comercialJogador.ts';
import type { PropostaTecnico } from '../../../temporada/diretoria.ts';
import type { Meta, NivelMeta } from '../../../gestao/diretoria.ts';
import { chanceDesistir } from '../../../temporada/comercialJogador.ts';
import { ajusteDaResposta, aplicarPreJogo, fimJogo, infoJogoTela, novasLinhas, novoAoVivo, parcial, preJogo, telaPausa } from './partida.ts';
import { contratar, custoDemissao, demitir, ehCargo, naJanela, pedidoDeRenovacao, renovar } from '../../../temporada/comissaoJogador.ts';
import { efetivo } from '../../../gestao/comissao.ts';
import { CARGOS } from '../../../motor/dados.ts';
import type { Profissional } from '../../../motor/dados.ts';
import { anoCalendario } from '../../../temporada/mercado.ts';
import { estadoBase, dispensarJovem, pedirEmprestimo, subirJovem } from '../../../temporada/baseJogador.ts';
import { amortizarDivida, estadoComercial, estrutura, iniciarObra, limiteEmprestimo, mesDoDia, mudarPrecos, tomarEmprestimo, COMERCIAL_JOGADOR } from '../../../temporada/comercialJogador.ts';
import { acharJogador, alternarTransferivel, buscar, chanceDaNegociacao, enviar, iniciarCompra, iniciarRenovacao, luvasEmMi, observar, relatorio, responder } from '../../../temporada/mercadoJogador.ts';
import type { Visto } from '../../../temporada/mercadoJogador.ts';
import type { Negociacao } from '../../../temporada/mercado.ts';
import { folhaDoClube, orcamentoDe, tetoDe } from '../../../temporada/mercado.ts';
import { FINANCAS } from '../../../gestao/financas.ts';
import { ver } from '../../../temporada/mercadoJogador.ts';
import { MERCADO, janelaDaSemana, semanaDoDia } from '../../../gestao/mercado.ts';
import { custoObra } from '../../../gestao/financas.ts';
import { estadoTatica, progressoDe } from '../../../temporada/taticaJogador.ts';
import { agirTatica, taticasTela } from './taticas.ts';
import { assumirClube, criarTecnicoDoJogador } from '../../../temporada/jogador.ts';
import { carregar, salvar } from '../../../temporada/salvamento.ts';
import { comprimir, descomprimir, apagar, gravar, ler, listar } from './saves.ts';
import type { Lance } from '../../../motor/tipos.ts';
import type { PedidoTatica, ResultadoTatica, TaticasTela, ComissaoTela, PedidoComissao, ResultadoComissao, ProfTela } from './protocolo.ts';
import type { Lance2D, DiretoriaTela, DecisaoTela, RespostaDecisao, FiltroTela, MercadoTela, NegTela, PedidoMercado, ResultadoMercado, TermosTela, VistoTela, BaseTela, ComercialTela, PedidoBase, PedidoComercial, ResultadoBase, ResultadoComercial, Carga, Foco, ElencoTela, TreinoTela, ClubeResumo, Etapa, EscolhaPreJogo, RespostaPausa, InfoSlot, JogoTela, NovoJogo, Painel, Pedido, Pedidos, Resposta, ResumoVirada, Slot, TipoPedido } from './protocolo.ts';

const arquivos = import.meta.glob('../../../gerado/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
/** Base nova a cada jogo: a carreira muda elencos e fichas (o mundo não copia tudo). */
const novaBase = () => montarBase(<T,>(arq: string): T => {
  const v = arquivos[`../../../gerado/${arq}`];
  if (v === undefined) throw new Error(`Dado não encontrado: ${arq}`);
  return structuredClone(v) as T;
});
const base = novaBase();

/** O que o save da web guarda além do mundo. */
interface ExtraWeb { semente: number; clubeTela: string; treino?: { carga: Carga; foco: Foco } | null; base?: { manual: boolean; idadeMinima: number | null }; comercial?: boolean; mercado?: boolean }

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

/** Pergunta do motor ao jogador no meio do ciclo (5d3c). */
type PedidoDecisao =
  | { tipo: 'evento'; p: PedidoEvento }
  | { tipo: 'coletiva'; p: PedidoColetiva }
  | { tipo: 'proposta'; p: PropostaTecnico }
  | { tipo: 'renovacao'; p: { clube: string; anos: number; confianca: number; avaliacao: string } }
  | { tipo: 'meta'; metas: Record<NivelMeta, Meta | null> }
  | { tipo: 'patrocinio'; p: PedidoPatrocinio };

/** Lançada pelos ganchos quando falta a resposta: o worker refaz o ciclo com ela (decisão do Gustavo, 5d3c). */
class Pendencia extends Error {
  pedido: PedidoDecisao;
  constructor(pedido: PedidoDecisao) { super('pendência'); this.pedido = pedido; }
}

/** O que a tela mandou durante o ciclo, na ordem: reaplicado ao refazer o ciclo. */
type EntradaLog = { tipo: 'pre'; e: EscolhaPreJogo } | { tipo: 'pausa'; r: RespostaPausa };

/** Ciclo em andamento: do Avançar até o fim da partida do clube do jogador (ou da semana). */
let ciclo: { it: DiaEmPassos; aoVivo: AoVivo | null; snap: string; log: EntradaLog[]; reproduz: EntradaLog[] | null; narradosPend: number } | null = null;
/** Virada pendente de uma decisão (renovação ou patrocínio): o mundo antes de fechar o ano. */
let viradaPend: { snap: string; a: AoVivo | null; linhas: ReturnType<typeof novasLinhas>; campo: Lance2D[] } | null = null;
/** Respostas dadas às decisões, na ordem em que o motor pergunta (o motor é determinístico). */
let decisoes: unknown[] = [];
let nDec = 0;
let pendente: PedidoDecisao | null = null;
/** Pedido de escalação do pré-jogo aberto (quem pode jogar), para aplicar a escolha. */
let pedidoPre: PedidoEscalacao | null = null;

function abandonarCiclo(): void {
  ciclo?.it.return([]);
  ciclo = null;
  viradaPend = null;
  decisoes = [];
  nDec = 0;
  pendente = null;
}

function decidir<T>(pedido: PedidoDecisao): T | null {
  if (nDec < decisoes.length) return decisoes[nDec++] as T | null;
  throw new Pendencia(pedido);
}

/** Liga os ganchos do jogador ao mundo (também depois de restaurar um estado). */
function ligar(w: Mundo): void {
  const J = w.jogador!;
  // O controle do jogador não vai no save (5c): o gancho do fim do jogo é posto a cada ciclo.
  J.aoJogo = (d, r) => { if (ciclo?.aoVivo) ciclo.aoVivo.final = { d, r }; };
  // Treino (5d3a): plano fixo do jogador, ou o auxiliar decide (null).
  J.treino = () => extra.treino ?? null;
  // Base, comercial e mercado (5d3b): manual quando o jogador escolheu; senão a IA.
  J.base = () => (extra.base?.manual ? 'manual' : extra.base?.idadeMinima ? { idadeMinima: extra.base.idadeMinima } : null);
  J.comercial = () => (extra.comercial ? 'manual' : null);
  // O gestor é o jogador: o mercado é sempre manual (o diretor de futebol só aconselha).
  J.mercado = () => true;
  // Decisões (5d3c): param o ciclo e perguntam à tela.
  J.evento = (p) => decidir<string>({ tipo: 'evento', p });
  J.coletiva = (p) => decidir<{ tom: string; assessoria: boolean }>({ tipo: 'coletiva', p });
  J.proposta = (p) => decidir<boolean>({ tipo: 'proposta', p });
  J.renovacao = (p) => decidir<number>({ tipo: 'renovacao', p });
  J.meta = (metas) => decidir<NivelMeta>({ tipo: 'meta', metas });
  J.patrocinio = (p) => (extra.comercial ? decidir<RespostaPatrocinio>({ tipo: 'patrocinio', p }) : null);
}

/** Troca o mundo pelo estado guardado (o controle do jogador é posto de novo). */
function restaurar(snap: string): Mundo {
  const s = carregar<ExtraWeb>(snap);
  const t = tecnicoDoJogador(s.mundo);
  s.mundo.jogador = { clube: t.clubeId ?? extra.clubeTela };
  m = s.mundo;
  ligar(m);
  return m;
}

function contexto(w: Mundo): Contexto {
  return { mem: w.emAndamento!.memoria, tatica: w.tatica, elencos: w.elencos, frases: base.frases, clube: w.jogador!.clube };
}

const nomesDe = (w: Mundo) => Object.fromEntries(w.clubes.map((x) => [x.id, x.nomeCurto]));

/** Lances dos blocos ainda não mostrados, para o 2D (junto com a narração; a mesma janela de blocos). */
function lances2d(a: AoVivo, ate: number, lances: Lance[] = a.lances): Lance2D[] {
  return lances.filter((l) => l.bloco > a.narrados && l.bloco <= ate && l.zonaOrigem !== null)
    .map((l) => ({ bloco: l.bloco, minuto: l.minuto, time: l.time, tema: l.tema, lance: l.lance, de: l.zonaOrigem, para: l.zonaDestino, resultado: l.resultado }));
}

function criarCiclo(w: Mundo) {
  const s = w.emAndamento ?? iniciarAno(w, extra.semente);
  return cicloEmPassos(s, { jogador: w.jogador!, interativo: true });
}

function avancar(): Promise<Etapa> {
  const w = exigir();
  if (ciclo || viradaPend) throw new Error('Há uma partida ou decisão em andamento.');
  virada = null;
  ligar(w);
  decisoes = [];
  nDec = 0;
  if (!w.emAndamento) iniciarAno(w, extra.semente);
  // Estado do início do ciclo: se o motor pedir uma decisão, o ciclo é refeito daqui com a resposta.
  const snap = salvar(w, extra);
  ciclo = { it: criarCiclo(w), aoVivo: null, snap, log: [], reproduz: null, narradosPend: 0 };
  return conduzir(undefined);
}

function decisaoTela(w: Mundo, d: PedidoDecisao): DecisaoTela {
  const nomeClube = (id: string | null) => (id ? w.clubes.find((c) => c.id === id)?.nome ?? id : null);
  if (d.tipo === 'evento') return { tipo: 'evento', titulo: d.p.modelo.titulo, texto: d.p.texto, opcoes: d.p.opcoes };
  if (d.tipo === 'coletiva') return { tipo: 'coletiva', assunto: d.p.assunto, pergunta: d.p.pergunta, respostas: d.p.respostas, ultimosTons: d.p.ultimosTons };
  if (d.tipo === 'proposta') {
    const t = tecnicoDoJogador(w);
    return { tipo: 'proposta', clube: nomeClube(d.p.clube)!, liga: d.p.liga, reputacao: d.p.reputacao, confianca: d.p.confianca, empregado: d.p.empregado, ultimoB: d.p.motivo === 'ultimo-b', suaReputacao: t.reputacao, clubeAtual: d.p.empregado ? nomeClube(t.clubeId) : null };
  }
  if (d.tipo === 'renovacao') return { tipo: 'renovacao', clube: nomeClube(d.p.clube)!, anos: d.p.anos, confianca: d.p.confianca, avaliacao: d.p.avaliacao };
  if (d.tipo === 'meta') return { tipo: 'meta', metas: (Object.keys(d.metas) as NivelMeta[]).filter((n) => d.metas[n]).map((n) => ({ nivel: n, texto: d.metas[n]!.texto, bonus: d.metas[n]!.bonus })) };
  return {
    tipo: 'patrocinio', cota: d.p.tipo, marcaAtual: d.p.marcaAtual, valorAtual: d.p.valorAtual, propostas: d.p.propostas, desistiram: d.p.desistiram,
    chanceDesistir: { 10: chanceDesistir(10, d.p.negociacao), 20: chanceDesistir(20, d.p.negociacao) },
  };
}

/** O motor parou numa pergunta: volta ao estado de antes e mostra a pergunta (o ciclo é refeito com a resposta). */
function etapaDecisao(p: PedidoDecisao, snap: string): Etapa {
  pendente = p;
  const w = restaurar(snap);
  return { tipo: 'decisao', decisao: decisaoTela(w, p), painel: painel(w) };
}

/** Roda o ciclo até o próximo pedido (pré-jogo, pausa ou decisão) ou até o fim. */
async function conduzir(resposta: RespostaDoDia | undefined): Promise<Etapa> {
  let w = exigir();
  let s = w.emAndamento!;
  const c = ciclo!;
  let p;
  const proximo = (r: RespostaDoDia | undefined) => {
    try {
      const x = c.it.next(r as RespostaDoDia);
      if (c.reproduz && c.reproduz.length === 0) { if (c.aoVivo) c.aoVivo.narrados = c.narradosPend; c.reproduz = null; }
      return x;
    } catch (e) {
      if (e instanceof Pendencia) {
        if (!c.reproduz) c.narradosPend = c.aoVivo?.narrados ?? 0;
        c.reproduz = null;
        return e;
      }
      ciclo = null;
      throw e;
    }
  };
  let r = proximo(resposta);
  for (;;) {
    if (r instanceof Pendencia) return etapaDecisao(r.pedido, c.snap);
    p = r;
    if (p.done) break;
    w = exigir();
    s = w.emAndamento!;
    const v = p.value;
    const ctx = contexto(w);
    if (v.tipo === 'escalar') {
      const clube = w.clubes.find((x) => x.id === w.jogador!.clube)!;
      const fase = copasDe(s).flatMap((cp) => cp.previstos(s.dia)).find((j) => j.dia === v.pedido.jogo.dia && (j.mandante === clube.id || j.visitante === clube.id))?.fase;
      const jogo = infoJogoTela(v.pedido.jogo, v.lado, clube.id, v.lado === 0 ? clube.estadio : w.clubes.find((x) => x.id === v.pedido.jogo.adversario)?.estadio ?? null, fase);
      c.aoVivo = novoAoVivo(jogo, v.pedido.jogo.dia);
      const e = c.reproduz?.shift();
      if (e?.tipo === 'pre') { c.aoVivo.simular = e.e.modo === 'simular'; r = proximo(aplicarPreJogo(ctx, e.e, v.pedido)); continue; }
      pedidoPre = v.pedido;
      return { tipo: 'prejogo', pre: preJogo(ctx, v.pedido, jogo, nomesDe(w)) };
    }
    const a = c.aoVivo!;
    a.lances.push(...v.info.lances);
    a.info = v.info;
    if (a.simular) { r = proximo(null); continue; }
    const e = c.reproduz?.shift();
    if (e?.tipo === 'pausa') { if (e.r.simularResto) a.simular = true; r = proximo(ajusteDaResposta(ctx, v.info, e.r)); continue; }
    const campo = lances2d(a, v.info.minuto / 15);
    return { tipo: 'pausa', jogo: a.jogo, nomes: nomesDe(w), linhas: novasLinhas(ctx, a, parcial(v.info, a), v.info.minuto / 15), campo, pausa: telaPausa(ctx, v.info) };
  }
  ciclo = null;
  ultimos = p.value;
  const a = c.aoVivo;
  let linhas: ReturnType<typeof novasLinhas> = [];
  let campo: Lance2D[] = [];
  if (a?.final) {
    if (a.simular) a.narrados = 0;
    campo = lances2d(a, 99, a.final.r.lances);
    linhas = novasLinhas(contexto(w), a, a.final.r, 99);
  }
  decisoes = [];
  nDec = 0;
  return terminar(a, linhas, campo);
}

/** Fim do ciclo: vira o ano, se acabou, e monta a etapa final. */
async function terminar(a: AoVivo | null, linhas: ReturnType<typeof novasLinhas>, campo: Lance2D[]): Promise<Etapa> {
  let w = exigir();
  const s = w.emAndamento!;
  if (s.fim) {
    // Renovação do técnico e patrocínio acontecem aqui: se faltar resposta, refaz a virada daqui.
    const snap = viradaPend?.snap ?? salvar(w, extra);
    nDec = 0;
    try {
      const r = virar(w, concluirAno(w));
      virada = { ano: r.ano, campeoes: r.campeoes, rebaixados: r.rebaixados, promovidos: r.promovidos };
      iniciarAno(w, extra.semente);
    } catch (e) {
      if (!(e instanceof Pendencia)) throw e;
      viradaPend = { snap, a, linhas, campo };
      return etapaDecisao(e.pedido, snap);
    }
    viradaPend = null;
    decisoes = [];
    nDec = 0;
    // Slot automático gravado em toda virada (decisão do Gustavo, 5d1).
    await salvarEm('auto');
    w = exigir();
  }
  const pn = painel(w);
  if (a?.final) return { tipo: 'fim', jogo: a.jogo, nomes: pn.nomes, linhas, campo, fim: fimJogo(a, ultimos), painel: pn };
  return { tipo: 'painel', painel: pn };
}

function responderPreJogo(e: EscolhaPreJogo): Promise<Etapa> {
  const w = exigir();
  if (!ciclo?.aoVivo || ciclo.aoVivo.info) throw new Error('Nenhum pré-jogo aberto.');
  ciclo.aoVivo.simular = e.modo === 'simular';
  ciclo.log.push({ tipo: 'pre', e });
  return conduzir(aplicarPreJogo(contexto(w), e, pedidoPre!));
}

function responderPausa(r: RespostaPausa): Promise<Etapa> {
  const w = exigir();
  const a = ciclo?.aoVivo;
  if (!a?.info) throw new Error('Nenhuma pausa aberta.');
  if (r.simularResto) a.simular = true;
  ciclo!.log.push({ tipo: 'pausa', r });
  return conduzir(ajusteDaResposta(contexto(w), a.info, r));
}

/** Resposta da tela a uma decisão: guarda e refaz o ciclo (ou a virada) com ela. */
async function responderDecisao(r: RespostaDecisao): Promise<Etapa> {
  const d = pendente;
  if (!d || d.tipo !== r.tipo) throw new Error('Nenhuma decisão aberta.');
  pendente = null;
  decisoes.push(
    r.tipo === 'evento' ? r.letra
      : r.tipo === 'coletiva' ? (r.tom ? { tom: r.tom, assessoria: r.assessoria } : null)
        : r.tipo === 'proposta' ? r.aceitar
          : r.tipo === 'renovacao' ? r.anos
            : r.tipo === 'meta' ? r.nivel
              : r.escolha === null ? null : { escolha: r.escolha, pedido: r.pedido },
  );
  if (viradaPend) {
    const v = viradaPend;
    restaurar(v.snap);
    return terminar(v.a, v.linhas, v.campo);
  }
  const c = ciclo!;
  // O mundo já voltou ao início do ciclo (etapaDecisao): refaz com o que foi escolhido até aqui.
  c.it = criarCiclo(exigir());
  c.aoVivo = null;
  nDec = 0;
  c.reproduz = [...c.log];
  return conduzir(undefined);
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
    semClube: t.clubeId || !mem.carreira?.de ? null : (() => {
      const h = [...mem.carreira.historico].reverse().find((x) => x.clube === mem.carreira!.de);
      const motivo = ({ 'demissão': 'Você foi demitido pela diretoria.', contrato: 'Seu contrato acabou e não foi renovado.', 'novo dono': 'O novo dono da diretoria trocou o técnico.' } as Record<string, string>)[h?.fato ?? ''] ?? 'Você deixou o cargo.';
      return { clube: w.clubes.find((x) => x.id === mem.carreira!.de)?.nome ?? mem.carreira.de, ano: h?.ano ?? w.ano, motivo };
    })(),
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


// ---------- Táticas (5b4) ----------
function taticas(): TaticasTela {
  const w = exigir();
  return taticasTela(w.emAndamento!.memoria, extra.clubeTela, w.tatica, w.emAndamento!.dia);
}

function agirTaticas(p: PedidoTatica): ResultadoTatica {
  const w = exigir();
  if (ciclo) throw new Error('Termine ou cancele a partida antes de editar as táticas.');
  return agirTatica(w.emAndamento!.memoria, extra.clubeTela, w.tatica, w.emAndamento!.dia, p);
}

/** Sai do pré-jogo sem jogar: o ciclo todo é descartado e o mundo volta ao estado de antes do Avançar. */
function cancelarPreJogo(): Painel {
  if (!ciclo?.aoVivo || ciclo.aoVivo.info || ciclo.log.length) throw new Error('Nenhum pré-jogo aberto.');
  const snap = ciclo.snap;
  abandonarCiclo();
  return painel(restaurar(snap));
}

// ---------- Comissão (5f) ----------
function comissaoTela(w: Mundo): ComissaoTela {
  const s = w.emAndamento!;
  const mem = s.memoria;
  const id = extra.clubeTela;
  const com = mem.gestao.get(id)?.comissao;
  const c = mem.financas.get(id);
  const ano = anoCalendario(mem.mercado!);
  if (!com || com.fixo !== undefined) return { temComissao: false, janela: false, caixa: c?.caixa ?? null, folhaMil: 0, ano, ct: null, base: null, cargos: [] };
  const tela = (p: Profissional, dono: boolean): ProfTela => ({
    nome: p.nome, cargo: p.cargo, idade: p.idade, nac: p.nacionalidade,
    atributos: Object.entries(p.atributos).map(([sigla, valor]) => ({ sigla, valor, efetivo: dono ? Math.round(efetivo(com, p.cargo, sigla) * 10) / 10 : null })),
    reputacao: p.reputacao, ambicao: p.ambicao, lealdade: p.lealdade, quimica: p.quimica, confianca: p.homemDeConfianca, salario: p.salario, contrato: p.contrato,
  });
  const cargos = CARGOS.map((cargo) => {
    const p = com.profissionais.find((x) => x.cargo === cargo) ?? null;
    return {
      cargo, atual: p ? tela(p, true) : null,
      rescisaoMi: p ? Math.round(custoDemissao(mem, p, s.dia) * 100) / 100 : null, pedidoRenovacao: p ? pedidoDeRenovacao(p) : null,
      livres: w.profissionaisLivres.filter((x) => x.cargo === cargo).sort((a, b) => b.reputacao - a.reputacao).map((x) => tela(x, false)),
    };
  });
  return { temComissao: true, janela: naJanela(s.dia), caixa: c?.caixa ?? null, folhaMil: com.profissionais.reduce((t, p) => t + p.salario, 0), ano, ct: com.ct, base: com.base, cargos };
}

function agirComissao(p: PedidoComissao): ResultadoComissao {
  const w = exigir();
  const s = w.emAndamento!;
  const id = extra.clubeTela;
  let erro: string | null = null, aviso: string | null = null, resposta: ResultadoComissao['resposta'] = null;
  const rep = w.clubes.find((c) => c.id === id)?.reputacao ?? 10;
  if (!w.tecnicos.some((t) => t.humano && t.clubeId === id)) erro = 'Sem clube.';
  else if (p.acao === 'contratar') {
    const r = contratar(s.memoria, w, id, p.nome, p.oferta, p.anos, s.dia, rep);
    erro = r.erro; resposta = r.resposta ?? null;
    if (resposta?.tipo === 'aceita') aviso = p.nome + ' contratado.';
  } else if (!ehCargo(p.cargo)) erro = 'Cargo inválido.';
  else if (p.acao === 'demitir') {
    const nome = s.memoria.gestao.get(id)?.comissao.profissionais.find((x) => x.cargo === p.cargo)?.nome ?? '';
    const r = demitir(s.memoria, w, id, p.cargo, s.dia);
    erro = r.erro;
    if (!erro) aviso = nome + ' demitido (rescisão de R$ ' + r.custo.toFixed(2) + ' mi).';
  } else {
    const r = renovar(s.memoria, id, p.cargo, p.oferta, p.anos);
    erro = r.erro; resposta = r.resposta ?? null;
    if (resposta?.tipo === 'aceita') aviso = 'Contrato renovado.';
  }
  return { erro, aviso, resposta, tela: comissaoTela(w) };
}

// ---------- Base e comercial (5d3b1) ----------
function baseTela(w: Mundo): BaseTela {
  const s = w.emAndamento!;
  const mem = s.memoria;
  const id = extra.clubeTela;
  const st = estadoBase(mem, id);
  const jovens = [...(mem.base.get(id) ?? [])].sort((a, b) => b.nota - a.nota).map((j) => {
    const v = ver(mem, id, j, semanaDoDia(s.dia));
    return { id: j.id, nome: j.nome, posicao: j.posicao, idade: j.idade, nota: j.nota, pot: v.pot ? [v.pot.min, v.pot.max] as [number, number] : null, perfil: j.perfilJovem, emprestimoPedido: st.pedidos.includes(j.id) };
  });
  const avisos = [...st.avisos];
  st.avisos = [];
  return { manual: extra.base?.manual ?? false, idadeMinima: extra.base?.idadeMinima ?? null, janela: janelaDaSemana(semanaDoDia(s.dia)) !== null, elenco: mem.elencos[id].length, elencoMax: MERCADO.elenco.max, jovens, avisos };
}

function agirBase(p: PedidoBase): ResultadoBase {
  const w = exigir();
  const s = w.emAndamento!;
  const id = extra.clubeTela;
  let erro: string | null = null;
  if (p.acao === 'modo') extra.base = { manual: p.manual, idadeMinima: p.manual ? null : p.idadeMinima ?? null };
  else if (!w.tecnicos.some((t) => t.humano && t.clubeId === id)) erro = 'Sem clube.';
  else if (p.acao === 'subir') erro = subirJovem(s.memoria, id, p.id);
  else if (p.acao === 'dispensar') erro = dispensarJovem(s.memoria, id, p.id);
  else erro = pedirEmprestimo(s.memoria, id, p.id, s.dia);
  return { erro, tela: baseTela(w) };
}

function comercialTela(w: Mundo): ComercialTela {
  const s = w.emAndamento!;
  const mem = s.memoria;
  const id = extra.clubeTela;
  const c = mem.financas.get(id);
  if (!c) throw new Error('Este clube não tem contas (só os 30 brasileiros).');
  const st = estadoComercial(mem, id);
  const mes = mesDoDia(s.dia);
  const L = COMERCIAL_JOGADOR.preco;
  const obra = (tipo: 'ct' | 'base') => { const e = estrutura(mem, id, tipo); return { tipo, nivel: e.nivel, obraAte: e.obra, custo: e.obra === null ? custoObra(e.nivel + 1) : null }; };
  const avisos = [...st.avisos];
  st.avisos = [];
  return {
    manual: extra.comercial ?? false, mes, podeMudarPreco: st.mesPreco !== mes, caixa: c.caixa, divida: c.divida, banco: c.banco, cabeMais: limiteEmprestimo(c),
    humor: mem.humor.get(id) ?? 50, ingresso: c.ingresso, ingressoRef: c.ingressoRef, mensalidade: c.mensalidade, mensalidadeRef: c.mensalidadeRef, socios: Math.round(c.socios),
    precoMin: L.min, precoMax: L.max, obras: [obra('ct'), obra('base')], cotas: c.cotas.map((x) => ({ tipo: x.tipo, marca: x.marca, valor: x.valor, ate: x.ate })), avisos,
  };
}

function agirComercial(p: PedidoComercial): ResultadoComercial {
  const w = exigir();
  const s = w.emAndamento!;
  const id = extra.clubeTela;
  let erro: string | null = null;
  if (p.acao === 'modo') {
    extra.comercial = p.manual;
    // Voltar à IA já devolve os preços (o ciclo seguinte também faz isso).
    if (!p.manual) { const st = estadoComercial(s.memoria, id); st.manual = false; const c = s.memoria.financas.get(id); if (c) { c.precoManual = false; c.ingresso = c.ingressoRef; } }
  } else if (!w.tecnicos.some((t) => t.humano && t.clubeId === id)) erro = 'Sem clube.';
  else if (!extra.comercial) erro = 'Assuma o comercial ("Eu cuido") para agir.';
  else if (p.acao === 'precos') erro = mudarPrecos(s.memoria, id, s.dia, p);
  else if (p.acao === 'emprestimo') erro = tomarEmprestimo(s.memoria, id, p.valor);
  else if (p.acao === 'amortizar') erro = amortizarDivida(s.memoria, id, p.valor);
  else if (p.acao === 'obra') erro = iniciarObra(s.memoria, id, p.tipo, s.dia);
  return { erro, tela: comercialTela(w) };
}

// ---------- Mercado (5d3b2) ----------
const GRUPOS_MERCADO = ['GOL', 'ZAG', 'LAT', 'VOL', 'MC', 'MO', 'PON', 'CA'];
const faixaTxt = (f: { min: number; max: number } | null): string => (!f ? '?' : f.min === f.max ? `${f.min}` : `${f.min}-${f.max}`);

function vistoTela(w: Mundo, v: Visto): VistoTela {
  const mem = w.emAndamento!.memoria;
  const id = extra.clubeTela;
  return {
    id: v.j.id, nome: v.j.nome, posicao: v.j.posicao, idade: v.j.idade, clube: v.clube ? (w.clubes.find((c) => c.id === v.clube)?.nomeCurto ?? v.clube) : null,
    nota: faixaTxt(v.nota), pot: faixaTxt(v.pot), valor: v.valor, relatorios: v.relatorios,
    observado: (mem.mercado!.observados.get(id) ?? []).includes(v.j.id), meu: v.j.clubeId === id,
  };
}

function negTela(w: Mundo, n: Negociacao): NegTela | null {
  const mem = w.emAndamento!.memoria;
  const j = acharJogador(mem, n.jogador);
  if (!j) return null;
  const nomeClube = (c: string) => w.clubes.find((x) => x.id === c)?.nomeCurto ?? c;
  return {
    id: n.id, tipo: n.tipo, rotulo: n.tipo === 'renovacao' ? 'Renovação' : n.preContrato ? 'Pré-contrato' : n.vendedor ? `Compra (${nomeClube(n.vendedor)})` : 'Livre',
    jogador: j.nome, jogadorId: j.id, fase: n.fase, rodada: n.rodada, estado: n.estado === 'enviada' ? 'enviada' : 'aberta', contra: n.contra,
    oferta: n.oferta, salario: n.salario, papel: n.papel, anos: n.anos, luvas: Math.round(n.luvas * 100), chance: Math.round(chanceDaNegociacao(mem, n)),
  };
}

function mercadoTela(w: Mundo, msg: string[] = []): MercadoTela {
  const s = w.emAndamento!;
  const mem = s.memoria;
  const id = extra.clubeTela;
  const mm = mem.mercado;
  if (!mm) throw new Error('Esta temporada não tem mercado.');
  const semana = semanaDoDia(s.dia);
  const jan = janelaDaSemana(semana);
  const fin = mem.financas.get(id);
  const avisos = [...msg, ...mm.avisos];
  mm.avisos.length = 0;
  const negs = mm.negociacoes.filter((n) => n.clube === id && (n.estado === 'aberta' || n.estado === 'enviada')).map((n) => negTela(w, n)).filter((x): x is NegTela => !!x);
  return {
    manual: true,
    janela: jan === null ? 'fechado (renovação a qualquer momento)' : `janela aberta até a semana ${MERCADO.janelas[jan][1]}`,
    podeComprar: jan !== null, orcamento: orcamentoDe(mem, id), folha: Math.round(folhaDoClube(mem, id)), teto: Math.round(tetoDe(mem, id)), elenco: mem.elencos[id].length, caixa: fin?.caixa ?? null, avisos,
    propostas: mm.propostas.filter((p) => p.clube === id && p.estado === 'nova').map((p) => {
      const j = mem.elencos[id].find((x) => x.id === p.jogador);
      return { id: p.id, comprador: w.clubes.find((c) => c.id === p.comprador)?.nomeCurto ?? p.comprador, jogador: j?.nome ?? p.jogador, oferta: p.oferta, valor: j?.valor ?? 0, maior: p.maior, reacao: p.reacao, estado: p.estado };
    }),
    negociacoes: negs,
    observados: (mm.observados.get(id) ?? []).map((x) => acharJogador(mem, x)).filter((j): j is NonNullable<typeof j> => !!j).map((j) => vistoTela(w, ver(mem, id, j, semana))),
    meus: [...mem.elencos[id]].sort((a, b) => b.nota - a.nota).map((j) => ({
      id: j.id, nome: j.nome, posicao: j.posicao, idade: j.idade, nota: j.nota, contrato: j.contrato, salario: j.salario, valor: j.valor,
      transferivel: mm.transferiveis.has(j.id), querSair: mm.querSair.has(j.id),
      vencendo: j.contrato !== null && j.contrato <= FINANCAS.anoInicial + w.ano && !mm.preContratos.has(j.id) && mm.renovacao.get(j.id) !== 'ok',
    })),
    grupos: GRUPOS_MERCADO,
  };
}

function termosDe(t: TermosTela) {
  return { ...(t.oferta !== undefined ? { oferta: t.oferta } : {}), ...(t.salario !== undefined ? { salario: t.salario } : {}), ...(t.papel ? { papel: t.papel } : {}),
    ...(t.anos !== undefined ? { anos: t.anos } : {}), ...(t.luvas !== undefined ? { luvas: t.luvas / 100 } : {}) };
}

function agirMercado(p: PedidoMercado): ResultadoMercado {
  const w = exigir();
  const s = w.emAndamento!;
  const mem = s.memoria;
  const id = extra.clubeTela;
  const mm = mem.mercado;
  if (!mm) throw new Error('Esta temporada não tem mercado.');
  let erro: string | null = null;
  let msg: string | null = null;
  mm.manual.add(id);
  if (p.acao === 'modo') { /* sem efeito: o mercado é sempre do jogador */ }
  else if (!w.tecnicos.some((t) => t.humano && t.clubeId === id)) erro = 'Sem clube.';
  else if (p.acao === 'comprar') { const n = iniciarCompra(mem, id, p.id, s.dia, p.pre); if (typeof n === 'string') erro = n; else msg = 'Negociação aberta (veja em Negociações).'; }
  else if (p.acao === 'renovar') { const n = iniciarRenovacao(mem, id, p.id); if (typeof n === 'string') erro = n; else msg = 'Renovação aberta (veja em Negociações).'; }
  else if (p.acao === 'observar') msg = observar(mem, id, p.id);
  else if (p.acao === 'transferivel') msg = alternarTransferivel(mem, p.id) ? 'Transferível: clubes da IA podem fazer proposta na janela.' : 'Fora da lista de transferíveis.';
  else if (p.acao === 'proposta') {
    const pr = mm.propostas.find((x) => x.id === p.id && x.clube === id);
    if (!pr) erro = 'Proposta não encontrada.'; else { responder(mem, pr, p.resposta); msg = 'Resposta dada: o resultado chega no próximo ciclo.'; }
  } else {
    const n = mm.negociacoes.find((x) => x.id === p.neg && x.clube === id);
    if (!n) erro = 'Negociação não encontrada.'; else { erro = enviar(mem, n, termosDe(p.termos)); if (!erro) msg = 'Enviada: a resposta chega no próximo ciclo.'; }
  }
  const tela = mercadoTela(w, msg ? [msg] : []);
  return { erro, msg, tela };
}

function buscarMercado(f: FiltroTela): VistoTela[] {
  const w = exigir();
  const s = w.emAndamento!;
  const mem = s.memoria;
  if (!mem.mercado) throw new Error('Esta temporada não tem mercado.');
  return buscar(mem, extra.clubeTela, { grupo: f.grupo, idadeMax: f.idadeMax || 99, notaMin: f.notaMin || 0, valorMax: f.valorMax ?? orcamentoDe(mem, extra.clubeTela) }, semanaDoDia(s.dia)).map((v) => vistoTela(w, v));
}

function relatorioMercado(id: string): string[] {
  const w = exigir();
  const s = w.emAndamento!;
  const j = acharJogador(s.memoria, id);
  if (!j) throw new Error('Jogador não encontrado.');
  return relatorio(s.memoria, extra.clubeTela, j, semanaDoDia(s.dia));
}

function chanceMercado(p: { neg: number; termos: TermosTela }): { chance: number; luvasMi: number } {
  const mem = exigir().emAndamento!.memoria;
  const n = mem.mercado!.negociacoes.find((x) => x.id === p.neg);
  if (!n) throw new Error('Negociação não encontrada.');
  const prev = { ...n, ...termosDe(p.termos) } as Negociacao;
  return { chance: Math.round(chanceDaNegociacao(mem, prev)), luvasMi: luvasEmMi(prev) };
}

// ---------- Diretoria (5d3c) ----------
function diretoriaTela(w: Mundo): DiretoriaTela | null {
  const mem = w.emAndamento!.memoria;
  const id = extra.clubeTela;
  const d = mem.diretoria.get(id);
  if (!d) return null;
  const f = d.ficha;
  const meta = d.metas[d.nivel];
  return {
    confianca: d.confianca, humor: mem.humor.get(id) ?? null, semVencer: d.semVencer, nivel: d.nivel, meta: meta?.texto ?? null, bonus: meta?.bonus ?? null,
    paciencia: f.paciencia, ambicao: f.ambicao, financeiro: f.financeiro, interferencia: f.interferencia, popularidade: f.popularidade, eleicao: f.eleicao, contratoAte: d.contratoAte, saf: f.saf,
    investidor: f.investidor ? `${f.investidor.tipo === 'receita' ? 'Receita' : 'Prejuízo'} ${f.investidor.valor} em ${f.investidor.prazo} anos; se falhar: ${f.investidor.falha}` : null,
  };
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
  decidir: (r) => responderDecisao(r),
  preJogo: (e) => responderPreJogo(e),
  pausa: (r) => responderPausa(r),
  painel: () => (m ? painel(m) : null),
  elenco: () => elencoTela(exigir()),
  treino: () => treinoTela(exigir()),
  definirTreino: (p) => definirTreino(p),
  mercado: () => mercadoTela(exigir()),
  diretoria: () => diretoriaTela(exigir()),
  agirMercado: (p) => agirMercado(p),
  buscarMercado: (f) => buscarMercado(f),
  relatorioMercado: (id) => relatorioMercado(id),
  chanceMercado: (p) => chanceMercado(p),
  base: () => baseTela(exigir()),
  agirBase: (p) => agirBase(p),
  taticas: () => taticas(),
  agirTatica: (p) => agirTaticas(p),
  cancelarPreJogo: () => cancelarPreJogo(),
  comissao: () => comissaoTela(exigir()),
  agirComissao: (p) => agirComissao(p),
  comercial: () => comercialTela(exigir()),
  agirComercial: (p) => agirComercial(p),
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
