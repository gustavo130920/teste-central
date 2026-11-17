import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { bonusEnsaiada, chanceBolaChega, chanceDueloAereo, chancePenalti, chancesCartao, escolherBatedor, limiarDividida } from '../motor/bolaparada.ts';
import { pontosEixo } from '../motor/confronto.ts';
import type { Instrucao, PadraoTime } from '../motor/dados.ts';
import { chanceDisputa, chanceGol, mediaPonderada, penaFirula, pesoDefeito } from '../motor/disputa.ts';
import { montarTime, retirarLesionado } from '../motor/escalacao.ts';
import { chanceLesao, chanceLesaoFaltaDura, semanasFora, sortearGravidade } from '../motor/lesoes.ts';
import { APOIO_NEUTRO, GDD } from '../motor/parametros.ts';
import { calcularAcrescimos, simularPartida } from '../motor/partida.ts';
import { criarRng } from '../motor/rng.ts';
import { calcularRetorno, eficaciaBase, faixaPeloBloco, notasEfetivas } from '../motor/plano.ts';
import { calcularEfeitos } from '../motor/sinergias.ts';
import { aplicarImpeto, calcularMod, decairImpeto, gastoBloco, modEnergia, modImpeto, modMoral } from '../motor/clima.ts';
import type { Escalado, TimeEmCampo } from '../motor/tipos.ts';
import { codigoZona, espelhar, zonaDeCodigo } from '../motor/zonas.ts';
import { narrar } from '../narracao/narrar.ts';
import { carregarBase, entradaTime } from '../terminal/carregar.ts';
import { medir } from '../terminal/medicao.ts';

const aqui = dirname(fileURLToPath(import.meta.url));
const base = carregarBase();
const jogar = (semente: number, a = 'ALA', b = 'BAR') =>
  simularPartida({ mandante: entradaTime(base, a), visitante: entradaTime(base, b), tatica: base.tatica, semente });
const semObjetos = (r: ReturnType<typeof jogar>) => ({ placar: r.placar, est: r.estatisticas, fins: r.fins, lances: r.lances, lesoes: r.lesoes });

test('conversor: 76 clubes com elenco e técnico, nada sem interpretar', () => {
  const rel = JSON.parse(readFileSync(join(aqui, '..', 'gerado', '_relatorio.json'), 'utf8'));
  assert.equal(rel.problemas.length, 0);
  assert.equal(rel.avisos.length, 0);
  const competindo = base.clubes.filter((c) => !c.reserva);
  assert.equal(competindo.length, 76);
  for (const c of competindo) {
    assert.ok(base.elencos[c.id].length >= 20, c.id);
    assert.ok(base.tecnicos.some((t) => t.clubeId === c.id), c.id);
  }
  assert.equal(base.frases.length, 324);
  assert.equal(base.tatica.estilos.length, 12);
});

test('mesma semente dá o mesmo jogo, com a mesma narração', () => {
  const r1 = jogar(123);
  const r2 = jogar(123);
  assert.deepEqual(semObjetos(r1), semObjetos(r2));
  assert.deepEqual(narrar(r1, base.frases, 123, { competicao: 'Liga' }), narrar(r2, base.frases, 123, { competicao: 'Liga' }));
});

test('sementes diferentes dão jogos diferentes', () => {
  assert.notDeepEqual(jogar(1).lances, jogar(2).lances);
});

