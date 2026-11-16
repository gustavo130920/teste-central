// Monta o time em campo: melhores 11 na formação com a bola e a mesma turma na formação sem a bola.
import type { Formacao, Jogador, PadraoTime, PecaFormacao, Posicao, Tatica } from './dados.ts';
import { APOIO_NEUTRO, GDD, PROVISORIO, RESPALDO } from './parametros.ts';
import { NOTA } from './notas.ts';
import { calcularRetorno, eficaciaFinal, escolherInstrucao, exigenciaCumprida, instrucaoManual, faixaPeloBloco, montarPesos, notasEfetivas } from './plano.ts';
import type { Rng } from './rng.ts';
import { calcularEfeitos } from './sinergias.ts';
import type { EntradaTime, Escalado, TimeEmCampo } from './tipos.ts';
import { TOTAL_ZONAS, corredor, distancia, espelhar, faixa, zona as zonaDe, zonaDeCodigo } from './zonas.ts';

/** Nota do jogador na vaga: principal, secundária (LAT e PON valem para os dois lados), ou improvisado. */
function notaNaVaga(j: Jogador, vaga: Posicao): number | null {
  if ((j.posicao === 'GOL') !== (vaga === 'GOL')) return null;
  if (j.posicao === vaga) return j.nota;
  const generica = vaga.slice(0, 3);
  const sec = j.secundarias.find((s) => s.posicao === vaga || s.posicao === generica);
  return sec ? sec.nota : j.nota - 6;
}

/** `escolhidos` (clube do jogador, 8ª fatia): entram primeiro, cada um na vaga de melhor encaixe; o resto completa. */
function escolherOnze(elenco: Jogador[], pecas: PecaFormacao[], escolhidos?: Set<string>): (Jogador | null)[] {
  const pares: { v: number; n: number; j: Jogador; e: number }[] = [];
  pecas.forEach((p, v) => {
    for (const j of elenco) {
      const n = notaNaVaga(j, p.posicao);
      if (n !== null) pares.push({ v, n, j, e: escolhidos?.has(j.id) ? 0 : 1 });
    }
  });
  pares.sort((a, b) => a.e - b.e || b.n - a.n || a.v - b.v || a.j.id.localeCompare(b.j.id));
  const onze: (Jogador | null)[] = pecas.map(() => null);
  const usados = new Set<string>();
  for (const { v, j } of pares) {
    if (onze[v] || usados.has(j.id)) continue;
    onze[v] = j;
    usados.add(j.id);
  }
  return onze;
}

/** Rodízio do auxiliar (etapa 3): titular poupado dá a vaga ao melhor de fora que tenha a posição como principal ou secundária. */
function pouparCansados(onze: (Jogador | null)[], elenco: Jogador[], pecas: PecaFormacao[], poupados: Set<string>): (Jogador | null)[] {
  if (!poupados.size) return onze;
  const res = [...onze];
  pecas.forEach((p, v) => {
    const atual = res[v];
    if (!atual || !poupados.has(atual.id)) return;
    const generica = p.posicao.slice(0, 3);
    const temPosicao = (j: Jogador): boolean => j.posicao === p.posicao || j.secundarias.some((s) => s.posicao === p.posicao || s.posicao === generica);
    const opcoes = elenco.filter((j) => !res.includes(j) && !poupados.has(j.id) && temPosicao(j));
    if (opcoes.length) res[v] = opcoes.reduce((m, j) => (notaNaVaga(j, p.posicao)! > notaNaVaga(m, p.posicao)! ? j : m));
  });
  return res;
}

/** 9 reservas (GDD 8): o melhor para cada posição da formação, goleiro incluído; o resto por nota (critério PROVISORIO). */
function escolherBanco(elenco: Jogador[], onze: (Jogador | null)[], pecas: PecaFormacao[]): Jogador[] {
  const resto = elenco.filter((j) => !onze.includes(j)).sort((a, b) => b.nota - a.nota || a.id.localeCompare(b.id));
  const banco: Jogador[] = [];
  for (const pos of new Set(pecas.map((p) => p.posicao))) {
    if (banco.length >= GDD.banco) break;
    const opcoes = resto.filter((j) => !banco.includes(j) && notaNaVaga(j, pos) !== null);
    if (opcoes.length) banco.push(opcoes.reduce((m, j) => (notaNaVaga(j, pos)! > notaNaVaga(m, pos)! ? j : m)));
  }
  for (const j of resto) if (banco.length < GDD.banco && !banco.includes(j)) banco.push(j);
  return banco;
}

