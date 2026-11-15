// Mercado (etapa 4, 5ª fatia; GDD-gestao 6 e 11). Contas puras: valor, salário, neblina, papel, posição mais fraca,
// pedido e chance das negociações, lealdade x ambição, política da IA por perfil e empresários.
// Valores em R$ mi; salários em R$ mil/mês (como em dados/).
import type { Jogador } from '../motor/dados.ts';
import { semearDeTexto } from '../motor/rng.ts';
import { grupoDaPosicao } from './evolucao.ts';

export interface Empresario {
  id: string;
  nome: string;
  perfil: string;
  ganancia: number;
  influencia: number;
  /** Memória com cada clube, de −5 a +5 (clube ausente = 0). */
  memoria: Record<string, number>;
  /** Ids dos jogadores da carteira. */
  clientes: string[];
}

/** Região do clube para valor e salário (gerador-elenco): Brasil, resto da América do Sul ou Europa. */
export type Regiao = 'brasil' | 'sul' | 'europa';
export const regiaoDaLiga = (liga: string | null): Regiao => (liga === 'europa' ? 'europa' : liga === 'argentina' || liga === 'colombia' || liga === 'chile' ? 'sul' : 'brasil');

export const MERCADO = {
  /** gerador-elenco: faixas de valor (R$ mi) e salário (R$ mil/mês) por nota, ligadas pelo meio de cada faixa (PROVISORIO). */
  valor: [[7, 0.2], [9.5, 1], [11.5, 4], [13.5, 12], [15.5, 35], [17.5, 80], [20, 300]] as [number, number][],
  salario: [[7, 8], [9.5, 30], [11.5, 80], [13.5, 200], [15.5, 500], [17.5, 1200], [20, 3000]] as [number, number][],
  regiao: { valor: { brasil: 1, sul: 0.7, europa: 2 }, salario: { brasil: 1, sul: 0.5, europa: 3 } } as Record<'valor' | 'salario', Record<Regiao, number>>,
  pequenoSalario: 0.7,
  /** gerador-elenco: × 1,5 a × 3 para jovens com potencial alto. PROVISORIO: até 23 anos e Pot 3+ acima da nota, + 0,25 por ponto além de 3. */
  jovem: { idade: 23, folga: 3, base: 1.5, passo: 0.25, max: 3 },
  veterano: { idade: 32, fator: 0.3 },
  /** GDD-gestao 6. */
  contratoCurto: { semanas: 52, fator: 0.6 },
  forma: { jogos: 8, minimo: 4, alta: 7.5, fatorAlta: 1.2, baixa: 5.5, fatorBaixa: 0.8 },
  /** Neblina (GDD-gestao 6): margem sem relatório; com relatório `(21 − Precisão) ÷ 4` (nota) e `÷ 3` (Potencial); 2+ relatórios, metade. */
  neblina: { semRelatorio: 4, nota: 4, pot: 3 },
  /** PROVISORIO: titulares de cada grupo de posição (11), para o papel e a posição mais fraca. */
  titulares: { GOL: 1, ZAG: 2, LAT: 2, VOL: 1, MC: 2, MO: 1, PON: 1, CA: 1 } as Record<string, number>,
  /** PROVISORIO: reserva = fora dos 18 melhores do elenco. */
  rotacao: 18,
  clube: {
    papel: { titular: 1.3, rotacao: 1, reserva: 0.9 },
    chanceTitular: -10, rival: -15, caixaNegativo: 15, querSair: 20,
    base: 50, fator: 150, min: 5, max: 95,
    influencia: { minimo: 16, fator: 1.1 },
    europa: { pedido: 1.5, titularIdade: 30, chance: -30 },
    rodadas: 3,
  },
  jogador: {
    base: 50, fator: 100, min: 5, max: 95, aumento: 1.1,
    reputacao: 3, papel: { titular: 10, rotacao: 0, reserva: -15 }, libertadores: { ambicao: 14, chance: 5 }, memoria: 2,
    /** Renovação com Lealdade maior que a Ambição; Parceiro com memória positiva. */
    leal: 10, parceiro: 10,
    rodadas: 3,
    /** PROVISORIO: o pedido parte do salário atual, mas nunca abaixo da referência da nota nem acima de 1,5 vez ela. */
    referencia: { min: 1, max: 1.5 },
    /** PROVISORIO: a IA sobe a oferta 5% do pedido a cada rodada. */
    passo: 0.05,
    /** PROVISORIO: reputação de quem está livre. */
    reputacaoLivre: 10,
  },
  /** GDD-gestao 6: limiar em Ambição − 5; aumento de 15% a 30% para ficar. */
  lealdade: { folga: 5, aumento: [0.15, 0.3] as [number, number], moral: -10, moralCiclo: -3 },
  empresario: { comissao: 2, porGanancia: 0.4, blefe: 30, rede: 4, blefeAumento: 0.15 },
  /** PROVISORIO: duração dos contratos novos pela idade (anos); 33 ou mais, só 1 (GDD-gestao 11). */
  duracao: [[23, 3, 5], [29, 2, 4], [32, 1, 3], [Infinity, 1, 1]] as [number, number, number][],
  elenco: { min: 18, max: 30, ideal: 23, alvo: 28, goleiros: 2 },
  /**
   * Equilíbrio do elenco (Gustavo, 15/11/2026; sem isso o INC chegou a 7 goleiros e faltou jogador de linha): por grupo, [mínimo, máximo]
   * = alvo da base − 1 e + 1 (goleiro até 3). Grupo no máximo fica fora da posição mais fraca; abaixo do mínimo, vai na frente.
   */
  grupos: { GOL: [2, 3], ZAG: [4, 6], LAT: [3, 5], VOL: [2, 4], MC: [2, 4], MO: [1, 3], PON: [2, 4], CA: [2, 4] } as Record<string, [number, number]>,
  /** GDD-gestao 11: compras por janela (IA). */
  compras: [3, 2],
  /** Janelas (GDD-gestao 1): semanas 1 a 8 e 26 a 29. */
  janelas: [[1, 8], [26, 29]] as [number, number][],
  preContrato: 26,
  /** Renovação da IA a partir de 12 meses do fim: titulares e Pot 2+ acima da nota (GDD-gestao 11). */
  renovar: { semanas: 52, pot: 2, veterano: 33 },
  /** Decisão do Gustavo (13/11/2026; PROVISORIO): empresta jovens até 21 com menos de 10% dos minutos; o destino paga 50% do salário. */
  emprestimo: { idade: 21, minutos: 0.1, salario: 0.5 },
  /** PROVISORIO: compra só quem melhora o titular mais fraco da posição em 1 ponto ou mais. */
  melhora: 1,
  /** GDD-gestao 11, Europa: tentativas por janela, chance de virar proposta, alvo e oferta. `jovem`: Pot do jovem gerado = média do elenco + 0 (2 → 0 em 15/11/2026: com o equilíbrio de posições eles jogavam e viravam craques). */
  europa: { tentativas: [2, 1], proposta: 50, idade: 26, folgaForca: 3, oferta: [1.1, 1.8] as [number, number], forcaPasso: 1, elenco: 26, saida: { idade: 31, chance: 50 }, nota: 3, jovem: 0 },
  /** Política por perfil (GDD-gestao 11). `oferta` = teto da oferta sobre o Valor; `vende` = mínimo aceito (endividado com caixa negativo: 1). */
  politica: {
    rico: { compra: true, oferta: 1.4, idadeMax: 30, acimaDaMedia: true, vende: 1.3 },
    endividado: { compra: false, oferta: 0, idadeMax: 33, acimaDaMedia: false, vende: 1.1 },
    formador: { compra: true, oferta: 1.1, idadeMax: 23, acimaDaMedia: false, vende: 1.1, vendeAte: 23 },
    emergente: { compra: true, oferta: 1.3, idadeMax: 33, acimaDaMedia: false, vende: 1.2 },
    pequeno: { compra: false, oferta: 0, idadeMax: 33, acimaDaMedia: false, vende: 0.9 },
    tradicional: { compra: true, oferta: 1.1, idadeMax: 30, acimaDaMedia: false, vende: 1.1 },
  } as Record<string, Politica>,
};

