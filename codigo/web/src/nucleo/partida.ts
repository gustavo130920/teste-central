// Partida ao vivo no Worker (5d2): monta as telas de pré-jogo, pausa e fim a partir do laço em passos da temporada.
// Só leitura do mundo, salvo o que o jogador escolhe (tática salva, batedores), pelas funções de `taticaJogador.ts`.
import type { Tatica } from '../../../motor/dados.ts';
import { previaDoOnze } from '../../../motor/escalacao.ts';
import { custoRadical } from '../../../motor/pausas.ts';
import type { AjustePausa, EstatTime, InfoPausa, Lance, ResultadoPartida, TimeEmCampo, TipoBatedor } from '../../../motor/tipos.ts';
import { semearDeTexto } from '../../../motor/rng.ts';
import type { FraseNarracao } from '../../../motor/dados.ts';
import { narrar } from '../../../narracao/narrar.ts';
import type { InfoJogo, PedidoEscalacao } from '../../../temporada/jogador.ts';
import type { Memoria } from '../../../temporada/memoria.ts';
import type { JogoDisputado, RespostaEscalar } from '../../../temporada/temporada.ts';
import { ajusteDoPlanoB, definirBatedor, estadoTatica, opcoesNaVaga, opcoesPlanoB, planoDoJogo, progressoDe, usarTatica } from '../../../temporada/taticaJogador.ts';
import type { TaticaSalva } from '../../../temporada/taticaJogador.ts';
import type { EscolhaPreJogo, EstatTela, FimJogo, InfoJogoTela, JogadorTela, Narrada, PreJogo, RespostaPausa, TelaPausa, VagaTela } from './protocolo.ts';

const semanaDe = (dia: number): number => Math.ceil(dia / 7);
const TIPOS: TipoBatedor[] = ['escanteio', 'falta', 'penalti'];
/** Atributos que a tela mostra para batedores e marcador. */
const ATRIBUTOS = ['BP', 'Comp', 'Des', 'Pos', 'Vel'];

export interface Contexto { mem: Memoria; tatica: Tatica; elencos: Record<string, { id: string; nome: string }[]>; frases: FraseNarracao[]; clube: string }

/** Partida do clube do jogador em andamento: lances acumulados e o último bloco já narrado na tela. */
export interface AoVivo {
  jogo: InfoJogoTela;
  semente: number;
  lances: Lance[];
  narrados: number;
  simular: boolean;
  info: InfoPausa | null;
  final: { d: JogoDisputado; r: ResultadoPartida } | null;
}

export function infoJogoTela(jogo: InfoJogo, lado: 0 | 1, clube: string, estadio: string | null, fase?: string): InfoJogoTela {
  return {
    competicao: jogo.competicao, ...(fase ? { fase } : {}), semana: semanaDe(jogo.dia),
    mandante: lado === 0 ? clube : jogo.adversario, visitante: lado === 0 ? jogo.adversario : clube, lado,
    classico: jogo.classico, decisao: jogo.decisao, estadio,
  };
}

export function novoAoVivo(jogo: InfoJogoTela, dia: number): AoVivo {
  return { jogo, semente: semearDeTexto(`narracao-${dia}-${jogo.mandante}-${jogo.visitante}`), lances: [], narrados: 0, simular: false, info: null, final: null };
}

// ---------- Pré-jogo ----------

const resumoPadrao = (x: TaticaSalva): string[] => Object.entries(x.padrao).map(([k, v]) => `${k} ${v}`);