test('motor e narração são puros: sem arquivo, console ou relógio', () => {
  for (const pasta of ['motor', 'narracao']) {
    for (const arq of readdirSync(join(aqui, '..', pasta))) {
      const src = readFileSync(join(aqui, '..', pasta, arq), 'utf8');
      assert.doesNotMatch(src, /from 'node:|console\.|process\.|Date\.|Math\.random/, `${pasta}/${arq}`);
    }
  }
});

test('contas dos exemplos do GDD', () => {
  // Seção 3: ponta Dri 16, Agi 14; lateral Des 11, Agi 12; um defensor a mais.
  assert.ok(Math.abs(mediaPonderada([16, 14]) - 15.2) < 1e-9);
  assert.ok(Math.abs(mediaPonderada([11, 12]) - 11.4) < 1e-9);
  assert.ok(Math.abs(chanceDisputa(50, 15.2, 11.4, 1, 2) - 52.7) < 1e-9);
  // Seção 8: cara a cara em Centro F5, sem marcador, Perigo de cerca de 27.
  assert.ok(Math.abs(chanceGol({ corredor: 2, faixa: 5, tipo: 'caraACara', vAtk: 12, vGol: 12, comMarcador: false }) - 27.3 * GDD.escalaZona) < 1e-9);
  // Limites.
  assert.equal(chanceDisputa(85, 20, 1, 3, 0), 95);
  assert.equal(chanceDisputa(35, 1, 20, 0, 5), 5);
});

const peca = (posicao: string, nome: string): Instrucao => {
  const i = base.tatica.instrucoes.find((x) => x.posicao === posicao && x.nome === nome);
  assert.ok(i, nome);
  return i;
};
const falsoEscalado = (zona: string, com: Instrucao | null, efCom: number, sem: Instrucao | null = null, efSem = 0): Escalado => ({
  j: { nome: zona, tracos: [], qualidades: [], defeitos: [], atributos: {} } as unknown as Escalado['j'], time: 0, vaga: 'MC', zonaCom: zonaDeCodigo(zona), zonaSem: zonaDeCodigo(zona), zonaSemBase: zonaDeCodigo(zona),
  retorno: 0, forma: 0, jogosGrandes: 0, energia: 100, moral: 60, modBloco: 0, instrCom: com, instrSem: sem, efCom, efSem, pesoCom: [], pesoSem: [], pesoContra: [],
  amarelos: 0, expulso: null, saiuSemTroca: false, lesao: null, nota: 6,
});
const padraoNormal = { linha: 'Média', pressao: 'Média', largura: 'Normal', ritmo: 'Normal', saida: 'Mista' } as PadraoTime;

test('GDD 4: exemplo da Diagonal da Morte dá 22,1% em Centro F5', () => {
  const ef = calcularEfeitos([
    falsoEscalado('CE5', peca('Centroavante', 'Falso 9'), 0.85),
    falsoEscalado('PE4', peca('Ponta', 'Corta pra dentro'), 0.85),
  ], base.tatica.combinacoes, padraoNormal);
  assert.ok(Math.abs(ef.chance[zonaDeCodigo('CE5')] - 22.1) < 1e-9, String(ef.chance[zonaDeCodigo('CE5')]));
  assert.ok(ef.combinacoes.includes('Diagonal da Morte'));
  assert.equal(ef.combinacaoNaZona[zonaDeCodigo('CE5')], 'Diagonal da Morte');
});

test('GDD 4: brecha pelo custo de Risco, coberta na zona e na vizinha', () => {
  const buraco = peca('Lateral', 'Apoia por fora'); // Abre buraco Lado F2-3, Risco G: 12%
  const cobre = peca('Lateral', 'Fica para defender'); // Cobre Lado F2
  const brecha = (l: Escalado[]) => calcularEfeitos(l, [], padraoNormal).brechaTransicao[zonaDeCodigo('PE2')];
  assert.equal(brecha([falsoEscalado('PE2', buraco, 0.3)]), 12); // não é escalada pela eficácia
  assert.equal(brecha([falsoEscalado('PE2', buraco, 1), falsoEscalado('PE3', null, 0, cobre, 1)]), 0);
  // Cobre em Lado F2 vale a zona; um Cobre Lado F2 cobrindo PE3 seria vizinho e anularia metade.
  const f3 = calcularEfeitos([falsoEscalado('PE2', buraco, 1), falsoEscalado('PE3', null, 0, cobre, 1)], [], padraoNormal).brechaTransicao[zonaDeCodigo('PE3')];
  assert.equal(f3, 6);
});

test('GDD 4: congestionamento de -5% por peça a mais', () => {
  const pivo = peca('Centroavante', 'Homem de área'); // Ocupa Centro F6
  const ef = calcularEfeitos([falsoEscalado('CE6', pivo, 1), falsoEscalado('ME6', pivo, 1), falsoEscalado('MD6', pivo, 1)], [], padraoNormal);
  assert.equal(ef.chance[zonaDeCodigo('CE6')], -10);
});

test('GDD 5: exemplo do eixo Pressão x Saída', () => {
  // Pressão 20 contra a média 11,25 dos 12 estilos: peso 0,4375; o total do confronto ainda vale × 3.
  assert.ok(Math.abs(pontosEixo(16, 13, (20 - 11.25) / 20) - 1.3125) < 1e-9); // os passes do alvo perdem cerca de 4 (× 3)
  assert.ok(Math.abs(pontosEixo(16, 17, (20 - 11.25) / 20) + 0.4375) < 1e-9); // alvo ganha cerca de 1,3 (× 3)
  assert.equal(pontosEixo(20, 5, 1), 6); // limite do eixo
  assert.equal(pontosEixo(null, 13, 1), 0); // sem ninguém na posição
});

test('GDD 5: notas efetivas por degrau e limite de 1 a 20', () => {
  const posse = base.tatica.estilos.find((e) => e.nome === 'Posse Posicional')!;
  assert.deepEqual(notasEfetivas(posse, posse.padrao), posse.notas);
  const n = notasEfetivas(posse, { ...posse.padrao, linha: 'Média', pressao: 'Alta' });
  assert.equal(n.Bloco, posse.notas.Bloco - 3);
  assert.equal(n.Risco, posse.notas.Risco - 2);
  assert.equal(n.Pressao, posse.notas.Pressao + 4);
  assert.equal(n.Fisico, posse.notas.Fisico + 2);
  assert.equal(notasEfetivas(posse, { ...posse.padrao, saida: 'Direta' }).Posse, 15);
});

test('GDD 5: Bloco desloca o mapa sem a bola; Risco atrasa a volta', () => {
  assert.equal(faixaPeloBloco(3, 7), 2);
  assert.equal(faixaPeloBloco(1, 5), 1);
  assert.equal(faixaPeloBloco(3, 15), 4);
  assert.equal(faixaPeloBloco(3, 10), 3);
  assert.equal(faixaPeloBloco(3, 15, true), 3); // zagueiros e laterais não sobem
  assert.equal(faixaPeloBloco(3, 7, true), 2); // mas recuam
  assert.equal(calcularRetorno(2, 10), 1);
  assert.equal(calcularRetorno(2, 16), 2);
  assert.equal(calcularRetorno(2, 5), 0);
});

test('melhor encaixe: nenhum jogador recebe instrução que contraria o estilo ou fora da posição', () => {
  const r = jogar(7, 'ALA', 'BAR');
  for (const t of r.times) {
    assert.ok(Math.abs(t.confronto.viabilidade) <= 3);
    for (const e of t.escalados) {
      for (const i of [e.instrCom, e.instrSem]) assert.ok(!i || !i.contraria.includes(t.estilo.nome), i?.nome);
      assert.ok(e.instrCom === null || e.instrCom.fase === 'Com');
      assert.ok(e.instrSem === null || e.instrSem.fase === 'Sem');
    }
  }
});

test('instruções do time mudam as notas sem quebrar o jogo', () => {
  const ent = { ...entradaTime(base, 'ALA'), padrao: { linha: 'Baixa', pressao: 'Baixa' } } as const;
  // Só o início: nas pausas o técnico pode mexer na linha, conforme o placar daquela semente.
  assert.equal(montarTime(0, ent, base.tatica, criarRng(9), false).padrao.linha, 'Baixa');
  const r = simularPartida({ mandante: ent, visitante: entradaTime(base, 'BAR'), tatica: base.tatica, semente: 9 });
  assert.ok(r.cadeias > 80);
});

test('GDD 6: exemplos de gasto de energia', () => {
  const custoG = { custo: { energia: 'G', risco: '0', posse: '0' } } as Instrucao;
  const volante = falsoEscalado('CE3', custoG, 1);
  volante.j.atributos = { Res: 12 };
  const time = (fisico: number) => ({ notas: { Fisico: fisico }, efeitos: { coberturas: new Map() }, apoio: APOIO_NEUTRO }) as unknown as TimeEmCampo;
  // O exemplo do GDD soma +1 de Empenho Alto, que a IA ainda não usa: 11,18 − 1.
  // O fator de posição (MC 1,05) vem por cima da conta do GDD; o goleiro gasta 30%.
  const fMC = 1.05;
  assert.ok(Math.abs(gastoBloco(volante, time(19)) - 10.18 * fMC) < 1e-9);
  const normal = falsoEscalado('CE3', null, 0);
  normal.j.atributos = { Res: 10 };
  assert.ok(Math.abs(gastoBloco(normal, time(10)) - 6.79 * fMC) < 1e-9);
  const gk = time(10);
  (gk as unknown as { goleiro: Escalado }).goleiro = normal;
  assert.ok(Math.abs(gastoBloco(normal, gk) - 6.79 * 0.3) < 1e-9);
  assert.equal(modEnergia(70), 0);
  assert.equal(modEnergia(52), -1);
  assert.equal(modEnergia(40), -2);
});

test('GDD 6: tabelas de moral e ímpeto, casa e Gelo', () => {
  assert.deepEqual([20, 40, 70, 90, 95].map(modMoral), [-2, -1, 0, 1, 2]);
  assert.deepEqual([10, 25, -60, 80].map(modImpeto), [0, 1, -2, 2.5]);
  assert.equal(decairImpeto(5), 0);
  assert.equal(decairImpeto(-35), -25);
  const casa = { indice: 0, emCasa: true, escalados: [] } as unknown as TimeEmCampo;
  const gelo = falsoEscalado('CE3', null, 0);
  gelo.j.qualidades = ['Gelo'];
  const fora = { indice: 1, emCasa: false, escalados: [gelo] } as unknown as TimeEmCampo;
  const impeto: [number, number] = [0, 0];
  aplicarImpeto(impeto, casa, 30);
  aplicarImpeto(impeto, fora, -20);
  assert.deepEqual(impeto, [37.5, -15]);
  aplicarImpeto(impeto, casa, 200);
  assert.equal(impeto[0], 100);
});

test('partida: 5 pausas, energia cai, até 5 trocas e técnicos reagem', () => {
  let ajustes = 0;
  let trocas = 0;
  for (let s = 1; s <= 60; s++) {
    const r = jogar(s);
    assert.equal(r.pausas.length, 5);
    for (const t of r.times) {
      assert.ok(t.trocas <= 5);
      assert.equal(t.participantes.length, 11 + t.trocas);
      trocas += t.trocas;
      assert.ok(t.participantes.every((e) => e.energia < 100 || t.escalados.includes(e) || e.saiuSemTroca || e.lesao !== null));
    }
    ajustes += r.pausas.flatMap((p) => p.times.flatMap((t) => t.ajustes)).filter((a) => !a.startsWith('sai ') && !a.startsWith('fala')).length;
  }
  assert.ok(ajustes > 0, 'nenhum técnico mexeu');
  console.log(JSON.stringify({ ajustesPorJogo: ajustes / 60, trocasPorJogo: trocas / 60 }));
});

test('GDD 8: contas de bola parada', () => {
  assert.equal(chanceBolaChega(14, 12), 43);
  assert.equal(chanceDueloAereo(15, 13), 48);
  assert.equal(chanceBolaChega(60, 1), 95);
  assert.equal(chancePenalti(14, 12), 79);
  assert.equal(chancePenalti(30, 1), 92);
  assert.equal(chancePenalti(1, 30), 55);
  // Cobrança direta em F5: 12% × duelo, sem ajuste de marcador.
  assert.equal(chanceGol({ corredor: 2, faixa: 5, tipo: 'falta', vAtk: 12, vGol: 12, comMarcador: null, baseFixa: 12 }), 12);
  // Cabeceio de escanteio em Centro F6, sem ajuste de marcador: 32 × 0,7.
  assert.ok(Math.abs(chanceGol({ corredor: 2, faixa: 6, tipo: 'cabeceio', vAtk: 12, vGol: 12, comMarcador: null }) - 22.4 * GDD.escalaZona) < 1e-9);
});

test('GDD 8 e Anexo A: chances de cartão e limiar da dividida', () => {
  const j = falsoEscalado('CE2', null, 0);
  j.j.atributos = { Comb: 10 };
  j.j.perfilJovem = null;
  assert.deepEqual(chancesCartao(j, false), { amarelo: 20, vermelho: 1 });
  assert.deepEqual(chancesCartao(j, true), { amarelo: 40, vermelho: 15 });
  j.j.defeitos = ['Esquentado'];
  assert.deepEqual(chancesCartao(j, false), { amarelo: 30, vermelho: 2 });
  // Exemplo da seção 8: empate aos 80 minutos, limiar 20.
  j.j.defeitos = [];
  assert.equal(limiarDividida(j, 5, 80, 0), 20);
  assert.equal(limiarDividida(j, 6, 30, 3), 50);
  j.j.atributos = { Comb: 15 };
  j.j.defeitos = ['Indisciplinado'];
  assert.equal(limiarDividida(j, 5, 30, 2), 17);
});

test('Anexo A: Fominha, Firuleiro, Indisciplinado e Inseguro', () => {
  const j = falsoEscalado('CE5', null, 0);
  j.j.defeitos = ['Fominha'];
  assert.equal(pesoDefeito(j, 'drible', 4, 0), 1.3);
  assert.equal(pesoDefeito(j, 'passeCurto', 5, 0), 0.8);
  assert.equal(pesoDefeito(j, 'drible', 3, 0), 1);
  j.j.defeitos = ['Firuleiro'];
  assert.equal(pesoDefeito(j, 'drible', 2, 0), 1.2);
  assert.equal(pesoDefeito(j, 'drible', 2, 2), 1.5);
  assert.equal(penaFirula(j, 'drible', 3), -1);
  assert.equal(penaFirula(j, 'drible', 4), 0);
  const ins = { chaves: ['Dec'], tracos: [] } as unknown as Instrucao;
  const k = falsoEscalado('CE3', null, 0);
  k.j.posicao = 'MC';
  k.j.atributos = { DT: 10, Dec: 10 };
  assert.ok(Math.abs(eficaciaBase(k, ins) - 0.5) < 1e-9);
  k.j.defeitos = ['Indisciplinado'];
  assert.ok(Math.abs(eficaciaBase(k, ins) - 0.4) < 1e-9);
  const elenco = entradaTime(base, 'ALA').elenco.map((x) => ({ ...x, perfilJovem: 'Inseguro', atributos: { ...x.atributos, JG: 10 } }));
  const ent = { ...entradaTime(base, 'ALA'), elenco };
  assert.ok(montarTime(0, ent, base.tatica, criarRng(1), true).escalados.every((e) => e.jogosGrandes === -1));
  assert.ok(montarTime(0, ent, base.tatica, criarRng(1), false).escalados.every((e) => e.jogosGrandes === 0));
});

test('GDD 8: banco de 9 reservas, com goleiro, sem repetir titular', () => {
  for (const c of base.clubes.filter((x) => !x.reserva)) {
    const t = montarTime(0, entradaTime(base, c.id), base.tatica, criarRng(1), false);
    assert.equal(t.banco.length, 9, c.id);
    assert.ok(t.banco.some((j) => j.posicao === 'GOL'), c.id);
    assert.ok(t.banco.every((j) => !t.escalados.some((e) => e.j === j)), c.id);
  }
});

test('GDD 8: batedor é o maior BP e o estilo Bola Parada soma +2', () => {
  const a = falsoEscalado('CE2', null, 0);
  const b = falsoEscalado('CE3', null, 0);
  a.j.atributos = { BP: 9 };
  b.j.atributos = { BP: 15 };
  const t = { escalados: [a, b], estilo: { nome: 'Bola Parada' }, apoio: APOIO_NEUTRO } as unknown as TimeEmCampo;
  assert.equal(escolherBatedor(t), b);
  assert.equal(bonusEnsaiada(t), 2);
  assert.equal(bonusEnsaiada({ estilo: { nome: 'Ginga' }, apoio: APOIO_NEUTRO } as unknown as TimeEmCampo), 0);
});

test('expulsão tira o jogador de campo, sem quebrar o jogo', () => {
  let expulsos = 0;
  for (let s = 1; s <= 400; s++) {
    const r = jogar(s);
    for (const t of r.times) {
      const fora = t.participantes.filter((e) => e.expulso);
      expulsos += fora.length;
      assert.ok(fora.every((e) => !t.escalados.includes(e)));
      assert.ok(t.escalados.includes(t.goleiro), 'time sem goleiro');
      assert.equal(new Set(t.escalados).size, t.escalados.length);
      const lesionadosSemTroca = t.participantes.filter((e) => e.saiuSemTroca && (e.lesao === 'media' || e.lesao === 'grave')).length;
      assert.equal(t.escalados.length, 11 - fora.length - lesionadosSemTroca);
      for (const e of t.participantes) assert.ok(e.amarelos <= 2);
    }
  }
  assert.ok(expulsos > 0, 'nenhuma expulsão em 400 jogos');
});

test('narração: cartão e pênalti sempre têm frase', () => {
  for (let s = 1; s <= 80; s++) {
    const r = jogar(s);
    const linhas = narrar(r, base.frases, s, { competicao: 'Liga' });
    const n = r.lances.filter((l) => ['Amarelo', 'Segundo amarelo', 'Vermelho direto', 'Marcado', 'Convertido', 'Defendido', 'Perdido'].includes(l.lance) && l.tema !== 'fogo').length;
    const ditas = linhas.filter((l) => l.voz === 'N' && (l.tema === 'penalti' || l.tema === 'falta')).length;
    assert.ok(ditas >= n, `semente ${s}: ${ditas} frases para ${n} lances`);
    assert.ok(linhas.every((l) => !/\{[a-z_0-9]+\}/.test(l.texto)));
  }
});

test('espelho das zonas', () => {
  assert.equal(codigoZona(espelhar(zonaDeCodigo('MD2'))), 'ME5');
  assert.equal(codigoZona(espelhar(zonaDeCodigo('PE1'))), 'PD6');
});

test('blocos respeitam o número de cadeias e o placar bate com os gols', () => {
  for (let s = 1; s <= 30; s++) {
    const r = jogar(s);
    assert.equal(r.cadeiasPorBloco.length, 6);
    r.cadeiasPorBloco.forEach((n, i) => {
      const extra = i === 2 || i === 5 ? 2 : 0;
      assert.ok(n >= 15 && n <= 21 + extra, `bloco ${i + 1}: ${n}`);
    });
    const gols = r.lances.filter((l) => l.tema === 'gol' || l.lance === 'Convertido').length;
    assert.equal(gols, r.placar[0] + r.placar[1]);
  }
});

test('narração: gol sempre tem frase e nenhum espaço fica sem preencher', () => {
  const r = jogar(42);
  const linhas = narrar(r, base.frases, 42, { competicao: 'Liga' });
  const convertidos = r.lances.filter((l) => l.lance === 'Convertido').length;
  assert.ok(linhas.filter((l) => l.tema === 'gol' && l.voz === 'N').length >= r.placar[0] + r.placar[1] - convertidos);
  assert.ok(linhas.every((l) => !/\{[a-z_0-9]+\}/.test(l.texto)), 'sobrou espaço sem preencher');
});

test('todos os 76 clubes jogam', () => {
  const ids = base.clubes.filter((c) => !c.reserva).map((c) => c.id);
  ids.forEach((id, i) => {
    const r = jogar(i, id, ids[(i + 1) % ids.length]);
    assert.ok(r.cadeias > 80);
  });
});

test('GDD 8: chance de lesão por bloco', () => {
  const perto = (a: number, b: number): void => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
  perto(chanceLesao(10, 100), 0.6);
  perto(chanceLesao(10, 40), 0.6);
  perto(chanceLesao(10, 39), 1.2);
  perto(chanceLesao(10, 25), 1.2);
  perto(chanceLesao(10, 24), 1.8); // × 3, não × 6
  perto(chanceLesao(20, 100, 0.7), 0.7);
  perto(chanceLesaoFaltaDura(10, 100), 1.6);
});

test('GDD 8: gravidade 60/30/10 e tempo fora dentro das faixas', () => {
  const rng = criarRng(5);
  const n = { leve: 0, media: 0, grave: 0 };
  const faixas = { leve: [1, 2], media: [3, 6], grave: [8, 24] };
  for (let i = 0; i < 100000; i++) {
    const g = sortearGravidade(rng);
    n[g] += 1;
    const s = semanasFora(g, rng);
    assert.ok(s >= faixas[g][0] && s <= faixas[g][1], `${g}: ${s}`);
  }
  assert.ok(Math.abs(n.leve / 1000 - 60) < 1 && Math.abs(n.media / 1000 - 30) < 1 && Math.abs(n.grave / 1000 - 10) < 1, JSON.stringify(n));
});

test('GDD 1: acréscimos contam gols, lesões e faltas, até 2', () => {
  assert.equal(calcularAcrescimos(0, 0, 2), 0);
  assert.equal(calcularAcrescimos(0, 1, 0), 1);
  assert.equal(calcularAcrescimos(0, 1, 3), 2);
  assert.equal(calcularAcrescimos(2, 2, 9), 2);
});

test('GDD 8: lesão leve vale -1 no modificador', () => {
  const t = { indice: 1 } as TimeEmCampo;
  const e = falsoEscalado('CE3', null, 0);
  const sem = calcularMod(e, t, 0, 1, 0);
  e.lesao = 'leve';
  assert.equal(calcularMod(e, t, 0, 1, 0), sem - 1);
});

const timeNovo = (): TimeEmCampo => montarTime(0, entradaTime(base, 'ALA'), base.tatica, criarRng(1), false);

test('GDD 1: lesionado sai, reserva entra na vaga e conta nas 5', () => {
  const t = timeNovo();
  const sai = t.escalados.find((e) => e !== t.goleiro)!;
  const entra = retirarLesionado(t, sai, base.tatica, criarRng(2), false);
  assert.ok(entra);
  assert.equal(entra.vaga, sai.vaga);
  assert.equal(t.trocas, 1);
  assert.equal(t.escalados.length, 11);
  assert.ok(!t.escalados.includes(sai) && !sai.saiuSemTroca);
  assert.ok(entra.pesoCom.length > 0, 'entrou sem mapa de presença');
});

test('GDD 1: sem trocas, o time segue com 10', () => {
  const t = timeNovo();
  t.trocas = 5;
  const sai = t.escalados.find((e) => e !== t.goleiro)!;
  assert.equal(retirarLesionado(t, sai, base.tatica, criarRng(2), false), null);
  assert.equal(t.trocas, 5);
  assert.equal(t.escalados.length, 10);
  assert.ok(sai.saiuSemTroca);
});

test('GDD 8: goleiro lesionado com e sem troca', () => {
  const comTroca = timeNovo();
  const reserva = retirarLesionado(comTroca, comTroca.goleiro, base.tatica, criarRng(2), false);
  assert.ok(reserva);
  assert.equal(comTroca.goleiro, reserva);
  assert.equal(reserva.j.posicao, 'GOL');
  assert.equal(comTroca.escalados.length, 11); // na lesão ninguém mais sai, ao contrário da expulsão

  const semTroca = timeNovo();
  semTroca.trocas = 5;
  const gol = semTroca.goleiro;
  const linha = semTroca.escalados.filter((e) => e !== gol);
  const maiorAgi = Math.max(...linha.map((e) => e.j.atributos.Agi ?? 0));
  assert.equal(retirarLesionado(semTroca, gol, base.tatica, criarRng(2), false), null);
  assert.equal(semTroca.escalados.length, 10);
  assert.ok(linha.includes(semTroca.goleiro));
  assert.equal(semTroca.goleiro.j.atributos.Agi, maiorAgi);
  assert.equal(semTroca.goleiro.j.atributos.Ref, GDD.goleiroImprovisado);
  assert.equal(semTroca.goleiro.vaga, 'GOL');
});

test('jogo segue íntegro com lesões, em 600 jogos', () => {
  const contagem = { leve: 0, media: 0, grave: 0, faltaDura: 0, semTroca: 0 };
  for (let s = 1; s <= 600; s++) {
    const r = jogar(s);
    for (const t of r.times) {
      assert.ok(t.trocas <= 5);
      assert.equal(t.participantes.length, 11 + t.trocas);
      assert.equal(new Set(t.escalados.map((e) => e.j.id)).size, t.escalados.length);
      assert.ok(t.escalados.includes(t.goleiro));
    }
    for (const l of r.lesoes) {
      const t = r.times[l.time];
      const e = t.participantes.find((x) => x.j.id === l.jogador);
      assert.ok(e, l.jogador);
      contagem[l.gravidade] += 1;
      if (l.origem === 'faltaDura') contagem.faltaDura += 1;
      assert.equal(l.saiu, l.gravidade !== 'leve');
      if (!l.saiu) continue;
      assert.ok(!t.escalados.includes(e), `${e.j.id} segue em campo`);
      if (l.substituto) assert.ok(t.participantes.some((x) => x.j.id === l.substituto));
      else { contagem.semTroca += 1; assert.ok(e.saiuSemTroca); }
      // Depois de sair, não aparece em mais nenhum lance (na falta dura, o resto da mesma cadeia ainda é a cobrança).
      const saida = r.lances.findIndex((x) => x.tema === 'lesao' && x.lance === 'Saída de campo' && x.jogador === l.jogador);
      const depois = r.lances.slice(saida + 1).filter((x) => x.tema !== 'lesao' && (x.jogador === l.jogador || x.jogador2 === l.jogador || x.goleiro === l.jogador));
      const cadeia = r.lances[saida].cadeia;
      assert.deepEqual(depois.filter((x) => l.origem === 'bloco' || x.cadeia > cadeia), [], `semente ${s}`);
    }
  }
  assert.ok(contagem.leve > 0 && contagem.media > 0 && contagem.grave > 0 && contagem.faltaDura > 0 && contagem.semTroca > 0, JSON.stringify(contagem));
  console.log(JSON.stringify(contagem));
});

test('narração: lesão sempre tem frase', () => {
  for (let s = 1; s <= 200; s++) {
    const r = jogar(s);
    const linhas = narrar(r, base.frases, s, { competicao: 'Liga' }).filter((l) => l.tema === 'lesao');
    assert.equal(linhas.filter((l) => l.voz === 'N').length, r.lances.filter((l) => l.tema === 'lesao').length, `semente ${s}`);
    assert.ok(linhas.every((l) => !/\{[a-z_0-9]+\}/.test(l.texto)));
  }
});

test('1.000 jogos rodam (só mede; metas são comparadas em npm run medir)', () => {
  const m = medir(base, 1000);
  assert.equal(m.jogos, 1000);
  assert.ok(m.finalizacoesPorJogo > 0);
  console.log(JSON.stringify(m));
});
