// Cenários de calibração do GDD 9. Só mede: --testar muda um número na memória, nunca no arquivo.
// Uso: npm run simular -- [--jogos 5000] [--so liga,zebra,bloco,risco,estilos] [--testar GDD.escalaZona=0.70]
import { calcularConfronto, viabilidade } from '../motor/confronto.ts';
import type { Clube, Estilo } from '../motor/dados.ts';
import { montarTime } from '../motor/escalacao.ts';
import { GDD, PROVISORIO } from '../motor/parametros.ts';
import { simularPartida } from '../motor/partida.ts';
import { criarRng } from '../motor/rng.ts';
import type { EntradaTime } from '../motor/tipos.ts';
import { carregarBase, entradaTime } from './carregar.ts';
import { medir } from './medicao.ts';

const CENARIOS = ['liga', 'zebra', 'bloco', 'risco', 'estilos'];
const TODOS = [...CENARIOS, 'espelho', 'inicios']; // diagnósticos: só rodam se pedidos em --so
const RISCO_ALTO = 15; // GDD 9: "Risco alto" é estilo com nota de Risco 15 ou mais
const PARES_ZEBRA = 400;
const JOGOS_ESTILO = 0.4; // fração de --jogos para cada um dos 12 estilos
const CLUBES_COMPATIVEIS = 20; // GDD 9: elenco compatível = os 20 clubes de maior viabilidade no estilo

function lerArgs(): { jogos: number; so: string[]; testar: string[] } {
  const a = process.argv.slice(2);
  const res = { jogos: 5000, so: CENARIOS, testar: [] as string[] };
  for (let i = 0; i < a.length; i += 2) {
    if (a[i] === '--jogos') res.jogos = Number(a[i + 1]);
    else if (a[i] === '--so') res.so = a[i + 1].split(',');
    else if (a[i] === '--testar') res.testar.push(a[i + 1]);
    else throw new Error(`Opção desconhecida: ${a[i]}`);
  }
  const invalido = res.so.find((c) => !TODOS.includes(c));
  if (invalido) throw new Error(`Cenário desconhecido: ${invalido}`);
  return res;
}

/** Troca um número só nesta execução. Falha se o caminho não existir ou não for número. */
function aplicarTeste(pedido: string): void {
  const [caminho, valor] = pedido.split('=');
  const partes = caminho.split('.');
  const raizes: Record<string, unknown> = { GDD, PROVISORIO };
  let alvo = raizes as Record<string, unknown>;
  for (const p of partes.slice(0, -1)) alvo = alvo[p] as Record<string, unknown>;
  const chave = partes[partes.length - 1];
  const novo = Number(valor);
  if (!alvo || typeof alvo[chave] !== 'number' || Number.isNaN(novo)) throw new Error(`--testar inválido: ${pedido}`);
  console.log(`TESTE (só nesta execução): ${caminho} ${alvo[chave]} → ${novo}`);
  alvo[chave] = novo;
}

const num = (v: number, d = 2): string => v.toFixed(d).replace('.', ',');
const pct = (n: number, total: number): number => (total ? (n / total) * 100 : 0);
const foraDe: string[] = [];

function linha(nome: string, valor: number, meta: string, min: number, max: number, d = 2): void {
  const sit = valor < min ? 'ABAIXO' : valor > max ? 'ACIMA' : 'dentro';
  if (sit !== 'dentro') foraDe.push(`${nome}: ${num(valor, d)} (${meta})`);
  console.log(`${nome.padEnd(46)}${num(valor, d).padStart(8)}   ${meta.padEnd(20)}${sit}`);
}

const args = lerArgs();
args.testar.forEach(aplicarTeste);
const base = carregarBase();
const clubes = base.clubes.filter((c) => !c.reserva);
const entrada = (c: Clube): EntradaTime => entradaTime(base, c.id);
const comEstilo = (ent: EntradaTime, e: Estilo): EntradaTime => ({
  ...ent, tecnico: { ...ent.tecnico, estilo: e.nome, formacaoComBola: e.formacaoComBola, formacaoSemBola: e.formacaoSemBola },
});
const montar = (i: 0 | 1, ent: EntradaTime) => montarTime(i, ent, base.tatica, criarRng(1), false);
const forca = new Map(clubes.map((c) => {
  const t = montar(0, entrada(c));
  return [c.id, t.escalados.reduce((s, e) => s + e.j.nota, 0) / t.escalados.length];
}));
const jogar = (a: EntradaTime, b: EntradaTime, semente: number): [number, number] =>
  simularPartida({ mandante: a, visitante: b, tatica: base.tatica, semente }).placar as [number, number];