export function preJogo(c: Contexto, p: PedidoEscalacao, jogo: InfoJogoTela, nomes: Record<string, string>): PreJogo {
  const est = estadoTatica(c.mem, c.clube);
  const nome = (id: string) => c.elencos[c.clube]?.find((j) => j.id === id)?.nome ?? id;
  const advId = jogo.lado === 0 ? jogo.visitante : jogo.mandante;
  const adv = c.mem.gestao.get(advId)?.tecnico;
  const vagas = (xs: ReturnType<typeof previaDoOnze>): VagaTela[] => xs.map(({ j, vaga }) => ({ id: j.id, nome: j.nome, vaga, condicao: p.condicao[j.id] ?? 100 }));
  return {
    jogo, nomes, ativa: est.ativa,
    taticas: est.taticas.map((x) => ({
      nome: x.nome, estilo: x.estilo, formacaoComBola: x.formacaoComBola, formacaoSemBola: x.formacaoSemBola,
      entrosamento: progressoDe(c.mem, c.clube, c.tatica, x), ajustes: resumoPadrao(x),
      instrucoes: Object.values(x.instrucoes).reduce((s, i) => s + (i.Com ? 1 : 0) + (i.Sem ? 1 : 0), 0),
      batedores: { ...x.batedores },
      onze: vagas(previaDoOnze(p.elenco, c.tatica, x.formacaoComBola, undefined, p.poupados)),
    })),
    elenco: p.elenco.map((j) => ({
      id: j.id, nome: j.nome, posicao: j.posicao, nota: j.nota, condicao: p.condicao[j.id] ?? 100,
      atributos: Object.fromEntries(ATRIBUTOS.map((a) => [a, (j.atributos as Record<string, number>)[a] ?? 0])), tracos: j.tracos,
    })),
    fora: [...p.desfalques.lesionados.map((id) => ({ nome: nome(id), motivo: 'lesão' })), ...p.desfalques.suspensos.map((id) => ({ nome: nome(id), motivo: 'suspenso' }))],
    poupados: p.poupados.map(nome),
    rival: adv ? vagas(previaDoOnze(c.mem.elencos[advId] ?? [], c.tatica, adv.formacaoComBola)) : [],
  };
}

/** Aplica a escolha do pré-jogo na tática salva e devolve o plano do jogo (titulares com o auxiliar). */
export function aplicarPreJogo(c: Contexto, e: EscolhaPreJogo): RespostaEscalar {
  const est = estadoTatica(c.mem, c.clube);
  if (e.tatica !== est.ativa && est.taticas[e.tatica]) usarTatica(c.mem, c.clube, c.tatica, e.tatica);
  for (const t of TIPOS) definirBatedor(c.mem, c.clube, t, e.batedores[t] ?? null);
  return { ...planoDoJogo(c.mem, c.clube), ...(e.marcacao ? { marcacao: e.marcacao } : {}) };
}

// ---------- Narração e estatísticas ----------

/** Linhas dos blocos ainda não mostrados (a narração tem sorteio próprio, refeito do início a cada passo). */
export function novasLinhas(c: Contexto, a: AoVivo, res: Pick<ResultadoPartida, 'times' | 'lances' | 'classico'>, ate: number): Narrada[] {
  const linhas = narrar(res, c.frases, a.semente, { competicao: a.jogo.competicao }).filter((l) => l.bloco > a.narrados && l.bloco <= ate);
  a.narrados = ate;
  return linhas;
}

export function estatTela(e: [EstatTime, EstatTime]): EstatTela[] {
  const total = e[0].posseSegundos + e[1].posseSegundos || 1;
  return e.map((x) => ({
    gols: x.gols, finalizacoes: x.finalizacoes, noAlvo: x.noAlvo, posse: Math.round((x.posseSegundos / total) * 100), escanteios: x.escanteios,
    faltas: x.faltas, amarelos: x.amarelos, vermelhos: x.vermelhos, impedimentos: x.impedimentos,
  }));
}

const timesDe = (info: InfoPausa): [TimeEmCampo, TimeEmCampo] => (info.lado === 0 ? [info.time, info.rival] : [info.rival, info.time]);
export const parcial = (info: InfoPausa, a: AoVivo) => ({ times: timesDe(info), lances: a.lances, classico: a.jogo.classico });

// ---------- Pausa ----------

