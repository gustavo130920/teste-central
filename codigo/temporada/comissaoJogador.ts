// Comissão técnica do clube do jogador: contratar, demitir e renovar (etapa 5, fatia 5f; GDD-gestao 8 e PLANEJAMENTO bloco 5).
// Regras: contratos de 1 a 4 anos; contratar só nas janelas de transferência; demitir custa 50% dos salários restantes;
// lealdade x ambição na renovação; cargo vago vale 3 em tudo (comissao.ts). Salários em R$ mil por mês.
import type { Cargo, Profissional } from '../motor/dados.ts';
import { CARGOS } from '../motor/dados.ts';
import { janelaDaSemana, semanaDoDia } from '../gestao/mercado.ts';
import { FINANCAS } from '../gestao/financas.ts';
import type { Memoria } from './memoria.ts';
import { anoCalendario, limparCache } from './mercado.ts';
import { mesDoDia } from './comercialJogador.ts';

/** PROVISORIO (5f): números da negociação com o profissional. */
export const COMISSAO_JOGADOR = {
  rescisao: 0.5,
  anos: [1, 4] as const,
  /** O caixa precisa cobrir este número de meses do salário novo. */
  caixaMeses: 3,
  /** Oferta a partir desta fração do pedido recebe contraproposta; abaixo, recusa. */
  contraproposta: 0.85,
  /** Profissional ambicioso (12+) recusa clube com Reputação tantos pontos abaixo da dele. */
  ambicioso: { ambicao: 12, folga: 4 },
  /** Renovação: pede + (Ambição − Lealdade) × 2% (de 0 a 30%) sobre o salário atual. */
  aumento: { porPonto: 0.02, max: 0.3 },
} as const;

export interface ResultadoOferta {
  tipo: 'aceita' | 'contra' | 'recusa';
  /** Em R$ mil/mês: o pedido (aceita) ou a contraproposta. */
  valor: number;
  texto: string;
}

const conta = (mem: Memoria, clube: string) => mem.financas.get(clube);
const comissaoDe = (mem: Memoria, clube: string) => mem.gestao.get(clube)?.comissao;

export const ehCargo = (c: string): c is Cargo => (CARGOS as readonly string[]).includes(c);
export const naJanela = (dia: number): boolean => janelaDaSemana(semanaDoDia(dia)) !== null;

/** Meses de contrato que faltam (para a rescisão). Contrato em ano N vence na virada para N. */
export function mesesRestantes(mem: Memoria, p: Profissional, dia: number): number {
  const ano = anoCalendario(mem.mercado!);
  return Math.max(1, ((p.contrato ?? ano) - ano) * FINANCAS.meses - mesDoDia(dia));
}

/** Custo da demissão em R$ mi: 50% dos salários restantes. */
export const custoDemissao = (mem: Memoria, p: Profissional, dia: number): number =>
  (COMISSAO_JOGADOR.rescisao * p.salario * mesesRestantes(mem, p, dia)) / 1000;

/** Pedido do profissional livre: a pretensão que ele traz. */
export const pedidoDoLivre = (p: Profissional): number => p.salario;

/** Pedido de renovação: lealdade abaixo da ambição pede aumento para ficar (GDD-gestao 6). */
export function pedidoDeRenovacao(p: Profissional): number {
  const A = COMISSAO_JOGADOR.aumento;
  const a = Math.min(A.max, Math.max(0, (p.ambicao - p.lealdade) * A.porPonto));
  return Math.max(1, Math.round(p.salario * (1 + a)));
}

function avaliar(pedido: number, oferta: number, recusa: string | null): ResultadoOferta {
  if (recusa) return { tipo: 'recusa', valor: pedido, texto: recusa };
  if (oferta >= pedido) return { tipo: 'aceita', valor: pedido, texto: 'Aceita a proposta.' };
  if (oferta >= pedido * COMISSAO_JOGADOR.contraproposta) {
    const meio = Math.max(oferta + 1, Math.round((oferta + pedido) / 2));
    return { tipo: 'contra', valor: Math.min(pedido, meio), texto: `Pede R$ ${Math.min(pedido, meio)} mil por mês.` };
  }
  return { tipo: 'recusa', valor: pedido, texto: 'Recusou: a proposta está muito abaixo do que ele pede.' };
}

/** Resposta do candidato livre a uma oferta (salário em R$ mil/mês); `rep` é a Reputação do clube. */
export function responderOferta(p: Profissional, oferta: number, rep: number): ResultadoOferta {
  const A = COMISSAO_JOGADOR.ambicioso;
  const recusa = p.ambicao >= A.ambicao && p.reputacao - rep >= A.folga ? 'Recusou: acha o clube pequeno para a carreira dele.' : null;
  return avaliar(pedidoDoLivre(p), oferta, recusa);
}