/** Liga cada jogador a uma vaga da formação sem a bola: mesma posição e mais perto primeiro. */
function ligarSemBola(escalacao: { pos: Posicao; zona: number }[], sem: PecaFormacao[]): number[] {
  const pares: { i: number; v: number; difPos: number; d: number }[] = [];
  escalacao.forEach((e, i) => sem.forEach((p, v) => {
    const goleiroErrado = (e.pos === 'GOL') !== (p.posicao === 'GOL');
    if (!goleiroErrado) pares.push({ i, v, difPos: e.pos === p.posicao ? 0 : 1, d: distancia(e.zona, zonaDeCodigo(p.zona)) });
  }));
  pares.sort((a, b) => a.difPos - b.difPos || a.d - b.d || a.i - b.i || a.v - b.v);
  const res = escalacao.map(() => -1);
  const vagas = new Set<number>();
  for (const { i, v } of pares) {
    if (res[i] !== -1 || vagas.has(v)) continue;
    res[i] = v;
    vagas.add(v);
  }
  return res;
}

const formacao = (t: Tatica, nome: string): Formacao => {
  const f = t.formacoes.find((x) => x.nome === nome);
  if (!f) throw new Error(`Formação fora do catálogo: ${nome}`);
  return f;
};

/** Prévia dos 11 e da vaga de cada um, como o motor escala (tela de tática, 5b1). */
export function previaDoOnze(elenco: Jogador[], tatica: Tatica, formacaoComBola: string, titulares?: string[], poupados?: string[]): { j: Jogador; vaga: Posicao }[] {
  const com = formacao(tatica, formacaoComBola).pecas;
  const onze = titulares ? escolherOnze(elenco, com, new Set(titulares)) : pouparCansados(escolherOnze(elenco, com), elenco, com, new Set(poupados ?? []));
  return onze.flatMap((j, i) => (j ? [{ j, vaga: com[i].posicao }] : []));
}

export function montarTime(indice: 0 | 1, ent: EntradaTime, tatica: Tatica, rng: Rng, classico: boolean): TimeEmCampo {
  const estilo = tatica.estilos.find((e) => e.nome === ent.tecnico.estilo);
  if (!estilo) throw new Error(`Estilo desconhecido: ${ent.tecnico.estilo}`);
  const padrao: PadraoTime = { ...estilo.padrao, ...ent.padrao };
  const com = formacao(tatica, ent.tecnico.formacaoComBola).pecas;
  const sem = formacao(tatica, ent.tecnico.formacaoSemBola).pecas;
  // Titulares escolhidos pelo jogador: sem o rodízio do auxiliar.
  const onze = ent.titulares ? escolherOnze(ent.elenco, com, new Set(ent.titulares)) : pouparCansados(escolherOnze(ent.elenco, com), ent.elenco, com, new Set(ent.poupados ?? []));
  const ligacao = ligarSemBola(com.map((p) => ({ pos: p.posicao, zona: zonaDeCodigo(p.zona) })), sem);
  const escalados: Escalado[] = onze.map((j, i) => {
    if (!j) throw new Error(`${ent.clube.id}: faltou jogador para ${com[i].posicao} (${ent.elenco.length} disponíveis, ${ent.elenco.filter((x) => x.posicao === 'GOL').length} goleiros)`);
    return novoEscalado(j, indice, com[i].posicao, zonaDeCodigo(com[i].zona), zonaDeCodigo(sem[ligacao[i]].zona), rng, classico, ent.condicao, ent.moral);
  });
  const goleiro = escalados.find((e) => e.j.posicao === 'GOL');
  if (!goleiro) throw new Error(`${ent.clube.id}: sem goleiro`);
  const t: TimeEmCampo = {
    indice, clube: ent.clube, tecnico: ent.tecnico, estilo, formacaoComBola: ent.tecnico.formacaoComBola, formacaoSemBola: ent.tecnico.formacaoSemBola, padrao, notas: notasEfetivas(estilo, padrao), escalados, goleiro,
    participantes: [...escalados], banco: escolherBanco(ent.elenco, onze, com), trocas: 0, tecnicoExpulso: false, emCasa: indice === 0, condicao: ent.condicao, moral: ent.moral, ajusteFraco: false, custoAjuste: 1, casa: ent.fatorCasa, vaia: ent.vaia,
    presencaCom: [], presencaContra: [], efeitos: calcularEfeitos([], [], padrao),
    confronto: { pressaoSaida: 0, velocidadeCostas: 0, criacaoBloco: 0, viabilidade: 0 },
    apoio: { ...APOIO_NEUTRO, ...ent.apoio },
    ...(ent.instrucoes ? { instrucoes: ent.instrucoes } : {}),
    ...(ent.batedores ? { batedores: ent.batedores } : {}),
    ...(ent.marcacao ? { marcacao: { ...ent.marcacao } } : {}),
  };
  for (const e of escalados) escolherAsDuas(e, t, tatica);
  prepararTime(t, tatica);
  return t;
}

