// Partida como cadeias de eventos (GDD 1, 2, 3 e 10). Puro: sem arquivo, console ou relógio.
import { bonusGol, calcularConfronto, pontosElo } from './confronto.ts';
import { bonusEnsaiada, chanceBolaChega, chanceDueloAereo, chancePenalti, chancesCartao, escolherBatedor, limiarDividida, melhoresNoAlto } from './bolaparada.ts';
import { chanceDisputa, chanceGol, lerAtributo, limitar, modTraco, penaFirula, pesoDefeito, valorAcao, valorJogador } from './disputa.ts';
import { aplicarImpeto, atualizarMods, calcularMod, decairImpeto, gastoBloco, mudarMoral, temQualidade } from './clima.ts';
import { escolherAsDuas, montarTime, prepararTime, retirarExpulso, retirarLesionado, substituir, trocarFormacao } from './escalacao.ts';
import { chanceLesao, chanceLesaoFaltaDura, semanasFora, sortearGravidade } from './lesoes.ts';
import { chanceForaDePosicao } from './plano.ts';
import type { Decisao } from './pausas.ts';
import { atacarBrecha, custoTroca, decidirReacao, escolherTrocas, falaDoJogador, falaIntervalo, mudarDegrau, reverterEixo, tonsCertos } from './pausas.ts';
import { GDD, PLANO_B, PROVISORIO, RESPALDO } from './parametros.ts';
import { NOTA, fecharNotas, pontuarLance } from './notas.ts';
import type { Acao, AcaoDisputa, TipoChute } from './parametros.ts';
import { criarRng, semearDeTexto } from './rng.ts';
import type { Rng } from './rng.ts';
import type { Tatica } from './dados.ts';
import type { AjustePausa, ControlePausa, EntradaPartida, Escalado, EstatInicio, EstatTime, FinsCadeia, Lance, RegistroLesao, RelatorioPausa, RelatorioTime, ResultadoPartida, TimeEmCampo } from './tipos.ts';
import { TOTAL_ZONAS, codigoZona, corredor, distancia, espelhar, faixa, zona as zonaDe } from './zonas.ts';

type TipoInicio = 'saida' | 'recuperacao' | 'contra' | 'reinicio' | 'continuacao' | 'escanteio' | 'faltaPerigosa';
interface Inicio { posse: 0 | 1; tipo: TipoInicio; zona: number; portador: Escalado | null }
interface Fim { prox: Inicio; motivo: keyof FinsCadeia }

interface Estado {
  rng: Rng;
  t: [TimeEmCampo, TimeEmCampo];
  placar: [number, number];
  est: [EstatTime, EstatTime];
  fins: FinsCadeia;
  lances: Lance[];
  classico: boolean;
  tatica: Tatica;
  impeto: [number, number];
  bloco: number;
  cadeia: number;
  posse: 0 | 1;
  minuto: number;
  acrescimo: number;
  golsBloco: number;
  faltasBloco: number;
  lesoesBloco: number;
  lesoes: RegistroLesao[];
  porInicio: Record<string, EstatInicio>;
  avisos: [string[], string[]];
  semente: number;
  controle?: ControlePausa;
  /** Ajustes da pausa anterior: o do adversário só aparece no relatório seguinte (GDD 7). */
  ultimaPausa: [string[], string[]];
}

const novaEstat = (): EstatTime => ({
  gols: 0, finalizacoes: 0, noAlvo: 0, chancesEsperadas: 0, posseSegundos: 0, passes: 0, desarmes: 0, faltas: 0,
  cartoes: 0, amarelos: 0, vermelhos: 0, penaltis: 0, cobrancasDiretas: 0, golsBolaParada: 0,
  escanteios: 0, impedimentos: 0, contraAtaques: 0, calor: new Array<number>(TOTAL_ZONAS).fill(0),
});

const outro = (i: 0 | 1): 0 | 1 => (i === 0 ? 1 : 0);

interface DadosLance { jogador?: Escalado | null; jogador2?: Escalado | null; goleiro?: Escalado | null; origem?: number | null; destino?: number | null; resultado: string; chance?: number }

/** Zonas sempre na visão de quem tem a bola no lance. */
function registrar(st: Estado, tema: string, lance: string, time: 0 | 1, d: DadosLance): void {
  const j = d.jogador ?? null;
  const zonaLance = d.destino ?? d.origem ?? null;
  pontuarLance(st.t, { tema, lance, time, jogador: d.jogador, jogador2: d.jogador2, goleiro: d.goleiro, zona: zonaLance, chance: d.chance });
  st.lances.push({
    minuto: st.minuto, acrescimo: st.acrescimo, bloco: st.bloco, cadeia: st.cadeia, tema, lance, time,
    clube: st.t[time].clube.id,
    jogador: j?.j.id ?? null, jogador2: d.jogador2?.j.id ?? null, goleiro: d.goleiro?.j.id ?? null,
    zonaOrigem: d.origem == null ? null : codigoZona(d.origem),
    zonaDestino: d.destino == null ? null : codigoZona(d.destino),
    resultado: d.resultado, chance: d.chance ?? null,
    contexto: {
      placar: [st.placar[0], st.placar[1]], tipoJogo: st.classico ? 'classico' : 'normal', impeto: st.impeto[time],
      tracos: j?.j.tracos ?? [], qualidades: j?.j.qualidades ?? [], defeitos: j?.j.defeitos ?? [], perfilJovem: j?.j.perfilJovem ?? null,
      estilo: st.t[time].estilo.nome,
    },
    combinacaoAtiva: zonaLance !== null && time === st.posse ? st.t[time].efeitos.combinacaoNaZona[zonaLance] : null,
  });
}

/** Zona do defensor na visão de quem ataca: quem perdeu a bola ainda volta (GDD 2). */
function zonaDefensor(e: Escalado, elo: number, transicao: boolean): number {
  return espelhar(transicao && elo < e.retorno ? e.zonaCom : e.zonaSem);
}

/** Presença do defensor na zona, vista por quem ataca: quem ainda volta conta pelo mapa com a bola. */
function pesoDefensor(e: Escalado, z: number, elo: number, transicao: boolean): number {
  return (transicao && elo < e.retorno ? e.pesoCom : e.pesoSem)[espelhar(z)];
}

/** Goleiro não marca nem conta nos números: ele já duela na finalização. PROVISORIO. */
function marcacao(st: Estado, atk: TimeEmCampo, def: TimeEmCampo, z: number, elo: number, transicao: boolean): { marcador: Escalado | null; n: number } {
  const pesos = def.escalados.filter((e) => e !== def.goleiro).map((e) => ({ e, p: pesoDefensor(e, z, elo, transicao) })).filter((x) => x.p > 0);
  if (pesos.length) {
    // O marcador é quem tem mais peso na zona (GDD 3); Atrai marcador tira presença dali (GDD 4).
    const maior = Math.max(...pesos.map((x) => x.p));
    const n = Math.max(0, pesos.reduce((s, x) => s + x.p, 0) - atk.efeitos.atrai[z]);
    return { marcador: st.rng.um(pesos.filter((x) => x.p === maior)).e, n };
  }
  // Zona vazia: marca quem está na zona vizinha, sem contar nos números (GDD 3, aprovado em 09/11/2026).
  const vizinhos = def.escalados.filter((e) => e !== def.goleiro && distancia(zonaDefensor(e, elo, transicao), z) === 1);
  return { marcador: vizinhos.length ? st.rng.um(vizinhos) : null, n: 0 };
}

function maisProximo(st: Estado, grupo: Escalado[], pos: (e: Escalado) => number, z: number): Escalado {
  const menor = Math.min(...grupo.map((e) => distancia(pos(e), z)));
  return st.rng.um(grupo.filter((e) => distancia(pos(e), z) === menor));
}

const pesoAtacante = (e: Escalado, z: number, contra: boolean): number => (contra ? e.pesoContra : e.pesoCom)[z];

function sortearPorPeso(st: Estado, grupo: Escalado[], z: number, contra: boolean): Escalado {
  return grupo[st.rng.peso(grupo.map((e) => pesoAtacante(e, z, contra)))];
}

function portadorNaZona(st: Estado, atk: TimeEmCampo, z: number, contra: boolean): Escalado {
  const aqui = atk.escalados.filter((e) => pesoAtacante(e, z, contra) > 0);
  return aqui.length ? sortearPorPeso(st, aqui, z, contra) : maisProximo(st, atk.escalados.filter((e) => e !== atk.goleiro), (e) => e.zonaCom, z);
}

function zonaNaFaixa(st: Estado, atk: TimeEmCampo, faixas: number[]): number {
  const zonas: number[] = [];
  for (let z = 0; z < TOTAL_ZONAS; z++) if (faixas.includes(faixa(z)) && atk.presencaCom[z] > 0) zonas.push(z);
  if (!zonas.length) return zonaDe(2, faixas[0]);
  return zonas[st.rng.peso(zonas.map((z) => atk.presencaCom[z]))];
}

/** Quem recebe: companheiro na zona; em bola à frente, também quem está a 1 zona e corre até ela. PROVISORIO. */
function receptores(atk: TimeEmCampo, portador: Escalado, z: number, alcance: number, contra: boolean): Escalado[] {
  const grupo = atk.escalados.filter((e) => e !== portador && (e !== atk.goleiro || faixa(z) <= 2));
  const naZona = grupo.filter((e) => pesoAtacante(e, z, contra) > 0);
  if (naZona.length || alcance === 0) return naZona;
  return grupo.filter((e) => distancia(e.zonaCom, z) <= alcance);
}

