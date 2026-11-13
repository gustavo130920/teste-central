// Plano do time: notas efetivas, escolha e eficácia das instruções, etiquetas em zonas reais e pesos por zona (GDD 2, 3, 4 e 5).
import type { Estilo, Etiqueta, Instrucao, Jogador, NotaEstilo, PadraoTime, Posicao } from './dados.ts';
import { lerAtributo, limitar } from './disputa.ts';
import { GDD, PROVISORIO } from './parametros.ts';
import type { Escalado } from './tipos.ts';
import { TOTAL_ZONAS, corredor, zona } from './zonas.ts';

const POSICAO_INSTRUCAO: Record<string, string> = {
  GOL: 'Goleiro', ZAG: 'Zagueiro', 'LAT-E': 'Lateral', 'LAT-D': 'Lateral', VOL: 'Volante',
  MC: 'Meia Central', MO: 'Meia Ofensivo', 'PON-E': 'Ponta', 'PON-D': 'Ponta', CA: 'Centroavante',
};

const ORDEM = {
  linha: ['Baixa', 'Média', 'Alta'],
  pressao: ['Baixa', 'Média', 'Alta'],
  ritmo: ['Lento', 'Normal', 'Rápido'],
  saida: ['Curta', 'Mista', 'Direta'],
} as const;

const AJUSTE: Record<keyof typeof ORDEM, Partial<Record<NotaEstilo, number>>> = {
  linha: { Bloco: 3, Risco: 2 },
  pressao: { Pressao: 4, Fisico: 2 },
  ritmo: { Verticalidade: 2, Fisico: 1 },
  saida: { Verticalidade: 2, Posse: -2 },
};

/** GDD 5: cada instrução do time fora do padrão do estilo ajusta as notas, por degrau, entre 1 e 20. */
export function notasEfetivas(estilo: Estilo, padrao: PadraoTime): Record<NotaEstilo, number> {
  const notas = { ...estilo.notas };
  for (const k of Object.keys(ORDEM) as (keyof typeof ORDEM)[]) {
    const lista = ORDEM[k] as readonly string[];
    const degraus = lista.indexOf(padrao[k]) - lista.indexOf(estilo.padrao[k]);
    for (const [nota, v] of Object.entries(AJUSTE[k]) as [NotaEstilo, number][]) notas[nota] += degraus * v;
  }
  for (const n of Object.keys(notas) as NotaEstilo[]) notas[n] = limitar(notas[n], 1, 20);
  return notas;
}

function familiaridade(j: Jogador, vaga: Posicao): number {
  if (j.posicao === vaga) return 1;
  const generica = vaga.slice(0, 3);
  return j.secundarias.some((s) => s.posicao === vaga || s.posicao === generica) ? 0.85 : 0.6;
}

/** GDD 3: (DT + média das chaves) ÷ 40, +0,10 com traço compatível, × familiaridade, máximo 1,1. */
export function eficaciaBase(e: Escalado, ins: Instrucao): number {
  const chaves = ins.chaves.reduce((s, a) => s + lerAtributo(e, a), 0) / ins.chaves.length;
  const traco = ins.tracos.some((t) => e.j.tracos.includes(t)) ? 0.1 : 0;
  const indisciplina = e.j.defeitos.includes('Indisciplinado') ? GDD.indisciplinadoEficacia : 0; // Anexo A
  return Math.min(1.1, ((lerAtributo(e, 'DT') + chaves) / 40 + traco + indisciplina) * familiaridade(e.j, e.vaga));
}

export function coerencia(ins: Instrucao, estilo: string): number {
  if (ins.combina.includes(estilo)) return 1.05;
  if (ins.contraria.includes(estilo)) return 0.9;
  return 1;
}

/** GDD 4: eficácia × coerência × entrosamento. */
export const eficaciaFinal = (e: Escalado, ins: Instrucao, estilo: string): number =>
  eficaciaBase(e, ins) * coerencia(ins, estilo) * PROVISORIO.entrosamentoInicial;

export function exigenciaCumprida(ins: Instrucao, padrao: PadraoTime, zagueiros: number): boolean {
  if (ins.exige === 'Linha Alta') return padrao.linha === 'Alta';
  if (ins.exige === 'Linha de 3 zagueiros') return zagueiros >= 3;
  return true;
}

/** Instruções da vaga que o técnico aceita: nunca uma que Contraria o estilo. */
export function opcoesInstrucao(
  e: Escalado, fase: Instrucao['fase'], catalogo: Instrucao[], estilo: string, padrao: PadraoTime, zagueiros: number,
): Instrucao[] {
  return catalogo.filter((ins) => ins.posicao === POSICAO_INSTRUCAO[e.vaga] && ins.fase === fase && !ins.contraria.includes(estilo) && exigenciaCumprida(ins, padrao, zagueiros));
}