/**
 * Troca de formação na pausa (5b2): os mesmos jogadores em campo vão para as vagas da formação nova,
 * o goleiro no gol e os de linha pela maior nota na vaga (como na escalação); com um a menos, sobra a vaga mais difícil.
 * Instruções refeitas para as vagas novas. Devolve false se a formação não existe ou não mudou.
 */
export function trocarFormacao(t: TimeEmCampo, tatica: Tatica, comBola: string, semBola: string): boolean {
  const fc = tatica.formacoes.find((x) => x.nome === comBola);
  const fs = tatica.formacoes.find((x) => x.nome === semBola);
  if (!fc || !fs || (comBola === t.formacaoComBola && semBola === t.formacaoSemBola)) return false;
  const pecas = fc.pecas;
  const vagas: (Escalado | null)[] = pecas.map(() => null);
  const gol = pecas.findIndex((p) => p.posicao === 'GOL');
  vagas[gol] = t.goleiro;
  const pares: { v: number; n: number; e: Escalado }[] = [];
  pecas.forEach((p, v) => {
    if (v === gol) return;
    for (const e of t.escalados) {
      if (e === t.goleiro) continue;
      const n = notaNaVaga(e.j, p.posicao);
      if (n !== null) pares.push({ v, n, e });
    }
  });
  pares.sort((a, b) => b.n - a.n || a.v - b.v || a.e.j.id.localeCompare(b.e.j.id));
  const usados = new Set<Escalado>([t.goleiro]);
  for (const { v, e } of pares) {
    if (vagas[v] || usados.has(e)) continue;
    vagas[v] = e;
    usados.add(e);
  }
  const ocupadas = pecas.flatMap((p, v) => (vagas[v] ? [{ e: vagas[v]!, p }] : []));
  const ligacao = ligarSemBola(ocupadas.map(({ p }) => ({ pos: p.posicao, zona: zonaDeCodigo(p.zona) })), fs.pecas);
  ocupadas.forEach(({ e, p }, i) => {
    e.vaga = p.posicao;
    e.zonaCom = zonaDeCodigo(p.zona);
    e.zonaSemBase = zonaDeCodigo(fs.pecas[ligacao[i]].zona);
  });
  t.formacaoComBola = comBola;
  t.formacaoSemBola = semBola;
  for (const e of t.escalados) escolherAsDuas(e, t, tatica);
  return true;
}

function novoEscalado(j: Jogador, time: 0 | 1, vaga: Posicao, zonaCom: number, zonaSemBase: number, rng: Rng, classico: boolean, condicao?: Record<string, number>, moral?: Record<string, number>): Escalado {
  const amplitude = (21 - (j.atributos.Cons ?? 10)) / 5; // Forma do dia, GDD 3
  return {
    j, time, vaga, zonaCom, zonaSem: zonaSemBase, zonaSemBase, retorno: 0,
    forma: (rng.n() * 2 - 1) * amplitude,
    jogosGrandes: classico ? ((j.atributos.JG ?? 10) - 10) / 5 + (j.perfilJovem === 'Inseguro' ? GDD.inseguroClassico : 0) : 0,
    energia: condicao?.[j.id] ?? PROVISORIO.energiaInicial, moral: moral?.[j.id] ?? PROVISORIO.moralInicial, modBloco: 0, nota: NOTA.inicial,
    instrCom: null, instrSem: null, efCom: 0, efSem: 0, pesoCom: [], pesoSem: [], pesoContra: [],
    amarelos: 0, expulso: null, saiuSemTroca: false, lesao: null,
  };
}

const contarZagueiros = (t: TimeEmCampo): number => t.escalados.filter((e) => e.vaga === 'ZAG').length;

/** Instrução da fase: a do jogador se ainda vale (5b1), senão o melhor encaixe. */
function escolherFase(e: Escalado, fase: 'Com' | 'Sem', t: TimeEmCampo, tatica: Tatica, zagueiros: number) {
  return instrucaoManual(e, fase, t.instrucoes?.[e.j.id]?.[fase], tatica.instrucoes, t.padrao, zagueiros)
    ?? escolherInstrucao(e, fase, tatica.instrucoes, t.estilo.nome, t.padrao, zagueiros);
}