export function telaPausa(c: Contexto, info: InfoPausa): TelaPausa {
  const t = info.time;
  const x: TaticaSalva = { nome: '', estilo: t.estilo.nome, formacaoComBola: t.formacaoComBola, formacaoSemBola: t.formacaoSemBola, padrao: { ...t.padrao }, instrucoes: {}, batedores: {} };
  const opcoes = (e: TimeEmCampo['escalados'][number], fase: 'Com' | 'Sem') => opcoesNaVaga(e.j, e.vaga, fase, c.tatica, x).map((o) => ({
    id: o.ins.id, nome: o.ins.nome, encaixe: o.encaixe, contraria: o.contraria, combina: o.ins.combina.includes(x.estilo), auxiliar: o.auxiliar, exige: o.ins.exige ?? null,
  }));
  return {
    minuto: info.minuto, intervalo: info.intervalo, placar: info.placar,
    relatorio: info.times.map((r) => ({ finalizacoes: r.finalizacoes, posse: r.possePct, energia: r.energiaMedia, impeto: r.impeto })),
    estatisticas: info.estatisticas ? estatTela(info.estatisticas) : [],
    adversario: info.times[info.lado === 0 ? 1 : 0].ajustes, extras: info.extras, sugestoes: info.sugestoes,
    estilo: t.estilo.nome, formacaoComBola: t.formacaoComBola, formacaoSemBola: t.formacaoSemBola,
    padrao: { ...t.padrao } as Record<string, string>, marcacao: t.marcacao ?? null, trocasRestantes: info.trocasRestantes,
    emCampo: t.escalados.map((e) => ({
      id: e.j.id, nome: e.j.nome, vaga: e === t.goleiro ? 'GOL' : e.vaga, goleiro: e === t.goleiro, energia: Math.round(e.energia), amarelos: e.amarelos,
      lesao: e.lesao, instrCom: e.instrCom?.nome ?? null, instrSem: e.instrSem?.nome ?? null,
      opcoes: e === t.goleiro ? null : { Com: opcoes(e, 'Com'), Sem: opcoes(e, 'Sem') },
    })),
    banco: t.banco.map((j): JogadorTela => ({ id: j.id, nome: j.nome, posicao: j.posicao, nota: j.nota, condicao: Math.round(t.condicao?.[j.id] ?? 100) })),
    rival: info.rival.escalados.map((e) => ({ id: e.j.id, nome: e.j.nome, vaga: e === info.rival.goleiro ? 'GOL' : e.vaga })),
    estilos: c.tatica.estilos.map((s) => s.nome),
    formacoes: c.tatica.formacoes.map((f) => f.nome),
    planoB: opcoesPlanoB(c.mem, c.clube, t).map((o) => ({ nome: o.tatica.nome, estilo: o.tatica.estilo, formacaoComBola: o.tatica.formacaoComBola, formacaoSemBola: o.tatica.formacaoSemBola, entrosamento: o.entrosamento, planoB: o.planoB, perda: o.perda })),
    custoRadical: 1 - custoRadical(t),
  };
}

/** Resposta da tela para o motor: o Plano B entra por cima do resto. */
export function ajusteDaResposta(c: Contexto, info: InfoPausa, r: RespostaPausa): AjustePausa | null {
  if (!r.ajuste) return null;
  const aj: AjustePausa = structuredClone(r.ajuste);
  if (r.planoB !== undefined && r.planoB !== null) {
    const o = opcoesPlanoB(c.mem, c.clube, info.time)[r.planoB];
    if (o) { delete aj.estilo; Object.assign(aj, ajusteDoPlanoB(c.tatica, info.time, o.tatica)); }
  }
  // Trocas só de quem está em campo por quem está no banco, até o limite.
  if (aj.trocas) aj.trocas = aj.trocas.filter(([s, e]) => info.time.escalados.some((x) => x.j.id === s) && info.time.banco.some((j) => j.id === e)).slice(0, info.trocasRestantes);
  return aj;
}

// ---------- Fim ----------

export function fimJogo(a: AoVivo, rodada: JogoDisputado[]): FimJogo {
  const { d, r } = a.final!;
  const k = a.jogo.lado;
  const quem = (id: string | null): string => (id ? r.times.flatMap((x) => x.participantes).find((e) => e.j.id === id)?.j.nome ?? '' : '');
  const t = r.times[k];
  return {
    placar: d.placar, penaltis: d.penaltis ?? null,
    gols: r.lances.filter((l) => l.resultado === 'gol' || l.resultado === 'gol contra').map((l) => ({
      minuto: `${l.minuto}'${l.acrescimo ? `+${l.acrescimo}` : ''}`, nome: quem(l.jogador), time: l.time,
      obs: l.resultado === 'gol contra' ? 'contra' : l.tema === 'penalti' ? 'pênalti' : '',
    })),
    estatisticas: estatTela(r.estatisticas),
    notas: t.participantes.map((e, i) => ({ nome: e.j.nome, vaga: e === t.goleiro ? 'GOL' : e.vaga, nota: Math.round(e.nota * 10) / 10, entrou: i >= 11 })).sort((x, y) => y.nota - x.nota),
    lesoes: r.lesoes.filter((l) => l.time === k).map((l) => ({ nome: quem(l.jogador), gravidade: l.gravidade, semanas: l.semanas })),
    rodada: rodada.filter((j) => j.competicao === d.competicao && j.dia === d.dia && j !== d).map((j) => ({ mandante: j.mandante, visitante: j.visitante, placar: j.placar, ...(j.penaltis !== undefined ? { penaltis: j.penaltis } : {}) })),
  };
}
