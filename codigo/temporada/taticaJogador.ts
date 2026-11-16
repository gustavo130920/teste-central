// Tática profunda do clube do jogador (etapa 5, fatia 5b1; GDD 3, 7 e 8; GDD-gestao 2): até 3 táticas salvas
// (estilo, formações, ajustes do padrão, instruções individuais e batedores), qual usar no jogo e qual treinar.
// Delegada (sem o gancho ou com resposta null), nada disto entra: o motor usa o melhor encaixe e o maior BP.
import type { Instrucao, Jogador, PadraoTime, Posicao, Tatica, Tecnico } from '../motor/dados.ts';
import type { Batedores, InstrucoesManuais, TipoBatedor } from '../motor/tipos.ts';
import { coerencia, opcoesDoJogador } from '../motor/plano.ts';
import { chaveTatica } from '../gestao/treino.ts';
import type { Memoria } from './memoria.ts';
import { mudarTatica } from './jogador.ts';

/** PROVISORIO (5b1). */
export const TATICA_JOGADOR = {
  max: 3,
  /** Encaixe mostrado na tela: (DT + média das chaves) ÷ 40, +0,10 com traço, máximo 1,1, × coerência (GDD 3 e 4). */
  traco: 0.1,
  teto: 1.1,
} as const;

export interface TaticaSalva {
  nome: string;
  estilo: string;
  formacaoComBola: string;
  formacaoSemBola: string;
  padrao: Partial<PadraoTime>;
  instrucoes: InstrucoesManuais;
  batedores: Batedores;
}

export interface EstadoTaticaJogador {
  taticas: TaticaSalva[];
  /** Índice da tática usada no próximo jogo. */
  ativa: number;
  /** Índice da tática que o foco Tática treina (100%; as outras 25%). */
  treinar: number;
}

const doTecnico = (t: Pick<Tecnico, 'estilo' | 'formacaoComBola' | 'formacaoSemBola'>, nome: string): TaticaSalva =>
  ({ nome, estilo: t.estilo, formacaoComBola: t.formacaoComBola, formacaoSemBola: t.formacaoSemBola, padrao: {}, instrucoes: {}, batedores: {} });

/** Estado criado sob demanda a partir da tática do técnico. Se o técnico mudou de tática por fora, a ativa acompanha. */
export function estadoTatica(mem: Memoria, clube: string): EstadoTaticaJogador {
  const t = mem.gestao.get(clube)!.tecnico;
  if (!mem.taticaJogador) mem.taticaJogador = { taticas: [doTecnico(t, 'Tática 1')], ativa: 0, treinar: 0 };
  const s = mem.taticaJogador;
  const a = s.taticas[s.ativa];
  if (chaveTatica(a) !== chaveTatica(t)) Object.assign(a, { estilo: t.estilo, formacaoComBola: t.formacaoComBola, formacaoSemBola: t.formacaoSemBola });
  return s;
}

export const taticaAtiva = (mem: Memoria, clube: string): TaticaSalva => { const s = estadoTatica(mem, clube); return s.taticas[s.ativa]; };

/** Copia a ativa numa tática nova (até 3) e passa a usá-la. Devolve o erro, ou null. */
export function novaTatica(mem: Memoria, clube: string, nome?: string): string | null {
  const s = estadoTatica(mem, clube);
  if (s.taticas.length >= TATICA_JOGADOR.max) return `Já há ${TATICA_JOGADOR.max} táticas: apague uma antes.`;
  const a = s.taticas[s.ativa];
  s.taticas.push({ ...a, nome: nome || `Tática ${s.taticas.length + 1}`, padrao: { ...a.padrao }, instrucoes: structuredClone(a.instrucoes), batedores: { ...a.batedores } });
  s.ativa = s.taticas.length - 1;
  return null;
}

/** Usa a tática i no próximo jogo: o técnico passa a ter o estilo e as formações dela. */
export function usarTatica(mem: Memoria, clube: string, tatica: Tatica, i: number): void {
  const s = estadoTatica(mem, clube);
  if (!s.taticas[i]) return;
  s.ativa = i;
  const x = s.taticas[i];
  mudarTatica(mem, clube, tatica, { estilo: x.estilo, formacaoComBola: x.formacaoComBola, formacaoSemBola: x.formacaoSemBola });
}

/** Apaga a tática i (nunca a ativa). O entrosamento dela segue no treino até sair pelo limite de 3. */
export function apagarTatica(mem: Memoria, clube: string, i: number): string | null {
  const s = estadoTatica(mem, clube);
  if (i === s.ativa) return 'Não dá para apagar a tática em uso.';
  if (!s.taticas[i]) return 'Tática inexistente.';
  s.taticas.splice(i, 1);
  if (s.ativa > i) s.ativa -= 1;
  s.treinar = s.treinar === i ? s.ativa : s.treinar > i ? s.treinar - 1 : s.treinar;
  return null;
}