export function escolherAsDuas(e: Escalado, t: TimeEmCampo, tatica: Tatica): void {
  const z = contarZagueiros(t);
  e.instrCom = escolherFase(e, 'Com', t, tatica, z);
  e.instrSem = escolherFase(e, 'Sem', t, tatica, z);
}

/** Marcação individual em vigor (5b3): os dois em campo, nenhum é goleiro. */
export function marcacaoAtiva(t: TimeEmCampo, op: TimeEmCampo | undefined): { marcador: Escalado; alvo: Escalado } | null {
  if (!t.marcacao || !op) return null;
  const marcador = t.escalados.find((e) => e.j.id === t.marcacao!.marcador);
  const alvo = op.escalados.find((e) => e.j.id === t.marcacao!.alvo);
  return marcador && alvo && marcador !== t.goleiro && alvo !== op.goleiro ? { marcador, alvo } : null;
}

/** Refaz notas, mapas e efeitos a partir do plano atual. Roda no início de cada bloco (GDD 1 e 4). `op` só para a marcação individual. */
export function prepararTime(t: TimeEmCampo, tatica: Tatica, op?: TimeEmCampo): void {
  t.notas = notasEfetivas(t.estilo, t.padrao);
  const zagueiros = contarZagueiros(t);
  // Sem `op` (saída no meio do bloco), vale a zona do alvo do início do bloco.
  if (op) { const a = marcacaoAtiva(t, op); t.zonaDoAlvo = a ? espelhar(a.alvo.zonaCom) : undefined; }
  const marcador = t.zonaDoAlvo === undefined ? undefined : t.escalados.find((e) => e.j.id === t.marcacao?.marcador && e !== t.goleiro);
  for (const e of t.escalados) {
    const goleiro = e === t.goleiro;
    const defensor = e.vaga === 'ZAG' || e.vaga.startsWith('LAT');
    // Marcador (5b3): sem a bola, fica na zona do alvo (a dele com a bola, espelhada) e larga a sua, que vira brecha.
    e.zonaSem = marcador === e ? t.zonaDoAlvo! : goleiro ? e.zonaSemBase : zonaDe(corredor(e.zonaSemBase), faixaPeloBloco(faixa(e.zonaSemBase), t.notas.Bloco, defensor));
    e.retorno = calcularRetorno(distancia(e.zonaCom, e.zonaSem), t.notas.Risco);
    // Ajuste de linha na pausa pode invalidar uma instrução que exige Linha Alta.
    // A do jogador volta assim que a exigência é cumprida de novo (5b1).
    const manual = t.instrucoes?.[e.j.id];
    const mCom = instrucaoManual(e, 'Com', manual?.Com, tatica.instrucoes, t.padrao, zagueiros);
    const mSem = instrucaoManual(e, 'Sem', manual?.Sem, tatica.instrucoes, t.padrao, zagueiros);
    if (mCom) e.instrCom = mCom;
    if (mSem) e.instrSem = mSem;
    if (e.instrCom && !exigenciaCumprida(e.instrCom, t.padrao, zagueiros)) e.instrCom = escolherFase(e, 'Com', t, tatica, zagueiros);
    if (e.instrSem && !exigenciaCumprida(e.instrSem, t.padrao, zagueiros)) e.instrSem = escolherFase(e, 'Sem', t, tatica, zagueiros);
    const fator = t.apoio.entrosamento * (t.ajusteFraco ? RESPALDO.fator : 1) * t.custoAjuste;
    e.efCom = e.instrCom ? eficaciaFinal(e, e.instrCom, t.estilo.nome, fator) : 0;
    // O marcador deixa a instrução sem a bola de lado: ela volta quando a marcação acaba.
    e.efSem = e.instrSem && marcador !== e ? eficaciaFinal(e, e.instrSem, t.estilo.nome, fator) : 0;
    montarPesos(e, goleiro);
  }
  const somaPesos = (peso: (e: Escalado) => number[]): number[] => {
    const res = new Array<number>(TOTAL_ZONAS).fill(0);
    for (const e of t.escalados) peso(e).forEach((v, z) => { res[z] += v; });
    return res;
  };
  t.presencaCom = somaPesos((e) => e.pesoCom);
  t.presencaContra = somaPesos((e) => e.pesoContra);
  t.efeitos = calcularEfeitos(t.escalados, tatica.combinacoes, t.padrao);
}