function sortearReceptor(st: Estado, grupo: Escalado[], z: number, contra: boolean): Escalado {
  return grupo.some((e) => pesoAtacante(e, z, contra) > 0) ? sortearPorPeso(st, grupo, z, contra) : st.rng.um(grupo);
}

interface Destino { zona: number; peso: number }

function pesoDestino(atk: TimeEmCampo, origem: number, d: number, contra: boolean): number {
  const df = faixa(d) - faixa(origem);
  let p = 1 + PROVISORIO.pesoPresencaDestino * (contra ? atk.presencaContra : atk.presencaCom)[d];
  if (df > 0) p *= 1 + (atk.notas.Verticalidade - 10) * PROVISORIO.verticalidadePorFaixa;
  if (df < 0) p *= PROVISORIO.destinoParaTras;
  if (corredor(d) === 0 || corredor(d) === 4) {
    if (atk.padrao.largura === 'Aberta') p *= PROVISORIO.larguraAberta;
    if (atk.padrao.largura === 'Estreita') p *= PROVISORIO.larguraEstreita;
  }
  return p * Math.max(PROVISORIO.sinergiaNoDestinoMin, 1 + atk.efeitos.chance[d] * PROVISORIO.sinergiaNoDestino); // GDD 2
}

/** Geometria de cada ação. PROVISORIO: o GDD só diz o que pesa no destino, não o alcance. */
function destinos(atk: TimeEmCampo, portador: Escalado, z: number, acao: AcaoDisputa, contra: boolean): Destino[] {
  const res: Destino[] = [];
  const f = faixa(z);
  const c = corredor(z);
  const lateral = c !== 2;
  for (let d = 0; d < TOTAL_ZONAS; d++) {
    if (d === z) continue;
    const df = faixa(d) - f;
    const dc = Math.abs(corredor(d) - c);
    const dist = distancia(d, z);
    let ok = false;
    let alcance = 0;
    switch (acao) {
      case 'passeCurto': ok = dist === 1; break;
      case 'passeProfundidade': ok = df === (f >= 5 ? 1 : 2) && dc <= 1; alcance = 1; break;
      case 'lancamento': ok = df >= 3 && dc <= 2; alcance = 1; break;
      case 'conducao':
      case 'drible': ok = dist === 1 && df >= 0; alcance = -1; break;
      case 'cruzamento': ok = lateral && f >= 4 && corredor(d) >= 1 && corredor(d) <= 3 && faixa(d) >= 5 && df >= 0; alcance = 1; break;
    }
    if (!ok) continue;
    if (alcance >= 0 && !receptores(atk, portador, d, alcance, contra).length) continue;
    res.push({ zona: d, peso: pesoDestino(atk, z, d, contra) });
  }
  return res;
}

const ACOES: Acao[] = ['passeCurto', 'passeProfundidade', 'lancamento', 'conducao', 'drible', 'cruzamento', 'finalizacao'];

function escolherAcao(st: Estado, atk: TimeEmCampo, portador: Escalado, z: number, contra: boolean): { acao: Acao; destino: number } | null {
  const f = faixa(z);
  const lado = corredor(z) === 0 || corredor(z) === 4;
  const goleiro = portador === atk.goleiro;
  const opcoes: { acao: Acao; peso: number; dest: Destino[] }[] = [];
  for (const acao of ACOES) {
    let peso = PROVISORIO.pesoAcao[f][acao];
    if (peso <= 0) continue;
    if (goleiro && acao !== 'passeCurto' && acao !== 'lancamento') continue;
    peso *= pesoDefeito(portador, acao, f, difPlacar(st, atk.indice));
    if (acao === 'finalizacao') {
      if (f < 4) continue;
      if (lado) peso *= PROVISORIO.finalizacaoNoLado;
      if (f === 4 && portador.j.tracos.includes('Chuta de fora')) peso *= PROVISORIO.pesoTracoNaAcao;
      opcoes.push({ acao, peso, dest: [] });
      continue;
    }
    if (acao === 'cruzamento' && lado) peso *= PROVISORIO.cruzamentoNoLado;
    if (acao === 'passeCurto') peso *= Math.max(0, 1 + (atk.notas.Posse - 10) * PROVISORIO.posseNoPasseCurto);
    if (acao === 'passeProfundidade') peso *= Math.max(0, 1 + (atk.notas.Verticalidade - 10) * PROVISORIO.verticalidadeNaProfundidade);
    if (modTraco(portador, acao, GDD.acoes[acao].atk[0]) !== 0) peso *= PROVISORIO.pesoTracoNaAcao;
    const dest = destinos(atk, portador, z, acao, contra);
    if (dest.length) opcoes.push({ acao, peso, dest });
  }
  if (!opcoes.length) return null;
  const o = opcoes[st.rng.peso(opcoes.map((x) => x.peso))];
  if (o.acao === 'finalizacao') return { acao: o.acao, destino: z };
  return { acao: o.acao, destino: o.dest[st.rng.peso(o.dest.map((d) => d.peso))].zona };
}

function inicioRecuperacao(st: Estado, novaPosse: 0 | 1, z: number, portador: Escalado | null): Inicio {
  const perdeu = st.t[outro(novaPosse)];
  const fora = perdeu.escalados.filter((e) => e !== perdeu.goleiro && st.rng.pct(chanceForaDePosicao(distancia(e.zonaCom, e.zonaSem), perdeu.notas.Risco))).length;
  const contra = faixa(z) >= 2 && faixa(z) <= 4 && fora >= GDD.foraDePosicaoMin;
  if (contra) st.est[novaPosse].contraAtaques += 1;
  return { posse: novaPosse, tipo: contra ? 'contra' : 'recuperacao', zona: z, portador };
}

function saida(st: Estado, posse: 0 | 1, faixas: number[]): Inicio {
  return { posse, tipo: 'saida', zona: zonaNaFaixa(st, st.t[posse], faixas), portador: null };
}

/** A cobrança é a cadeia seguinte (GDD 2 e 8). */
function escanteio(st: Estado, atk: TimeEmCampo, z: number): Inicio {
  st.est[atk.indice].escanteios += 1;
  return { posse: atk.indice, tipo: 'escanteio', zona: z, portador: null };
}

interface Elo {
  atk: TimeEmCampo; def: TimeEmCampo; portador: Escalado; receptor: Escalado | null;
  marcador: Escalado | null; zona: number; origem: number; elo: number; transicao: boolean; contra: boolean;
  /** Posse resumida: a bola ia para a F4, mas a falta acontece onde a cadeia estava. */
  zonaFalta?: number;
}

function expulsar(st: Estado, t: TimeEmCampo, e: Escalado, tipo: NonNullable<Escalado['expulso']>): void {
  e.expulso = tipo;
  e.nota += NOTA.vermelho;
  st.est[t.indice].vermelhos += 1;
  if (tipo === 'direto') st.est[t.indice].cartoes += 1;
  retirarExpulso(t, e, st.tatica, st.rng, st.classico);
}

function aplicarAmarelo(st: Estado, t: TimeEmCampo, e: Escalado, narrar: boolean): void {
  e.amarelos += 1;
  e.nota += NOTA.amarelo;
  st.est[t.indice].cartoes += 1;
  st.est[t.indice].amarelos += 1;
  if (!temQualidade(e, 'Gelo')) mudarMoral(t, [e], PROVISORIO.moralCartao);
  const segundo = e.amarelos >= 2;
  if (narrar) registrar(st, 'falta', segundo ? 'Segundo amarelo' : 'Amarelo', t.indice, { jogador: e, resultado: segundo ? 'segundo amarelo' : 'amarelo' });
  if (segundo) expulsar(st, t, e, 'segundoAmarelo');
}

function aplicarVermelho(st: Estado, t: TimeEmCampo, e: Escalado): void {
  registrar(st, 'falta', 'Vermelho direto', t.indice, { jogador: e, resultado: 'vermelho direto' });
  expulsar(st, t, e, 'direto');
}

const NOME_GRAVIDADE = { leve: 'leve', media: 'média', grave: 'grave' };

/** Leve: continua, com -1 no valor e -10 de energia. Média e grave: saem na hora (GDD 1 e 8). */
function lesionar(st: Estado, t: TimeEmCampo, e: Escalado, origem: RegistroLesao['origem']): void {
  const i = t.indice;
  const gravidade = sortearGravidade(st.rng);
  const reg: RegistroLesao = {
    time: i, jogador: e.j.id, gravidade, semanas: semanasFora(gravidade, st.rng), minuto: st.minuto, acrescimo: st.acrescimo,
    bloco: st.bloco, origem, saiu: gravidade !== 'leve', substituto: null,
  };
  st.lesoes.push(reg);
  st.lesoesBloco += 1;
  if (gravidade === 'leve') {
    registrar(st, 'lesao', 'Pancada', i, { jogador: e, resultado: 'lesão leve' });
    if (e.lesao === null) {
      e.lesao = 'leve';
      e.modBloco += GDD.lesao.levePena; // o modificador só é recalculado no próximo bloco
    }
    e.energia = Math.max(0, e.energia + GDD.lesao.leveEnergia);
    st.avisos[i].push(`lesão leve: ${e.j.nome}, segue em campo`);
    return;
  }
  e.lesao = gravidade;
  // Sem "Pancada": as frases dela incluem "continua em campo", que só vale para a leve.
  registrar(st, 'lesao', 'Atendimento', i, { jogador: e, resultado: `lesão ${NOME_GRAVIDADE[gravidade]}` });
  registrar(st, 'lesao', 'Saída de campo', i, { jogador: e, resultado: 'saiu lesionado' });
  const entra = retirarLesionado(t, e, st.tatica, st.rng, st.classico);
  if (entra) {
    reg.substituto = entra.j.id;
    entra.modBloco = calcularMod(entra, t, difPlacar(st, i), st.bloco, st.impeto[i]);
    registrar(st, 'lesao', 'Substituição', i, { jogador: e, jogador2: entra, resultado: 'substituição forçada' });
  }
  st.avisos[i].push(`lesão ${NOME_GRAVIDADE[gravidade]}: ${e.j.nome} sai${entra ? `, entra ${entra.j.nome}` : ', sem trocas'}`);
}

