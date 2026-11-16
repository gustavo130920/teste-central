// Comercial, empréstimos e obras do clube do jogador (etapa 5, fatia 5a2; GDD-gestao 7, 8 e 9).
// Preços: manuais (1 mudança por mês, sem o bônus do gerente) ou delegados ao gerente com preço mínimo e máximo.
// Patrocínio: na virada, o gerente traz 2 ou 3 marcas por cota vencida; o jogador escolhe ou pede +10% ou +20%.
// Empréstimo, amortização e obras: a qualquer ciclo, com aval da diretoria. Sem o gancho (ou resposta null), tudo segue a IA.
import type { Rng } from '../motor/rng.ts';
import type { Conta, Cota, PropostaPatrocinio } from '../gestao/financas.ts';
import { FINANCAS, PATROCINIO_MANUAL, chanceDesistir, custoObra, fecharPatrocinio, gerente, mudarMensalidade, propostasPatrocinio } from '../gestao/financas.ts';
import { PMG } from '../gestao/diretoria.ts';
import type { Memoria } from './memoria.ts';
import { avalDaDiretoria, humor } from './diretoria.ts';
import type { ControleJogador } from './jogador.ts';

/** PROVISORIO (5a2): preço manual entre 50% e 200% da referência. */
export const COMERCIAL_JOGADOR = {
  preco: { min: 0.5, max: 2 },
} as const;

export interface EstadoComercialJogador {
  clube: string;
  /** true: o jogador cuida dos preços, das obras e da amortização (sem as da IA na virada). */
  manual: boolean;
  /** Mês (0 a 12) da última mudança de preço. */
  mesPreco: number | null;
  avisos: string[];
}

export interface InfoComercial { dia: number; mes: number; podeMudarPreco: boolean }

/** 'manual': o jogador age pelas funções daqui; { min, max } (frações da referência): preços com o gerente; null: IA. */
export type RespostaComercial = 'manual' | { min: number; max: number } | null;

/** Cota vencida na virada: as marcas que ainda estão na mesa e as que desistiram. */
export interface PedidoPatrocinio { tipo: Cota['tipo']; marcaAtual: string; valorAtual: number; propostas: PropostaPatrocinio[]; desistiram: string[]; negociacao: number }

/** Escolha: índice da proposta e quanto pedir a mais (0, 10 ou 20%); null = o gerente renova (regra da IA). */
export type RespostaPatrocinio = { escolha: number; pedido: 0 | 10 | 20 } | null;

export const mesDoDia = (dia: number): number => Math.min(FINANCAS.meses - 1, Math.floor(Math.max(0, dia - 1) / FINANCAS.diasMes));

const conta = (mem: Memoria, clube: string): Conta | undefined => mem.financas.get(clube);

/** O técnico do clube é o do jogador. */
const humano = (mem: Memoria, clube: string): boolean => !!mem.gestao.get(clube)?.tecnico.humano;

/** Comercial manual do clube do jogador, com o técnico dele no banco. */
export const comercialManual = (mem: Memoria, clube: string): boolean => mem.comercialJogador?.clube === clube && mem.comercialJogador.manual && humano(mem, clube);

/** Volta a conta para a IA: preços na referência, com o bônus do gerente. */
function voltarIA(c: Conta): void {
  c.precoManual = false;
  c.ingresso = c.ingressoRef;
  if (c.mensalidade !== c.mensalidadeRef) mudarMensalidade(c, c.mensalidadeRef);
}

export function estadoComercial(mem: Memoria, clube: string): EstadoComercialJogador {
  const st = mem.comercialJogador;
  if (!st || st.clube !== clube) {
    const velha = st && conta(mem, st.clube);
    if (velha) voltarIA(velha);
    mem.comercialJogador = { clube, manual: false, mesPreco: null, avisos: [] };
  }
  return mem.comercialJogador!;
}

