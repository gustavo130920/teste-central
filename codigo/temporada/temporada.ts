// Temporada (etapa 3): 5 ligas de pontos corridos e as copas. Cada jogo roda com o motor completo e semente própria.
// Memória entre jogos (condição, lesões, suspensões, rodízio) em memoria.ts; copas em copas.ts.
import type { Jogador, Profissional, Tatica } from '../motor/dados.ts';
import { simularPartida } from '../motor/partida.ts';
import { disputarPenaltis } from '../motor/penaltis.ts';
import { criarRng, semearDeTexto } from '../motor/rng.ts';
import type { EntradaTime } from '../motor/tipos.ts';
import type { Jogo } from './calendario.ts';
import { jogosDaLiga } from './calendario.ts';
import type { Linha, ResultadoJogo } from './classificacao.ts';
import { classificar } from './classificacao.ts';
import type { Copa, JogoCopa } from './copas.ts';
import { ANO1, criarChampions, criarCopaDoBrasil, criarLibertadores, criarMundial } from './copas.ts';
import { adaptar, lerJogo } from './adaptacao.ts';
import type { Desfalques, Memoria } from './memoria.ts';
import { criarMemoria, prepararJogo, registrarJogo } from './memoria.ts';
import type { Nomes } from '../gestao/base.ts';
import { EVOLUCAO } from '../gestao/evolucao.ts';
import { novaSafra, periodoDeEvolucao, periodoDePerfil } from './pessoas.ts';
import type { Comercial } from '../gestao/financas.ts';
import { FINANCAS } from '../gestao/financas.ts';
import { fecharMesContas, jogoNasContas } from './contas.ts';
import type { ContextoMercado } from './mercado.ts';
import { cicloDoMercado } from './mercadoJogador.ts';
import { atualizarContexto, criarMercado, periodoDeMercado, registrarEscalaEuropa, semanaDeMercado } from './mercado.ts';
import type { Tecnico } from '../motor/dados.ts';
import type { FichaDiretoria } from '../gestao/diretoria.ts';
import { TORCIDA, fatorCasa } from '../gestao/diretoria.ts';
import { gerente, ocupacao } from '../gestao/financas.ts';
import { modCasa } from '../motor/clima.ts';
import { jogoEmCasa } from './contas.ts';
import type { CtxDiretoria } from './diretoria.ts';
import { cicloDoTecnico, copaNaDiretoria, inicioDoAno, jogoNaDiretoria, mesNaDiretoria, semanaNaDiretoria } from './diretoria.ts';
import type { DadosEventos } from './eventos.ts';
import { cicloNaImprensa, criarImprensa, fecharAnoImprensa, impetoDoJogo, jogoNaImprensa, tituloNaImprensa, torcidaDosDefeitos } from './eventos.ts';

export const LIGAS = ['serie-a', 'serie-b', 'argentina', 'colombia', 'chile'] as const;

/** Decisão do Gustavo (13/11/2026): "decisão" na moral = mata-mata das quartas em diante e o Mundial. */
const DECISAO = ['Quartas', 'Semifinal', 'Final'];

import type { ControleJogador } from './jogador.ts';
import { confiancaInicial, controleDaPausa } from './jogador.ts';
export interface JogoDisputado extends Jogo, ResultadoJogo {
  semente: number;
  desfalques: [Desfalques, Desfalques];
  /** Condição média dos 11 que começaram. */
  condicaoTitulares: [number, number];
  fase?: string;
  perna?: 0 | 1 | 2;
  neutro?: boolean;
  penaltis?: [number, number] | null;
  /** Quem chegou com o padrão ajustado pela adaptação. */
  adaptou: [boolean, boolean];
}

export interface Temporada {
  semente: number;
  jogos: JogoDisputado[];
  tabelas: Record<string, Linha[]>;
  copas: Copa[];
  memoria: Memoria;
}