interface LesaoAgendada { cadeia: number; time: 0 | 1; e: Escalado }

/** Um sorteio por jogador no início do bloco; quem se lesiona, se lesiona numa cadeia sorteada do bloco (PROVISORIO). */
function sortearLesoesDoBloco(st: Estado, cadeias: number): LesaoAgendada[] {
  const res: LesaoAgendada[] = [];
  for (const time of [0, 1] as const) {
    for (const e of st.t[time].escalados) {
      if (st.rng.pct(chanceLesao(lerAtributo(e, 'Les'), e.energia, st.t[time].apoio.prevencao))) res.push({ cadeia: st.rng.int(0, cadeias - 1), time, e });
    }
  }
  return res;
}

/** Sem outro defensor de linha entre a bola e o gol, num contra-ataque (critério PROVISORIO). */
function ehUltimoDefensor(x: Elo): boolean {
  if (!x.contra || !x.marcador) return false;
  return !x.def.escalados.some((e) => e !== x.def.goleiro && e !== x.marcador && faixa(zonaDefensor(e, x.elo, x.transicao)) >= faixa(x.zona));
}

function reclamar(st: Estado, t: TimeEmCampo, e: Escalado): void {
  if (st.rng.pct(PROVISORIO.reclamacao)) registrar(st, 'falta', 'Reclamação', t.indice, { jogador: e, resultado: 'reclamação' });
}

/** Cartão da falta. Falta dura é a que rende cartão (PROVISORIO: o GDD usa o termo sem definir). */
function cartaoDaFalta(st: Estado, x: Elo): void {
  const { atk, def, portador, marcador } = x;
  if (!marcador) return;
  const c = chancesCartao(marcador, ehUltimoDefensor(x));
  const r = st.rng.n() * 100;
  if (r >= c.vermelho + c.amarelo) return;
  if (r < c.vermelho) aplicarVermelho(st, def, marcador);
  else aplicarAmarelo(st, def, marcador, true);
  reclamar(st, def, marcador);
  aplicarImpeto(st.impeto, atk, GDD.impeto.faltaDura);
  if (portador.j.defeitos.includes('Esquentado') && st.rng.pct(GDD.cartoes.revide)) {
    if (st.rng.pct(GDD.cartoes.revideAmarelo)) aplicarAmarelo(st, atk, portador, true);
    else aplicarVermelho(st, atk, portador);
  }
  // Falta dura sofrida (GDD 8). Depois do revide: quem foi expulso nele já não está em campo.
  if (atk.escalados.includes(portador) && st.rng.pct(chanceLesaoFaltaDura(lerAtributo(portador, 'Les'), portador.energia, atk.apoio.prevencao))) lesionar(st, atk, portador, 'faltaDura');
}

/** Decisivo: do minuto 75 em diante, com empate ou diferença de 1 gol (Anexo A). */
const bonusDecisivo = (st: Estado, e: Escalado): number =>
  temQualidade(e, 'Decisivo') && st.minuto >= GDD.decisivo.minuto && Math.abs(st.placar[0] - st.placar[1]) <= GDD.decisivo.difMax ? GDD.decisivo.bonus : 0;

function cobrarPenalti(st: Estado, x: Elo): Fim {
  const { atk, def, portador, marcador } = x;
  const iAtk = atk.indice;
  const iDef = def.indice;
  const p = GDD.bolaParada.penalti;
  registrar(st, 'penalti', 'Marcado', iAtk, { jogador: portador, jogador2: marcador, origem: x.zona, resultado: 'pênalti' });
  const batedor = escolherBatedor(atk, 'penalti');
  const gol = def.goleiro;
  const vBat = valorJogador(batedor, ['BP', 'Comp'], (batedor.j.tracos.includes('Cobrador de pênalti') ? p.traco : 0) + bonusDecisivo(st, batedor));
  const vGol = valorJogador(gol, ['Ref', 'Agi'], (gol.j.tracos.includes('Pegador de pênalti') ? p.traco : 0) + def.apoio.estudoBatedores);
  const chance = chancePenalti(vBat, vGol);
  const e = st.est[iAtk];
  e.penaltis += 1;
  e.finalizacoes += 1;
  e.chancesEsperadas += chance / 100;
  const base: DadosLance = { jogador: batedor, goleiro: gol, origem: x.zona, destino: x.zona, resultado: '', chance };
  if (st.rng.pct(chance)) {
    e.gols += 1;
    e.noAlvo += 1;
    e.golsBolaParada += 1;
    st.golsBloco += 1;
    st.placar[iAtk] += 1;
    efeitosDoGol(st, atk, def, batedor, null);
    registrar(st, 'penalti', 'Convertido', iAtk, { ...base, resultado: 'gol' });
    return { prox: saida(st, iDef, [3]), motivo: 'falta' };
  }
  aplicarImpeto(st.impeto, atk, GDD.impeto.penaltiPerdido);
  aplicarImpeto(st.impeto, def, GDD.impeto.penaltiPerdidoOutro);
  mudarMoral(atk, [batedor], PROVISORIO.moralFalha);
  if (st.rng.pct(PROVISORIO.penaltiDefendido)) {
    e.noAlvo += 1;
    registrar(st, 'penalti', 'Defendido', iAtk, { ...base, resultado: 'defendido' });
  } else {
    registrar(st, 'penalti', 'Perdido', iAtk, { ...base, resultado: 'para fora' });
  }
  return { prox: saida(st, iDef, [1, 2]), motivo: 'falta' };
}

/** Lado ou F1 a F3: reinício. Centro ou Meia em F4 e F5: falta perigosa. F6: pênalti. Lado F6 é fora da área (PROVISORIO). */
function reinicioDaFalta(st: Estado, x: Elo): Fim {
  const c = corredor(x.zona);
  const f = faixa(x.zona);
  if (c === 0 || c === 4 || f <= 3) return { prox: { posse: x.atk.indice, tipo: 'reinicio', zona: x.zona, portador: x.portador }, motivo: 'falta' };
  if (f === 6) return cobrarPenalti(st, x);
  return { prox: { posse: x.atk.indice, tipo: 'faltaPerigosa', zona: x.zona, portador: null }, motivo: 'falta' };
}

/** Bola não chegou ou duelo perdido (GDD 8). A bola sai na entrada da área. */
function bolaAfastada(st: Estado, atk: TimeEmCampo, def: TimeEmCampo, zagueiro: Escalado): Fim {
  if (st.rng.pct(PROVISORIO.afastadaRecupera)) return { prox: inicioRecuperacao(st, def.indice, espelhar(zonaDe(2, 5)), zagueiro), motivo: 'perda' };
  return { prox: { posse: atk.indice, tipo: 'reinicio', zona: zonaDe(st.rng.pct(50) ? 0 : 4, 5), portador: null }, motivo: 'fora' };
}

/** Bola na área em duas etapas, para escanteio e falta cruzada (GDD 8). */
function bolaNaArea(st: Estado, atk: TimeEmCampo, def: TimeEmCampo, lance: 'Escanteio' | 'Falta perigosa', origem: number): Fim {
  const iAtk = atk.indice;
  const batedor = escolherBatedor(atk, lance === 'Escanteio' ? 'escanteio' : 'falta');
  const bonus = bonusEnsaiada(atk);
  const atacante = st.rng.um(melhoresNoAlto(atk, batedor));
  const zagueiro = st.rng.um(melhoresNoAlto(def, null));
  const g = GDD.bolaParada;
  registrar(st, 'bola_parada', lance, iAtk, { jogador: batedor, jogador2: atacante, goleiro: def.goleiro, origem, resultado: 'bola na área' });
  const vBat = valorJogador(batedor, ['BP'], bonus + modTraco(batedor, lance === 'Escanteio' ? 'escanteio' : 'falta', 'BP'));
  if (!st.rng.pct(chanceBolaChega(vBat, valorJogador(def.goleiro, ['Com'])))) return bolaAfastada(st, atk, def, zagueiro);
  const vAtk = valorJogador(atacante, ['Cab', 'Imp'], bonus + (atacante.j.tracos.includes('Cabeceador') ? g.tracoAereo : 0));
  const vDef = valorJogador(zagueiro, ['Cab', 'Imp'], zagueiro.j.tracos.includes('Xerife do jogo aéreo') ? g.tracoAereo : 0);
  if (!st.rng.pct(chanceDueloAereo(vAtk, vDef))) return bolaAfastada(st, atk, def, zagueiro);
  const z = zonaDe(2, 6);
  const x: Elo = { atk, def, portador: atacante, receptor: null, marcador: zagueiro, zona: z, origem, elo: 0, transicao: false, contra: false };
  return finalizar(st, x, 'cabeceio', { acao: 'bolaParada', passador: batedor }, false, { semAjusteMarcador: true, extra: bonus });
}

