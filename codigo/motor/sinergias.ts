// Mapa de efeitos por zona: sinergias, congestionamento, brechas e combinações (GDD 4). Zonas na visão do próprio time.
import type { Combinacao, Instrucao, PadraoTime } from './dados.ts';
import { GDD, PROVISORIO } from './parametros.ts';
import { zonasDaEtiqueta } from './plano.ts';
import type { EfeitosTime, Escalado } from './tipos.ts';
import { TOTAL_ZONAS, codigoZona, corredor, distancia, faixa, zona } from './zonas.ts';

interface Marca { e: Escalado; ef: number; tipo: string; z: number; comBola: boolean; risco: string }

const zeros = (): number[] => new Array<number>(TOTAL_ZONAS).fill(0);
const media = (a: number, b: number): number => (a + b) / 2;

/** Mesma zona, mesmo corredor com faixa vizinha ou corredor vizinho na mesma faixa (GDD 4). */
export const perto = (a: number, b: number): boolean =>
  Math.abs(corredor(a) - corredor(b)) + Math.abs(faixa(a) - faixa(b)) <= 1;

function marcas(escalados: Escalado[]): Marca[] {
  const res: Marca[] = [];
  for (const e of escalados) {
    const passos: [Instrucao | null, number, boolean][] = [[e.instrCom, e.efCom, true], [e.instrSem, e.efSem, false]];
    for (const [ins, ef, comBola] of passos) {
      for (const et of ins?.etiquetas ?? []) {
        for (const z of zonasDaEtiqueta(et, e.zonaCom)) res.push({ e, ef, tipo: et.tipo, z, comBola, risco: ins!.custo.risco });
      }
    }
  }
  return res;
}

/** Maior média de eficácia entre pares de jogadores diferentes; 0 se não houver par. */
function melhorPar(a: Marca[], b: Marca[]): number {
  let melhor = 0;
  for (const x of a) for (const y of b) if (x.e !== y.e) melhor = Math.max(melhor, media(x.ef, y.ef));
  return melhor;
}

/** Quanto do buraco é anulado (Cobre na zona pela eficácia; na vizinha, metade) e quem cobre. */
function cobertura(buraco: Marca, cobres: Marca[]): { valor: number; quem: Escalado | null } {
  let valor = 0;
  let quem: Escalado | null = null;
  for (const m of cobres) {
    if (m.e === buraco.e || m.e.j.defeitos.includes('Preguiçoso sem a bola')) continue;
    const d = distancia(m.z, buraco.z);
    const v = d === 0 ? m.ef : d === 1 ? m.ef * GDD.sinergia.coberturaVizinha : 0;
    if (v > valor) { valor = v; quem = m.e; }
  }
  return { valor: Math.min(1, valor), quem };
}

const ladoDe = (e: Escalado): number => Math.sign(corredor(e.zonaCom) - 2);
const mesmoLado = (a: Escalado, b: Escalado): boolean => ladoDe(a) === 0 || ladoDe(b) === 0 || ladoDe(a) === ladoDe(b);

function condicaoCumprida(c: Combinacao, pecas: Escalado[], escalados: Escalado[], padrao: PadraoTime): boolean {
  switch (c.condicao) {
    case null: return true;
    case 'Com 2 zagueiros em campo': return escalados.filter((e) => e.vaga === 'ZAG').length === 2;
    case 'Lateral e ponta do mesmo lado':
    case 'Meia cai no lado do lateral': return mesmoLado(pecas[0], pecas[1]);
    case 'Linha Alta': return padrao.linha === 'Alta';
    default: throw new Error(`Condição desconhecida: ${c.condicao}`);
  }
}

/** Melhor conjunto de peças que cumpre a condição, pela eficácia média. */
function ativar(c: Combinacao, escalados: Escalado[], padrao: PadraoTime): { pecas: Escalado[]; ef: number } | null {
  const efDe = (e: Escalado, id: string): number => (e.instrCom?.id === id ? e.efCom : e.instrSem?.id === id ? e.efSem : -1);
  let melhor: { pecas: Escalado[]; ef: number } | null = null;
  const passo = (i: number, atual: Escalado[], soma: number): void => {
    if (i === c.pecas.length) {
      const ef = soma / c.pecas.length;
      if (ef >= GDD.sinergia.eficaciaMinCombinacao && (!melhor || ef > melhor.ef) && condicaoCumprida(c, atual, escalados, padrao)) melhor = { pecas: [...atual], ef };
      return;
    }
    for (const e of escalados) {
      const ef = efDe(e, c.pecas[i]);
      if (ef >= 0 && !atual.includes(e)) passo(i + 1, [...atual, e], soma + ef);
    }
  };
  passo(0, [], 0);
  return melhor;
}

