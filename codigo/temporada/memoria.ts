// Memória entre jogos (etapa 3, 2ª fatia): condição física, lesões com dias fora, recaída, suspensões e rodízio do auxiliar.
// Regras do GDD-gestao (seções 2 e 4) e do GDD-motor (seção 8).
// Etapa 4, 1ª fatia: com `gestao`, comissão real e treino da IA (gestao/); sem ela, comissão neutra como na etapa 3.
import type { Clube, Jogador, Profissional, Tatica, Tecnico } from '../motor/dados.ts';
import type { ApoioComissao } from '../motor/tipos.ts';
import type { ComissaoClube } from '../gestao/comissao.ts';
import { COMISSAO, apoioDaComissao, efetivo, naFaixa } from '../gestao/comissao.ts';
import type { Carga, Ciclo, EstadoTreino } from '../gestao/treino.ts';
import { TREINO, bonusDoFoco, chaveTatica, criarTreino, decidirIA, entrosamento, jogouCom, treinar, treinoTatico } from '../gestao/treino.ts';
import { quedaMoral } from '../gestao/comissao.ts';
import { notaFinal } from '../motor/notas.ts';
import { LIDER, MORAL, alvoRespaldo, andarRespaldo, aplicar, deltaDoJogo, melhoresDoElenco, moralDoGrupo, pesosDe, quedaPorMinutos, repousar, respaldoInicial } from '../gestao/moral.ts';
import { GDD } from '../motor/parametros.ts';
import type { Rng } from '../motor/rng.ts';
import type { Gravidade, ResultadoPartida } from '../motor/tipos.ts';
import type { LeituraJogo } from './adaptacao.ts';

export const ENTRE_JOGOS = {
  /** GDD-gestao 1: tipo de ciclo pelos dias até o próximo jogo. */
  ciclo: { curtoAte: 3, normalAte: 7 },
  /** GDD-gestao 2: base de recuperação do ciclo. */
  baseCiclo: { curto: 25, normal: 40, longo: 60 },
  resistencia: 0.3,
  veterano: { idade: 32, condicao: -4, tempoLesao: 1.2 },
  jovem: { idade: 23, tempoLesao: 0.9 },
  ritmo: { ciclos: 4, teto: 90 },
  /** GDD-gestao 4: lesão no treino, % por jogador e por ciclo. */
  lesaoTreino: { base: 0.1, propensaoBase: 0.5, propensaoDiv: 10, condicaoBaixa: 50, fatorCondicaoBaixa: 2, leve: 80 },
  volta: 70,
  recaida: { dias: 28, base: { leve: 0, media: 3, grave: 6 } as Record<Gravidade, number>, fracao: [0.5, 1] },
  grave: { propensao: 1, sequela: 20 },
  /** GDD-motor 8: jogos de suspensão. */
  suspensao: { amarelos: 3, segundoAmarelo: 1, direto: 2 },
  /** PROVISORIO (Gustavo, 13/11/2026): o auxiliar poupa o titular abaixo desta condição, se houver reserva da posição. */
  poupar: 70,
  /** PROVISORIO: condição no 1º jogo = 60 + 4 ciclos Normais de pré-temporada; amistosos tiram o limite de ritmo. */
  preTemporada: 100,
  /** Comissão neutra (atributos 10), usada sem `gestao` (etapa 3 e testes). */
  comissao: { tratamento: 10, readaptacao: 10, recuperacao: 10, prevencao: 1 },
} as const;

export interface EstadoJogador {
  condicao: number;
  ciclosSemJogar: number;
  /** Dia em que volta da lesão; null se está bem. */
  voltaDia: number | null;
  /** Lesão que abre a janela de recaída depois da volta. */
  ultimaLesao: { gravidade: Gravidade; dias: number; recaidaAte: number | null } | null;
  amarelos: Record<string, number>;
  suspensao: Record<string, number>;
  /** Moral de 0 a 100 (GDD-gestao 3); só muda com `gestao`. */
  moral: number;
  /** Jogos seguidos do clube sem ser titular (queda por Minutos). */
  ciclosSemTitular: number;
  /** Jogos como titular na temporada (peso na moral do grupo). */
  titularidades: number;
}

export interface Desfalques { lesionados: string[]; suspensos: string[]; poupados: string[] }