function cobrarFaltaPerigosa(st: Estado, atk: TimeEmCampo, def: TimeEmCampo, z: number): Fim {
  if (!st.rng.pct(PROVISORIO.cobrancaDireta)) return bolaNaArea(st, atk, def, 'Falta perigosa', z);
  const batedor = escolherBatedor(atk, 'falta');
  st.est[atk.indice].cobrancasDiretas += 1;
  registrar(st, 'bola_parada', 'Falta perigosa', atk.indice, { jogador: batedor, goleiro: def.goleiro, origem: z, resultado: 'cobrança direta' });
  const x: Elo = { atk, def, portador: batedor, receptor: null, marcador: null, zona: z, origem: z, elo: 0, transicao: false, contra: false };
  const g = GDD.bolaParada;
  return finalizar(st, x, 'falta', null, false, { semAjusteMarcador: true, extra: bonusEnsaiada(atk), baseFixa: faixa(z) === 4 ? g.diretaF4 : g.diretaF5 });
}

function tipoDoChute(z: number, semMarcador: boolean, ultimo: { acao: string } | null): TipoChute {
  if (faixa(z) === 4) return 'longe';
  if (semMarcador && corredor(z) >= 1 && corredor(z) <= 3 && ultimo && ['passeProfundidade', 'lancamento', 'drible'].includes(ultimo.acao)) return 'caraACara';
  return 'area';
}

/** Amarelado sozinho na zona, em F5 ou F6 (GDD 8). Devolve o fim da cadeia, 'evitada' se o lance segue sem marcador, ou null. */
function dividida(st: Estado, x: Elo, tipo: TipoChute): Fim | 'evitada' | null {
  const { atk, def, marcador: m, zona: z } = x;
  if (!m || m.amarelos !== 1 || faixa(z) < 5) return null;
  if (def.escalados.some((e) => e !== def.goleiro && e !== m && pesoDefensor(e, z, x.elo, x.transicao) > 0)) return null;
  const alvo = x.receptor ?? x.portador;
  const iDef = def.indice;
  const chute = GDD.chutes[tipo];
  const perigo = chanceGol({ corredor: corredor(z), faixa: faixa(z), tipo, vAtk: valorJogador(alvo, chute.atk), vGol: valorJogador(def.goleiro, chute.gol), comMarcador: false });
  const erro = st.rng.n() * (20 - lerAtributo(m, 'Dec')) * (st.rng.pct(50) ? 1 : -1);
  const dif = Math.abs(st.placar[0] - st.placar[1]);
  if (perigo + erro < limiarDividida(m, faixa(z), st.minuto, dif)) {
    registrar(st, 'falta', 'Dividida evitada', iDef, { jogador: m, jogador2: alvo, goleiro: def.goleiro, origem: x.origem, destino: z, resultado: 'dividida evitada' });
    return 'evitada';
  }
  const d = GDD.acoes.drible;
  if (!st.rng.pct(chanceDisputa(d.base, valorAcao(alvo, 'drible'), valorJogador(m, d.def), 1, 1))) {
    st.est[iDef].desarmes += 1;
    registrar(st, 'falta', 'Dividida ganha', iDef, { jogador: m, jogador2: alvo, origem: x.origem, destino: z, resultado: 'dividida ganha' });
    return { prox: inicioRecuperacao(st, iDef, espelhar(z), m), motivo: 'perda' };
  }
  st.est[iDef].faltas += 1;
  st.faltasBloco += 1;
  if (st.rng.pct(GDD.dividida.vermelho)) {
    registrar(st, 'falta', 'Dividida perdida', iDef, { jogador: m, jogador2: alvo, origem: x.origem, destino: z, resultado: 'dividida perdida' });
    aplicarAmarelo(st, def, m, false);
  } else {
    registrar(st, 'falta', 'Falta', iDef, { jogador: m, jogador2: alvo, origem: x.origem, destino: z, resultado: 'falta na dividida' });
  }
  return reinicioDaFalta(st, { ...x, portador: alvo });
}

/** Lateral longo: só muda o texto (GDD 10). Zona na visão de quem cobra. */
function narrarLateralLongo(st: Estado, t: TimeEmCampo, z: number): void {
  const f = faixa(z);
  if (f !== 4 && f !== 5) return;
  const min = PROVISORIO.lateralLongoMin;
  const j = t.escalados.find((e) => e !== t.goleiro && (e.j.atributos.For ?? 0) >= min && (e.j.atributos.Pas ?? 0) >= min);
  if (j) registrar(st, 'bola_parada', 'Lateral longo', t.indice, { jogador: j, origem: z, resultado: 'lateral longo' });
}

function falha(st: Estado, acao: AcaoDisputa, x: Elo): Fim {
  const { atk, def, portador, marcador, zona: z } = x;
  const iAtk = atk.indice;
  const iDef = def.indice;
  const reinicioAdversario = (zonaR: number): Inicio => ({ posse: iDef, tipo: 'reinicio', zona: espelhar(zonaR), portador: null });

  if ((acao === 'passeProfundidade' || acao === 'lancamento') && st.rng.pct(GDD.impedimentoEmFalha)) {
    st.est[iAtk].impedimentos += 1;
    registrar(st, 'bola_parada', 'Impedimento', iAtk, { jogador: x.receptor ?? portador, origem: x.origem, destino: z, resultado: 'impedimento' });
    return { prox: reinicioAdversario(z), motivo: 'fora' };
  }

  let { perda, falta, fora } = GDD.falha as { perda: number; falta: number; fora: number };
  if (faixa(z) === 6) {
    // GDD 8: 8% em vez dos 22%, sem o que puxa para falta nas outras faixas.
    perda += falta - GDD.bolaParada.faltaEmF6;
    falta = GDD.bolaParada.faltaEmF6;
  } else {
    if (acao === 'drible') { falta += PROVISORIO.driblePuxaFalta; perda -= PROVISORIO.driblePuxaFalta; }
    if (marcador && (marcador.j.atributos.Comb ?? 0) >= PROVISORIO.combatividadeAlta) { falta += PROVISORIO.combatividadePuxaFalta; perda -= PROVISORIO.combatividadePuxaFalta; }
  }
  if (portador.j.tracos.includes('Cava faltas')) { falta += GDD.bolaParada.cavaFaltas; perda -= GDD.bolaParada.cavaFaltas; }
  if (acao === 'lancamento' || acao === 'cruzamento') { fora += PROVISORIO.altoPuxaFora; perda -= PROVISORIO.altoPuxaFora; }
  if (!marcador) falta = 0; // sem marcador não há quem faça a falta

  const r = st.rng.peso([perda, falta, fora]);
  if (r === 1) {
    const lugar = x.zonaFalta === undefined ? x : { ...x, zona: x.zonaFalta };
    st.est[iDef].faltas += 1;
    st.faltasBloco += 1;
    registrar(st, 'falta', 'Falta', iDef, { jogador: marcador, jogador2: portador, origem: x.origem, destino: lugar.zona, resultado: 'falta' });
    cartaoDaFalta(st, lugar);
    return reinicioDaFalta(st, lugar);
  }
  if (r === 2) {
    if (faixa(z) === 6) {
      if (st.rng.pct(PROVISORIO.escanteioEmForaF6)) return { prox: escanteio(st, atk, z), motivo: 'fora' };
      return { prox: saida(st, iDef, [1, 2]), motivo: 'fora' };
    }
    const ladoSaida = zonaDe(corredor(z) <= 2 ? 0 : 4, faixa(z));
    narrarLateralLongo(st, def, espelhar(ladoSaida));
    return { prox: reinicioAdversario(ladoSaida), motivo: 'fora' };
  }

  const roubo = marcador ?? maisProximo(st, def.escalados.filter((e) => e !== def.goleiro), (e) => zonaDefensor(e, x.elo, x.transicao), z);
  if ((acao === 'conducao' || acao === 'drible') && marcador) {
    st.est[iDef].desarmes += 1;
    registrar(st, 'jogada', 'Desarme', iDef, { jogador: marcador, jogador2: portador, origem: x.origem, destino: z, resultado: 'desarme' });
  } else if (marcador && def.padrao.pressao === 'Alta' && faixa(z) <= 3) {
    registrar(st, 'jogada', 'Pressão', iDef, { jogador: marcador, jogador2: portador, origem: x.origem, destino: z, resultado: 'roubo sob pressão' });
  } else {
    registrar(st, 'jogada', 'Perda de bola', iAtk, { jogador: portador, jogador2: roubo, origem: x.origem, destino: z, resultado: 'perda' });
  }
  return { prox: inicioRecuperacao(st, iDef, espelhar(z), roubo), motivo: 'perda' };
}

/** Ímpeto e moral do gol (GDD 6 e Anexo A). */
function efeitosDoGol(st: Estado, atk: TimeEmCampo, def: TimeEmCampo, autor: Escalado, passador: Escalado | null): void {
  aplicarImpeto(st.impeto, atk, GDD.impeto.gol);
  aplicarImpeto(st.impeto, def, GDD.impeto.golSofrido);
  const idolo = (e: Escalado | null): boolean => !!e && (temQualidade(e, 'Ídolo') || temQualidade(e, 'Cria da casa'));
  if (atk.emCasa && (idolo(autor) || idolo(passador))) aplicarImpeto(st.impeto, atk, GDD.impeto.idolo);
  mudarMoral(atk, atk.escalados, PROVISORIO.moralGolTime);
  mudarMoral(atk, [autor], PROVISORIO.moralGolAutor);
  mudarMoral(def, def.escalados, PROVISORIO.moralGolSofrido);
}