export interface EntradaTemporada {
  semente: number;
  /** Clubes de cada liga. */
  clubesPorLiga: Record<string, string[]>;
  /** Clubes europeus (só Champions e Mundial). Sem eles, a temporada roda só as ligas. */
  europeus?: string[];
  /** Clube e técnico de cada clube; o elenco vem de `elencos` e passa pela memória. */
  entradas: Record<string, EntradaTime>;
  elencos: Record<string, Jogador[]>;
  tatica: Tatica;
  /** Chamado depois de cada jogo (para mostrar progresso). */
  aoJogar?: (j: JogoDisputado) => void;
  /** Da 2ª temporada em diante (virada.ts): vagas, folgas e a memória do ano anterior. Sem eles, vale o ano 1. */
  libertadores?: string[][];
  folgasCopaDoBrasil?: string[];
  memoria?: Memoria;
  /** Adaptação do técnico da IA entre jogos (padrão: ligada). */
  adaptacao?: boolean;
  /** Comissões por clube (etapa 4). Sem elas, comissão neutra e sem treino, como na etapa 3. */
  comissoes?: Record<string, Profissional[]>;
  /** Nomes já usados no mundo, para os jovens da base. */
  nomes?: Nomes;
  /** Finanças e comercial (etapa 4, 4ª fatia); só no ano 1, com as comissões. */
  comercial?: Comercial;
  /** Mercado (etapa 4, 5ª fatia); só com as comissões. */
  mercado?: ContextoMercado;
  /** Diretorias (etapa 4, 6ª fatia; só no ano 1, com as comissões), técnicos do mundo (com os livres) e o ano da carreira. */
  diretoria?: FichaDiretoria[];
  tecnicos?: Tecnico[];
  ano?: number;
  /** Eventos e imprensa (etapa 4, 7ª fatia; só com a diretoria): modelos, cenário e clubes que recebem. */
  eventos?: DadosEventos;
  /** Clube do jogador (etapa 4, 8ª fatia): ganchos síncronos de cada ciclo; sem ele, tudo na IA. */
  jogador?: ControleJogador;
}