/** Melhor encaixe (decisão do Gustavo, 09/11/2026): maior eficácia final. */
export function escolherInstrucao(
  e: Escalado, fase: Instrucao['fase'], catalogo: Instrucao[], estilo: string, padrao: PadraoTime, zagueiros: number,
): Instrucao | null {
  let melhor: Instrucao | null = null;
  let nota = -1;
  for (const ins of opcoesInstrucao(e, fase, catalogo, estilo, padrao, zagueiros)) {
    const n = eficaciaFinal(e, ins, estilo);
    if (n > nota) { melhor = ins; nota = n; }
  }
  return melhor;
}

/** Corredor relativo em zonas reais, pelo lado do jogador. Quem joga no centro vale para os dois lados (PROVISORIO). */
export function zonasDaEtiqueta(et: Pick<Etiqueta, 'corredor' | 'faixas'>, base: number): number[] {
  const c = corredor(base);
  const meia = c < 2 ? [1] : c > 2 ? [3] : [1, 3];
  const lado = c < 2 ? [0] : c > 2 ? [4] : [0, 4];
  const corredores = et.corredor === 'Centro' ? [2] : et.corredor === 'Meia' ? meia : lado;
  return corredores.flatMap((x) => et.faixas.map((f) => zona(x, f)));
}

function somar(peso: number[], zonas: number[], total: number): void {
  for (const z of zonas) peso[z] = Math.max(0, peso[z] + total / zonas.length);
}

/** GDD 2: mapa de presença de cada jogador, com e sem a bola, e no contra-ataque. */
export function montarPesos(e: Escalado, goleiro: boolean): void {
  e.pesoCom = new Array<number>(TOTAL_ZONAS).fill(0);
  e.pesoSem = new Array<number>(TOTAL_ZONAS).fill(0);
  e.pesoCom[e.zonaCom] = 1;
  e.pesoSem[e.zonaSem] = 1;
  const contra: { zonas: number[]; v: number }[] = [];
  const passos: [Instrucao | null, number, boolean][] = [[e.instrCom, e.efCom, true], [e.instrSem, e.efSem, false]];
  for (const [ins, ef, comBola] of passos) {
    for (const et of ins?.etiquetas ?? []) {
      const zonas = zonasDaEtiqueta(et, e.zonaCom);
      const v = PROVISORIO.presencaEtiqueta * ef;
      if (et.tipo === 'Cobre') somar(e.pesoSem, zonas, v);
      else if (et.tipo === 'Ataca o espaço' && !comBola) contra.push({ zonas, v });
      else if (et.tipo === 'Ocupa' || et.tipo === 'Ataca o espaço') {
        // Goleiro não aparece no ataque: a "Ligação direta" é a bola chegando lá, e só conta nas sinergias.
        if (!(goleiro && comBola && et.faixas.some((f) => f > 2))) somar(comBola ? e.pesoCom : e.pesoSem, zonas, v);
      } else if (et.tipo === 'Libera' || et.tipo === 'Abre buraco') somar(comBola ? e.pesoCom : e.pesoSem, zonas, -v);
    }
  }
  if (e.j.defeitos.includes('Preguiçoso sem a bola')) e.pesoSem = e.pesoSem.map((v) => v * GDD.preguicosoPeso);
  e.pesoContra = [...e.pesoCom];
  for (const { zonas, v } of contra) somar(e.pesoContra, zonas, v);
}

/** GDD 2 e 5: elos até voltar, pela distância entre as formações e pelo Risco. */
export function calcularRetorno(distancia: number, risco: number): number {
  let r = distancia <= 1 ? 0 : distancia === 2 ? 1 : 2;
  if (risco >= PROVISORIO.riscoAlto && distancia >= 1) r += 1;
  if (risco <= PROVISORIO.riscoBaixo) r -= 1;
  return limitar(r, 0, 2);
}

/** GDD 2: chance, em %, de um jogador de linha estar fora de posição quando o time perde a bola. */
export function chanceForaDePosicao(distancia: number, risco: number): number {
  const p = PROVISORIO.foraDePosicao;
  return limitar(p.chancePorDistancia[Math.min(3, distancia)] + (risco - 10) * p.porNotaRisco, 0, 95);
}

/** GDD 5: até 7, o mapa sem a bola recua uma faixa; 15 ou mais, sobe uma, menos zagueiros e laterais. */
export function faixaPeloBloco(f: number, bloco: number, defensor = false): number {
  if (bloco <= GDD.blocoBaixo) return Math.max(1, f - 1);
  if (bloco >= GDD.blocoAlto && !defensor) return Math.min(6, f + 1);
  return f;
}