/** Estilo e formações da ativa. */
export function mudarEstiloFormacao(mem: Memoria, clube: string, tatica: Tatica, novo: Pick<Tecnico, 'estilo' | 'formacaoComBola' | 'formacaoSemBola'>): void {
  const s = estadoTatica(mem, clube);
  Object.assign(s.taticas[s.ativa], novo);
  mudarTatica(mem, clube, tatica, novo);
}

export function definirInstrucao(mem: Memoria, clube: string, jogador: string, fase: 'Com' | 'Sem', id: string | null): void {
  const a = taticaAtiva(mem, clube);
  const x = { ...a.instrucoes[jogador] };
  if (id) x[fase] = id; else delete x[fase];
  if (x.Com || x.Sem) a.instrucoes[jogador] = x; else delete a.instrucoes[jogador];
}

export function definirBatedor(mem: Memoria, clube: string, tipo: TipoBatedor, jogador: string | null): void {
  const a = taticaAtiva(mem, clube);
  if (jogador) a.batedores[tipo] = jogador; else delete a.batedores[tipo];
}

/** Tática que o foco Tática treina: chave e semanas do estilo dela (GDD-gestao 2). */
export function alvoDoTreino(mem: Memoria, clube: string, tatica: Tatica): { chave: string; semanas: number } {
  const s = estadoTatica(mem, clube);
  const x = s.taticas[s.treinar] ?? s.taticas[s.ativa];
  return { chave: chaveTatica(x), semanas: tatica.estilos.find((e) => e.nome === x.estilo)?.entrosamentoSemanas || 1 };
}

/** Entrosamento de 0 a 100% de uma tática salva. */
export function progressoDe(mem: Memoria, clube: string, tatica: Tatica, x: TaticaSalva): number {
  const g = mem.gestao.get(clube);
  const semanas = tatica.estilos.find((e) => e.nome === x.estilo)?.entrosamentoSemanas || 1;
  return Math.min(1, (g?.treino.taticas.get(chaveTatica(x))?.progresso ?? 0) / semanas);
}

/** O que vai para o motor (instruções só de quem está no elenco). */
export function planoDoJogo(mem: Memoria, clube: string): { padrao?: Partial<PadraoTime>; instrucoes?: InstrucoesManuais; batedores?: Batedores } {
  const a = taticaAtiva(mem, clube);
  return {
    ...(Object.keys(a.padrao).length ? { padrao: { ...a.padrao } } : {}),
    ...(Object.keys(a.instrucoes).length ? { instrucoes: structuredClone(a.instrucoes) } : {}),
    ...(Object.keys(a.batedores).length ? { batedores: { ...a.batedores } } : {}),
  };
}

// ---------- Tela ----------

export interface OpcaoInstrucao { ins: Instrucao; encaixe: number; contraria: boolean; auxiliar: boolean }

/** Encaixe na tela, sem forma do dia, moral nem entrosamento (GDD 3 e 4). */
export function encaixe(j: Jogador, ins: Instrucao, estilo: string): number {
  const chaves = ins.chaves.reduce((s, a) => s + (j.atributos[a] ?? 10), 0) / ins.chaves.length;
  const traco = ins.tracos.some((t) => j.tracos.includes(t)) ? TATICA_JOGADOR.traco : 0;
  return Math.min(TATICA_JOGADOR.teto, ((j.atributos.DT ?? 10) + chaves) / 40 + traco) * coerencia(ins, estilo);
}

/** Opções da vaga, da melhor para a pior; `auxiliar` marca a que o melhor encaixe escolheria (nunca uma que Contraria). */
export function opcoesNaVaga(j: Jogador, vaga: Posicao, fase: 'Com' | 'Sem', tatica: Tatica, x: TaticaSalva): OpcaoInstrucao[] {
  const estilo = tatica.estilos.find((e) => e.nome === x.estilo)!;
  const padrao: PadraoTime = { ...estilo.padrao, ...x.padrao };
  const zagueiros = tatica.formacoes.find((f) => f.nome === x.formacaoComBola)?.pecas.filter((p) => p.posicao === 'ZAG').length ?? 0;
  const ops = opcoesDoJogador(vaga, fase, tatica.instrucoes, padrao, zagueiros)
    .map((ins) => ({ ins, encaixe: encaixe(j, ins, x.estilo), contraria: ins.contraria.includes(x.estilo), auxiliar: false }))
    .sort((a, b) => b.encaixe - a.encaixe || a.ins.id.localeCompare(b.ins.id));
  const aux = ops.find((o) => !o.contraria);
  if (aux) aux.auxiliar = true;
  return ops;
}