interface OpcoesChute { semAjusteMarcador?: boolean; extra?: number; baseFixa?: number }

function finalizar(st: Estado, x: Elo, tipo: TipoChute, ultimo: { acao: AcaoDisputa | 'bolaParada'; passador: Escalado | null } | null, contra: boolean, op: OpcoesChute = {}): Fim {
  const { atk, def, portador, marcador, zona: z } = x;
  const iAtk = atk.indice;
  const iDef = def.indice;
  const chute = GDD.chutes[tipo];
  let extra = modTraco(portador, tipo, chute.atk[0]) + bonusDecisivo(st, portador) + (op.extra ?? 0);
  if (tipo !== 'cabeceio' && tipo !== 'falta' && st.rng.pct(GDD.chancePeFraco)) extra -= 5 - portador.j.peFraco;
  const chance = chanceGol({
    corredor: corredor(z), faixa: faixa(z), tipo,
    vAtk: valorJogador(portador, chute.atk, extra),
    vGol: valorJogador(def.goleiro, chute.gol),
    comMarcador: op.semAjusteMarcador ? null : marcador !== null,
    bonusPct: bonusGol(atk, def, z, x.elo, x.transicao),
    baseFixa: op.baseFixa,
  });
  const e = st.est[iAtk];
  e.finalizacoes += 1;
  e.chancesEsperadas += chance / 100;
  if (ultimo?.passador && faixa(z) >= 4) {
    registrar(st, 'jogada', 'Passe decisivo', iAtk, { jogador: ultimo.passador, jogador2: portador, destino: z, resultado: 'passe para finalização' });
  }
  const base: DadosLance = { jogador: portador, jogador2: marcador, goleiro: def.goleiro, origem: z, destino: z, resultado: '', chance };

  if (st.rng.pct(chance)) {
    e.gols += 1;
    e.noAlvo += 1;
    st.golsBloco += 1;
    st.placar[iAtk] += 1;
    if (op.semAjusteMarcador) e.golsBolaParada += 1;
    efeitosDoGol(st, atk, def, portador, ultimo?.passador ?? null);
    let lance = 'Gol comum';
    if (tipo === 'cabeceio') lance = 'Gol de cabeça';
    else if (tipo === 'longe' || tipo === 'falta') lance = 'Gol de fora da área';
    else if (contra) lance = 'Gol de contra-ataque';
    const golContra = (ultimo?.acao === 'cruzamento' || ultimo?.acao === 'bolaParada') && marcador !== null && st.rng.pct(GDD.golContraEmCruzamento);
    if (golContra) registrar(st, 'gol', 'Gol contra', iAtk, { ...base, jogador: marcador, jogador2: portador, resultado: 'gol contra' });
    else registrar(st, 'gol', lance, iAtk, { ...base, jogador2: ultimo?.passador ?? null, resultado: 'gol' });
    if (chance <= GDD.falhaGoleiroChanceMax && (def.goleiro.j.atributos.Mao ?? 10) < PROVISORIO.maoBaixa) {
      registrar(st, 'goleiro', 'Falha', iDef, { ...base, resultado: 'falha do goleiro' });
      mudarMoral(def, [def.goleiro], PROVISORIO.moralFalha);
    }
    return { prox: saida(st, iDef, [3]), motivo: 'finalizacao' };
  }

  if (marcador && st.rng.pct(GDD.bloqueadoComMarcador)) {
    registrar(st, 'finalizacao', 'Chute bloqueado', iAtk, { ...base, resultado: 'bloqueado' });
    if (st.rng.pct(PROVISORIO.bloqueioViraEscanteio)) return { prox: escanteio(st, atk, z), motivo: 'finalizacao' };
    return { prox: inicioRecuperacao(st, iDef, espelhar(z), marcador), motivo: 'finalizacao' };
  }

  if (st.rng.pct(GDD.paraFora)) {
    const pFora = (marcador ? 1 - GDD.bloqueadoComMarcador / 100 : 1) * GDD.paraFora;
    let lance = tipo === 'caraACara' ? 'Cara a cara perdido' : 'Chute para fora';
    const media = ((portador.j.atributos.Fin ?? 10) + (portador.j.atributos.Comp ?? 10)) / 2;
    if (st.rng.pct((GDD.traveDasSemGol / pFora) * 100)) lance = 'Chute na trave';
    else if (media <= PROVISORIO.furadaMediaMax && st.rng.pct(PROVISORIO.furadaChance)) lance = 'Furada';
    registrar(st, 'finalizacao', lance, iAtk, { ...base, resultado: 'para fora' });
    return { prox: saida(st, iDef, [1, 2]), motivo: 'finalizacao' };
  }

  e.noAlvo += 1;
  const dificil = chance >= PROVISORIO.defesaDificilChance;
  const pSegura = limitar(PROVISORIO.seguraBase + PROVISORIO.seguraPorPonto * ((def.goleiro.j.atributos.Mao ?? 10) - 10), PROVISORIO.seguraMin, PROVISORIO.seguraMax);
  if (st.rng.pct(pSegura)) {
    const lance = tipo === 'cabeceio' || tipo === 'caraACara' ? 'Saída do gol' : dificil ? 'Defesa difícil' : 'Defesa simples';
    if (lance === 'Defesa difícil') aplicarImpeto(st.impeto, def, GDD.impeto.defesaDificil);
    registrar(st, 'goleiro', lance, iDef, { ...base, resultado: 'defesa, bola presa' });
    return { prox: saida(st, iDef, [1, 2]), motivo: 'finalizacao' };
  }
  if (st.rng.pct(PROVISORIO.reboteDoRestante)) {
    registrar(st, 'goleiro', 'Rebote', iDef, { ...base, resultado: 'rebote' });
    return { prox: saida(st, iDef, [1, 2]), motivo: 'finalizacao' };
  }
  aplicarImpeto(st.impeto, def, GDD.impeto.defesaDificil);
  registrar(st, 'goleiro', 'Defesa difícil', iDef, { ...base, resultado: 'defesa para escanteio' });
  return { prox: escanteio(st, atk, z), motivo: 'finalizacao' };
}

function simularCadeia(st: Estado, ini: Inicio): Inicio {
  const atk = st.t[ini.posse];
  const def = st.t[outro(ini.posse)];
  const transicao = ini.tipo === 'recuperacao' || ini.tipo === 'contra';
  const contra = ini.tipo === 'contra';
  const e = st.est[atk.indice];
  st.posse = atk.indice;
  const presenca = contra ? atk.presencaContra : atk.presencaCom;
  let z = ini.zona;
  // Quem ia receber a bola pode ter sido expulso no fim da cadeia anterior.
  let portador = ini.portador && atk.escalados.includes(ini.portador) ? ini.portador : portadorNaZona(st, atk, z, contra);
  let elo = 0;
  let segundos = 0;
  let ultimo: { acao: AcaoDisputa; passador: Escalado | null } | null = null;
  let forcarCabeceio = false;

  const encerrar = (f: Fim): Inicio => {
    st.fins[f.motivo] += 1;
    e.posseSegundos += segundos * Math.max(0, 1 + (atk.notas.Posse - 10) * PROVISORIO.posseNaDuracao);
    return f.prox;
  };
  const continuar = (): Inicio => encerrar({ prox: { posse: atk.indice, tipo: 'continuacao', zona: z, portador }, motivo: 'limite' });

  if (ini.tipo === 'escanteio' || ini.tipo === 'faltaPerigosa') {
    segundos += PROVISORIO.duracaoBolaParada;
    return encerrar(ini.tipo === 'escanteio' ? bolaNaArea(st, atk, def, 'Escanteio', z) : cobrarFaltaPerigosa(st, atk, def, z));
  }

  if (contra) registrar(st, 'jogada', 'Contra-ataque', atk.indice, { jogador: portador, origem: z, resultado: 'contra-ataque' });

  // Posse resumida (GDD 2): um teste de progressão até a F4, com a conta do passe curto.
  if (faixa(z) <= 3 && def.padrao.pressao !== 'Alta') {
    const zonasF4: Destino[] = [];
    for (let c = 0; c < 5; c++) {
      const d = zonaDe(c, 4);
      if (receptores(atk, portador, d, 1, contra).length) zonasF4.push({ zona: d, peso: pesoDestino(atk, z, d, contra) });
    }
    if (!zonasF4.length) return continuar();
    const d = zonasF4[st.rng.peso(zonasF4.map((x) => x.peso))].zona;
    const rec = sortearReceptor(st, receptores(atk, portador, d, 1, contra), d, contra);
    const m = marcacao(st, atk, def, d, 0, transicao);
    const vDef = m.marcador ? valorJogador(m.marcador, GDD.acoes.passeCurto.def) : GDD.defensorAusente;
    const pontos = pontosElo({ atk, def, acao: 'passeCurto', origem: z, destino: d, contra, elo: 0, transicao, temMarcador: m.marcador !== null });
    const chance = chanceDisputa(PROVISORIO.baseProgressaoResumida, valorAcao(portador, 'passeCurto'), vDef, Math.max(1, presenca[d]), m.n, pontos);
    e.passes += st.rng.int(GDD.passesResumida[0], GDD.passesResumida[1]);
    segundos += st.rng.int(GDD.duracaoResumida[0], GDD.duracaoResumida[1]);
    e.calor[z] += 1;
    elo = 1;
    if (!st.rng.pct(chance)) {
      return encerrar(falha(st, 'passeCurto', { atk, def, portador, receptor: rec, marcador: m.marcador, zona: d, origem: z, elo: 0, transicao, contra, zonaFalta: z }));
    }
    z = d;
    portador = rec;
  }

  while (elo < GDD.maxElos || forcarCabeceio) {
    const escolha: { acao: Acao; destino: number } | null = forcarCabeceio ? { acao: 'finalizacao', destino: z } : escolherAcao(st, atk, portador, z, contra);
    if (!escolha) return continuar();
    const { acao, destino: d } = escolha;
    let m = marcacao(st, atk, def, d, elo, transicao);
    segundos += GDD.duracaoPorElo;
    e.calor[z] += 1;
    const x: Elo = { atk, def, portador, receptor: null, marcador: m.marcador, zona: d, origem: z, elo, transicao, contra };
    const eDePasse = acao === 'passeCurto' || acao === 'passeProfundidade' || acao === 'lancamento' || acao === 'cruzamento';
    if (eDePasse) x.receptor = sortearReceptor(st, receptores(atk, portador, d, acao === 'passeCurto' ? 0 : 1, contra), d, contra);

    const dec = dividida(st, x, forcarCabeceio ? 'cabeceio' : tipoDoChute(d, true, ultimo));
    if (dec === 'evitada') {
      m = { marcador: null, n: 0 };
      x.marcador = null;
    } else if (dec) return encerrar(dec);

    if (acao === 'finalizacao') return encerrar(finalizar(st, x, forcarCabeceio ? 'cabeceio' : tipoDoChute(z, !m.marcador, ultimo), ultimo, contra));

    const def2 = GDD.acoes[acao].def;
    const penaDesarme = m.marcador?.amarelos && (acao === 'drible' || acao === 'conducao') ? GDD.cartoes.amareladoDesarme : 0;
    const vDef = m.marcador ? valorJogador(m.marcador, def2, penaDesarme) : GDD.defensorAusente;
    const pontos = pontosElo({ atk, def, acao, origem: z, destino: d, contra, elo, transicao, temMarcador: m.marcador !== null });
    const chance = chanceDisputa(GDD.acoes[acao].base, valorAcao(portador, acao, penaFirula(portador, acao, faixa(z))), vDef, Math.max(1, presenca[d]), m.n, pontos);
    if (!st.rng.pct(chance)) return encerrar(falha(st, acao, x));

    if (eDePasse) {
      if (acao !== 'cruzamento') e.passes += 1;
      else {
        forcarCabeceio = true;
        registrar(st, 'jogada', 'Cruzamento', atk.indice, { jogador: portador, jogador2: x.receptor, origem: z, destino: d, resultado: 'cruzamento certo' });
      }
      ultimo = { acao, passador: portador };
      portador = x.receptor!;
    } else {
      if (acao === 'drible' && faixa(z) >= 4) registrar(st, 'jogada', 'Drible', atk.indice, { jogador: portador, jogador2: m.marcador, origem: z, destino: d, resultado: 'drible certo' });
      ultimo = { acao, passador: null };
    }
    z = d;
    elo += 1;
  }
  // PROVISORIO: o GDD não diz o que acontece ao fim dos 6 elos sem desfecho. O mesmo time segue com a bola na cadeia seguinte.
  return continuar();
}

