// Moral do jogador, moral do grupo e Respaldo do elenco (etapa 4, 2ª fatia; GDD-gestao 3). Contas puras.
import type { Jogador, Tecnico } from '../motor/dados.ts';

export const MORAL = {
  inicial: 60,
  recemContratado: 65,
  /** A cada ciclo, anda 2 pontos em direção a 55. */
  repouso: 55,
  passoCiclo: 2,
  vitoria: 4,
  derrota: -4,
  /** Clássico, decisão (mata-mata das quartas em diante e Mundial) ou placar de 3 gols ou mais. */
  pesoGrande: 1.5,
  margemGrande: 3,
  notaAlta: { nota: 7.5, delta: 3 },
  notaBaixa: { nota: 5, delta: -3 },
  titular: 1,
  /** 3 ciclos seguidos sem ser titular, entre as 6 melhores notas do elenco, com mais de 21 anos: -3 por ciclo. */
  minutos: { ciclos: 3, melhores: 6, idadeMin: 21, delta: -3 },
  motivacao: { base: 0.8, div: 50 },
  paizaoMinutos: 0.75,
  linhaDura: { vitoria: -1, derrotaMenos: 1, disciplinaMin: 14 },
  pesoNoGrupo: 2,
  min: 0,
  max: 100,
} as const;

export const RESPALDO_GESTAO = {
  /** Técnico novo: 55 + (Reputação − 10). */
  inicial: 55,
  passo: 0.2,
  gestaoGrupo: 2,
  liderAlto: { moral: 50, alvo: 5 },
  liderBaixo: { moral: 30, alvo: -10 },
  titulo: 10,
  semDado: 10,
} as const;

export const LIDER = 'Líder de vestiário';

const limitar = (v: number): number => Math.max(MORAL.min, Math.min(MORAL.max, v));

/** Quem muda a moral: Motivação do técnico nos ganhos, psicólogo nas quedas (GDD-gestao 3). */
export interface Pesos { motivacao: number; quedaPsicologo: number }

export const pesosDe = (t: Tecnico, quedaPsicologo: number): Pesos => ({
  motivacao: t.trabalho?.['Motivação'] ?? RESPALDO_GESTAO.semDado, quedaPsicologo,
});

export function aplicar(moral: number, delta: number, p: Pesos): number {
  if (delta > 0) return limitar(moral + delta * (MORAL.motivacao.base + p.motivacao / MORAL.motivacao.div));
  return limitar(moral + delta * p.quedaPsicologo);
}

/** Um ciclo: 2 pontos em direção a 55, sem passar. */
export function repousar(moral: number): number {
  const d = MORAL.repouso - moral;
  return moral + Math.sign(d) * Math.min(Math.abs(d), MORAL.passoCiclo);
}

export interface FatosJogo {
  /** 1 vitória, 0 empate, -1 derrota. */
  resultado: 1 | 0 | -1;
  grande: boolean;
  nota: number | null;
  titular: boolean;
}

/** Soma da moral depois do jogo, antes dos pesos, já com o temperamento do técnico. */
export function deltaDoJogo(j: Jogador, f: FatosJogo, temperamento: string | null): number {
  let res = f.resultado === 1 ? MORAL.vitoria : f.resultado === -1 ? MORAL.derrota : 0;
  if (temperamento === 'Linha-dura') {
    if (f.resultado === 1) res += MORAL.linhaDura.vitoria;
    if (f.resultado === -1 && (j.atributos.DT ?? 10) >= MORAL.linhaDura.disciplinaMin) res += MORAL.linhaDura.derrotaMenos;
  }
  if (f.grande) res *= MORAL.pesoGrande;
  let d = res;
  if (f.nota !== null && f.nota >= MORAL.notaAlta.nota) d += MORAL.notaAlta.delta;
  if (f.nota !== null && f.nota <= MORAL.notaBaixa.nota) d += MORAL.notaBaixa.delta;
  if (f.titular) d += MORAL.titular;
  return d;
}

/** As 6 melhores notas gerais do elenco (para a queda por Minutos). */
export const melhoresDoElenco = (elenco: Jogador[]): Set<string> =>
  new Set([...elenco].sort((a, b) => b.nota - a.nota).slice(0, MORAL.minutos.melhores).map((j) => j.id));

/** Queda por Minutos, já com o Paizão; 0 se não se aplica. */
export function quedaPorMinutos(j: Jogador, ciclosSemTitular: number, melhores: Set<string>, temperamento: string | null): number {
  const m = MORAL.minutos;
  if (ciclosSemTitular < m.ciclos || !melhores.has(j.id) || j.idade <= m.idadeMin) return 0;
  return m.delta * (temperamento === 'Paizão' ? MORAL.paizaoMinutos : 1);
}

/** Moral do grupo: média com peso 2 para quem foi titular em metade ou mais dos jogos e para Líder de vestiário. */
export function moralDoGrupo(elenco: Jogador[], moral: (id: string) => number, titularidades: (id: string) => number, jogos: number): number {
  let soma = 0;
  let pesos = 0;
  for (const j of elenco) {
    const peso = (jogos > 0 && titularidades(j.id) * 2 >= jogos) || j.qualidades.includes(LIDER) ? MORAL.pesoNoGrupo : 1;
    soma += moral(j.id) * peso;
    pesos += peso;
  }
  return pesos ? soma / pesos : MORAL.inicial;
}

export const respaldoInicial = (t: Tecnico): number => RESPALDO_GESTAO.inicial + (t.reputacao - 10);

/** Alvo do Respaldo: moral do grupo + (Gestão de Grupo − 10) × 2 + marcas e fatos. Promessas e grupo rachado chegam com os eventos (7ª fatia). */
export function alvoRespaldo(grupo: number, t: Tecnico, lideres: number[], titulo: boolean): number {
  const r = RESPALDO_GESTAO;
  let alvo = grupo + ((t.trabalho?.['Gestão de Grupo'] ?? r.semDado) - 10) * r.gestaoGrupo;
  // PROVISORIO: com mais de um líder, vale o melhor caso; o baixo só pesa sem nenhum líder bem.
  if (lideres.some((m) => m >= r.liderAlto.moral)) alvo += r.liderAlto.alvo;
  else if (lideres.some((m) => m <= r.liderBaixo.moral)) alvo += r.liderBaixo.alvo;
  if (titulo) alvo += r.titulo;
  return alvo;
}

/** A cada ciclo, anda 20% da distância até o alvo. */
export const andarRespaldo = (atual: number, alvo: number): number => limitar(atual + (alvo - atual) * RESPALDO_GESTAO.passo);