function cenarioLiga(): void {
  const m = medir(base, args.jogos);
  console.log(`\nTEMPORADA (${args.jogos} jogos dentro das ligas)`);
  linha('Gols por jogo', m.golsPorJogo, '2,5 (2,3 a 2,7)', 2.3, 2.7);
  linha('0 a 0 (%)', m.zeroAZeroPct, '8 (6 a 10)', 6, 10, 1);
  linha('Finalizações', m.finalizacoesPorJogo, '25 (18 a 32)', 18, 32, 1);
  linha('Contra-ataques', m.contraAtaquesPorJogo, '10 (8 a 12)', 8, 12);
  linha('Escanteios', m.escanteiosPorJogo, '10 (8 a 12)', 8, 12);
  linha('Amarelos', m.amarelosPorJogo, '4 (3 a 5)', 3, 5);
  linha('Lesões médias ou graves', m.lesoesMediasGravesPorJogo, '0,3 (0,2 a 0,4)', 0.2, 0.4);
  linha('Times iguais: casa (%)', m.iguais.mandantePct, '45 (41 a 49)', 41, 49, 1);
  linha('Times iguais: empate (%)', m.iguais.empatePct, '27 (23 a 31)', 23, 31, 1);
  linha('Times iguais: fora (%)', m.iguais.visitantePct, '28 (24 a 32)', 24, 32, 1);
}

interface Confronto { fraco: EntradaTime; forte: EntradaTime }

/** GDD 9: viabilidade e pontuação do plano (soma dos 3 eixos menos a brecha média por zona). */
function avaliarPlano(fraco: EntradaTime, forte: EntradaTime): { viavel: boolean; pontos: number; viab: number; eixos: number } {
  const a = montar(0, fraco);
  const c = calcularConfronto(a, montar(1, forte), base.tatica.estilos);
  const brecha = [...a.efeitos.brechaSem, ...a.efeitos.brechaTransicao].reduce((s, v) => s + v, 0) / a.efeitos.brechaSem.length;
  const eixos = c.pressaoSaida + c.velocidadeCostas + c.criacaoBloco;
  return { viavel: c.viabilidade >= 1, pontos: eixos - brecha, viab: c.viabilidade, eixos };
}

function jogarZebra(lista: Confronto[], semente: number): { vitoria: number; empate: number } {
  const rng = criarRng(semente);
  let vitoria = 0;
  let empate = 0;
  for (let i = 1; i <= args.jogos; i++) {
    const { fraco, forte } = rng.um(lista);
    const fracoEmCasa = i % 2 === 0;
    const [x, y] = fracoEmCasa ? jogar(fraco, forte, semente + i) : jogar(forte, fraco, semente + i);
    const [gf, gs] = fracoEmCasa ? [x, y] : [y, x];
    if (gf > gs) vitoria += 1;
    else if (gf === gs) empate += 1;
  }
  return { vitoria: pct(vitoria, args.jogos), empate: pct(empate, args.jogos) };
}

function cenarioZebra(): void {
  const rng = criarRng(20261111);
  const pares = clubes.flatMap((f) => clubes.filter((o) => {
    const d = forca.get(o.id)! - forca.get(f.id)!;
    return d >= 3 && d <= 4;
  }).map((o) => [f, o] as const));
  const amostra = Array.from({ length: Math.min(PARES_ZEBRA, pares.length) }, () => rng.um(pares));
  const neutro: Confronto[] = [];
  const certo: Confronto[] = [];
  const perfil = { neutro: { viab: 0, eixos: 0, n: 0 }, certo: { viab: 0, eixos: 0, n: 0 } };
  for (const [f, o] of amostra) {
    const fraco = entrada(f);
    const forte = entrada(o);
    const planos = base.tatica.estilos.map((e) => ({ e, ent: comEstilo(fraco, e), ...avaliarPlano(comEstilo(fraco, e), forte) })).sort((p, q) => q.pontos - p.pontos);
    const melhores = planos.slice(0, 3);
    const doTecnico = planos.find((p) => p.e.nome === fraco.tecnico.estilo)!;
    if (!(doTecnico.viavel && melhores.includes(doTecnico))) {
      neutro.push({ fraco, forte });
      perfil.neutro.viab += doTecnico.viab;
      perfil.neutro.eixos += doTecnico.eixos;
      perfil.neutro.n += 1;
    }
    for (const p of melhores) {
      if (!p.viavel) continue;
      certo.push({ fraco: p.ent, forte });
      perfil.certo.viab += p.viab;
      perfil.certo.eixos += p.eixos;
      perfil.certo.n += 1;
    }
  }
  const media = (g: { viab: number; eixos: number; n: number }): string => `viabilidade ${num(g.viab / g.n)}, soma dos eixos ${num(g.eixos / g.n)}`;
  console.log(`Plano neutro ou ruim: ${media(perfil.neutro)} · plano certo: ${media(perfil.certo)}`);
  console.log(`\nZEBRA (${args.jogos} jogos por plano; ${pares.length} pares com diferença de 3 a 4, amostra de ${amostra.length}; ${neutro.length} com plano neutro ou ruim, ${certo.length} planos certos)`);
  if (neutro.length) {
    const r = jogarZebra(neutro, 3000000);
    linha('Fraco vence, plano neutro ou ruim (%)', r.vitoria, '12 (10 a 15)', 10, 15, 1);
  }
  if (certo.length) {
    const r = jogarZebra(certo, 4000000);
    linha('Fraco vence, plano certo (%)', r.vitoria, '25 (22 a 28)', 22, 28, 1);
    linha('Teto do plano certo (%)', r.vitoria, 'até 35', 0, 35, 1);
  } else {
    foraDe.push('Plano certo: nenhum plano viável');
    console.log('Plano certo: nenhum plano viável');
  }
}