function zonasDaCombinacao(c: Combinacao, pecas: Escalado[]): number[] {
  const [corr, f] = c.zona.split(' ');
  const [de, ate] = f.slice(1).split('-').map(Number);
  const faixas = ate ? Array.from({ length: ate - de + 1 }, (_, i) => de + i) : [de];
  const ala = pecas.find((e) => ladoDe(e) !== 0);
  return zonasDaEtiqueta({ corredor: corr, faixas }, ala?.zonaCom ?? zona(2, 3));
}

export function calcularEfeitos(escalados: Escalado[], combinacoes: Combinacao[], padrao: PadraoTime): EfeitosTime {
  const s = GDD.sinergia;
  const todas = marcas(escalados);
  const com = todas.filter((m) => m.comBola);
  const ef: EfeitosTime = {
    chance: zeros(), posse: zeros(), contra: zeros(), recuperacao: zeros(), protecao: zeros(),
    brechaSem: zeros(), brechaTransicao: zeros(), atrai: zeros(), coberturas: new Map(),
    combinacaoNaZona: new Array<string | null>(TOTAL_ZONAS).fill(null), resumo: [], combinacoes: [],
  };

  for (let z = 0; z < TOTAL_ZONAS; z++) {
    const ataca = com.filter((m) => m.tipo === 'Ataca o espaço' && m.z === z);
    const par = melhorPar(com.filter((m) => m.tipo === 'Libera' && m.z === z), ataca);
    if (par) ef.resumo.push(`Libera + Ataca em ${codigoZona(z)}: +${(s.liberaAtaca * par).toFixed(1)}%`);
    const atrai = com.filter((m) => m.tipo === 'Atrai marcador' && perto(m.z, z));
    const parAtrai = melhorPar(atrai, ataca);
    if (parAtrai) {
      ef.resumo.push(`Atrai perto de Ataca em ${codigoZona(z)}: +${(s.atraiAtaca * parAtrai).toFixed(1)}%`);
      ef.atrai[z] = PROVISORIO.atraiPesoMarcador * Math.max(...atrai.map((m) => m.ef));
    }
    const pecas = new Set(com.filter((m) => (m.tipo === 'Ocupa' || m.tipo === 'Ataca o espaço') && m.z === z).map((m) => m.e));
    const congestao = pecas.size >= 2 ? Math.min(s.congestionamentoMax, s.congestionamento * (pecas.size - 1)) : 0;
    if (congestao) ef.resumo.push(`Congestionamento em ${codigoZona(z)}: -${congestao}%`);
    ef.chance[z] = Math.min(s.limiteAutomatico, s.liberaAtaca * par + s.atraiAtaca * parAtrai - congestao);
  }

  const cobres = todas.filter((m) => m.tipo === 'Cobre');
  for (const b of todas.filter((m) => m.tipo === 'Abre buraco')) {
    const cob = cobertura(b, cobres);
    if (cob.quem) ef.coberturas.set(cob.quem, (ef.coberturas.get(cob.quem) ?? 0) + 1);
    const aberta = (s.brecha[b.risco] ?? 0) * (1 - cob.valor);
    if (aberta <= 0) continue;
    const mapa = b.comBola ? ef.brechaTransicao : ef.brechaSem;
    mapa[b.z] = Math.min(PROVISORIO.brechaMax, mapa[b.z] + aberta);
    ef.resumo.push(`Brecha em ${codigoZona(b.z)} (${b.e.j.nome}): ${aberta.toFixed(1)}%`);
  }

  const canal: Record<string, number[]> = { 'Chance criada': ef.chance, Posse: ef.posse, 'Contra-ataque': ef.contra, Recuperação: ef.recuperacao, Proteção: ef.protecao };
  for (const c of combinacoes) {
    const ativa = ativar(c, escalados, padrao);
    if (!ativa) continue;
    ef.combinacoes.push(c.nome);
    const mapa = canal[c.bonusTipo];
    if (!mapa) throw new Error(`Bônus desconhecido: ${c.bonusTipo}`);
    for (const z of zonasDaCombinacao(c, ativa.pecas)) {
      mapa[z] = Math.min(s.limiteComCombinacao, mapa[z] + c.bonusValor * ativa.ef);
      ef.combinacaoNaZona[z] ??= c.nome;
    }
  }
  return ef;
}
