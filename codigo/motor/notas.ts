// Nota do jogador, de 1 a 10 (GDD 10). Parte de 6,0 e soma os lances dele. Contas puras; partida.ts chama a cada lance.
import { PROVISORIO } from './parametros.ts';
import type { Escalado, TimeEmCampo } from './tipos.ts';
import { faixa } from './zonas.ts';

export const NOTA = {
  inicial: 6,
  min: 1,
  max: 10,
  gol: 1,
  assistencia: 0.6,
  /** Passe decisivo ou drible certo, de F4 em diante. */
  criacao: 0.1,
  chancePerdida: -0.3,
  /** Desarme ou interceptação em F1 a F3 (PROVISORIO: o próprio campo de quem desarma). */
  desarme: 0.1,
  /** Perda em F1 a F3 (PROVISORIO: o próprio campo de quem perde). */
  perda: -0.2,
  defesaDificil: 0.3,
  golSofrido: -0.3,
  semSofrer: 0.3,
  penaltiDefendido: 1,
  penaltiPerdido: -0.5,
  penaltiCometido: -0.5,
  golContra: -0.6,
  amarelo: -0.3,
  vermelho: -1.5,
} as const;

/** Goleiro e defesa (PROVISORIO: goleiro, zagueiros e laterais). */
export const ehDefesa = (e: Escalado): boolean => e.vaga === 'GOL' || e.vaga === 'ZAG' || e.vaga.startsWith('LAT');

export const notaFinal = (e: Escalado): number => Math.round(Math.max(NOTA.min, Math.min(NOTA.max, e.nota)) * 10) / 10;

const somar = (e: Escalado | null | undefined, v: number): void => { if (e) e.nota += v; };

/** Chance alta = a mesma de "defesa difícil" (PROVISORIO). */
const chanceAlta = (chance: number | null | undefined): boolean => (chance ?? 0) >= PROVISORIO.defesaDificilChance;

export interface LanceNota {
  tema: string;
  lance: string;
  /** Time do lance, como no registro. */
  time: 0 | 1;
  jogador?: Escalado | null;
  jogador2?: Escalado | null;
  goleiro?: Escalado | null;
  /** Zona do lance na visão de quem ataca. */
  zona: number | null;
  chance?: number | null;
}

/** Aplica a nota de um lance registrado. Cartões entram em partida.ts, fora do registro. */
export function pontuarLance(t: [TimeEmCampo, TimeEmCampo], x: LanceNota): void {
  const sofreu = (i: 0 | 1): void => { for (const e of t[i].escalados) if (ehDefesa(e)) somar(e, NOTA.golSofrido); };
  const outro = (1 - x.time) as 0 | 1;
  const f = x.zona === null ? 0 : faixa(x.zona);
  switch (x.tema) {
    case 'gol':
      if (x.lance === 'Gol contra') { somar(x.jogador, NOTA.golContra); sofreu(outro); break; }
      somar(x.jogador, NOTA.gol);
      somar(x.jogador2, NOTA.assistencia);
      sofreu(outro);
      break;
    case 'penalti':
      if (x.lance === 'Convertido') { somar(x.jogador, NOTA.gol); sofreu(outro); }
      else if (x.lance === 'Marcado') somar(x.jogador2, NOTA.penaltiCometido);
      else if (x.lance === 'Defendido') { somar(x.jogador, NOTA.penaltiPerdido); somar(x.goleiro, NOTA.penaltiDefendido); }
      else if (x.lance === 'Perdido') somar(x.jogador, NOTA.penaltiPerdido);
      break;
    case 'jogada':
      if ((x.lance === 'Passe decisivo' || x.lance === 'Drible') && f >= 4) somar(x.jogador, NOTA.criacao);
      else if (x.lance === 'Desarme' && f >= 4) somar(x.jogador, NOTA.desarme);
      else if (x.lance === 'Perda de bola' && f <= 3) somar(x.jogador, NOTA.perda);
      break;
    case 'finalizacao':
      if (chanceAlta(x.chance)) somar(x.jogador, NOTA.chancePerdida);
      break;
    case 'goleiro':
      // No registro do goleiro, `jogador` é quem finalizou e `goleiro` é quem defendeu.
      if (x.lance === 'Falha') break;
      if (chanceAlta(x.chance)) somar(x.jogador, NOTA.chancePerdida);
      if (x.lance === 'Defesa difícil') somar(x.goleiro, NOTA.defesaDificil);
      break;
  }
}

/** Fim de jogo: goleiro e defesa de quem não sofreu gol. */
export function fecharNotas(t: [TimeEmCampo, TimeEmCampo], placar: [number, number]): void {
  for (const i of [0, 1] as const) {
    if (placar[1 - i] > 0) continue;
    for (const e of t[i].participantes) if (ehDefesa(e)) somar(e, NOTA.semSofrer);
  }
}