const ajusteRitmo = (t: TimeEmCampo): number => (t.padrao.ritmo === 'Rápido' ? 1 : t.padrao.ritmo === 'Lento' ? -1 : 0);

const difPlacar = (st: Estado, i: 0 | 1): number => st.placar[i] - st.placar[outro(i)];

/** "Pôr fogo" por conta própria: a ordem do técnico entra com o comando do jogador nas pausas (GDD 6). */
function fogoPorContaPropria(st: Estado, i: 0 | 1): void {
  const f = GDD.fogo;
  const t = st.t[i];
  const perdendo = difPlacar(st, i) < 0;
  const apagado = st.impeto[i] < f.impetoBaixo;
  const candidatos = t.escalados.filter((e) => temQualidade(e, 'Incendiário'));
  if (!(perdendo || apagado) || !candidatos.length || !st.rng.pct(f.contaPropria)) return;
  const e = st.rng.um(candidatos);
  const media = ((e.j.atributos.Lid ?? 10) + (e.j.atributos.Comb ?? 10) + (e.j.atributos.Comp ?? 10)) / 3;
  const situacoes = (t.emCasa ? 1 : 0) + (perdendo ? 1 : 0) + (apagado ? 1 : 0);
  const chance = limitar(f.base + f.porPonto * (media - 10) + f.porSituacao * situacoes, f.min, f.max);
  registrar(st, 'fogo', 'Tentativa', i, { jogador: e, resultado: 'tentativa', chance });
  if (st.rng.pct(chance)) {
    aplicarImpeto(st.impeto, t, f.sucesso);
    registrar(st, 'fogo', 'Sucesso', i, { jogador: e, resultado: 'sucesso' });
  } else if (i === 1 || st.rng.pct(50)) {
    aplicarImpeto(st.impeto, st.t[outro(i)], f.falha);
    registrar(st, 'fogo', 'Torcida rival inflamada', i, { jogador: e, resultado: 'falha: ímpeto do rival' });
  } else {
    registrar(st, 'fogo', 'Cartão', i, { jogador: e, resultado: 'falha: cartão' });
    aplicarAmarelo(st, t, e, e.amarelos >= 1); // se for o segundo, a expulsão também é narrada
  }
}

/** Caso raro, com o time apático e conforme o temperamento (GDD 8). O auxiliar assume (GDD 1). */
function tecnicoPerdeACabeca(st: Estado, i: 0 | 1): void {
  const t = st.t[i];
  if (t.tecnicoExpulso || st.impeto[i] >= GDD.cartoes.impetoTecnico) return;
  const tab = PROVISORIO.tecnicoExpulso;
  if (!st.rng.pct(tab[t.tecnico.temperamento ?? 'semDado'] ?? tab.semDado)) return;
  t.tecnicoExpulso = true;
  st.avisos[i].push('técnico expulso, o auxiliar assume');
}

/** Frase de clima quando o ímpeto chega a um extremo ou troca de lado. Limites PROVISORIO. */
function narrarClima(st: Estado, i: 0 | 1, antes: number): void {
  const v = st.impeto[i];
  const p = PROVISORIO;
  const t = st.t[i];
  if (antes < 0 && v >= p.impetoViraClima) registrar(st, 'impeto', 'Jogo muda de clima', i, { resultado: 'clima virou' });
  else if (t.emCasa && v >= p.impetoNarraAlto) registrar(st, 'impeto', 'Torcida empurra', i, { resultado: 'torcida' });
  else if (t.emCasa && v <= p.impetoNarraBaixo) {
    registrar(st, 'impeto', 'Vaia', i, { resultado: 'vaia' });
    mudarMoral(t, t.escalados.filter((e) => !temQualidade(e, 'Gelo')), p.moralVaia);
  } else if (v <= p.impetoNarraBaixo) registrar(st, 'impeto', 'Time apático', i, { resultado: 'apático' });
}

/** Torcida hostil (Humor até 25, GDD-gestao 9): em casa e perdendo, vaia no fim do bloco; Gelo não sente. */
function vaiaDaTorcida(st: Estado, i: 0 | 1): void {
  const t = st.t[i];
  if (!t.vaia || !t.emCasa || st.placar[i] >= st.placar[1 - i]) return;
  registrar(st, 'impeto', 'Vaia', i, { resultado: 'vaia' });
  mudarMoral(t, t.escalados.filter((e) => !temQualidade(e, 'Gelo')), PROVISORIO.moralVaia);
}

function fimDeBloco(st: Estado, b: number, inicioImpeto: [number, number]): void {
  for (const i of [0, 1] as const) {
    st.t[i].ajusteFraco = false;
    st.t[i].custoAjuste = 1;
    for (const e of st.t[i].escalados) e.energia = Math.max(0, e.energia - gastoBloco(e, st.t[i]));
    fogoPorContaPropria(st, i);
    tecnicoPerdeACabeca(st, i);
    narrarClima(st, i, inicioImpeto[i]);
    vaiaDaTorcida(st, i);
    st.impeto[i] = decairImpeto(st.impeto[i]);
    if (b === GDD.blocoIntervalo) for (const e of st.t[i].escalados) e.energia = Math.min(100, e.energia + st.t[i].apoio.recuperacaoIntervalo);
  }
}

function relatorio(st: Estado, i: 0 | 1, ajustes: string[]): RelatorioTime {
  const total = st.est[0].posseSegundos + st.est[1].posseSegundos;
  const e = st.est[i];
  const t = st.t[i];
  return {
    finalizacoes: e.finalizacoes, possePct: total ? Math.round((e.posseSegundos / total) * 100) : 50,
    energiaMedia: Math.round(t.escalados.reduce((s, x) => s + x.energia, 0) / t.escalados.length),
    impeto: Math.round(st.impeto[i]), ajustes,
  };
}

interface Sugestao { texto: string; decisao?: Decisao; ajuste?: AjustePausa }