/** Ingresso e mensalidade (R$): 1 vez por mês, entre 50% e 200% da referência; mudar põe os preços no manual. */
export function mudarPrecos(mem: Memoria, clube: string, dia: number, p: { ingresso?: number; mensalidade?: number }): string | null {
  const c = conta(mem, clube);
  const st = estadoComercial(mem, clube);
  if (!c) return 'Clube sem contas.';
  const mes = mesDoDia(dia);
  if (st.mesPreco === mes) return 'Os preços já mudaram neste mês.';
  const L = COMERCIAL_JOGADOR.preco;
  const fora = (v: number, ref: number): boolean => !(v >= ref * L.min - 1e-9 && v <= ref * L.max + 1e-9);
  if (p.ingresso !== undefined && fora(p.ingresso, c.ingressoRef)) return `Ingresso entre R$ ${(c.ingressoRef * L.min).toFixed(0)} e R$ ${(c.ingressoRef * L.max).toFixed(0)}.`;
  if (p.mensalidade !== undefined && fora(p.mensalidade, c.mensalidadeRef)) return `Mensalidade entre R$ ${(c.mensalidadeRef * L.min).toFixed(0)} e R$ ${(c.mensalidadeRef * L.max).toFixed(0)}.`;
  if (p.ingresso === undefined && p.mensalidade === undefined) return 'Nada a mudar.';
  if (p.ingresso !== undefined) c.ingresso = p.ingresso;
  if (p.mensalidade !== undefined && p.mensalidade !== c.mensalidade) mudarMensalidade(c, p.mensalidade);
  st.mesPreco = mes;
  st.manual = true;
  c.precoManual = true;
  return null;
}

/** Limite de empréstimo bancário que ainda cabe: 30% da receita anual menos o já tomado (GDD-gestao 7). */
export const limiteEmprestimo = (c: Conta): number => Math.max(0, FINANCAS.emprestimo * c.receitaRef - c.banco);

/** Empréstimo bancário (R$ mi), somado à dívida, com aval da diretoria (Confiança 40+). */
export function tomarEmprestimo(mem: Memoria, clube: string, valor: number): string | null {
  const c = conta(mem, clube);
  if (!c) return 'Clube sem contas.';
  if (!(valor > 0)) return 'Valor inválido.';
  const lim = limiteEmprestimo(c);
  if (valor > lim + 1e-9) return `Limite do banco: R$ ${lim.toFixed(1)} mi (30% da receita menos o já tomado).`;
  if (!avalDaDiretoria(mem, clube)) { mem.dir.aval.emprestimo += 1; return 'A diretoria negou o aval (Confiança abaixo de 40).'; }
  c.caixa += valor;
  c.divida += valor;
  c.banco += valor;
  c.ano.emprestimo += valor;
  return null;
}

/** Amortiza a dívida (R$ mi) com o caixa; os empréstimos do banco saem primeiro. */
export function amortizarDivida(mem: Memoria, clube: string, valor: number): string | null {
  const c = conta(mem, clube);
  if (!c) return 'Clube sem contas.';
  if (!(valor > 0)) return 'Valor inválido.';
  if (valor > c.divida + 1e-9) return `A dívida é de R$ ${c.divida.toFixed(1)} mi.`;
  if (valor > c.caixa + 1e-9) return `O caixa é de R$ ${c.caixa.toFixed(1)} mi.`;
  c.caixa -= valor;
  c.divida -= valor;
  c.banco = Math.max(0, c.banco - valor);
  c.ano.amortizacao += valor;
  return null;
}

/** Nível atual de CT ou base (o que a comissão guarda) e a obra em andamento. */
export function estrutura(mem: Memoria, clube: string, tipo: 'ct' | 'base'): { nivel: number; obra: number | null } {
  const g = mem.gestao.get(clube);
  const nivel = (tipo === 'ct' ? g?.comissao.ct : g?.comissao.base) ?? 10;
  const o = conta(mem, clube)?.obras.find((x) => x.tipo === tipo);
  return { nivel, obra: o ? o.dia : null };
}

/** Obra de +1 nível (GDD-gestao 8): `alvo² × R$ 0,15 mi`, 26 semanas, aval (caixa cobre e Confiança 40+); 1 por tipo de cada vez. */
export function iniciarObra(mem: Memoria, clube: string, tipo: 'ct' | 'base', dia: number): string | null {
  const c = conta(mem, clube);
  if (!c) return 'Clube sem contas.';
  const e = estrutura(mem, clube, tipo);
  if (e.obra !== null) return 'Já há uma obra deste tipo em andamento.';
  if (e.nivel >= FINANCAS.estrutura.max) return `Nível máximo (${FINANCAS.estrutura.max}).`;
  const custo = custoObra(e.nivel + 1);
  if (c.caixa < custo) return `A obra custa R$ ${custo.toFixed(1)} mi; o caixa não cobre.`;
  if (!avalDaDiretoria(mem, clube)) { mem.dir.aval.estrutura += 1; return 'A diretoria negou o aval (Confiança abaixo de 40).'; }
  c.caixa -= custo;
  c.ano.obras += custo;
  c.obras.push({ tipo, dia: dia + FINANCAS.estrutura.dias });
  return null;
}