function jogarEstilos(estilos: Estilo[], semente: number): { gols: number; zero: number } {
  const rng = criarRng(semente);
  let gols = 0;
  let zero = 0;
  for (let i = 1; i <= args.jogos; i++) {
    const a = rng.um(clubes);
    const b = rng.um(clubes.filter((c) => c.liga === a.liga && c.id !== a.id));
    const [x, y] = jogar(comEstilo(entrada(a), rng.um(estilos)), comEstilo(entrada(b), rng.um(estilos)), semente + i);
    gols += x + y;
    zero += x + y === 0 ? 1 : 0;
  }
  return { gols: gols / args.jogos, zero: pct(zero, args.jogos) };
}

function cenarioBloco(): void {
  const r = jogarEstilos(base.tatica.estilos.filter((e) => e.nome === 'Bloco Baixo'), 5000000);
  console.log(`\nDOIS BLOCOS BAIXOS (${args.jogos} jogos)`);
  linha('Gols por jogo', r.gols, '1,3 (1,0 a 1,6)', 1, 1.6);
  linha('0 a 0 (%)', r.zero, '25 (18 a 32)', 18, 32, 1);
}

function cenarioRisco(): void {
  const estilos = base.tatica.estilos.filter((e) => e.notas.Risco >= RISCO_ALTO);
  const r = jogarEstilos(estilos, 6000000);
  console.log(`\nDOIS DE RISCO ALTO (${args.jogos} jogos; nota de Risco ${RISCO_ALTO}+: ${estilos.map((e) => e.nome).join(', ')})`);
  linha('Gols por jogo', r.gols, '2,7 (2,4 a 3,0)', 2.4, 3);
}

function cenarioEstilos(): void {
  const jogos = Math.round(args.jogos * JOGOS_ESTILO);
  const res: { nome: string; ap: number; clubes: number }[] = [];
  base.tatica.estilos.forEach((e, k) => {
    const compativeis = clubes
      .map((c) => ({ c, v: viabilidade(montar(0, comEstilo(entrada(c), e)), base.tatica.estilos) }))
      .sort((p, q) => q.v - p.v)
      .slice(0, CLUBES_COMPATIVEIS)
      .map((x) => x.c);
    const rng = criarRng(7000000 + k);
    let pontos = 0;
    if (compativeis.length) {
      for (let i = 1; i <= jogos; i++) {
        const a = rng.um(compativeis);
        const b = entrada(rng.um(clubes.filter((c) => c.liga === a.liga && c.id !== a.id)));
        const ent = comEstilo(entrada(a), e);
        const emCasa = i % 2 === 0;
        const [x, y] = emCasa ? jogar(ent, b, 7100000 + k * 100000 + i) : jogar(b, ent, 7100000 + k * 100000 + i);
        const [gf, gs] = emCasa ? [x, y] : [y, x];
        pontos += gf > gs ? 3 : gf === gs ? 1 : 0;
      }
    }
    res.push({ nome: e.nome, ap: pct(pontos, jogos * 3), clubes: compativeis.length });
  });
  const comDados = res.filter((r) => r.clubes > 0);
  const media = comDados.reduce((s, r) => s + r.ap, 0) / comDados.length;
  console.log(`\n12 ESTILOS, ELENCO COMPATÍVEL (${CLUBES_COMPATIVEIS} clubes de maior viabilidade; ${jogos} jogos cada; média ${num(media, 1)}%)`);
  for (const r of [...res].sort((p, q) => q.ap - p.ap)) console.log(`${r.nome.padEnd(22)}${num(r.ap, 1).padStart(7)}%  ${(r.ap >= media ? '+' : '') + num(r.ap - media, 1)} pts  ${r.clubes} clubes`);
  linha('Maior vantagem sobre a média (pontos)', Math.max(...comDados.map((r) => r.ap - media)), 'até 8', -100, 8, 1);
}

