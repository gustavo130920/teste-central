// Memória entre jogos (etapa 3, 2ª fatia): condição física, lesões com dias fora, recaída, suspensões e rodízio do auxiliar.
// Regras do GDD-gestao (seções 2 e 4) e do GDD-motor (seção 8). Comissão com valor neutro até a Gestão (decisão do Gustavo, 13/11/2026).
import type { Jogador } from '../motor/dados.ts';
import { GDD } from '../motor/parametros.ts';
import type { Rng } from '../motor/rng.ts';
import type { Gravidade, ResultadoPartida } from '../motor/tipos.ts';
import type { LeituraJogo } from './adaptacao.ts';

export const ENTRE_JOGOS = {
  /** GDD-gestao 1: tipo de ciclo pelos dias até o próximo jogo. */
  ciclo: { curtoAte: 3, normalAte: 7 },
  /** GDD-gestao 2: base de recuperação do ciclo. */
  baseCiclo: { curto: 25, normal: 40, longo: 60 },
  /** GDD-gestao 2: carga. A IA usa Leve em ciclo Curto e Normal nos demais. */
  carga: { leve: { rec: 8, lesao: 0.8 }, normal: { rec: 0, lesao: 1 } },
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
  /** PROVISORIO: comissão neutra (atributos 10) até a Gestão. */
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
}

export interface Desfalques { lesionados: string[]; suspensos: string[]; poupados: string[] }

export interface Memoria {
  /** Cópia própria dos elencos: a lesão grave muda Propensão e pode deixar sequela. */
  elencos: Record<string, Jogador[]>;
  jogadores: Map<string, EstadoJogador>;
  ultimoJogo: Map<string, number>;
  /** Adaptação entre jogos: o que cada técnico leu do último jogo contra cada adversário (`clube>adversário`). */
  leituras: Map<string, LeituraJogo>;
  contagem: { lesoesTreino: number; recaidas: number; sequelas: number; suspensoes: number; semGoleiro: number; adaptacoes: number; leiturasCertas: number; leiturasErradas: number };
}

export function criarMemoria(elencos: Record<string, Jogador[]>, clubes: string[]): Memoria {
  const copia: Record<string, Jogador[]> = {};
  const jogadores = new Map<string, EstadoJogador>();
  for (const c of clubes) {
    copia[c] = elencos[c].map((j) => ({ ...j, atributos: { ...j.atributos } }));
    for (const j of copia[c]) jogadores.set(j.id, { condicao: ENTRE_JOGOS.preTemporada, ciclosSemJogar: 0, voltaDia: null, ultimaLesao: null, amarelos: {}, suspensao: {} });
  }
  return { elencos: copia, jogadores, ultimoJogo: new Map(), leituras: new Map(), contagem: { lesoesTreino: 0, recaidas: 0, sequelas: 0, suspensoes: 0, semGoleiro: 0, adaptacoes: 0, leiturasCertas: 0, leiturasErradas: 0 } };
}

export function tipoCiclo(dias: number): 'curto' | 'normal' | 'longo' {
  const c = ENTRE_JOGOS.ciclo;
  return dias <= c.curtoAte ? 'curto' : dias <= c.normalAte ? 'normal' : 'longo';
}

/** Recuperação do ciclo (GDD-gestao 2), sem o teto. */
export function recuperacao(j: Jogador, ciclo: 'curto' | 'normal' | 'longo'): number {
  const e = ENTRE_JOGOS;
  const carga = ciclo === 'curto' ? e.carga.leve : e.carga.normal;
  return e.baseCiclo[ciclo] + carga.rec + (e.comissao.recuperacao - 10) * 0.5 + ((j.atributos.Res ?? 10) - 10) * e.resistencia + (j.idade >= e.veterano.idade ? e.veterano.condicao : 0);
}

