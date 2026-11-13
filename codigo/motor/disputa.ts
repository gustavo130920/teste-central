// Contas da seção 3 do GDD, sem sorteio.
import type { Atributo } from './dados.ts';
import { modPersonalidade } from './neutros.ts';
import { GDD, TRACO_DA_ACAO, chanceDaZona } from './parametros.ts';
import type { Acao, AcaoDisputa, TipoChute } from './parametros.ts';
import type { Escalado } from './tipos.ts';

export const limitar = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

/** Média ponderada: 60/40 com 2 atributos, 50/30/20 com 3. */
export function mediaPonderada(valores: number[]): number {
  const pesos = valores.length === 3 ? [0.5, 0.3, 0.2] : valores.length === 2 ? [0.6, 0.4] : [1];
  return valores.reduce((s, v, i) => s + v * pesos[i], 0);
}

/** Goleiro não tem Pas na ficha: usa Pés. */
export const lerAtributo = (e: Escalado, a: Atributo): number => e.j.atributos[a] ?? (a === 'Pas' ? e.j.atributos.Pes : undefined) ?? 1;

export function modTraco(e: Escalado, chave: AcaoDisputa | TipoChute | 'escanteio', primeiro: Atributo): number {
  if (!e.j.tracos.some((t) => TRACO_DA_ACAO[t] === chave)) return 0;
  return lerAtributo(e, primeiro) >= GDD.tracoMinimo ? GDD.tracoBom : GDD.tracoRuim;
}

function somaMods(e: Escalado, extra: number): number {
  const soma = extra + e.forma + e.jogosGrandes + e.modBloco + modPersonalidade(e);
  return limitar(soma, -GDD.modsMax, GDD.modsMax);
}

export function valorJogador(e: Escalado, atributos: readonly Atributo[], extra = 0): number {
  return mediaPonderada(atributos.map((a) => lerAtributo(e, a))) + somaMods(e, extra);
}

export function pontosNumeros(atacantes: number, defensores: number): number {
  return limitar((atacantes - defensores) * GDD.pontosPorJogador, -GDD.numerosMax, GDD.numerosMax);
}

/** Chance da ação dar certo: base + 3 × (atacante − defensor) + números + pontos de plano (GDD 4 e 5), entre 5% e 95%. */
export function chanceDisputa(base: number, vAtk: number, vDef: number, atacantes: number, defensores: number, pontos = 0): number {
  return limitar(base + GDD.pontosPorAtributo * (vAtk - vDef) + pontosNumeros(atacantes, defensores) + pontos, GDD.chanceMin, GDD.chanceMax);
}

/** `comMarcador` null: sem ajuste de marcador (bola parada). `baseFixa` troca a chance da zona (cobrança direta). */
export interface EntradaChute { corredor: number; faixa: number; tipo: TipoChute; vAtk: number; vGol: number; comMarcador: boolean | null; bonusPct?: number; baseFixa?: number }

export function chanceGol(c: EntradaChute): number {
  const base = (c.baseFixa ?? chanceDaZona(c.corredor, c.faixa) * GDD.escalaZona) * GDD.chutes[c.tipo].ajuste;
  const duelo = 1 + GDD.chancePorPontoGoleiro * (c.vAtk - c.vGol);
  const marcacao = c.comMarcador === null ? 1 : c.comMarcador ? GDD.chuteComMarcador : GDD.chuteSemMarcador;
  return limitar(base * duelo * marcacao * (1 + (c.bonusPct ?? 0) / 100), GDD.chuteMin, GDD.chuteMax);
}

export function valorAcao(e: Escalado, acao: AcaoDisputa, extra = 0): number {
  const attrs = GDD.acoes[acao].atk;
  return valorJogador(e, attrs, modTraco(e, acao, attrs[0]) + extra);
}

/** Fominha e Firuleiro mudam o que o jogador escolhe fazer (Anexo A). Passe = curto e em profundidade. */
export function pesoDefeito(e: Escalado, acao: Acao, faixa: number, difPlacar: number): number {
  const { fominha: fo, firuleiro: fi } = GDD;
  let p = 1;
  if (e.j.defeitos.includes('Fominha') && faixa >= fo.faixaMin) {
    if (acao === 'drible' || acao === 'finalizacao') p *= fo.individual;
    if (acao === 'passeCurto' || acao === 'passeProfundidade') p *= fo.passe;
  }
  if (acao === 'drible' && e.j.defeitos.includes('Firuleiro')) p *= difPlacar >= fi.difVencendo ? fi.dribleVencendo : fi.drible;
  return p;
}

/** -1 do Firuleiro no drible em F1 a F3 (Anexo A). */
export const penaFirula = (e: Escalado, acao: Acao, faixa: number): number =>
  acao === 'drible' && faixa <= GDD.firuleiro.faixaPenaMax && e.j.defeitos.includes('Firuleiro') ? GDD.firuleiro.pena : 0;
