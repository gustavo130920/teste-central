// Base manual e promessa de papel do clube do jogador (etapa 5, fatia 5a1; GDD-gestao 3, 5, 6 e 8).
// Base: subir a qualquer ciclo, dispensar na hora, emprestar jovem sem subir (pedido na janela, sorteado no ciclo seguinte).
// Delegada, o coordenador sobe na virada como a IA, só quem tiver a idade mínima do jogador. Sem o gancho (ou resposta
// null), nada muda: os números são os da IA.
import type { Jogador } from '../motor/dados.ts';
import type { ResultadoPartida } from '../motor/tipos.ts';
import type { Rng } from '../motor/rng.ts';
import { efetivo } from '../gestao/comissao.ts';
import { EVENTOS } from '../gestao/eventos.ts';
import { MERCADO, chanceDoJogador, grupoDe, janelaDaSemana, papelDeQuemChega, semanaDoDia } from '../gestao/mercado.ts';
import type { Papel } from '../gestao/mercado.ts';
import type { Desfalques, Memoria } from './memoria.ts';
import { concluir, folhaDoClube, mexerMemoria, tetoDe } from './mercado.ts';
import { subir } from './pessoas.ts';
import type { ControleJogador } from './jogador.ts';

/** PROVISORIO (5a1). */
export const BASE_JOGADOR = {
  /** Promessa de papel conferida a cada 10 jogos do clube com o jogador disponível; abaixo da fração como titular, quebra. */
  promessa: { janela: 10, titular: 0.5, rotacao: 0.2 },
} as const;

export interface EstadoBaseJogador {
  clube: string;
  /** true: o jogador cuida da base (sem subidas automáticas na virada). */
  manual: boolean;
  /** Delegada: o coordenador só sobe quem tiver esta idade ou mais (null = sem limite, como a IA). */
  idadeMinima: number | null;
  /** Pedidos de empréstimo (ids), sorteados no ciclo seguinte. */
  pedidos: string[];
  avisos: string[];
  /** Promessa de papel: jogos com o jogador disponível e jogos como titular na janela atual. */
  janelas: Map<string, { jogos: number; titular: number }>;
  quebradas: number;
}

export interface InfoBase { dia: number; semana: number; janela: 0 | 1 | null }

/** Resposta do gancho: 'manual' (o jogador age pelas funções daqui), a idade mínima com a base delegada, ou null (IA). */
export type RespostaBase = 'manual' | { idadeMinima: number } | null;

export function estadoBase(mem: Memoria, clube: string): EstadoBaseJogador {
  if (!mem.baseJogador || mem.baseJogador.clube !== clube) {
    mem.baseJogador = { clube, manual: false, idadeMinima: null, pedidos: [], avisos: [], janelas: mem.baseJogador?.janelas ?? new Map(), quebradas: mem.baseJogador?.quebradas ?? 0 };
  }
  return mem.baseJogador;
}

const daBase = (mem: Memoria, clube: string, id: string): Jogador | undefined => mem.base.get(clube)?.find((j) => j.id === id);

/** Sobe ao profissional agora (Integração do coordenador, como a IA). */
export function subirJovem(mem: Memoria, clube: string, id: string): string | null {
  const j = daBase(mem, clube, id);
  if (!j) return 'Jovem não está na base.';
  if (mem.elencos[clube].length >= MERCADO.elenco.max) return `Elenco cheio (${MERCADO.elenco.max}).`;
  const base = mem.base.get(clube)!;
  base.splice(base.indexOf(j), 1);
  const st = estadoBase(mem, clube);
  st.pedidos = st.pedidos.filter((x) => x !== id);
  const g = mem.gestao.get(clube)!;
  subir(mem, clube, j, efetivo(g.comissao, 'Coord. base', 'Integ'));
  return null;
}

/** Dispensa: sai do mundo na hora, como o dispensado da base da IA (decisão de 14/11/2026). */
export function dispensarJovem(mem: Memoria, clube: string, id: string): string | null {
  const j = daBase(mem, clube, id);
  if (!j) return 'Jovem não está na base.';
  const base = mem.base.get(clube)!;
  base.splice(base.indexOf(j), 1);
  j.clubeId = null;
  mem.evolucao.delete(j.id);
  const st = estadoBase(mem, clube);
  st.pedidos = st.pedidos.filter((x) => x !== id);
  return null;
}

/** Pede o empréstimo de um jovem da base (só na janela); o diretor procura um clube no ciclo seguinte. */
export function pedirEmprestimo(mem: Memoria, clube: string, id: string, dia: number): string | null {
  if (!daBase(mem, clube, id)) return 'Jovem não está na base.';
  if (janelaDaSemana(semanaDoDia(dia)) === null) return 'Fora da janela.';
  const st = estadoBase(mem, clube);
  if (!st.pedidos.includes(id)) st.pedidos.push(id);
  return null;
}

/**
 * Destino do jovem (PROVISORIO): clube da IA fora da Europa, com vaga no elenco e folga no teto para 50% do salário,
 * onde ele não seria reserva; o de maior Reputação. Aceita com a chance do jogador, nunca abaixo de 50% (como a IA).
 */