function caixaCobre(mem: Memoria, clube: string, mi: number): string | null {
  const c = conta(mem, clube);
  if (!c) return 'Clube sem contas.';
  return c.caixa < mi ? `O caixa não cobre (R$ ${mi.toFixed(2)} mi).` : null;
}

/** Cargos acima do técnico: quem manda neles é a diretoria, não o jogador. */
export const CARGOS_DA_DIRETORIA: readonly Cargo[] = ['Diretor', 'Comercial'];
const DA_DIRETORIA = 'Esse cargo está acima do técnico: a diretoria escolhe, demite e renova.';

export interface Livres { profissionaisLivres: Profissional[] }

export function contratar(mem: Memoria, w: Livres, clube: string, nome: string, oferta: number, anos: number, dia: number, rep: number): { erro: string | null; resposta?: ResultadoOferta } {
  const com = comissaoDe(mem, clube);
  if (!com || com.fixo !== undefined) return { erro: 'Este clube não tem comissão.' };
  if (!naJanela(dia)) return { erro: 'Contratações só nas janelas de transferência.' };
  const p = w.profissionaisLivres.find((x) => x.nome === nome);
  if (!p) return { erro: 'Profissional não está mais disponível.' };
  const [a, b] = COMISSAO_JOGADOR.anos;
  if (!Number.isInteger(anos) || anos < a || anos > b) return { erro: `Contrato de ${a} a ${b} anos.` };
  if (!(oferta > 0)) return { erro: 'Informe o salário.' };
  if (CARGOS_DA_DIRETORIA.includes(p.cargo)) return { erro: DA_DIRETORIA };
  if (com.profissionais.some((x) => x.cargo === p.cargo)) return { erro: `O cargo de ${p.cargo} está ocupado: demita antes.` };
  const r = responderOferta(p, oferta, rep);
  if (r.tipo !== 'aceita') return { erro: null, resposta: r };
  const erro = caixaCobre(mem, clube, (r.valor * COMISSAO_JOGADOR.caixaMeses) / 1000);
  if (erro) return { erro };
  w.profissionaisLivres.splice(w.profissionaisLivres.indexOf(p), 1);
  com.profissionais.push({ ...p, salario: Math.round(oferta), contrato: anoCalendario(mem.mercado!) + anos, quimica: 10 });
  limparCache();
  return { erro: null, resposta: r };
}

export function demitir(mem: Memoria, w: Livres, clube: string, cargo: Cargo, dia: number): { erro: string | null; custo: number } {
  const com = comissaoDe(mem, clube);
  if (!com || com.fixo !== undefined) return { erro: 'Este clube não tem comissão.', custo: 0 };
  if (CARGOS_DA_DIRETORIA.includes(cargo)) return { erro: DA_DIRETORIA, custo: 0 };
  const p = com.profissionais.find((x) => x.cargo === cargo);
  if (!p) return { erro: 'Cargo já está vago.', custo: 0 };
  const custo = custoDemissao(mem, p, dia);
  const erro = caixaCobre(mem, clube, custo);
  if (erro) return { erro, custo };
  const c = conta(mem, clube)!;
  c.caixa -= custo;
  c.ano.comissao += custo;
  com.profissionais.splice(com.profissionais.indexOf(p), 1);
  w.profissionaisLivres.push({ ...p, quimica: null, contrato: null, homemDeConfianca: false });
  limparCache();
  return { erro: null, custo };
}

export function renovar(mem: Memoria, clube: string, cargo: Cargo, oferta: number, anos: number): { erro: string | null; resposta?: ResultadoOferta } {
  if (CARGOS_DA_DIRETORIA.includes(cargo)) return { erro: DA_DIRETORIA };
  const com = comissaoDe(mem, clube);
  const p = com?.profissionais.find((x) => x.cargo === cargo);
  if (!com || !p) return { erro: 'Cargo vago.' };
  const [a, b] = COMISSAO_JOGADOR.anos;
  if (!Number.isInteger(anos) || anos < a || anos > b) return { erro: `Contrato de ${a} a ${b} anos.` };
  if (!(oferta > 0)) return { erro: 'Informe o salário.' };
  const r = avaliar(pedidoDeRenovacao(p), oferta, null);
  if (r.tipo !== 'aceita') return { erro: null, resposta: r };
  p.salario = Math.round(oferta);
  p.contrato = Math.max(p.contrato ?? 0, anoCalendario(mem.mercado!)) + anos;
  p.lealdade = Math.min(20, p.lealdade + 1);
  return { erro: null, resposta: r };
}