/** Chamado no ciclo do clube do jogador (com ou sem jogo): abre a tela e aplica o modo dos preços. */
export function cicloDoComercial(mem: Memoria, clube: string, dia: number, J: ControleJogador): void {
  const c = conta(mem, clube);
  if (!J.comercial || !c) return;
  const st = estadoComercial(mem, clube);
  const mes = mesDoDia(dia);
  const r = J.comercial({ dia, mes, podeMudarPreco: st.mesPreco !== mes }, mem);
  st.manual = r === 'manual';
  c.precoManual = st.manual;
  if (r === 'manual') return;
  if (!r) { voltarIA(c); return; }
  // Delegado com limites: o gerente joga na referência, dentro do mínimo e do máximo.
  const lim = (ref: number): number => Math.min(ref * r.max, Math.max(ref * r.min, ref));
  c.ingresso = lim(c.ingressoRef);
  const m = lim(c.mensalidadeRef);
  if (m !== c.mensalidade) mudarMensalidade(c, m);
}

/** No fechamento do mês: preço 30% acima da referência tira P do Humor; 30% abaixo, soma P. Técnico que saiu devolve a conta à IA. */
export function mesDoComercial(mem: Memoria, clube: string, c: Conta): void {
  if (!c.precoManual) return;
  if (!humano(mem, clube) || mem.comercialJogador?.clube !== clube) { voltarIA(c); return; }
  const x = c.ingresso / c.ingressoRef - 1;
  const t = FINANCAS.bilheteria.humorPreco;
  if (x >= t - 1e-9) humor(mem, clube, -PMG.P);
  else if (x <= -t + 1e-9) humor(mem, clube, PMG.P);
}

/**
 * Virada: as cotas vencidas do clube do jogador vão para a tela. Marca que desiste sai da mesa; sem acordo com nenhuma, a
 * atual fica por 1 ano a × 0,8 (PROVISORIO). Resposta null deixa a cota para o gerente (regra da IA, em `renovarCotas`).
 */
export function patrocinioDoJogador(mem: Memoria, c: Conta, contas: Conta[], rivais: Set<string>, ano: number, resultado: number, J: ControleJogador | undefined, rng: Rng): number {
  if (!J?.patrocinio || J.clube !== c.clubeId || !humano(mem, c.clubeId)) return 0;
  const neg = gerente(mem.gestao.get(c.clubeId)?.comissao).negociacao;
  let fechadas = 0;
  for (const cota of c.cotas) {
    if (cota.ate > FINANCAS.anoInicial + ano) continue;
    let mesa = propostasPatrocinio(c, cota, contas, mem.marcas, rivais, resultado, neg, rng);
    const desistiram: string[] = [];
    const antes = { marca: cota.marca, valor: cota.valor };
    let fechou = false;
    let respondeu = false;
    while (mesa.length) {
      const r = J.patrocinio({ tipo: cota.tipo, marcaAtual: antes.marca, valorAtual: antes.valor, propostas: mesa, desistiram, negociacao: neg }, mem);
      if (!r || !mesa[r.escolha]) break;
      respondeu = true;
      const p = mesa[r.escolha];
      if (fecharPatrocinio(cota, p, r.pedido, neg, ano, rng)) { fechou = true; break; }
      desistiram.push(p.marca);
      mesa = mesa.filter((x) => x !== p);
    }
    if (fechou) { fechadas += 1; continue; }
    if (respondeu && !mesa.length) {
      cota.valor = antes.valor * PATROCINIO_MANUAL.semAcordo;
      cota.ate = FINANCAS.anoInicial + ano + 1;
      fechadas += 1;
      estadoComercial(mem, c.clubeId).avisos.push(`Patrocínio ${cota.tipo}: todas as marcas desistiram; ${cota.marca} fica 1 ano por R$ ${cota.valor.toFixed(1)} mi.`);
    }
  }
  return fechadas;
}

export { chanceDesistir };