export function simularTemporada(e: EntradaTemporada): Temporada {
  const ligas = Object.keys(e.clubesPorLiga);
  const rngDe = (s: string) => criarRng(semearDeTexto(`${e.semente}-${s}`));
  const dasLigas = ligas.flatMap((liga) => jogosDaLiga(liga, e.clubesPorLiga[liga], rngDe(`tabela-${liga}`)));
  const memoria = e.memoria ?? criarMemoria(e.elencos, [...ligas.flatMap((l) => e.clubesPorLiga[l]), ...(e.europeus ?? [])],
    e.comissoes ? { comissoes: e.comissoes, entradas: e.entradas, tatica: e.tatica, nomes: e.nomes, comercial: e.comercial, diretoria: e.diretoria } : undefined);
  const ligaDe = (id: string): string[] => ligas.map((l) => e.clubesPorLiga[l]).find((cs) => cs.includes(id)) ?? [];
  const comGestao = memoria.gestao.size > 0;
  if (comGestao && e.mercado) {
    if (memoria.mercado) atualizarContexto(memoria.mercado, e.mercado);
    else { memoria.mercado = criarMercado(e.mercado); registrarEscalaEuropa(memoria); }
  }
  const comMercado = !!memoria.mercado;
  const comDiretoria = memoria.diretoria.size > 0;
  if (e.eventos && comDiretoria && !memoria.imprensa) memoria.imprensa = criarImprensa(memoria, e.eventos);
  const comImprensa = !!memoria.imprensa;
  const ctxDir: CtxDiretoria = { ano: e.ano ?? 1, dia: 1, tecnicos: e.tecnicos ?? [], entradas: e.entradas, tatica: e.tatica, clubesPorLiga: e.clubesPorLiga, jogador: e.jogador };
  // Paciência pela Reputação do técnico do jogador, só ao criar a memória (8ª fatia).
  const J = e.jogador;
  if (J && !e.memoria) {
    const st = memoria.diretoria.get(J.clube);
    const ent = e.entradas[J.clube];
    if (st && ent?.tecnico.humano) st.confianca = confiancaInicial(ent.tecnico, ent.clube);
  }
  /** O clube é do jogador neste momento (o técnico dele ainda está lá). */
  const ehDoJogador = (id: string): boolean => J?.clube === id && !!e.entradas[id]?.tecnico.humano;
  // Fator casa e vaia pelo Humor (GDD-gestao 9). PROVISORIO: sem conta (sul-americanos), o fator pela torcida × Humor ÷ 50.
  const casa = (id: string, visitante: string, competicao: string, decisao: boolean, neutro: boolean): { fatorCasa?: number; vaia?: boolean } => {
    const h = memoria.humor.get(id);
    if (h === undefined || neutro) return {};
    const clube = e.entradas[id].clube;
    const c = memoria.financas.get(id);
    const fc = c && TORCIDA.casaGdd ? fatorCasa(h, ocupacao(c, jogoEmCasa(memoria, c, competicao, clube, visitante, decisao, ligaDe), gerente(memoria.gestao.get(id)?.comissao).marketing, h))
      : Math.min(2, modCasa(clube) * h / 50);
    return { fatorCasa: fc, vaia: h <= TORCIDA.vaia };
  };

  const copas: Copa[] = [];
  if (e.europeus) {
    const brasileiros = [...(e.clubesPorLiga['serie-a'] ?? []), ...(e.clubesPorLiga['serie-b'] ?? [])];
    const lib = ANO1.libertadores;
    const vagas = e.libertadores ?? [lib.brasil, lib.argentina, lib.colombia, lib.chile];
    const libertadores = criarLibertadores(vagas, rngDe('sorteio-libertadores'), () => rngDe('desempate-libertadores'));
    const champions = criarChampions(e.europeus, rngDe('sorteio-champions'));
    copas.push(criarCopaDoBrasil(brasileiros, e.folgasCopaDoBrasil ?? ANO1.folgasCopaDoBrasil), libertadores, champions, criarMundial(libertadores, champions));
  }

  const jogos: JogoDisputado[] = [];
  /** 8b2: semana sem jogo do clube do jogador também é um ciclo do mercado (pré-temporada e pausas). */
  let ultimoMercado = 0;
  /** 8b3: Série B na ordem da tabela até agora (o último oferece emprego ao técnico livre há 26 semanas). */
  const ultimosDaB = (): string[] => classificar(e.clubesPorLiga['serie-b'] ?? [], jogos.filter((j) => j.competicao === 'serie-b'), rngDe('carreira-serie-b')).map((l) => l.clube);
  const ultimoDia = Math.max(...dasLigas.map((j) => j.dia), 52 * 7);
  for (let dia = 1; dia <= ultimoDia; dia++) {
    // Etapa 4, 3ª fatia: safra na semana 1 (GDD-gestao 5).
    if (dia === 1 && comGestao) novaSafra(memoria, rngDe('safra'));
    ctxDir.dia = dia;
    // 8b3: propostas ao técnico do jogador (no dia 1, antes das metas; depois, toda semana no fim do dia).
    if (dia === 1 && comDiretoria) cicloDoTecnico(memoria, ctxDir, ultimosDaB);
    if (dia === 1 && comDiretoria) inicioDoAno(memoria, ctxDir);
    const doDia: (Jogo | JogoCopa)[] = dasLigas.filter((j) => j.dia === dia);
    for (const c of copas) doDia.push(...c.jogosDoDia(dia, rngDe(`${c.id}-${dia}`)));
    for (const j of doDia) {
      const copa = copas.find((c) => c.id === j.competicao);
      const jc = copa ? (j as JogoCopa) : null;
      const semente = semearDeTexto(`${e.semente}-${j.competicao}-${j.dia}-${j.mandante}-${j.visitante}`);
      const rngMem = criarRng(semearDeTexto(`${semente}-memoria`));
      const lados = [j.mandante, j.visitante] as const;
      const decisao = !!jc && DECISAO.includes(jc.fase);
      const classico = e.entradas[j.mandante].clube.rivais.some((x) => x.clubeId === j.visitante) || e.entradas[j.visitante].clube.rivais.some((x) => x.clubeId === j.mandante);
      for (const k of [0, 1] as const) if (ehDoJogador(lados[k])) J!.aoCiclo?.({ dia: j.dia, competicao: j.competicao, adversario: lados[1 - k], casa: k === 0 && !jc?.neutro, classico, decisao }, memoria);
      if (comImprensa) for (const k of [0, 1] as const) {
        cicloNaImprensa(memoria, ctxDir, lados[k], { dia: j.dia, competicao: j.competicao, adversario: lados[1 - k], casa: k === 0 && !jc?.neutro, classico, decisao });
      }
      // Mercado do clube do jogador (8b2): rodadas do ciclo anterior e a tela, antes do treino e da lista do jogo; sorteio próprio, fora do da IA.
      for (const k of [0, 1] as const) if (ehDoJogador(lados[k]) && comMercado) { cicloDoMercado(memoria, lados[k], j.dia, J!, rngDe(`jogador-mercado-${j.dia}-${j.competicao}`)); ultimoMercado = j.dia; }
      const impeto = comImprensa ? impetoDoJogo(memoria, lados[0], lados[1]) : [0, 0];
      const prep = lados.map((c) => prepararJogo(memoria, c, j.dia, j.competicao, rngMem, ehDoJogador(c) && J!.treino ? (ciclo, ia) => J!.treino!(ciclo, ia, memoria) : undefined));
      // Próximo jogo do clube do jogador: titulares e padrão dele; sem escolha, o auxiliar (IA e adaptação).
      const plano = lados.map((c, k) => (ehDoJogador(c) && J!.escalar ? J!.escalar({
        jogo: { dia: j.dia, competicao: j.competicao, adversario: lados[1 - k], casa: k === 0 && !jc?.neutro, classico, decisao },
        elenco: prep[k].elenco, condicao: prep[k].condicao, poupados: prep[k].poupados, desfalques: prep[k].desfalques,
      }, memoria) : null));
      const padrao = lados.map((c, k) => {
        if (plano[k]) return plano[k]!.padrao ? { ...e.entradas[c].padrao, ...plano[k]!.padrao } : undefined;
        const leitura = memoria.leituras.get(`${c}>${lados[1 - k]}`);
        if (e.adaptacao === false || !leitura) return undefined;
        const ent = e.entradas[c];
        const estilo = e.tatica.estilos.find((s) => s.nome === ent.tecnico.estilo)!;
        const aj = adaptar(ent.tecnico, estilo, leitura, rngMem);
        if (aj.leu === true) memoria.contagem.leiturasCertas += 1;
        if (aj.leu === false) memoria.contagem.leiturasErradas += 1;
        if (!aj.mudancas.length) return undefined;
        memoria.contagem.adaptacoes += 1;
        return aj.padrao;
      });
      const entrada = (k: 0 | 1): EntradaTime => ({ ...(impeto[k] ? { impeto: impeto[k] } : {}), ...(plano[k]?.titulares ? { titulares: plano[k]!.titulares } : {}), ...e.entradas[lados[k]], elenco: prep[k].elenco, condicao: prep[k].condicao, poupados: prep[k].poupados, padrao: padrao[k] ?? e.entradas[lados[k]].padrao, apoio: prep[k].apoio, moral: prep[k].moral,
        ...(k === 0 && comDiretoria ? casa(lados[0], lados[1], j.competicao, decisao, !!jc?.neutro) : {}) });
      const kj = ([0, 1] as const).find((k) => ehDoJogador(lados[k]));
      const controle = kj !== undefined && J!.pausa ? controleDaPausa(memoria, lados[kj], kj, (info) => J!.pausa!(info, { dia: j.dia, competicao: j.competicao, adversario: lados[1 - kj], casa: kj === 0 && !jc?.neutro, classico, decisao }, memoria)) : undefined;
      const r = simularPartida({ mandante: entrada(0), visitante: entrada(1), tatica: e.tatica, semente, neutro: jc?.neutro, ...(controle ? { controle } : {}) });
      const [x, y] = r.estatisticas;
      const titulares = (k: 0 | 1): number => {
        const ids = r.times[k].participantes.slice(0, 11).map((p) => p.j.id);
        return ids.reduce((s, id) => s + (prep[k].condicao[id] ?? 100), 0) / ids.length;
      };
      const res: ResultadoJogo = { mandante: j.mandante, visitante: j.visitante, placar: r.placar, amarelos: [x.amarelos, y.amarelos], vermelhos: [x.vermelhos, y.vermelhos] };
      const penaltis = copa && jc && copa.precisaPenaltis(jc, r.placar) ? disputarPenaltis(r.times, criarRng(semearDeTexto(`${semente}-penaltis`))).placar : null;
      const d: JogoDisputado = {
        adaptou: [!!padrao[0], !!padrao[1]],
        ...j, ...res, semente, desfalques: [prep[0].desfalques, prep[1].desfalques], condicaoTitulares: [titulares(0), titulares(1)],
        ...(jc ? { fase: jc.fase, perna: jc.perna, neutro: jc.neutro, penaltis } : {}),
      };
      for (const k of [0, 1] as const) {
        const chave = `${lados[k]}>${lados[1 - k]}`;
        memoria.leituras.set(chave, lerJogo(r, k, memoria.leituras.get(chave)));
      }
      for (const k of [0, 1] as const) registrarJogo(memoria, lados[k], k, r, j.dia, j.competicao, prep[k].desfalques.suspensos, rngMem, decisao);
      if (comDiretoria) for (const k of [0, 1] as const) torcidaDosDefeitos(memoria, lados[k], k, r, k === 0 && !jc?.neutro);
      if (comImprensa) for (const k of [0, 1] as const) {
        jogoNaImprensa(memoria, lados[k], k, r, { dia: j.dia, competicao: j.competicao, adversario: lados[1 - k], casa: k === 0 && !jc?.neutro, classico, decisao, pro: r.placar[k], contra: r.placar[1 - k] }, !copa);
      }
      if (comDiretoria) for (const k of [0, 1] as const) jogoNaDiretoria(memoria, ctxDir, e.entradas[lados[k]].clube, lados[1 - k], r.placar[k], r.placar[1 - k]);
      if (memoria.financas.size) jogoNasContas(memoria, j.competicao, e.entradas[j.mandante].clube, j.visitante, r.placar, !!jc?.neutro, decisao, ligaDe);
      if (copa && jc) {
        copa.registrar(jc, res, penaltis);
        if (comDiretoria) copaNaDiretoria(memoria, ctxDir, copa);
        // Título na temporada: +10 no alvo do Respaldo (GDD-gestao 3). Ligas terminam no fim do ano, sem ciclo depois.
        const campeao = copa.campeao();
        const gc = campeao ? memoria.gestao.get(campeao) : undefined;
        if (gc) gc.titulo = true;
        if (campeao && comImprensa && !memoria.dirCopas.has(`${copa.id}-titulo-imprensa`)) { memoria.dirCopas.add(`${copa.id}-titulo-imprensa`); tituloNaImprensa(memoria, campeao, copa.id); }
      }
      jogos.push(d);
      for (const k of [0, 1] as const) if (ehDoJogador(lados[k])) J!.aoJogo?.(d, r, memoria);
      e.aoJogar?.(d);
    }
    // Evolução a cada 4 semanas e perfis de jovem a cada 13 (GDD-gestao 5).
    if (comGestao && dia % EVOLUCAO.periodoDias === 0) periodoDeEvolucao(memoria, rngDe(`evolucao-${dia}`));
    if (comGestao && dia % EVOLUCAO.perfilDias === 0) periodoDePerfil(memoria);
    // Fechamento do mês (GDD-gestao 7): 13 meses de 4 semanas.
    // Mercado (GDD-gestao 6): valor, relatórios e renovações a cada 4 semanas; janelas e livres toda semana.
    if (comMercado && dia % FINANCAS.diasMes === 0) periodoDeMercado(memoria, dia, rngDe(`mercado-periodo-${dia}`));
    if (comDiretoria && dia % 7 === 0) cicloDoTecnico(memoria, ctxDir, ultimosDaB);
    if (comMercado && dia % 7 === 0 && J && ehDoJogador(J.clube) && ultimoMercado <= dia - 7) { cicloDoMercado(memoria, J.clube, dia, J, rngDe(`jogador-mercado-semana-${dia}`), true); ultimoMercado = dia; }
    if (comMercado && dia % 7 === 0) semanaDeMercado(memoria, dia, rngDe(`mercado-semana-${dia}`));
    if (comDiretoria && comMercado && dia % 7 === 0) semanaNaDiretoria(memoria);
    if (memoria.financas.size && dia % FINANCAS.diasMes === 0 && dia <= FINANCAS.diasMes * FINANCAS.meses) fecharMesContas(memoria, dia, (id) => e.entradas[id].clube);
    if (comDiretoria && dia % FINANCAS.diasMes === 0 && dia <= FINANCAS.diasMes * FINANCAS.meses) mesNaDiretoria(memoria, ctxDir);
  }

  if (comImprensa) fecharAnoImprensa(memoria, e.clubesPorLiga, ctxDir.ano);
  const tabelas: Record<string, Linha[]> = {};
  for (const liga of ligas) tabelas[liga] = classificar(e.clubesPorLiga[liga], jogos.filter((j) => j.competicao === liga), rngDe(`sorteio-${liga}`));
  return { semente: e.semente, jogos, tabelas, copas, memoria };
}
