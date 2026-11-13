// Decisões dos técnicos da IA nas pausas (GDD 7). Regras fixas, sem IA generativa. Os dois decidem antes de qualquer um aplicar.
import type { PadraoTime, Tatica } from './dados.ts';
import { cartaoEmRisco } from './bolaparada.ts';
import { limitar } from './disputa.ts';
import { PROVISORIO } from './parametros.ts';
import { eficaciaFinal, opcoesInstrucao, zonasDaEtiqueta } from './plano.ts';
import type { Rng } from './rng.ts';
import type { Escalado, TimeEmCampo } from './tipos.ts';
import { TOTAL_ZONAS, codigoZona, espelhar } from './zonas.ts';

export interface Decisao { texto: string; aplicar: () => void }

const DEGRAUS = { linha: ['Baixa', 'Média', 'Alta'], saida: ['Curta', 'Mista', 'Direta'] } as const;
const NOME = { linha: 'Linha', saida: 'Saída' };

/** Um degrau numa instrução do time, sem passar de 1 degrau do padrão do estilo (PROVISORIO). */
export function mudarDegrau(t: TimeEmCampo, k: keyof typeof DEGRAUS, delta: number): Decisao | null {
  const lista = DEGRAUS[k] as readonly string[];
  const novo = lista.indexOf(t.padrao[k]) + delta;
  if (novo < 0 || novo >= lista.length || Math.abs(novo - lista.indexOf(t.estilo.padrao[k])) > PROVISORIO.degrausMax) return null;
  const valor = lista[novo];
  return { texto: `${NOME[k]} ${valor}`, aplicar: () => { t.padrao = { ...t.padrao, [k]: valor } as PadraoTime; } };
}

/** Técnico expulso: o auxiliar assume, e o Comando dele só existe com a comissão na Gestão (valor neutro, PROVISORIO). */
const atributoTecnico = (t: TimeEmCampo, a: string): number => (t.tecnicoExpulso ? PROVISORIO.atributoTecnicoSemDado : t.tecnico.trabalho?.[a] ?? PROVISORIO.atributoTecnicoSemDado);

/** Eixo em que o adversário mais leva vantagem sobre este time (GDD 5). */
function reverterEixo(t: TimeEmCampo, op: TimeEmCampo): Decisao | null {
  const eixos: [number, () => Decisao | null][] = [
    [op.confronto.pressaoSaida, () => mudarDegrau(t, 'saida', 1)],
    [op.confronto.velocidadeCostas, () => mudarDegrau(t, 'linha', -1)],
    [op.confronto.criacaoBloco, () => mudarDegrau(t, 'linha', 1)],
  ];
  eixos.sort((a, b) => b[0] - a[0]);
  for (const [p, f] of eixos) {
    if (p < PROVISORIO.eixoPerdidoMin) return null;
    const d = f();
    if (d) return d;
  }
  return null;
}

/** Troca a instrução de quem pode atacar a maior brecha do adversário. */
function atacarBrecha(t: TimeEmCampo, op: TimeEmCampo, tatica: Tatica): Decisao | null {
  let alvo = -1;
  let maior = 0;
  for (let z = 0; z < TOTAL_ZONAS; z++) {
    const v = op.efeitos.brechaSem[z] + op.efeitos.brechaTransicao[z];
    if (v > maior) { maior = v; alvo = z; }
  }
  if (alvo < 0) return null;
  const zona = espelhar(alvo);
  const ataca = (e: Escalado, ins: Escalado['instrCom']): boolean =>
    !!ins?.etiquetas.some((et) => et.tipo === 'Ataca o espaço' && zonasDaEtiqueta(et, e.zonaCom).includes(zona));
  if (t.escalados.some((e) => e !== t.goleiro && ataca(e, e.instrCom))) return null;
  const zagueiros = t.escalados.filter((e) => e.vaga === 'ZAG').length;
  let escolhido: { e: Escalado; ins: NonNullable<Escalado['instrCom']>; ef: number } | null = null;
  for (const e of t.escalados) {
    if (e === t.goleiro) continue;
    for (const ins of opcoesInstrucao(e, 'Com', tatica.instrucoes, t.estilo.nome, t.padrao, zagueiros)) {
      if (!ataca(e, ins)) continue;
      const ef = eficaciaFinal(e, ins, t.estilo.nome);
      if (!escolhido || ef > escolhido.ef) escolhido = { e, ins, ef };
    }
  }
  if (!escolhido) return null;
  const { e, ins } = escolhido;
  return { texto: `${e.j.nome}: ${ins.nome}, mirando ${codigoZona(zona)}`, aplicar: () => { e.instrCom = ins; } };
}

export function decidirReacao(t: TimeEmCampo, op: TimeEmCampo, dif: number, minuto: number, tatica: Tatica, rng: Rng): Decisao | null {
  const leu = (): boolean => rng.pct(atributoTecnico(t, 'Leitura Tática') * 5);
  switch (t.tecnico.reacao) {
    case 'Conservador':
      if (dif >= 0) return mudarDegrau(t, 'linha', -1);
      return minuto >= 60 ? mudarDegrau(t, 'linha', 1) : null;
    case 'Agressivo': return dif <= 0 ? mudarDegrau(t, 'linha', 1) : null;
    case 'Teimoso': return dif < 0 && (dif <= -2 || minuto >= 75) ? mudarDegrau(t, 'linha', 1) : null;
    // O GDD não define o "ajuste padrão" destes dois: errando a leitura, mantêm o plano (PROVISORIO).
    case 'Adaptável': return leu() ? reverterEixo(t, op) : null;
    case 'Calculista': return leu() ? atacarBrecha(t, op, tatica) : null;
    default: return null; // técnicos sem perfil nos dados
  }
}

/** Tira quem está cansado (limite em PROVISORIO.trocaEnergia), com cartão em risco ou com lesão leve, a partir do minuto 60. Goleiro fica (PROVISORIO). */
export function escolherTrocas(t: TimeEmCampo, minuto: number): Escalado[] {
  if (minuto < PROVISORIO.trocaMinuto) return [];
  return t.escalados.filter((e) => e !== t.goleiro && (e.energia < PROVISORIO.trocaEnergia || cartaoEmRisco(e) || e.lesao === 'leve')).sort((a, b) => a.energia - b.energia);
}

/** Fala do intervalo. A IA acerta o tom com Motivação × 5% (PROVISORIO). Devolve o ímpeto e o tom. */
export function falaIntervalo(t: TimeEmCampo, dif: number, impeto: number, rng: Rng): { delta: number; tom: string } | null {
  const tom = dif < 0 ? 'Cobrar' : impeto < 0 || dif === 1 ? 'Acalmar' : dif >= 2 ? 'Elogiar' : null;
  if (!tom) return null;
  const mot = atributoTecnico(t, 'Motivação');
  return rng.pct(mot * 5) ? { delta: limitar(5 + mot * 0.75, 6, 20), tom } : { delta: PROVISORIO.falaErrada, tom: 'tom errado' };
}
