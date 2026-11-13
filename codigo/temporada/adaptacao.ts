// Adaptação do técnico da IA entre jogos (aprovada em 09/11/2026; IA contra IA para teste, decisão do Gustavo em 13/11/2026).
// Em confronto repetido, o técnico lê o jogo anterior contra o mesmo adversário e ajusta o padrão do time. Regras fixas.
import type { Estilo, PadraoTime, Tecnico } from '../motor/dados.ts';
import { PROVISORIO } from '../motor/parametros.ts';
import type { Rng } from '../motor/rng.ts';
import type { ResultadoPartida } from '../motor/tipos.ts';

export const ADAPTACAO = {
  /** Mudanças no máximo por jogo (PLANEJAMENTO: 1 ou 2). */
  maxMudancas: 2,
  /** PROVISORIO: cada repetição do mesmo plano do adversário soma pontos à Leitura Tática, até o teto. */
  leituraPorRepeticao: 2,
  leituraTeto: 20,
  /** Teimoso só muda se perdeu por 2 ou mais. */
  teimosoDerrota: 2,
} as const;

const DEGRAUS: Record<keyof PadraoTime, readonly string[]> = {
  linha: ['Baixa', 'Média', 'Alta'],
  pressao: ['Baixa', 'Média', 'Alta'],
  largura: ['Estreita', 'Normal', 'Aberta'],
  ritmo: ['Lento', 'Normal', 'Rápido'],
  saida: ['Curta', 'Mista', 'Direta'],
};

/** O que o técnico guarda do último jogo contra aquele adversário. */
export interface LeituraJogo {
  planoAdversario: string;
  repeticoes: number;
  /** Eixo em que o adversário levou mais vantagem: 'pressaoSaida' | 'velocidadeCostas' | 'criacaoBloco' | null. */
  eixoPerdido: keyof typeof EIXO | null;
  /** Onde ficou a maior brecha do adversário. */
  brechaAdversario: 'transicao' | 'posicional' | null;
  dif: number;
}

/** Ajuste do padrão que reverte cada eixo perdido (o mesmo das pausas, GDD 7). */
const EIXO = {
  pressaoSaida: { k: 'saida', d: 1 },
  velocidadeCostas: { k: 'linha', d: -1 },
  criacaoBloco: { k: 'linha', d: 1 },
} as const;

export const planoDe = (t: Tecnico): string => `${t.estilo}|${t.formacaoComBola}|${t.formacaoSemBola}`;

/** Lê o jogo do ponto de vista do lado `k`. */
export function lerJogo(r: ResultadoPartida, k: 0 | 1, anterior: LeituraJogo | undefined): LeituraJogo {
  const op = r.times[1 - k];
  const plano = planoDe(op.tecnico);
  const eixos = (Object.keys(EIXO) as (keyof typeof EIXO)[]).map((e) => [e, op.confronto[e]] as const).sort((a, b) => b[1] - a[1]);
  let transicao = 0;
  let posicional = 0;
  for (let z = 0; z < op.efeitos.brechaSem.length; z++) {
    posicional = Math.max(posicional, op.efeitos.brechaSem[z]);
    transicao = Math.max(transicao, op.efeitos.brechaTransicao[z]);
  }
  return {
    planoAdversario: plano,
    repeticoes: anterior && anterior.planoAdversario === plano ? anterior.repeticoes + 1 : 0,
    eixoPerdido: eixos[0][1] >= PROVISORIO.eixoPerdidoMin ? eixos[0][0] : null,
    brechaAdversario: transicao === 0 && posicional === 0 ? null : transicao >= posicional ? 'transicao' : 'posicional',
    dif: r.placar[k] - r.placar[1 - k],
  };
}

/** Um degrau, sem passar de 1 degrau do padrão do estilo (sem trocar de estilo). */
function degrau(p: PadraoTime, estilo: Estilo, k: keyof PadraoTime, d: number): PadraoTime | null {
  const lista = DEGRAUS[k];
  const novo = lista.indexOf(p[k]) + d;
  if (novo < 0 || novo >= lista.length || Math.abs(novo - lista.indexOf(estilo.padrao[k])) > PROVISORIO.degrausMax) return null;
  return { ...p, [k]: lista[novo] } as PadraoTime;
}

export interface Ajuste { padrao: PadraoTime; mudancas: string[]; leu: boolean | null }

/**
 * Ajuste para o próximo jogo contra o mesmo adversário.
 * Adaptável reverte o eixo perdido; Calculista mira a maior brecha; Conservador reduz o Risco; Agressivo sobe a linha;
 * Teimoso só muda se perdeu por 2 ou mais. Adaptável e Calculista precisam acertar a leitura (Leitura Tática × 5%).
 */
export function adaptar(tec: Tecnico, estilo: Estilo, leitura: LeituraJogo, rng: Rng): Ajuste {
  let p: PadraoTime = { ...estilo.padrao };
  const mudancas: string[] = [];
  const tentar = (k: keyof PadraoTime, d: number): void => {
    if (mudancas.length >= ADAPTACAO.maxMudancas) return;
    const novo = degrau(p, estilo, k, d);
    if (novo) { p = novo; mudancas.push(`${k} ${novo[k]}`); }
  };
  const base = tec.trabalho?.['Leitura Tática'] ?? PROVISORIO.atributoTecnicoSemDado;
  const valor = Math.min(ADAPTACAO.leituraTeto, base + leitura.repeticoes * ADAPTACAO.leituraPorRepeticao);
  let leu: boolean | null = null;
  switch (tec.reacao) {
    case 'Adaptável':
      leu = rng.pct(valor * 5);
      if (leu && leitura.eixoPerdido) tentar(EIXO[leitura.eixoPerdido].k, EIXO[leitura.eixoPerdido].d);
      break;
    case 'Calculista':
      // PROVISORIO: brecha na transição pede saída mais direta; brecha posicional pede ritmo mais lento, para rodar a bola até achá-la.
      leu = rng.pct(valor * 5);
      if (leu && leitura.brechaAdversario === 'transicao') tentar('saida', 1);
      if (leu && leitura.brechaAdversario === 'posicional') tentar('ritmo', -1);
      break;
    case 'Conservador':
      // PROVISORIO: reduzir Risco = linha e pressão um degrau abaixo.
      tentar('linha', -1);
      tentar('pressao', -1);
      break;
    case 'Agressivo':
      tentar('linha', 1);
      break;
    case 'Teimoso':
      if (leitura.dif <= -ADAPTACAO.teimosoDerrota) tentar('linha', 1);
      break;
    default:
      break; // sem perfil nos dados (Europa)
  }
  return { padrao: p, mudancas, leu };
}