/** Sugestões do auxiliar (GDD 7): de 1 a 3 pela leitura; a certa sai com `leitura × 5%`, senão o ajuste padrão de linha (PROVISORIO). */
function sugerir(st: Estado, i: 0 | 1, minuto: number, intervalo: boolean, leitura: number, rp: Rng): Sugestao[] {
  const t = st.t[i];
  const op = st.t[outro(i)];
  const dif = difPlacar(st, i);
  const n = leitura <= 7 ? 1 : leitura <= 13 ? 2 : 3;
  const acerta = (): boolean => rp.pct(leitura * 5);
  const out: Sugestao[] = [];
  const certa = reverterEixo(t, op) ?? atacarBrecha(t, op, st.tatica);
  const d = certa && acerta() ? certa : mudarDegrau(t, 'linha', dif < 0 ? 1 : -1);
  if (d) out.push({ texto: d.texto, decisao: d });
  for (const sai of escolherTrocas(t, minuto)) {
    if (out.length >= n || t.trocas >= GDD.substituicoes) break;
    out.push({ texto: `trocar ${sai.j.nome} (energia ${Math.round(sai.energia)}) pelo melhor reserva`, ajuste: { trocas: [[sai.j.id, '']] } });
  }
  if (intervalo && out.length < n) {
    const certos = tonsCertos(dif, st.impeto[i]);
    const tom = certos.length && acerta() ? certos[0] : rp.um(['Cobrar', 'Acalmar', 'Elogiar'] as const);
    out.push({ texto: `fala: ${tom}`, ajuste: { fala: tom } });
  }
  return out.slice(0, n);
}

/** Itens do analista pela Profundidade; cada um erra com `(20 − Precisão) × 2,5%`; com Precisão abaixo de 10, faixas (GDD 7). */
function extrasDoAnalista(st: Estado, i: 0 | 1, b: number, an: ControlePausa['analista'], rp: Rng): string[] {
  const out: string[] = [];
  const o = outro(i);
  const erra = (): boolean => rp.pct((20 - an.precisao) * 2.5);
  const zonaQualquer = (): string => codigoZona(rp.int(0, TOTAL_ZONAS - 1));
  const lances = st.lances.filter((l) => l.bloco === b);
  const moda = (xs: (string | null)[]): string | null => {
    const c = new Map<string, number>();
    for (const x of xs) if (x) c.set(x, (c.get(x) ?? 0) + 1);
    return [...c].sort((a, b2) => b2[1] - a[1] || a[0].localeCompare(b2[0]))[0]?.[0] ?? null;
  };
  if (an.profundidade >= 8) {
    const perdas = moda(lances.filter((l) => (l.lance === 'Perda de bola' && l.time === i) || ((l.lance === 'Desarme' || l.lance === 'Pressão') && l.time === o)).map((l) => l.zonaDestino ?? l.zonaOrigem));
    if (perdas) out.push(`Mais bolas perdidas em ${erra() ? zonaQualquer() : perdas}`);
    const chances = moda(lances.filter((l) => (l.tema === 'finalizacao' || l.tema === 'gol') && l.time === o).map((l) => l.zonaOrigem));
    if (chances) out.push(`Mais chances sofridas saindo de ${erra() ? zonaQualquer() : chances} (no ataque deles)`);
  }
  if (an.profundidade >= 14) {
    const [c, d] = [st.t[i].confronto, st.t[o].confronto];
    const nomes = { pressaoSaida: 'pressão x saída', velocidadeCostas: 'velocidade x costas', criacaoBloco: 'criação x bloco' } as const;
    const eixos = (Object.keys(nomes) as (keyof typeof nomes)[]).map((k) => {
      const v = Math.round((c[k] - d[k]) * (erra() ? -1 : 1));
      return `${nomes[k]} ${an.precisao < 10 ? `${v - 2} a ${v + 2}` : (v > 0 ? '+' : '') + v}`;
    });
    out.push(`Eixos (sua vantagem): ${eixos.join(' · ')}`);
    let alvo = -1;
    let maior = 0;
    for (let z = 0; z < TOTAL_ZONAS; z++) {
      const v = st.t[o].efeitos.brechaSem[z] + st.t[o].efeitos.brechaTransicao[z];
      if (v > maior) { maior = v; alvo = z; }
    }
    if (alvo >= 0) out.push(`Maior brecha deles: ${erra() ? zonaQualquer() : codigoZona(espelhar(alvo))}`);
    const ids = new Map<string, number>();
    for (const l of lances) if (l.time === o && l.jogador && (l.tema === 'gol' || l.tema === 'finalizacao' || ['Drible', 'Passe decisivo', 'Cruzamento', 'Desarme'].includes(l.lance))) ids.set(l.jogador, (ids.get(l.jogador) ?? 0) + 1);
    const top = [...ids].sort((a, b2) => b2[1] - a[1])[0]?.[0];
    const nomeDe = (id: string): string => st.t[o].participantes.find((e) => e.j.id === id)?.j.nome ?? id;
    if (top) out.push(`Destaque deles: ${erra() ? rp.um(st.t[o].escalados).j.nome : nomeDe(top)}`);
  }
  return out;
}

/** Aplica o que o jogador decidiu e cobra o custo do ajuste no bloco seguinte (GDD 7). */
function aplicarDoJogador(st: Estado, i: 0 | 1, intervalo: boolean, aj: AjustePausa, sug: Sugestao[], feitos: string[]): void {
  const t = st.t[i];
  const antes = { ...t.padrao };
  const trocas: [string, string][] = [...(aj.trocas ?? [])];
  let fala = aj.fala;
  for (const k of aj.sugestoes ?? []) {
    const s = sug[k];
    if (!s) continue;
    if (s.decisao) s.decisao.aplicar();
    if (s.ajuste?.trocas) trocas.push(...s.ajuste.trocas);
    if (s.ajuste?.fala && !fala) fala = s.ajuste.fala;
  }
  const trocaEstilo = !!aj.estilo && aj.estilo !== t.estilo.nome && st.tatica.estilos.some((e) => e.nome === aj.estilo);
  const chaveAntes = `${t.estilo.nome}|${t.formacaoComBola}|${t.formacaoSemBola}`;
  if (trocaEstilo) {
    t.estilo = st.tatica.estilos.find((e) => e.nome === aj.estilo)!;
    t.padrao = { ...t.estilo.padrao };
    feitos.push(`estilo ${t.estilo.nome}`);
  }
  if (aj.padrao) t.padrao = { ...t.padrao, ...aj.padrao };
  // Formação (5b2): radical como o estilo. Com o padrão já novo, para a exigência das instruções.
  const trocaFormacao = (!!aj.formacaoComBola || !!aj.formacaoSemBola)
    && trocarFormacao(t, st.tatica, aj.formacaoComBola ?? t.formacaoComBola, aj.formacaoSemBola ?? t.formacaoSemBola);
  if (trocaFormacao) feitos.push(`formação ${t.formacaoComBola} / ${t.formacaoSemBola}`);
  const radical = trocaEstilo || trocaFormacao;
  // Instruções individuais (5b2): ajuste leve; null devolve a escolha ao melhor encaixe.
  if (aj.instrucoes) {
    const ins = structuredClone(t.instrucoes ?? {});
    for (const [id, x] of Object.entries(aj.instrucoes)) {
      const y = { ...ins[id] };
      for (const f of ['Com', 'Sem'] as const) if (f in x) { if (x[f]) y[f] = x[f]!; else delete y[f]; }
      if (y.Com || y.Sem) ins[id] = y; else delete ins[id];
    }
    t.instrucoes = ins;
  }
  if (aj.batedores) t.batedores = { ...aj.batedores };
  if (radical) for (const e of t.escalados) escolherAsDuas(e, t, st.tatica);
  else if (aj.instrucoes) for (const e of t.escalados) if (e.j.id in aj.instrucoes) escolherAsDuas(e, t, st.tatica);
  if (aj.instrucoes) for (const e of t.escalados) if (e.j.id in aj.instrucoes) feitos.push(`${e.j.nome}: ${e.instrCom?.nome ?? '-'} / ${e.instrSem?.nome ?? '-'}`);
  const ref = trocaEstilo ? t.estilo.padrao : antes;
  const mudadas = (Object.keys(t.padrao) as (keyof typeof t.padrao)[]).filter((k) => t.padrao[k] !== ref[k]);
  for (const k of mudadas) feitos.push(`${k} ${t.padrao[k]}`);
  // Instrução individual vinda de sugestão do auxiliar: ajuste leve.
  for (const k of aj.sugestoes ?? []) if (sug[k]?.decisao?.texto.includes(":")) feitos.push(sug[k].decisao!.texto);
  t.custoAjuste = mudadas.length >= 2 ? 0.9 : 1;
  if (radical) {
    // Plano B (GDD 7): o motor passa a usar o entrosamento da tática nova; já treinada (0,85+) corta a perda pela metade.
    const chave = `${t.estilo.nome}|${t.formacaoComBola}|${t.formacaoSemBola}`;
    const mapa = t.apoio.taticas;
    if (mapa && chave !== chaveAntes) t.apoio.entrosamento = mapa[chave] ?? PLANO_B.minimo;
    t.custoAjuste = custoTroca(t, mapa?.[chave]);
    if ((mapa?.[chave] ?? 0) >= PLANO_B.treinada) feitos.push(`Plano B (entrosamento ${Math.round(mapa![chave] * 100)}%)`);
  }
  if ((radical || mudadas.length) && t.apoio.respaldo < RESPALDO.fraco) t.ajusteFraco = true;
  for (const [saiId, entraId] of trocas) {
    if (t.trocas >= GDD.substituicoes) break;
    const sai = t.escalados.find((e) => e.j.id === saiId);
    if (!sai) continue;
    const goleiro = sai === t.goleiro;
    const entra = substituir(t, sai, st.tatica, st.rng, st.classico, entraId || undefined);
    if (!entra) continue;
    if (goleiro) t.goleiro = entra;
    feitos.push(`sai ${sai.j.nome} (${Math.round(sai.energia)}), entra ${entra.j.nome}`);
  }
  if (intervalo && fala) {
    const delta = falaDoJogador(t, fala, difPlacar(st, i), st.impeto[i]);
    if (delta) aplicarImpeto(st.impeto, t, delta);
    feitos.push(`fala: ${fala}${delta < 0 ? ' (tom errado)' : delta === 0 ? ' (sem efeito)' : ''}`);
  }
}