/** Política de mercado por perfil (GDD-gestao 11). `oferta` = teto da oferta sobre o Valor; `vende` = mínimo aceito. */
export interface Politica { compra: boolean; oferta: number; idadeMax: number; acimaDaMedia: boolean; vende: number; vendeAte?: number }
export function politica(perfil: string, caixaNegativo = false): Politica {
  const P = MERCADO.politica;
  switch (perfil) {
    case 'Gigante rico': return { ...P.rico };
    case 'Gigante endividado': return { ...P.endividado, vende: caixaNegativo ? 1 : P.endividado.vende };
    case 'Formador': return { ...P.formador };
    case 'Emergente': return { ...P.emergente };
    case 'Pequeno sobrevivente': return { ...P.pequeno };
    default: return { ...P.tradicional };
  }
}

const limitar = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** Interpolação em escala logarítmica entre os pontos da tabela. */
function curva(t: [number, number][], nota: number): number {
  if (nota <= t[0][0]) return t[0][1] * Math.pow(t[1][1] / t[0][1], (nota - t[0][0]) / (t[1][0] - t[0][0]));
  for (let i = 1; i < t.length; i++) {
    const [x0, y0] = t[i - 1], [x1, y1] = t[i];
    if (nota <= x1) return y0 * Math.pow(y1 / y0, (nota - x0) / (x1 - x0));
  }
  return t[t.length - 1][1];
}