/** Troca na mesma vaga pelo melhor reserva. Devolve quem entrou, ou null sem reserva possível. */
export function substituir(t: TimeEmCampo, sai: Escalado, tatica: Tatica, rng: Rng, classico: boolean, escolhido?: string): Escalado | null {
  let melhor: Jogador | null = escolhido ? t.banco.find((j) => j.id === escolhido) ?? null : null;
  let nota = -Infinity;
  if (!escolhido) for (const j of t.banco) {
    const n = notaNaVaga(j, sai.vaga);
    if (n !== null && n > nota) { melhor = j; nota = n; }
  }
  if (!melhor) return null;
  const entra = novoEscalado(melhor, t.indice, sai.vaga, sai.zonaCom, sai.zonaSemBase, rng, classico, t.condicao, t.moral);
  escolherAsDuas(entra, t, tatica);
  t.escalados[t.escalados.indexOf(sai)] = entra;
  t.participantes.push(entra);
  t.banco = t.banco.filter((j) => j !== melhor);
  t.trocas += 1;
  return entra;
}

function tirarDeCampo(t: TimeEmCampo, e: Escalado): void {
  t.escalados.splice(t.escalados.indexOf(e), 1);
  e.saiuSemTroca = true;
}

/** Goleiro expulso: entra o reserva no lugar de um atacante; sem troca ou reserva, vai o jogador de linha com maior Agi (GDD 8). */
function trocarGoleiroExpulso(t: TimeEmCampo, gol: Escalado, tatica: Tatica, rng: Rng, classico: boolean): void {
  const linha = t.escalados.filter((e) => e !== gol);
  const reserva = t.trocas < GDD.substituicoes ? substituir(t, gol, tatica, rng, classico) : null;
  if (reserva) {
    t.goleiro = reserva;
    gol.saiuSemTroca = true;
    // PROVISORIO: sai o mais avançado; no empate, o de menor nota.
    tirarDeCampo(t, [...linha].sort((a, b) => faixa(b.zonaCom) - faixa(a.zonaCom) || a.j.nota - b.j.nota || a.j.id.localeCompare(b.j.id))[0]);
    return;
  }
  improvisarGoleiro(t, gol);
}

/** Sem troca ou sem reserva: vai para o gol o jogador de linha com maior Agi, com atributos de goleiro valendo 3 (GDD 8). */
function improvisarGoleiro(t: TimeEmCampo, gol: Escalado): void {
  const novo = t.escalados.filter((e) => e !== gol).reduce((m, e) => ((e.j.atributos.Agi ?? 0) > (m.j.atributos.Agi ?? 0) ? e : m));
  const a = GDD.goleiroImprovisado;
  novo.j = { ...novo.j, atributos: { ...novo.j.atributos, Ref: a, Mao: a, Aer: a, Sai: a, Pes: a, Com: a } };
  novo.vaga = 'GOL';
  novo.zonaCom = gol.zonaCom;
  novo.zonaSemBase = gol.zonaSemBase;
  novo.instrCom = null;
  novo.instrSem = null;
  t.goleiro = novo;
  tirarDeCampo(t, gol);
}

/** O time se reorganiza sozinho: quem joga à frente de quem saiu e está mais perto assume a zona dele. Atacante não puxa ninguém (PROVISORIO). */
function sairEReorganizar(t: TimeEmCampo, e: Escalado): void {
  tirarDeCampo(t, e);
  const aFrente = t.escalados.filter((x) => x !== t.goleiro && faixa(x.zonaSemBase) > faixa(e.zonaSemBase));
  if (aFrente.length) {
    const novo = aFrente.reduce((m, x) => (distancia(x.zonaSemBase, e.zonaSemBase) < distancia(m.zonaSemBase, e.zonaSemBase) ? x : m));
    novo.zonaCom = e.zonaCom;
    novo.zonaSemBase = e.zonaSemBase;
  }
}

export function retirarExpulso(t: TimeEmCampo, e: Escalado, tatica: Tatica, rng: Rng, classico: boolean): void {
  if (e === t.goleiro) trocarGoleiroExpulso(t, e, tatica, rng, classico);
  else sairEReorganizar(t, e);
  prepararTime(t, tatica);
}

/** Lesão que tira de campo (GDD 1 e 8): entra o reserva da posição e conta nas 5. Sem troca, segue com um a menos. Devolve quem entrou. */
export function retirarLesionado(t: TimeEmCampo, e: Escalado, tatica: Tatica, rng: Rng, classico: boolean): Escalado | null {
  const eraGoleiro = e === t.goleiro;
  const entra = t.trocas < GDD.substituicoes ? substituir(t, e, tatica, rng, classico) : null;
  if (entra && eraGoleiro) t.goleiro = entra;
  if (!entra) {
    if (eraGoleiro) improvisarGoleiro(t, e);
    else sairEReorganizar(t, e);
  }
  prepararTime(t, tatica);
  return entra;
}