function emprestar(mem: Memoria, clube: string, j: Jogador, semana: number, rng: Rng): string {
  const m = mem.mercado!;
  const M = MERCADO;
  const opcoes: { c: string; rep: number; papel: Papel }[] = [];
  for (const [c, js] of Object.entries(mem.elencos)) {
    if (c === clube || m.europeus.has(c) || m.manual.has(c) || js.length >= M.elenco.max) continue;
    if (j.salario * M.emprestimo.salario > tetoDe(mem, c) - folhaDoClube(mem, c)) continue;
    const papel = papelDeQuemChega(js, grupoDe(j), j.nota);
    if (papel === 'reserva') continue;
    opcoes.push({ c, rep: m.clubes.get(c)?.reputacao ?? 0, papel });
  }
  const o = opcoes.sort((a, b) => b.rep - a.rep || (a.c < b.c ? -1 : 1))[0];
  if (!o) return `Empréstimo de ${j.nome}: nenhum clube quer (ele seria reserva em todos).`;
  const ag = m.agenteDe.get(j.id);
  const ch = chanceDoJogador(1, 1, { reputacaoDestino: o.rep, reputacaoAtual: m.clubes.get(clube)?.reputacao ?? 0, ambicao: j.ambicao, papel: o.papel, libertadores: m.libertadores.has(o.c), memoria: ag?.memoria[o.c] ?? 0 });
  if (!rng.pct(Math.max(50, ch))) return `Empréstimo de ${j.nome}: recusou ir para ${o.c}.`;
  const base = mem.base.get(clube)!;
  base.splice(base.indexOf(j), 1);
  // `concluir` tira de mem.elencos[origem]; o jovem não está lá, então só entra no destino.
  m.emprestimos.push({ jogador: j.id, origem: clube, destino: o.c, base: true });
  m.contagem.emprestimos += 1;
  concluir(mem, j, clube, o.c, { valor: 0, salario: j.salario, semana, tipo: 'emprestimo' }, rng);
  return `Empréstimo de ${j.nome}: vai para ${o.c} até o fim do ano (${o.papel === 'titular' ? 'titular' : 'rotação'}).`;
}

/** Chamado no ciclo do clube do jogador (com ou sem jogo): sorteia os pedidos do ciclo anterior e abre a tela. */
export function cicloDaBase(mem: Memoria, clube: string, dia: number, J: ControleJogador, rng: Rng): void {
  if (!J.base || !mem.mercado) return;
  const st = estadoBase(mem, clube);
  const semana = semanaDoDia(dia);
  const janela = janelaDaSemana(semana);
  for (const id of st.pedidos) {
    const j = daBase(mem, clube, id);
    if (!j) continue;
    st.avisos.push(janela === null ? `Empréstimo de ${j.nome}: a janela fechou.` : emprestar(mem, clube, j, semana, rng));
  }
  st.pedidos = [];
  const r = J.base({ dia, semana, janela }, mem);
  st.manual = r === 'manual';
  st.idadeMinima = r && r !== 'manual' ? r.idadeMinima : null;
  if (r !== 'manual') st.pedidos = [];
}


// ---------- Promessa de papel (GDD-gestao 3 e 6) ----------

/**
 * Depois de cada jogo do clube: quem tem promessa de Titular ou Rotação e estava disponível soma 1 jogo (e 1 de titular,
 * se começou). A cada 10, confere: abaixo da fração, a promessa quebra (marca "promessa quebrada" no Respaldo e Memória
 * do empresário −1) e acaba; senão, a janela recomeça. Lesão e suspensão não contam.
 */
export function promessasNoJogo(mem: Memoria, clube: string, lado: 0 | 1, r: ResultadoPartida, desfalques: Desfalques, dia: number): void {
  const m = mem.mercado;
  if (!m || !m.promessas.size) return;
  const P = BASE_JOGADOR.promessa;
  const fora = new Set([...desfalques.lesionados, ...desfalques.suspensos]);
  const titulares = new Set(r.times[lado].participantes.slice(0, 11).map((p) => p.j.id));
  for (const j of mem.elencos[clube] ?? []) {
    const papel = m.promessas.get(j.id);
    if (!papel || papel === 'reserva' || fora.has(j.id)) continue;
    const st = estadoBase(mem, mem.baseJogador?.clube ?? clube);
    const w = st.janelas.get(j.id) ?? { jogos: 0, titular: 0 };
    w.jogos += 1;
    if (titulares.has(j.id)) w.titular += 1;
    st.janelas.set(j.id, w);
    if (w.jogos < P.janela) continue;
    st.janelas.delete(j.id);
    if (w.titular / w.jogos >= (papel === 'titular' ? P.titular : P.rotacao)) continue;
    m.promessas.delete(j.id);
    st.quebradas += 1;
    mem.imprensa?.clubes.get(clube)?.promessas.push(dia + EVENTOS.marcaDias);
    const ag = m.agenteDe.get(j.id);
    if (ag) mexerMemoria(ag, clube, -1);
    if (st.clube === clube) st.avisos.push(`Promessa quebrada: ${j.nome} (${papel === 'titular' ? 'titular' : 'rotação'}) começou ${w.titular} de ${w.jogos} jogos. Respaldo cai e o empresário não esquece.`);
  }
}