/** Salário de referência da nota (R$ mil/mês) na região do clube. */
export function salarioReferencia(nota: number, regiao: Regiao, pequeno = false): number {
  return curva(MERCADO.salario, nota) * MERCADO.regiao.salario[regiao] * (pequeno ? MERCADO.pequenoSalario : 1);
}

export interface FatosValor { nota: number; pot: number; idade: number; regiao: Regiao; semanasDeContrato: number | null; notas: number[] }

/** Valor de mercado (GDD-gestao 6), recalculado a cada 4 semanas. */
export function valorDeMercado(f: FatosValor): number {
  const M = MERCADO;
  let v = curva(M.valor, f.nota) * M.regiao.valor[f.regiao];
  const folga = f.pot - f.nota;
  if (f.idade <= M.jovem.idade && folga >= M.jovem.folga) v *= Math.min(M.jovem.max, M.jovem.base + (folga - M.jovem.folga) * M.jovem.passo);
  if (f.idade > M.veterano.idade) v *= M.veterano.fator;
  if (f.semanasDeContrato !== null && f.semanasDeContrato < M.contratoCurto.semanas) v *= M.contratoCurto.fator;
  if (f.notas.length >= M.forma.minimo) {
    const media = f.notas.reduce((a, b) => a + b, 0) / f.notas.length;
    if (media >= M.forma.alta) v *= M.forma.fatorAlta;
    else if (media <= M.forma.baixa) v *= M.forma.fatorBaixa;
  }
  return Math.round(v * 100) / 100;
}

// ---------- Neblina ----------

export interface Conhecimento { atual: number; pot: number }

/** Ruído fixo de −1 a 1 por par clube-jogador: o erro diminui com os relatórios, mas não muda de lado. */
export const ruido = (clube: string, jogador: string, tipo: string): number => (semearDeTexto(`${clube}>${jogador}>${tipo}`) % 2001) / 1000 - 1;