/** Diagnóstico, sem meta: cada estilo contra ele mesmo, para ver o quanto o estilo muda o jogo. */
function cenarioEspelho(): void {
  const jogos = Math.round(args.jogos * JOGOS_ESTILO);
  console.log(`\nESPELHO (${jogos} jogos por estilo, dentro das ligas; só diagnóstico)`);
  console.log('Estilo                   Gols   Final   Conv%  Contras  Escant   0x0%');
  base.tatica.estilos.forEach((e, k) => {
    const rng = criarRng(8000000 + k);
    const s = { gols: 0, fin: 0, contra: 0, esc: 0, zero: 0 };
    for (let i = 1; i <= jogos; i++) {
      const a = rng.um(clubes);
      const b = rng.um(clubes.filter((c) => c.liga === a.liga && c.id !== a.id));
      const [x, y] = simularPartida({ mandante: comEstilo(entrada(a), e), visitante: comEstilo(entrada(b), e), tatica: base.tatica, semente: 8100000 + k * 100000 + i }).estatisticas;
      s.gols += x.gols + y.gols;
      s.fin += x.finalizacoes + y.finalizacoes;
      s.contra += x.contraAtaques + y.contraAtaques;
      s.esc += x.escanteios + y.escanteios;
      s.zero += x.gols + y.gols === 0 ? 1 : 0;
    }
    console.log(`${e.nome.padEnd(22)}${num(s.gols / jogos).padStart(6)}${num(s.fin / jogos, 1).padStart(8)}${num(pct(s.gols, s.fin), 1).padStart(8)}${num(s.contra / jogos).padStart(9)}${num(s.esc / jogos).padStart(8)}${num(pct(s.zero, jogos), 1).padStart(7)}`);
  });
}

/** Diagnóstico, sem meta: o que rende cada tipo de início de cadeia. */
function cenarioInicios(): void {
  const rng = criarRng(9500000);
  const soma: Record<string, { cadeias: number; finalizacoes: number; gols: number }> = {};
  for (let i = 1; i <= args.jogos; i++) {
    const a = rng.um(clubes);
    const b = rng.um(clubes.filter((c) => c.liga === a.liga && c.id !== a.id));
    const r = simularPartida({ mandante: entrada(a), visitante: entrada(b), tatica: base.tatica, semente: 9600000 + i });
    for (const [tipo, v] of Object.entries(r.porInicio)) {
      const s = (soma[tipo] ??= { cadeias: 0, finalizacoes: 0, gols: 0 });
      s.cadeias += v.cadeias;
      s.finalizacoes += v.finalizacoes;
      s.gols += v.gols;
    }
  }
  console.log(`\nINÍCIOS DE CADEIA (${args.jogos} jogos; só diagnóstico)`);
  console.log('Tipo            Cadeias/jogo  Final/100  Gols/100  Gols/jogo');
  for (const [tipo, s] of Object.entries(soma).sort((p, q) => q[1].cadeias - p[1].cadeias)) {
    console.log(`${tipo.padEnd(16)}${num(s.cadeias / args.jogos, 1).padStart(12)}${num(pct(s.finalizacoes, s.cadeias), 1).padStart(11)}${num(pct(s.gols, s.cadeias), 2).padStart(10)}${num(s.gols / args.jogos).padStart(11)}`);
  }
}

const executar: Record<string, () => void> = { liga: cenarioLiga, zebra: cenarioZebra, bloco: cenarioBloco, risco: cenarioRisco, estilos: cenarioEstilos, espelho: cenarioEspelho, inicios: cenarioInicios };
for (const c of TODOS) if (args.so.includes(c)) executar[c]();
console.log(`\nFora da faixa: ${foraDe.length ? foraDe.join(' · ') : 'nada'}`);
