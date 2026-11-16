// Contas de bola parada e cartões (GDD 8 e Anexo A), sem sorteio.
import { limitar, lerAtributo } from './disputa.ts';
import { GDD, PROVISORIO } from './parametros.ts';
import type { Escalado, TimeEmCampo, TipoBatedor } from './tipos.ts';

const chanceBola = (base: number, atk: number, def: number): number =>
  limitar(base + GDD.pontosPorAtributo * (atk - def), GDD.chanceMin, GDD.chanceMax);

export const chanceBolaChega = (vBatedor: number, vComGoleiro: number): number => chanceBola(GDD.bolaParada.chegaBase, vBatedor, vComGoleiro);
export const chanceDueloAereo = (vAtacante: number, vZagueiro: number): number => chanceBola(GDD.bolaParada.dueloBase, vAtacante, vZagueiro);

export function chancePenalti(vBatedor: number, vGoleiro: number): number {
  const p = GDD.bolaParada.penalti;
  return limitar(p.base + p.porPonto * (vBatedor - vGoleiro), p.min, p.max);
}

/** Batedor da tática se está em campo (5b1); sem definição, cobra quem tem o maior BP em campo (GDD 8). Empate: o primeiro da escalação. */
export function escolherBatedor(t: TimeEmCampo, tipo?: TipoBatedor): Escalado {
  const id = tipo ? t.batedores?.[tipo] : undefined;
  const definido = id ? t.escalados.find((e) => e.j.id === id) : undefined;
  return definido ?? t.escalados.reduce((m, e) => (lerAtributo(e, 'BP') > lerAtributo(m, 'BP') ? e : m));
}

/** Bônus de quem cobra: analista (entra com a Gestão) e estilo Bola Parada, em BP e Cab. */
export const bonusEnsaiada = (t: TimeEmCampo): number =>
  t.apoio.ensaiada + (t.estilo.nome === 'Bola Parada' ? GDD.bolaParada.estilo : 0);

const valorAereo = (e: Escalado): number => lerAtributo(e, 'Cab') * 0.6 + lerAtributo(e, 'Imp') * 0.4;

/** Quem sobe para a área: os melhores pelo alto, sem goleiro e sem o batedor (PROVISORIO). */
export function melhoresNoAlto(t: TimeEmCampo, excluido: Escalado | null): Escalado[] {
  return t.escalados
    .filter((e) => e !== t.goleiro && e !== excluido)
    .sort((a, b) => valorAereo(b) - valorAereo(a) || a.j.id.localeCompare(b.j.id))
    .slice(0, PROVISORIO.disputamNoAlto);
}

export const combatividadeAlta = (e: Escalado): boolean => lerAtributo(e, 'Comb') >= GDD.dividida.combatividade;
const esquentadoOuIndisciplinado = (e: Escalado): boolean => e.j.defeitos.includes('Esquentado') || e.j.defeitos.includes('Indisciplinado');

/** Amarelado que tende a levar o segundo: o técnico tira a partir do minuto 60 (GDD 7). Critério PROVISORIO. */
export const cartaoEmRisco = (e: Escalado): boolean => e.amarelos > 0 && (combatividadeAlta(e) || esquentadoOuIndisciplinado(e));

export function chancesCartao(e: Escalado, ultimoDefensor: boolean): { amarelo: number; vermelho: number } {
  const c = GDD.cartoes;
  const base = ultimoDefensor ? c.ultimoDefensor : c.comum;
  let amarelo: number = base.amarelo;
  let vermelho: number = base.vermelho;
  if (e.j.defeitos.includes('Esquentado')) { amarelo *= c.esquentadoAmarelo; vermelho *= c.esquentadoVermelho; }
  if (e.j.defeitos.includes('Indisciplinado')) amarelo *= c.indisciplinadoAmarelo;
  if (e.j.perfilJovem === 'Marrento') amarelo *= c.marrentoAmarelo;
  if (combatividadeAlta(e)) amarelo *= PROVISORIO.cartaoCombatividade;
  if (e.j.tracos.includes('Desarme limpo')) { amarelo *= PROVISORIO.cartaoDesarmeLimpo; vermelho *= PROVISORIO.cartaoDesarmeLimpo; }
  return { amarelo, vermelho };
}

export function limiarDividida(e: Escalado, faixa: number, minuto: number, difAbsoluta: number): number {
  const d = GDD.dividida;
  let limiar: number = d.limiar;
  if (difAbsoluta <= 1 && minuto >= d.minutoApertado) limiar += d.apertado;
  if (difAbsoluta >= 3) limiar += d.goleada;
  if (faixa === 6) limiar += d.emF6;
  if (combatividadeAlta(e)) limiar += d.porCombatividade;
  if (esquentadoOuIndisciplinado(e)) limiar += d.porDefeito;
  return limiar;
}