export interface Memoria {
  /** Cópia própria dos elencos: a lesão grave muda Propensão e pode deixar sequela. */
  elencos: Record<string, Jogador[]>;
  jogadores: Map<string, EstadoJogador>;
  ultimoJogo: Map<string, number>;
  /** Adaptação entre jogos: o que cada técnico leu do último jogo contra cada adversário (`clube>adversário`). */
  leituras: Map<string, LeituraJogo>;
  /** Comissão e treino de cada clube (etapa 4); vazio sem `gestao`. */
  gestao: Map<string, ClubeGestao>;
  contagem: { lesoesTreino: number; recaidas: number; sequelas: number; suspensoes: number; semGoleiro: number; adaptacoes: number; leiturasCertas: number; leiturasErradas: number };
}

export interface ClubeGestao {
  comissao: ComissaoClube;
  tecnico: Tecnico;
  /** Semanas do estilo para o entrosamento completo. */
  semanas: number;
  treino: EstadoTreino;
  /** Respaldo do elenco ao técnico, 0 a 100. */
  respaldo: number;
  /** Jogos do clube na temporada. */
  jogos: number;
  /** Título na temporada (+10 no alvo do Respaldo). */
  titulo: boolean;
}

/** Dados da Gestão para a memória: comissões dos clubes, clube e técnico de cada um, catálogo tático. */
export interface DadosGestao {
  comissoes: Record<string, Profissional[]>;
  entradas: Record<string, { clube: Clube; tecnico: Tecnico }>;
  tatica: Tatica;
}

/** Valores da comissão que a memória usa (efetivos com `gestao`, neutros sem). */
function comissaoDe(m: Memoria, clube: string): { tratamento: number; readaptacao: number; recuperacao: number; prevencao: number } {
  const g = m.gestao.get(clube);
  if (!g) return ENTRE_JOGOS.comissao;
  const c = g.comissao;
  return {
    tratamento: efetivo(c, 'Médico', 'Trat'), readaptacao: efetivo(c, 'Médico', 'Read'),
    recuperacao: efetivo(c, 'Preparador', 'Rec'), prevencao: naFaixa('prevencao', efetivo(c, 'Preparador', 'Prev')),
  };
}

export function criarMemoria(elencos: Record<string, Jogador[]>, clubes: string[], dados?: DadosGestao): Memoria {
  const copia: Record<string, Jogador[]> = {};
  const jogadores = new Map<string, EstadoJogador>();
  for (const c of clubes) {
    copia[c] = elencos[c].map((j) => ({ ...j, atributos: { ...j.atributos } }));
    for (const j of copia[c]) jogadores.set(j.id, { condicao: ENTRE_JOGOS.preTemporada, ciclosSemJogar: 0, voltaDia: null, ultimaLesao: null, amarelos: {}, suspensao: {}, moral: MORAL.inicial, ciclosSemTitular: 0, titularidades: 0 });
  }
  const gestao = new Map<string, ClubeGestao>();
  if (dados) {
    for (const id of clubes) {
      const ent = dados.entradas[id];
      const profissionais = dados.comissoes[id];
      const comissao: ComissaoClube = { ct: ent.clube.estruturaCT, base: ent.clube.estruturaBase, profissionais: (profissionais ?? []).map((x) => ({ ...x })), ...(profissionais ? {} : { fixo: COMISSAO.europa }) };
      const semanas = dados.tatica.estilos.find((s) => s.nome === ent.tecnico.estilo)?.entrosamentoSemanas || 1;
      gestao.set(id, { comissao, tecnico: ent.tecnico, semanas, treino: criarTreino(chaveTatica(ent.tecnico), semanas), respaldo: respaldoInicial(ent.tecnico), jogos: 0, titulo: false });
    }
  }
  return { elencos: copia, jogadores, ultimoJogo: new Map(), leituras: new Map(), gestao, contagem: { lesoesTreino: 0, recaidas: 0, sequelas: 0, suspensoes: 0, semGoleiro: 0, adaptacoes: 0, leiturasCertas: 0, leiturasErradas: 0 } };
}

export function tipoCiclo(dias: number): 'curto' | 'normal' | 'longo' {
  const c = ENTRE_JOGOS.ciclo;
  return dias <= c.curtoAte ? 'curto' : dias <= c.normalAte ? 'normal' : 'longo';
}

/** Carga padrão da IA: Leve em ciclo Curto, Normal nos demais. */
const cargaIA = (ciclo: Ciclo): Carga => (ciclo === 'curto' ? 'leve' : 'normal');