export function margemNota(relatorios: number, precisao: number): number {
  const n = MERCADO.neblina;
  if (relatorios <= 0) return n.semRelatorio;
  return ((21 - precisao) / n.nota) / (relatorios >= 2 ? 2 : 1);
}
export function margemPot(relatorios: number, precisao: number): number | null {
  if (relatorios <= 0) return null;
  return ((21 - precisao) / MERCADO.neblina.pot) / (relatorios >= 2 ? 2 : 1);
}

/** O que o clube enxerga do jogador. Sem relatório de potencial, a IA supõe Pot = nota estimada. */
export function estimar(clube: string, j: Jogador, k: Conhecimento | undefined, precisaoAtual: number, precisaoPot: number, proprio: boolean): { nota: number; pot: number } {
  if (proprio) return { nota: j.nota, pot: j.potencial };
  const mn = margemNota(k?.atual ?? 0, precisaoAtual);
  const nota = limitar(j.nota + ruido(clube, j.id, 'n') * mn, 1, 20);
  const mp = margemPot(k?.pot ?? 0, precisaoPot);
  const pot = mp === null ? nota : limitar(j.potencial + ruido(clube, j.id, 'p') * mp, nota, 20);
  return { nota, pot };
}

// ---------- Elenco ----------

const grupo = (j: Jogador): string => grupoDaPosicao(j.posicao);

/** Papel no elenco: titular (melhores do grupo), reserva (fora dos 18 melhores) ou rotação. */
export function papelNoElenco(elenco: Jogador[], j: Jogador, nota: (x: Jogador) => number = (x) => x.nota): 'titular' | 'rotacao' | 'reserva' {
  const g = grupo(j);
  const doGrupo = elenco.filter((x) => grupo(x) === g).sort((a, b) => nota(b) - nota(a));
  if (doGrupo.indexOf(j) < (MERCADO.titulares[g] ?? 1)) return 'titular';
  const geral = [...elenco].sort((a, b) => nota(b) - nota(a));
  return geral.indexOf(j) >= MERCADO.rotacao ? 'reserva' : 'rotacao';
}

/** Papel prometido a quem chega: titular se supera o pior titular do grupo; reserva se fica abaixo dos 18 melhores. */
export function papelDeQuemChega(elenco: Jogador[], g: string, nota: number): 'titular' | 'rotacao' | 'reserva' {
  const doGrupo = elenco.filter((x) => grupo(x) === g).map((x) => x.nota).sort((a, b) => b - a);
  const k = MERCADO.titulares[g] ?? 1;
  if (doGrupo.length < k || nota > doGrupo[k - 1]) return 'titular';
  const geral = elenco.map((x) => x.nota).sort((a, b) => b - a);
  return geral.length >= MERCADO.rotacao && nota < geral[MERCADO.rotacao - 1] ? 'reserva' : 'rotacao';
}

/**
 * Posição mais fraca (GDD-gestao 6): grupo com a menor média dos titulares (falta conta 0) e a nota do pior titular.
 * Equilíbrio (`MERCADO.grupos`): o grupo mais abaixo do mínimo vem primeiro; grupo no máximo fica de fora.
 */
export function posicaoMaisFraca(elenco: Jogador[]): { grupo: string; piorTitular: number } {
  let melhor = { grupo: 'CA', piorTitular: Infinity, media: Infinity, falta: 0 };
  for (const [g, k] of Object.entries(MERCADO.titulares)) {
    const [min, max] = MERCADO.grupos[g] ?? [0, Infinity];
    const notas = elenco.filter((x) => grupo(x) === g).map((x) => x.nota).sort((a, b) => b - a);
    if (notas.length >= max) continue;
    const top = Array.from({ length: k }, (_, i) => notas[i] ?? 0);
    const media = top.reduce((a, b) => a + b, 0) / k;
    const falta = Math.max(0, min - notas.length);
    if (falta > melhor.falta || (falta === melhor.falta && media < melhor.media)) melhor = { grupo: g, piorTitular: top[k - 1], media, falta };
  }
  return { grupo: melhor.grupo, piorTitular: melhor.piorTitular };
}