/** Dias fora: semanas da gravidade × médico × idade (GDD-gestao 4). */
export function diasFora(semanas: number, idade: number): number {
  const e = ENTRE_JOGOS;
  const idadeF = idade <= e.jovem.idade ? e.jovem.tempoLesao : idade >= e.veterano.idade ? e.veterano.tempoLesao : 1;
  return Math.max(1, Math.round(semanas * 7 * (1.25 - e.comissao.tratamento / 40) * idadeF));
}

export const chanceLesaoTreino = (propensao: number, condicao: number, ciclo: 'curto' | 'normal' | 'longo'): number => {
  const t = ENTRE_JOGOS.lesaoTreino;
  const carga = ciclo === 'curto' ? ENTRE_JOGOS.carga.leve : ENTRE_JOGOS.carga.normal;
  return t.base * (t.propensaoBase + propensao / t.propensaoDiv) * carga.lesao * ENTRE_JOGOS.comissao.prevencao * (condicao < t.condicaoBaixa ? t.fatorCondicaoBaixa : 1);
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
export function prepararJogo(m: Memoria, clube: string, dia: number, competicao: string, rng: Rng): { elenco: Jogador[]; condicao: Record<string, number>; poupados: string[]; desfalques: Desfalques } {
  const ultimo = m.ultimoJogo.get(clube);
  const elenco = m.elencos[clube];
  const ciclo = ultimo === undefined ? null : tipoCiclo(dia - ultimo);
  for (const j of elenco) {
    const s = m.jogadores.get(j.id)!;
    if (ciclo && s.voltaDia === null && rng.pct(chanceLesaoTreino(j.atributos.Les ?? 10, s.condicao, ciclo))) {
      const t = ENTRE_JOGOS.lesaoTreino;
      const g: Gravidade = rng.pct(t.leve) ? 'leve' : 'media';
      const [a, b] = GDD.lesao.semanas[g];
      lesionar(m, j, s, g, diasFora(rng.int(a, b), j.idade), ultimo! + 1, rng);
      m.contagem.lesoesTreino += 1;
    }
    if (s.voltaDia !== null && s.voltaDia <= dia) {
      s.voltaDia = null;
      s.condicao = ENTRE_JOGOS.volta;
      s.ciclosSemJogar = Math.max(s.ciclosSemJogar, ENTRE_JOGOS.ritmo.ciclos);
      if (s.ultimaLesao) s.ultimaLesao.recaidaAte = dia + ENTRE_JOGOS.recaida.dias;
    } else if (ciclo && s.voltaDia === null) {
      const teto = s.ciclosSemJogar >= ENTRE_JOGOS.ritmo.ciclos ? ENTRE_JOGOS.ritmo.teto : 100;
      s.condicao = Math.max(0, Math.min(teto, s.condicao + recuperacao(j, ciclo)));
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
  return { elenco: disponiveis, condicao, poupados, desfalques: { lesionados, suspensos, poupados } };
}

/** Depois do jogo: condição de quem jogou, cartões, suspensões cumpridas, lesões do motor e recaída. */
export function registrarJogo(m: Memoria, clube: string, lado: 0 | 1, r: ResultadoPartida, dia: number, competicao: string, suspensosAntes: string[], rng: Rng): void {
  m.ultimoJogo.set(clube, dia);
  const e = ENTRE_JOGOS;
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
      if (rng.pct(e.recaida.base[u.gravidade] * (1.5 - e.comissao.readaptacao / 20))) {
        const [a, b] = e.recaida.fracao;
        lesionar(m, j, s, u.gravidade, Math.max(1, Math.round(u.dias * (a + rng.n() * (b - a)))), dia, rng);
        m.contagem.recaidas += 1;
      }
    }
  }
  for (const l of r.lesoes) {
    if (l.time !== lado) continue;
    const j = elenco.find((y) => y.id === l.jogador)!;
    lesionar(m, j, m.jogadores.get(j.id)!, l.gravidade, diasFora(l.semanas, j.idade), dia, rng);
  }
}