/** Recuperação do ciclo (GDD-gestao 2), sem o teto. */
export function recuperacao(j: Jogador, ciclo: Ciclo, carga: Carga = cargaIA(ciclo), recPreparador: number = ENTRE_JOGOS.comissao.recuperacao): number {
  const e = ENTRE_JOGOS;
  return e.baseCiclo[ciclo] + TREINO.carga[carga].rec + (recPreparador - 10) * 0.5 + ((j.atributos.Res ?? 10) - 10) * e.resistencia + (j.idade >= e.veterano.idade ? e.veterano.condicao : 0);
}

/** Dias fora: semanas da gravidade × médico × idade (GDD-gestao 4). */
export function diasFora(semanas: number, idade: number, tratamento: number = ENTRE_JOGOS.comissao.tratamento): number {
  const e = ENTRE_JOGOS;
  const idadeF = idade <= e.jovem.idade ? e.jovem.tempoLesao : idade >= e.veterano.idade ? e.veterano.tempoLesao : 1;
  return Math.max(1, Math.round(semanas * 7 * (1.25 - tratamento / 40) * idadeF));
}

export const chanceLesaoTreino = (propensao: number, condicao: number, ciclo: Ciclo, carga: Carga = cargaIA(ciclo), prevencao: number = ENTRE_JOGOS.comissao.prevencao): number => {
  const t = ENTRE_JOGOS.lesaoTreino;
  return t.base * (t.propensaoBase + propensao / t.propensaoDiv) * TREINO.carga[carga].lesao * prevencao * (condicao < t.condicaoBaixa ? t.fatorCondicaoBaixa : 1);
};

function lesionar(m: Memoria, j: Jogador, s: EstadoJogador, gravidade: Gravidade, dias: number, dia: number, rng: Rng): void {
  s.voltaDia = dia + dias;
  s.ultimaLesao = { gravidade, dias, recaidaAte: null };
  if (gravidade !== 'grave') return;
  j.atributos.Les = Math.min(20, (j.atributos.Les ?? 10) + ENTRE_JOGOS.grave.propensao);
  if (rng.pct(ENTRE_JOGOS.grave.sequela)) {
    const a = rng.pct(50) ? 'Vel' : 'Agi';
    j.atributos[a] = Math.max(1, (j.atributos[a] ?? 10) - 1);
    m.contagem.sequelas += 1;
  }
}

/**
 * Antes do jogo do clube no dia: ciclo desde o último jogo (treino, lesão no treino, recuperação, volta de lesão)
 * e lista de quem fica de fora. Devolve o elenco disponível e a condição de cada um.
 */
