// Confronto de estilos pelas notas contra o elenco em campo: eixos, viabilidade e pontos de cada elo (GDD 4 e 5).
import type { Atributo, Estilo } from './dados.ts';
import { lerAtributo, limitar } from './disputa.ts';
import { GDD, PROVISORIO } from './parametros.ts';
import type { AcaoDisputa } from './parametros.ts';
import type { ConfrontoTime, Escalado, TimeEmCampo } from './tipos.ts';
import { espelhar, faixa } from './zonas.ts';

type Grupo = [string, Atributo[]];

const noGrupo = (e: Escalado, posicao: string): boolean => e.vaga === posicao || e.vaga.slice(0, 3) === posicao;

/** Média de todos os atributos pedidos entre quem está em campo. Sem ninguém na posição, o grupo não entra. */
function mediaGrupos(t: TimeEmCampo, grupos: Grupo[]): number | null {
  const v: number[] = [];
  for (const [pos, attrs] of grupos) for (const e of t.escalados) if (noGrupo(e, pos)) for (const a of attrs) v.push(lerAtributo(e, a));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

export function pontosEixo(mediaAgressor: number | null, mediaAlvo: number | null, peso: number): number {
  if (mediaAgressor === null || mediaAlvo === null) return 0;
  return limitar((mediaAgressor - mediaAlvo) * peso, -GDD.confronto.eixoMax, GDD.confronto.eixoMax);
}

const mediaFavorece = (t: TimeEmCampo, e: Estilo): number | null => mediaGrupos(t, e.favorece.map((f) => [f.posicao, f.atributos]));

/** GDD 5: Favorece do estilo menos a média dessa mesma conta nos 12 estilos, no elenco em campo. */
export function viabilidade(t: TimeEmCampo, estilos: Estilo[]): number {
  const fav = mediaFavorece(t, t.estilo);
  if (fav === null) return 0;
  const todos = estilos.map((e) => mediaFavorece(t, e)).filter((m): m is number => m !== null);
  const referencia = todos.reduce((s, x) => s + x, 0) / todos.length;
  return limitar(fav - referencia, -GDD.confronto.viabilidadeMax, GDD.confronto.viabilidadeMax);
}

const ATK3: Atributo[] = ['Comb', 'Res', 'Vel'];

export function calcularConfronto(a: TimeEmCampo, alvo: TimeEmCampo, estilos: Estilo[]): ConfrontoTime {
  const pressao = mediaGrupos(a, [['CA', ATK3], ['PON', ATK3], ['MC', ATK3]]);
  const saida = mediaGrupos(alvo, [['GOL', ['Pes']], ['ZAG', ['Pas', 'Comp']], ['VOL', ['Pas']]]);
  const velocidade = mediaGrupos(a, [['CA', ['Vel', 'Mov']], ['PON', ['Vel', 'Mov']]]);
  const costas = mediaGrupos(alvo, [['ZAG', ['Vel', 'Pos']]]);
  const criacao = mediaGrupos(a, [['MC', ['Vis', 'Pas']], ['MO', ['Vis', 'Pas']], ['CA', ['Mov']]]);
  const bloco = mediaGrupos(alvo, [['ZAG', ['Pos', 'Conc']], ['VOL', ['Des']]]);
  // GDD 5: peso relativo, a nota do estilo menos a média dessa nota nos 12 estilos.
  const media = (n: 'Pressao' | 'Verticalidade' | 'Bloco'): number => estilos.reduce((s, e) => s + e.notas[n], 0) / estilos.length;
  return {
    pressaoSaida: pontosEixo(pressao, saida, (a.notas.Pressao - media('Pressao')) / 20),
    velocidadeCostas: pontosEixo(velocidade, costas, (a.notas.Verticalidade - media('Verticalidade')) / 20),
    criacaoBloco: pontosEixo(criacao, bloco, (media('Bloco') - alvo.notas.Bloco) / 20),
    viabilidade: viabilidade(a, estilos),
  };
}

export interface ContextoElo {
  atk: TimeEmCampo; def: TimeEmCampo; acao: AcaoDisputa; origem: number; destino: number;
  contra: boolean; elo: number; transicao: boolean; temMarcador: boolean;
}

/** GDD 5: eixos e viabilidade, somados no máximo ±10, vezes o peso do confronto. */
export function pontosConfronto(x: ContextoElo): number {
  const { atk, def, acao } = x;
  const passe = acao === 'passeCurto' || acao === 'passeProfundidade' || acao === 'lancamento' || acao === 'cruzamento';
  let p = atk.confronto.viabilidade - def.confronto.viabilidade;
  if (passe && faixa(x.origem) <= 3) p -= def.confronto.pressaoSaida;
  if (acao === 'passeProfundidade' || x.contra) p += atk.confronto.velocidadeCostas;
  if (faixa(x.destino) === 4 || faixa(x.destino) === 5) p += atk.confronto.criacaoBloco;
  return limitar(p, -GDD.confronto.somaMax, GDD.confronto.somaMax) * GDD.confronto.peso;
}

/** Abre buraco vale com o adversário atacando; o de instrução Com a bola, só enquanto o time volta (GDD 4). */
export function brechaNaZona(def: TimeEmCampo, zonaAtaque: number, elo: number, transicao: boolean): number {
  const z = espelhar(zonaAtaque);
  return def.efeitos.brechaSem[z] + (transicao && elo < GDD.retornoMax ? def.efeitos.brechaTransicao[z] : 0);
}

/** GDD 4: bônus de sinergia que entram na disputa, mais o roubo da nota de Pressão (GDD 5). */
export function pontosSinergia(x: ContextoElo): number {
  const { atk, def, acao, destino: d } = x;
  const zDef = espelhar(d);
  let p = atk.efeitos.chance[d] + brechaNaZona(def, d, x.elo, x.transicao) - def.efeitos.protecao[zDef];
  if (acao === 'passeCurto' || acao === 'conducao') p += atk.efeitos.posse[d];
  if (x.contra) p += atk.efeitos.contra[d];
  if (x.temMarcador) {
    p -= def.efeitos.recuperacao[zDef];
    if (faixa(d) <= 3) p -= Math.max(0, def.notas.Pressao - 10) * PROVISORIO.pressaoRouboPorNota;
  }
  return p;
}

export const pontosElo = (x: ContextoElo): number => pontosConfronto(x) + pontosSinergia(x);

/** GDD 4: Chance criada, brecha e Proteção agem como porcentagem sobre a chance de gol na zona. */
export const bonusGol = (atk: TimeEmCampo, def: TimeEmCampo, z: number, elo: number, transicao: boolean): number =>
  atk.efeitos.chance[z] + brechaNaZona(def, z, elo, transicao) - def.efeitos.protecao[espelhar(z)];