/** Os dois técnicos decidem sobre o mesmo cenário; só depois as mudanças entram (GDD 7). */
function pausa(st: Estado, b: number): RelatorioPausa {
  const minuto = b * 15;
  const intervalo = b === GDD.blocoIntervalo;
  const ajustes: [string[], string[]] = [st.avisos[0], st.avisos[1]];
  st.avisos = [[], []];
  // Clube do jogador: relatório, sugestões e escolha antes de qualquer mudança; null = o auxiliar decide (IA).
  const ctl = st.controle && !st.t[st.controle.lado].tecnicoExpulso ? st.controle : undefined;
  let doJogador: { aj: AjustePausa; sug: Sugestao[] } | null = null;
  if (ctl) {
    const i = ctl.lado;
    const o = outro(i);
    const rp = criarRng(semearDeTexto(`${st.semente}-pausa-${b}`));
    const sug = sugerir(st, i, minuto, intervalo, ctl.leitura, rp);
    const times: [RelatorioTime, RelatorioTime] = [relatorio(st, 0, [...ajustes[0]]), relatorio(st, 1, [...ajustes[1]])];
    times[o].ajustes = rp.pct(ctl.analista.aoVivo * 5) ? [...st.ultimaPausa[o], ...ajustes[o]] : [];
    const aj = ctl.pausa({
      minuto, intervalo, lado: i, placar: [st.placar[0], st.placar[1]], times, extras: extrasDoAnalista(st, i, b, ctl.analista, rp),
      sugestoes: sug.map((s) => s.texto), lances: st.lances.filter((l) => l.bloco === b), time: st.t[i], trocasRestantes: GDD.substituicoes - st.t[i].trocas,
    });
    if (aj) doJogador = { aj, sug };
  }
  const doLado = (i: 0 | 1): boolean => !!doJogador && ctl!.lado === i;
  const decisoes = ([0, 1] as const).map((i) => (doLado(i) ? null : decidirReacao(st.t[i], st.t[outro(i)], difPlacar(st, i), minuto, st.tatica, st.rng)));
  for (const i of [0, 1] as const) {
    if (doLado(i)) {
      aplicarDoJogador(st, i, intervalo, doJogador!.aj, doJogador!.sug, ajustes[i]);
      continue;
    }
    const d = decisoes[i];
    if (d) {
      d.aplicar();
      if (st.t[i].apoio.respaldo < RESPALDO.fraco) st.t[i].ajusteFraco = true;
      ajustes[i].push(d.texto);
      registrar(st, 'pausas', 'Ajuste do adversário', outro(i), { resultado: d.texto });
    }
    const t = st.t[i];
    for (const sai of escolherTrocas(t, minuto)) {
      if (t.trocas >= GDD.substituicoes) break;
      const entra = substituir(t, sai, st.tatica, st.rng, st.classico);
      if (entra) ajustes[i].push(`sai ${sai.j.nome} (${Math.round(sai.energia)}), entra ${entra.j.nome}`);
    }
    if (intervalo) {
      const fala = falaIntervalo(t, difPlacar(st, i), st.impeto[i], st.rng);
      if (fala) {
        aplicarImpeto(st.impeto, t, fala.delta);
        ajustes[i].push(`fala: ${fala.tom}`);
      }
    }
  }
  st.ultimaPausa = [[...ajustes[0]], [...ajustes[1]]];
  return { minuto, placar: [st.placar[0], st.placar[1]], times: [relatorio(st, 0, ajustes[0]), relatorio(st, 1, ajustes[1])] };
}

/** Roda a cadeia e conta o que ela rendeu, por tipo de início (só para o simulador). */
function cadeiaMedida(st: Estado, ini: Inicio): Inicio {
  const e = st.est[ini.posse];
  const [fin, gols] = [e.finalizacoes, e.gols];
  const prox = simularCadeia(st, ini);
  const r = (st.porInicio[ini.tipo] ??= { cadeias: 0, finalizacoes: 0, gols: 0 });
  r.cadeias += 1;
  r.finalizacoes += e.finalizacoes - fin;
  r.gols += e.gols - gols;
  return prox;
}

export const calcularAcrescimos =(gols: number, lesoes: number, faltas: number): number => Math.min(2, gols + lesoes + Math.floor(faltas / PROVISORIO.faltasPorAcrescimo));

export function simularPartida(ent: EntradaPartida): ResultadoPartida {
  const rng = criarRng(ent.semente);
  const classico = ent.mandante.clube.rivais.some((r) => r.clubeId === ent.visitante.clube.id)
    || ent.visitante.clube.rivais.some((r) => r.clubeId === ent.mandante.clube.id);
  const t: [TimeEmCampo, TimeEmCampo] = [
    montarTime(0, ent.mandante, ent.tatica, rng, classico),
    montarTime(1, ent.visitante, ent.tatica, rng, classico),
  ];
  if (ent.neutro) t[0].emCasa = false;
  const st: Estado = {
    rng, t, tatica: ent.tatica, impeto: [ent.mandante.impeto ?? 0, ent.visitante.impeto ?? 0], placar: [0, 0], est: [novaEstat(), novaEstat()],
    fins: { finalizacao: 0, perda: 0, falta: 0, fora: 0, limite: 0 },
    lances: [], classico, bloco: 1, cadeia: 0, posse: 0, minuto: 0, acrescimo: 0, golsBloco: 0, faltasBloco: 0, lesoesBloco: 0, lesoes: [], porInicio: {}, avisos: [[], []],
    semente: ent.semente, controle: ent.controle, ultimaPausa: [[], []],
  };
  const cadeiasPorBloco: number[] = [];
  const pausas: RelatorioPausa[] = [];
  let prox: Inicio = saida(st, 0, [3]);
  registrar(st, 'abertura', 'Início de jogo', 0, { resultado: 'início' });

  for (let b = 1; b <= GDD.blocos; b++) {
    st.bloco = b;
    st.golsBloco = 0;
    st.faltasBloco = 0;
    st.lesoesBloco = 0;
    st.acrescimo = 0;
    // GDD 1 e 5: aplica os ajustes e recalcula mapas, eixos e modificadores no início de cada bloco.
    prepararTime(t[0], ent.tatica);
    prepararTime(t[1], ent.tatica);
    t[0].confronto = calcularConfronto(t[0], t[1], ent.tatica.estilos);
    t[1].confronto = calcularConfronto(t[1], t[0], ent.tatica.estilos);
    atualizarMods(t[0], difPlacar(st, 0), b, st.impeto[0]);
    atualizarMods(t[1], difPlacar(st, 1), b, st.impeto[1]);
    const inicioImpeto: [number, number] = [st.impeto[0], st.impeto[1]];
    if (b === 4) prox = saida(st, 1, [3]);
    const n = GDD.cadeiasBase + ajusteRitmo(t[0]) + ajusteRitmo(t[1]) + rng.int(-1, 1);
    let feitas = 0;
    const agendadas = sortearLesoesDoBloco(st, n);
    for (let i = 0; i < n; i++) {
      st.minuto = (b - 1) * 15 + Math.floor((i * 15) / n) + 1;
      st.cadeia += 1;
      feitas += 1;
      // Só quem ainda está em campo: pode ter saído expulso ou lesionado antes.
      for (const a of agendadas) if (a.cadeia === i && t[a.time].escalados.includes(a.e)) lesionar(st, t[a.time], a.e, 'bloco');
      prox = cadeiaMedida(st, prox);
    }
    if ((GDD.blocosComAcrescimo as readonly number[]).includes(b)) {
      // PROVISORIO: o GDD diz "de 0 a 2, conforme gols, faltas e lesões", sem a conta.
      const extras = calcularAcrescimos(st.golsBloco, st.lesoesBloco, st.faltasBloco);
      for (let j = 1; j <= extras; j++) {
        st.minuto = b * 15;
        st.acrescimo = j;
        st.cadeia += 1;
        feitas += 1;
        prox = cadeiaMedida(st, prox);
      }
    }
    cadeiasPorBloco.push(feitas);
    st.minuto = b * 15;
    st.acrescimo = 0;
    fimDeBloco(st, b, inicioImpeto);
    if (b === GDD.blocoIntervalo) registrar(st, 'abertura', 'Intervalo', 0, { resultado: 'intervalo' });
    else if (b < GDD.blocos) registrar(st, 'pausas', 'Pausa de 15 minutos', 0, { resultado: 'parada técnica' });
    if (b < GDD.blocos) {
      pausas.push(pausa(st, b));
      // Quem ia receber a bola pode ter sido substituído.
      if (prox.portador && !t[prox.posse].escalados.includes(prox.portador)) prox = { ...prox, portador: null };
    }
  }
  registrar(st, 'abertura', 'Fim de jogo', 0, { resultado: 'fim' });
  fecharNotas(t, st.placar);

  return {
    semente: ent.semente, times: t, placar: st.placar, estatisticas: st.est, fins: st.fins,
    cadeias: st.cadeia, cadeiasPorBloco, classico, lances: st.lances, pausas, lesoes: st.lesoes, porInicio: st.porInicio,
  };
}