export function prepararJogo(m: Memoria, clube: string, dia: number, competicao: string, rng: Rng): { elenco: Jogador[]; condicao: Record<string, number>; poupados: string[]; desfalques: Desfalques; apoio?: ApoioComissao; moral?: Record<string, number> } {
  const ultimo = m.ultimoJogo.get(clube);
  const elenco = m.elencos[clube];
  const ciclo = ultimo === undefined ? null : tipoCiclo(dia - ultimo);
  const g = m.gestao.get(clube);
  const com = comissaoDe(m, clube);
  // Treino do ciclo (IA): decide carga e foco e aplica o ganho de entrosamento.
  let carga: Carga | undefined;
  if (g && ciclo) {
    const chave = chaveTatica(g.tecnico);
    const d = decidirIA(g.treino, chave, g.semanas, ciclo);
    treinar(g.treino, chave, g.semanas, ciclo, d.carga, d.foco, treinoTatico(g.tecnico, g.comissao));
    carga = d.carga;
    cicloDeMoral(m, g, elenco);
  }
  for (const j of elenco) {
    const s = m.jogadores.get(j.id)!;
    if (ciclo && s.voltaDia === null && rng.pct(chanceLesaoTreino(j.atributos.Les ?? 10, s.condicao, ciclo, carga, com.prevencao))) {
      const t = ENTRE_JOGOS.lesaoTreino;
      const gr: Gravidade = rng.pct(t.leve) ? 'leve' : 'media';
      const [a, b] = GDD.lesao.semanas[gr];
      lesionar(m, j, s, gr, diasFora(rng.int(a, b), j.idade, com.tratamento), ultimo! + 1, rng);
      m.contagem.lesoesTreino += 1;
    }
    if (s.voltaDia !== null && s.voltaDia <= dia) {
      s.voltaDia = null;
      s.condicao = ENTRE_JOGOS.volta;
      s.ciclosSemJogar = Math.max(s.ciclosSemJogar, ENTRE_JOGOS.ritmo.ciclos);
      if (s.ultimaLesao) s.ultimaLesao.recaidaAte = dia + ENTRE_JOGOS.recaida.dias;
    } else if (ciclo && s.voltaDia === null) {
      const teto = s.ciclosSemJogar >= ENTRE_JOGOS.ritmo.ciclos ? ENTRE_JOGOS.ritmo.teto : 100;
      s.condicao = Math.max(0, Math.min(teto, s.condicao + recuperacao(j, ciclo, carga, com.recuperacao)));
    }
  }
  const lesionados = elenco.filter((j) => m.jogadores.get(j.id)!.voltaDia !== null).map((j) => j.id);
  const suspensos = elenco.filter((j) => (m.jogadores.get(j.id)!.suspensao[competicao] ?? 0) > 0).map((j) => j.id);
  const fora = new Set([...lesionados, ...suspensos]);
  let disponiveis = elenco.filter((j) => !fora.has(j.id));
  if (!disponiveis.some((j) => j.posicao === 'GOL')) {
    // PROVISORIO: sem goleiro disponível, joga o goleiro que volta antes (caso raro, só contado).
    const gol = elenco.filter((j) => j.posicao === 'GOL').sort((a, b) => (m.jogadores.get(a.id)!.voltaDia ?? 0) - (m.jogadores.get(b.id)!.voltaDia ?? 0))[0];
    disponiveis = [...disponiveis, gol];
    m.contagem.semGoleiro += 1;
  }
  const condicao = Object.fromEntries(disponiveis.map((j) => [j.id, Math.round(m.jogadores.get(j.id)!.condicao)]));
  const poupados = disponiveis.filter((j) => condicao[j.id] < ENTRE_JOGOS.poupar).map((j) => j.id);
  const moral = g ? Object.fromEntries(disponiveis.map((j) => [j.id, Math.round(m.jogadores.get(j.id)!.moral)])) : undefined;
  return { elenco: disponiveis, condicao, poupados, desfalques: { lesionados, suspensos, poupados }, apoio: g ? apoioDoJogo(g) : undefined, moral };
}

/** Ciclo (GDD-gestao 3): moral volta para 55, queda por Minutos e Respaldo anda 20% até o alvo. */
function cicloDeMoral(m: Memoria, g: ClubeGestao, elenco: Jogador[]): void {
  const pesos = pesosDe(g.tecnico, quedaMoral(g.comissao));
  const melhores = melhoresDoElenco(elenco);
  for (const j of elenco) {
    const s = m.jogadores.get(j.id)!;
    s.moral = repousar(s.moral);
    const queda = quedaPorMinutos(j, s.ciclosSemTitular, melhores, g.tecnico.temperamento);
    if (queda) s.moral = aplicar(s.moral, queda, pesos);
  }
  const est = (id: string): EstadoJogador => m.jogadores.get(id)!;
  const grupo = moralDoGrupo(elenco, (id) => est(id).moral, (id) => est(id).titularidades, g.jogos);
  const lideres = elenco.filter((j) => j.qualidades.includes(LIDER)).map((j) => est(j.id).moral);
  g.respaldo = andarRespaldo(g.respaldo, alvoRespaldo(grupo, g.tecnico, lideres, g.titulo));
}

/** O que a comissão e o último ciclo de treino entregam ao motor. */
function apoioDoJogo(g: ClubeGestao): ApoioComissao {
  const base = apoioDaComissao(g.comissao);
  const foco = bonusDoFoco(g.treino, g.comissao);
  const progresso = g.treino.taticas.get(chaveTatica(g.tecnico))?.progresso ?? 0;
  return { ...base, ensaiada: base.ensaiada + foco.ensaiadaExtra, menosGasto: foco.menosGasto, entrosamento: entrosamento(progresso, g.semanas), respaldo: g.respaldo };
}