export const grupoDe = grupo;

export function duracaoContrato(idade: number, sorteio: (a: number, b: number) => number): number {
  const [, a, b] = MERCADO.duracao.find(([ate]) => idade <= ate)!;
  return sorteio(a, b);
}

// ---------- Negociação com o clube ----------

export interface FatosClube {
  valor: number;
  papel: 'titular' | 'rotacao' | 'reserva';
  /** Negociação do diretor do comprador. */
  negociacao: number;
  influente: boolean;
  vendedorEuropeu: boolean;
}
export function pedidoDoClube(f: FatosClube): number {
  const c = MERCADO.clube;
  return f.valor * c.papel[f.papel] * (1 - f.negociacao / 100) * (f.influente ? c.influencia.fator : 1) * (f.vendedorEuropeu ? c.europa.pedido : 1);
}

export interface AjustesClube { titular: boolean; rival: boolean; caixaNegativo: boolean; querSair: boolean; europaTitularJovem: boolean }
export function chanceDoClube(oferta: number, pedido: number, a: AjustesClube): number {
  const c = MERCADO.clube;
  const aj = (a.titular ? c.chanceTitular : 0) + (a.rival ? c.rival : 0) + (a.caixaNegativo ? c.caixaNegativo : 0) + (a.querSair ? c.querSair : 0) + (a.europaTitularJovem ? c.europa.chance : 0);
  return limitar(c.base + c.fator * (oferta / pedido - 1) + aj, c.min, c.max);
}

// ---------- Negociação com o jogador ----------

/** Pedido salarial (GDD-gestao 6), com o salário atual preso entre 1 e 1,5 vez a referência da nota no destino (PROVISORIO). */
export function pedidoSalarial(atual: number, referencia: number, ganancia: number): number {
  const r = MERCADO.jogador.referencia;
  const base = limitar(atual, referencia * r.min, referencia * r.max);
  return base * (MERCADO.jogador.aumento + ganancia / 100);
}

export interface AjustesJogador {
  reputacaoDestino: number;
  reputacaoAtual: number;
  ambicao: number;
  papel: 'titular' | 'rotacao' | 'reserva';
  libertadores: boolean;
  memoria: number;
  renovacao?: { leal: boolean; parceiro: boolean };
}
export function chanceDoJogador(oferta: number, pedido: number, a: AjustesJogador): number {
  const J = MERCADO.jogador;
  let aj = (a.reputacaoDestino - a.reputacaoAtual) * J.reputacao * (a.ambicao / 10) + J.papel[a.papel] + a.memoria * J.memoria;
  if (a.libertadores && a.ambicao >= J.libertadores.ambicao) aj += J.libertadores.chance;
  if (a.renovacao?.leal) aj += J.leal;
  if (a.renovacao?.parceiro) aj += J.parceiro;
  return limitar(J.base + J.fator * (oferta / pedido - 1) + aj, J.min, J.max);
}

// ---------- Lealdade x ambição ----------

/** Reação a uma proposta maior (Bloco 5; GDD-gestao 6), com limiar em Ambição − 5. */
export function reacaoAProposta(lealdade: number, ambicao: number): 'fica' | 'aumento' | 'sai' {
  if (lealdade > ambicao) return 'fica';
  return lealdade >= ambicao - MERCADO.lealdade.folga ? 'aumento' : 'sai';
}

export const comissaoDoEmpresario = (valor: number, ganancia: number): number =>
  valor * (MERCADO.empresario.comissao + ganancia * MERCADO.empresario.porGanancia) / 100;

/** Semana do ano (1 a 52) e janela em que cai (0, 1 ou null). */
export const semanaDoDia = (dia: number): number => Math.min(52, Math.ceil(dia / 7));
export function janelaDaSemana(semana: number): 0 | 1 | null {
  const i = MERCADO.janelas.findIndex(([a, b]) => semana >= a && semana <= b);
  return i < 0 ? null : (i as 0 | 1);
}