/** Depois do jogo: condição de quem jogou, cartões, suspensões cumpridas, lesões do motor e recaída. */
export function registrarJogo(m: Memoria, clube: string, lado: 0 | 1, r: ResultadoPartida, dia: number, competicao: string, suspensosAntes: string[], rng: Rng, decisao = false): void {
  m.ultimoJogo.set(clube, dia);
  const e = ENTRE_JOGOS;
  const g = m.gestao.get(clube);
  if (g) {
    jogouCom(g.treino, chaveTatica(g.tecnico), g.semanas);
    moralDepoisDoJogo(m, g, clube, lado, r, decisao);
  }
  const com = comissaoDe(m, clube);
  const elenco = m.elencos[clube];
  for (const id of suspensosAntes) {
    const s = m.jogadores.get(id)!;
    s.suspensao[competicao] = Math.max(0, (s.suspensao[competicao] ?? 0) - 1);
  }
  const t = r.times[lado];
  const jogaram = new Set(t.participantes.map((x) => x.j.id));
  for (const j of elenco) {
    const s = m.jogadores.get(j.id)!;
    s.ciclosSemJogar = jogaram.has(j.id) ? 0 : s.ciclosSemJogar + 1;
  }
  const novasLesoes = new Set(r.lesoes.filter((l) => l.time === lado).map((l) => l.jogador));
  for (const x of t.participantes) {
    const s = m.jogadores.get(x.j.id)!;
    const j = elenco.find((y) => y.id === x.j.id)!;
    s.condicao = Math.round(x.energia);
    if (x.expulso) {
      s.suspensao[competicao] = (s.suspensao[competicao] ?? 0) + (x.expulso === 'direto' ? e.suspensao.direto : e.suspensao.segundoAmarelo);
      m.contagem.suspensoes += 1;
    } else if (x.amarelos > 0) {
      s.amarelos[competicao] = (s.amarelos[competicao] ?? 0) + x.amarelos;
      if (s.amarelos[competicao] >= e.suspensao.amarelos) {
        s.amarelos[competicao] -= e.suspensao.amarelos;
        s.suspensao[competicao] = (s.suspensao[competicao] ?? 0) + 1;
        m.contagem.suspensoes += 1;
      }
    }
    // Recaída: nas 4 semanas depois da volta, por jogo (GDD-gestao 4).
    const u = s.ultimaLesao;
    if (!novasLesoes.has(j.id) && u && u.recaidaAte !== null && dia <= u.recaidaAte) {
      if (rng.pct(e.recaida.base[u.gravidade] * (1.5 - com.readaptacao / 20))) {
        const [a, b] = e.recaida.fracao;
        lesionar(m, j, s, u.gravidade, Math.max(1, Math.round(u.dias * (a + rng.n() * (b - a)))), dia, rng);
        m.contagem.recaidas += 1;
      }
    }
  }
  for (const l of r.lesoes) {
    if (l.time !== lado) continue;
    const j = elenco.find((y) => y.id === l.jogador)!;
    lesionar(m, j, m.jogadores.get(j.id)!, l.gravidade, diasFora(l.semanas, j.idade, com.tratamento), dia, rng);
  }
}

/** Depois do jogo (GDD-gestao 3): moral do fim do jogo + resultado, nota e titularidade, para o elenco relacionado. */
function moralDepoisDoJogo(m: Memoria, g: ClubeGestao, clube: string, lado: 0 | 1, r: ResultadoPartida, decisao: boolean): void {
  const t = r.times[lado];
  const [a, b] = lado === 0 ? r.placar : [r.placar[1], r.placar[0]];
  const resultado: 1 | 0 | -1 = a > b ? 1 : a < b ? -1 : 0;
  const grande = r.classico || decisao || Math.abs(a - b) >= MORAL.margemGrande;
  const pesos = pesosDe(g.tecnico, quedaMoral(g.comissao));
  const titulares = new Set(t.participantes.slice(0, 11).map((e) => e.j.id));
  const jogaram = new Map(t.participantes.map((e) => [e.j.id, e]));
  const relacionados = new Set([...jogaram.keys(), ...t.banco.map((j) => j.id)]);
  g.jogos += 1;
  for (const j of m.elencos[clube]) {
    const s = m.jogadores.get(j.id)!;
    const titular = titulares.has(j.id);
    s.ciclosSemTitular = titular ? 0 : s.ciclosSemTitular + 1;
    if (titular) s.titularidades += 1;
    if (!relacionados.has(j.id)) continue;
    const e = jogaram.get(j.id);
    // Decisão do Gustavo (13/11/2026): a moral que muda dentro do jogo (gol, cartão, vaia) vale só naquele jogo.
    const d = deltaDoJogo(j, { resultado, grande, nota: e ? notaFinal(e) : null, titular }, g.tecnico.temperamento);
    s.moral = aplicar(s.moral, d, pesos);
  }
}
