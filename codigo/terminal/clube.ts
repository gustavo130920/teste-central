// Uso: npm run clube -- [SEMENTE] [--auto] [--entradas "1;Fulano;2;;;"] [--anos N]
// Carreira com o clube do jogador (etapa 4, 8ª fatia, partes 8a e 8b1; GDD-gestao 1 e 8, GDD-motor 7). Leitura de teclado síncrona.
// Enter em qualquer pergunta = "Avançar" (mantém o que está, ou deixa com a delegação).
// --auto: Enter em tudo (teste rápido). --entradas: respostas na ordem, separadas por ";" (depois delas, Enter).
import { readSync } from 'node:fs';
import type { Jogador, PadraoTime } from '../motor/dados.ts';
import type { AjustePausa, Lance, ResultadoPartida, Tom } from '../motor/tipos.ts';
import { narrar } from '../narracao/narrar.ts';
import type { Carga, Foco } from '../gestao/treino.ts';
import type { NivelMeta } from '../gestao/diretoria.ts';
import type { Memoria } from '../temporada/memoria.ts';
import type { JogoDisputado } from '../temporada/temporada.ts';
import type { Area, ControleJogador, FichaTecnico, InfoJogo, Origem } from '../temporada/jogador.ts';
import { AREAS, ATALHOS, TECNICO_JOGADOR, assumirClube, criarTecnicoDoJogador, mudarTatica, progressoTatica } from '../temporada/jogador.ts';
import { criarMundo, jogarAno, virar } from '../temporada/virada.ts';
import { semanaDoDia } from '../gestao/mercado.ts';
import { carregarBase } from './carregar.ts';

// ---------- Entrada ----------
const args = process.argv.slice(2);
let auto = args.includes('--auto');
const fila: string[] = [];
let anosMax = Infinity;
let semente = 2026;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--entradas') fila.push(...(args[++i] ?? '').split(';'));
  else if (args[i] === '--anos') anosMax = Number(args[++i]);
  else if (/^\d+$/.test(args[i])) semente = Number(args[i]);
}

function lerLinha(): string | null {
  const buf = Buffer.alloc(1);
  let s = '';
  for (;;) {
    let n = 0;
    try { n = readSync(0, buf, 0, 1, null); } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'EAGAIN') continue;
      return null;
    }
    if (n === 0) return s.length ? s : null;
    const c = buf.toString('utf8');
    if (c === '\n') return s.replace(/\r$/, '');
    s += c;
  }
}

function perguntar(p: string): string {
  process.stdout.write(`${p} `);
  if (fila.length) { const v = fila.shift()!; console.log(v); return v.trim(); }
  if (auto) { console.log(''); return ''; }
  const v = lerLinha();
  if (v === null) { auto = true; console.log('(fim da entrada: Avançar em tudo)'); return ''; }
  return v.trim();
}
/** Número de 1 a n; vazio devolve null. */
function escolher(p: string, n: number): number | null {
  for (;;) {
    const v = perguntar(p);
    if (!v) return null;
    const k = Number(v);
    if (Number.isInteger(k) && k >= 1 && k <= n) return k - 1;
    console.log(`  Responda de 1 a ${n} (Enter = Avançar).`);
  }
}

// ---------- Mundo e início de carreira ----------
const base = carregarBase();
const m = criarMundo(base);
const nome = (id: string): string => m.clubes.find((c) => c.id === id)?.nomeCurto ?? id;
const COMP: Record<string, string> = { 'serie-a': 'Série A', 'serie-b': 'Série B', 'copa-do-brasil': 'Copa do Brasil', libertadores: 'Libertadores', mundial: 'Mundial', champions: 'Champions' };
const perfil = new Map(base.comercial.fichas.map((f) => [f.clubeId, f.perfil]));
const brasileiros = m.clubes.filter((c) => (c.liga === 'serie-a' || c.liga === 'serie-b') && !c.reserva);

console.log('\n=== Nova carreira (8ª fatia, parte 8a) ===');
brasileiros.forEach((c, i) => console.log(`  ${String(i + 1).padStart(2)}) ${c.nomeCurto.padEnd(16)} ${c.liga === 'serie-a' ? 'Série A' : 'Série B'} · Reputação ${c.reputacao} · ${perfil.get(c.id) ?? '-'}`));
const clube = brasileiros[escolher('Clube (número; Enter = 1):', brasileiros.length) ?? 0];
const antigo = m.tecnicos.find((t) => t.clubeId === clube.id)!;
const nomeTec = perguntar('Nome do técnico (Enter = Técnico Novato):') || 'Técnico Novato';
const ORIGENS: Origem[] = ['Ex-jogador', 'Estudioso', 'Formador da base'];
ORIGENS.forEach((o, i) => {
  const x = TECNICO_JOGADOR.origens[o];
  console.log(`  ${i + 1}) ${o}: Reputação ${TECNICO_JOGADOR.reputacao + x.reputacao}, ${Object.entries(x.trabalho).map(([k, v]) => `${k} +${v}`).join(', ')}`);
});
const origem = ORIGENS[escolher('Origem (Enter = Ex-jogador):', 3) ?? 0];
const estilos = m.tatica.estilos.map((s) => s.nome);
const formacoes = m.tatica.formacoes.map((f) => f.nome);
const lista = (xs: string[]): string => xs.map((x, i) => `${i + 1}) ${x}`).join('  ');
console.log(`  Estilos: ${lista(estilos)}`);
const estilo = estilos[escolher(`Estilo (Enter = ${antigo.estilo}, o do técnico anterior):`, estilos.length) ?? estilos.indexOf(antigo.estilo)];
console.log(`  Formações: ${lista(formacoes)}`);
const com = formacoes[escolher(`Formação com a bola (Enter = ${antigo.formacaoComBola}):`, formacoes.length) ?? formacoes.indexOf(antigo.formacaoComBola)];
const sem = formacoes[escolher(`Formação sem a bola (Enter = ${antigo.formacaoSemBola}):`, formacoes.length) ?? formacoes.indexOf(antigo.formacaoSemBola)];
const TEMP: FichaTecnico['temperamento'][] = ['Paizão', 'Linha-dura', 'Gestor'];
const temperamento = TEMP[escolher(`Temperamento: ${lista(TEMP)} (Enter = Gestor):`, 3) ?? 2];
const tecnico = criarTecnicoDoJogador({ nome: nomeTec, origem, estilo, formacaoComBola: com, formacaoSemBola: sem, temperamento });
assumirClube(m.tecnicos, clube, tecnico);
console.log(`\n${tecnico.nome} assume o ${clube.nome} (Reputação ${tecnico.reputacao}). ${antigo.nome} fica livre.`);

// Delegação (GDD-gestao 8). Na 8a, as áreas de negócio ficam sempre com a IA.
const delegado: Record<Area, boolean> = { tatica: false, treino: false, imprensa: false, mercado: true, comercial: true, base: true };
const limites = { cargaMax: 'pesada' as Carga, tom: 'Humildade' };
function menuDelegacao(): void {
  for (;;) {
    console.log('  Delegação: ' + (Object.keys(AREAS) as Area[]).map((a, i) => `${i + 1}) ${AREAS[a]}: ${delegado[a] ? 'delegado' : 'você'}${ATALHOS.gestor.includes(a) ? ' (manual na 8b)' : ''}`).join(' · '));
    console.log(`  Limites: carga máxima ${limites.cargaMax} · tom padrão ${limites.tom}. Atalhos: t) Técnico (campo com o auxiliar)  g) tudo com você  c) carga máxima  m) tom`);
    const v = perguntar('  Mudar (número, t, g, c, m; Enter sai):');
    if (!v) return;
    if (v === 't') for (const a of ATALHOS.tecnico) delegado[a] = true;
    else if (v === 'g') for (const a of ATALHOS.tecnico) delegado[a] = false;
    else if (v === 'c') limites.cargaMax = (['leve', 'normal', 'pesada'] as Carga[])[escolher('  Carga máxima 1) leve 2) normal 3) pesada:', 3) ?? 2];
    else if (v === 'm') limites.tom = perguntar('  Tom padrão (ex.: Humildade, Confiança):') || 'Humildade';
    else {
      const a = (Object.keys(AREAS) as Area[])[Number(v) - 1];
      if (a && !ATALHOS.gestor.includes(a)) delegado[a] = !delegado[a];
    }
  }
}
menuDelegacao();

// ---------- Telas do ciclo ----------
let logLido = 0;
function despejarLog(mem: Memoria): void {
  const log = mem.imprensa?.log ?? [];
  for (; logLido < log.length; logLido++) console.log(log[logLido]);
}
const estado = (mem: Memoria, id: string) => mem.jogadores.get(id);
const CARGAS: Carga[] = ['leve', 'normal', 'pesada'];
const FOCOS: Foco[] = ['tatica', 'fisico', 'tecnico', 'bolaParada', 'adversario'];
let ultimoTreino: { carga: Carga; foco: Foco } | null = null;
let titulares: string[] | null = null;
let padrao: Partial<PadraoTime> = {};
const rodada: JogoDisputado[] = [];
let ultimoDoClube: { d: JogoDisputado; r: ResultadoPartida } | null = null;

const PADRAO: [keyof PadraoTime, string[]][] = [
  ['linha', ['Alta', 'Média', 'Baixa']], ['pressao', ['Alta', 'Média', 'Baixa']], ['largura', ['Aberta', 'Normal', 'Estreita']],
  ['ritmo', ['Rápido', 'Normal', 'Lento']], ['saida', ['Curta', 'Mista', 'Direta']],
];

// ---------- Partida interativa (8b1) ----------
const PERIGO = ['gol', 'finalizacao', 'goleiro', 'penalti', 'lesao'];
const CARTOES = ['Amarelo', 'Segundo amarelo', 'Vermelho direto'];
const ehPerigo = (l: Lance): boolean => (PERIGO.includes(l.tema) && l.lance !== 'Defesa simples') || CARTOES.includes(l.lance);
function nomeJogador(id: string | null): string {
  if (!id) return '';
  for (const xs of Object.values(m.elencos)) { const j = xs.find((x) => x.id === id); if (j) return j.nome; }
  return id;
}
function mostrarLances(ls: Lance[]): void {
  for (const l of ls.filter(ehPerigo)) {
    const min = `${l.minuto}'${l.acrescimo ? `+${l.acrescimo}` : ''}`.padStart(6);
    const quem = [nomeJogador(l.jogador), l.jogador2 && l.tema === 'gol' ? `assist. ${nomeJogador(l.jogador2)}` : ''].filter(Boolean).join(', ');
    console.log(`${min} ${nome(l.clube)}: ${l.lance}${quem ? ` (${quem})` : ''}${l.resultado === 'gol' ? ' · GOL' : ''}`);
  }
}
const TONS: Tom[] = ['Cobrar', 'Acalmar', 'Elogiar'];

function telaResultado(): void {
  if (!ultimoDoClube) return;
  const { d, r } = ultimoDoClube;
  const k = d.mandante === clube.id ? 0 : 1;
  console.log(`\n--- 1. Resultado: ${nome(d.mandante)} ${d.placar[0]} x ${d.placar[1]} ${nome(d.visitante)} (${COMP[d.competicao] ?? d.competicao}${d.penaltis ? `, pênaltis ${d.penaltis[0]} x ${d.penaltis[1]}` : ''}) ---`);
  const quem = (id: string | null): string => (id ? r.times.flatMap((x) => x.participantes).find((e) => e.j.id === id)?.j.nome ?? '' : '');
  const gols = r.lances.filter((l) => l.resultado === 'gol' || l.resultado === 'gol contra').map((l) => `${l.minuto}' ${quem(l.jogador)}${l.resultado === 'gol contra' ? ' (contra)' : l.tema === 'penalti' ? ' (pênalti)' : ''}`);
  if (gols.length) console.log(`  Gols: ${gols.join(', ')}`);
  const [a, b] = r.estatisticas;
  console.log(`  Finalizações ${a.finalizacoes} x ${b.finalizacoes} · no alvo ${a.noAlvo} x ${b.noAlvo} · cartões ${a.amarelos + a.vermelhos} x ${b.amarelos + b.vermelhos}`);
  if (!delegado.tatica && r.lances.some((l) => l.bloco === 6)) { console.log('  Últimos 15 minutos:'); mostrarLances(r.lances.filter((l) => l.bloco === 6)); }
  const t = r.times[k];
  console.log('  Notas: ' + [...t.participantes].sort((x, y) => y.nota - x.nota).map((e) => `${e.j.nome} ${e.nota.toFixed(1)}`).join(', '));
  for (const l of r.lesoes.filter((x) => x.time === k)) console.log(`  Lesão: ${t.participantes.find((e) => e.j.id === l.jogador)?.j.nome} (${l.gravidade}, ${l.semanas} sem.)`);
  const outros = rodada.filter((j) => j.competicao === d.competicao && j.dia === d.dia && j !== d);
  if (outros.length) console.log('  Rodada: ' + outros.map((j) => `${nome(j.mandante)} ${j.placar[0]}x${j.placar[1]} ${nome(j.visitante)}`).join(' · '));
  if (perguntar('  Enter segue; n = ver a narração:') === 'n') {
    for (const l of narrar(r, base.frases, d.semente, { competicao: COMP[d.competicao] ?? d.competicao })) console.log(`${l.minuto.padStart(6)} ${l.voz === 'C' ? '  (comentarista) ' : ''}${l.texto}`);
  }
  ultimoDoClube = null;
}

function cabecalho(jogo: InfoJogo, mem: Memoria): void {
  const st = mem.diretoria.get(clube.id);
  const tab = mem.imprensa?.tabela;
  const liga = Object.keys(m.clubesPorLiga).find((l) => m.clubesPorLiga[l].includes(clube.id))!;
  const ordem = tab ? [...m.clubesPorLiga[liga]].sort((a, b) => { const p = tab.get(a) ?? { p: 0, sg: 0, gp: 0 }, q = tab.get(b) ?? { p: 0, sg: 0, gp: 0 }; return q.p - p.p || q.sg - p.sg || q.gp - p.gp; }) : [];
  const pts = tab?.get(clube.id)?.p ?? 0;
  console.log(`\n=== Ano ${m.ano} · semana ${semanaDoDia(jogo.dia)} · próximo: ${nome(jogo.adversario)} ${jogo.casa ? '(casa)' : '(fora)'} · ${COMP[jogo.competicao] ?? jogo.competicao}${jogo.classico ? ' · CLÁSSICO' : ''}${jogo.decisao ? ' · decisão' : ''} ===`);
  console.log(`  ${COMP[liga]}: ${ordem.indexOf(clube.id) + 1}º com ${pts} pts · Confiança ${st?.confianca.toFixed(0) ?? '-'} · Humor ${mem.humor.get(clube.id)?.toFixed(0) ?? '-'} · caixa R$ ${mem.financas.get(clube.id)?.caixa.toFixed(1) ?? '-'} mi`);
}

const controle: ControleJogador = {
  clube: clube.id,
  aoJogo(d, r) { ultimoDoClube = { d, r }; },
  aoCiclo(jogo, mem) {
    telaResultado();
    cabecalho(jogo, mem);
    console.log('--- 2. Notícias, eventos e coletiva ---');
  },
  evento(p, mem) {
    despejarLog(mem);
    console.log(`\n  EVENTO · ${p.modelo.titulo}: ${p.texto}`);
    p.opcoes.forEach((o, i) => console.log(`    ${i + 1}) ${o.texto}${o.chance !== null ? ` (chance ${o.chance.toFixed(0)}%)` : ''}`));
    const k = escolher('  Escolha (Enter = Avançar, opção mais neutra):', p.opcoes.length);
    return k === null ? null : p.opcoes[k].letra;
  },
  coletiva(p, mem) {
    if (delegado.imprensa) return { tom: limites.tom, assessoria: true };
    despejarLog(mem);
    console.log(`\n  COLETIVA (${p.assunto}): ${p.pergunta}${p.ultimosTons.length ? ` · últimos tons: ${p.ultimosTons.join(', ')}` : ''}`);
    p.respostas.forEach((r, i) => console.log(`    ${i + 1}) [${r.tom}] ${r.texto}`));
    const k = escolher('  Resposta (Enter = assessoria):', p.respostas.length);
    return k === null ? null : { tom: p.respostas[k].tom, assessoria: false };
  },
  treino(ciclo, ia, mem) {
    despejarLog(mem);
    const capar = (d: { carga: Carga; foco: Foco }) => (CARGAS.indexOf(d.carga) > CARGAS.indexOf(limites.cargaMax) ? { ...d, carga: limites.cargaMax } : d);
    if (delegado.treino) { const d = capar(ia); return d === ia ? null : d; }
    const atual = ultimoTreino ?? ia;
    console.log(`--- 3. Treino (ciclo ${ciclo}) · entrosamento da tática ${(progressoTatica(mem, clube.id) * 100).toFixed(0)}% · sugestão do auxiliar: ${ia.carga}, ${ia.foco} ---`);
    const v = perguntar(`  Carga 1) leve 2) normal 3) pesada e foco 1) tática 2) físico 3) técnico 4) bola parada 5) adversário, ex. "2 1" (Enter = ${atual.carga}, ${atual.foco}):`);
    if (v) {
      const [c, f] = v.split(/\s+/).map(Number);
      ultimoTreino = { carga: CARGAS[c - 1] ?? atual.carga, foco: FOCOS[f - 1] ?? atual.foco };
    }
    console.log('--- 4. Mercado, contratos e comissão: com o diretor (manual na 8b) ---');
    return ultimoTreino ?? ia;
  },
  escalar(p, mem) {
    despejarLog(mem);
    if (delegado.tatica) return null;
    const g = mem.gestao.get(clube.id)!;
    for (;;) {
      const t = g.tecnico;
      console.log(`--- 5. Próximo jogo: ${nome(p.jogo.adversario)} · ${t.estilo}, ${t.formacaoComBola} / ${t.formacaoSemBola} · entrosamento ${(progressoTatica(mem, clube.id) * 100).toFixed(0)}% · ajustes ${Object.entries(padrao).map(([k, v]) => `${k} ${v}`).join(', ') || 'nenhum'} ---`);
      const fora = [...p.desfalques.lesionados.map((id) => `${m.elencos[clube.id].find((j) => j.id === id)?.nome} (lesão)`), ...p.desfalques.suspensos.map((id) => `${m.elencos[clube.id].find((j) => j.id === id)?.nome} (suspenso)`)];
      if (fora.length) console.log(`  Fora: ${fora.join(', ')}`);
      console.log(`  Titulares: ${titulares ? titulares.filter((id) => p.elenco.some((j) => j.id === id)).map((id) => p.elenco.find((j) => j.id === id)!.nome).join(', ') + ' (o auxiliar completa as vagas)' : 'o auxiliar escolhe os melhores (poupa quem está abaixo de 70)'}`);
      const v = perguntar('  e) escolher titulares  a) auxiliar escolhe  t) estilo e formação  p) ajustes do padrão  d) delegação  Enter = jogar:');
      if (!v) break;
      if (v === 'e') {
        p.elenco.forEach((j: Jogador, i) => console.log(`    ${String(i + 1).padStart(2)}) ${j.posicao.padEnd(4)} ${j.nome.padEnd(18)} nota ${j.nota} · condição ${p.condicao[j.id] ?? 100} · moral ${estado(mem, j.id)?.moral.toFixed(0) ?? '-'}`));
        const ns = perguntar('  11 números separados por espaço:').split(/\s+/).map(Number).filter((n) => n >= 1 && n <= p.elenco.length);
        if (ns.length) titulares = [...new Set(ns.map((n) => p.elenco[n - 1].id))].slice(0, 11);
      } else if (v === 'a') titulares = null;
      else if (v === 't') {
        console.log(`  Estilos: ${lista(estilos)}`);
        const e = escolher(`  Estilo (Enter = ${t.estilo}):`, estilos.length);
        const c = escolher(`  Com a bola, ${lista(formacoes)} (Enter = ${t.formacaoComBola}):`, formacoes.length);
        const s = escolher(`  Sem a bola (Enter = ${t.formacaoSemBola}):`, formacoes.length);
        mudarTatica(mem, clube.id, m.tatica, { estilo: e === null ? t.estilo : estilos[e], formacaoComBola: c === null ? t.formacaoComBola : formacoes[c], formacaoSemBola: s === null ? t.formacaoSemBola : formacoes[s] });
      } else if (v === 'p') {
        for (const [k, ops] of PADRAO) {
          const x = escolher(`  ${k}: ${lista(ops)} (Enter = do estilo${padrao[k] ? `, hoje ${padrao[k]}` : ''}):`, ops.length);
          if (x === null) delete padrao[k]; else (padrao as Record<string, string>)[k] = ops[x];
        }
      } else if (v === 'd') { menuDelegacao(); if (delegado.tatica) return null; }
    }
    console.log('--- 6. Jogar ---');
    return { ...(titulares ? { titulares } : {}), ...(Object.keys(padrao).length ? { padrao } : {}) };
  },
  pausa(info, jogo) {
    if (delegado.tatica) return null;
    if (auto && !fila.length) return null; // teste rápido: o auxiliar decide, como a IA
    const i = info.lado;
    const t = info.time;
    const [a, b] = info.times;
    mostrarLances(info.lances);
    console.log(`\n--- ${info.intervalo ? 'INTERVALO' : `Pausa dos ${info.minuto}'`}: ${nome(i === 0 ? clube.id : jogo.adversario)} ${info.placar[0]} x ${info.placar[1]} ${nome(i === 0 ? jogo.adversario : clube.id)} ---`);
    console.log(`  Finalizações ${a.finalizacoes} x ${b.finalizacoes} · posse ${a.possePct}% x ${b.possePct}% · energia ${a.energiaMedia} x ${b.energiaMedia} · ímpeto ${a.impeto} x ${b.impeto}`);
    const adv = info.times[1 - i].ajustes;
    console.log(`  Adversário: ${adv.length ? adv.join(', ') : 'sem leitura das mudanças'}`);
    for (const x of info.extras) console.log(`  Analista: ${x}`);
    info.sugestoes.forEach((s, k) => console.log(`  Auxiliar ${k + 1}) ${s}`));
    const aj: AjustePausa = {};
    const resumo = (): string => [aj.estilo ? `estilo ${aj.estilo}` : '', ...Object.entries(aj.padrao ?? {}).map(([k, v]) => `${k} ${v}`),
      ...(aj.trocas ?? []).map(([s, e]) => `${nomeJogador(s)} por ${nomeJogador(e)}`), aj.fala ? `fala ${aj.fala}` : '', ...(aj.sugestoes ?? []).map((k) => `sugestão ${k + 1}`)].filter(Boolean).join(', ') || 'nada';
    for (;;) {
      console.log(`  Estilo ${aj.estilo ?? t.estilo.nome} · ${PADRAO.map(([k]) => `${k} ${aj.padrao?.[k] ?? t.padrao[k]}`).join(' · ')} · trocas restantes ${info.trocasRestantes - (aj.trocas?.length ?? 0)} · a aplicar: ${resumo()}`);
      const v = perguntar(`  s) sugestões  p) instruções do time  e) estilo  t) troca${info.intervalo ? '  f) fala' : ''}  a) auxiliar decide  Enter = seguir:`);
      if (!v) return aj;
      if (v === 'a') return null;
      if (v === 's') {
        const ns = perguntar('  Números das sugestões (ex.: 1 2):').split(/\s+/).map(Number).filter((n) => n >= 1 && n <= info.sugestoes.length);
        aj.sugestoes = [...new Set(ns.map((n) => n - 1))];
      } else if (v === 'p') {
        for (const [k, ops] of PADRAO) {
          const x = escolher(`  ${k}: ${lista(ops)} (Enter = ${aj.padrao?.[k] ?? t.padrao[k]}):`, ops.length);
          if (x !== null) aj.padrao = { ...aj.padrao, [k]: ops[x] };
        }
        console.log('  Custo: 1 instrução sem perda; 2 ou mais, eficácia × 0,9 nos próximos 15 minutos.');
      } else if (v === 'e') {
        console.log(`  Estilos: ${lista(estilos)}`);
        const x = escolher(`  Estilo (Enter = ${t.estilo.nome}; troca é radical, perde de 10% a 40% de eficácia por 15 minutos):`, estilos.length);
        if (x !== null) aj.estilo = estilos[x] === t.estilo.nome ? undefined : estilos[x];
      } else if (v === 't') {
        const campo = t.escalados;
        campo.forEach((e, k) => console.log(`    ${String(k + 1).padStart(2)}) ${e.vaga.padEnd(4)} ${e.j.nome.padEnd(18)} energia ${Math.round(e.energia)}${e.amarelos ? ' · amarelo' : ''}${e.lesao ? ` · lesão ${e.lesao}` : ''}`));
        t.banco.forEach((j, k) => console.log(`    b${k + 1}) ${j.posicao.padEnd(4)} ${j.nome.padEnd(18)} nota ${j.nota}`));
        const [s, e] = perguntar('  Quem sai e quem entra (ex.: 9 b2):').split(/\s+/);
        const sai = campo[Number(s) - 1];
        const entra = t.banco[Number(e?.replace(/^b/, '')) - 1];
        if (sai && entra && (aj.trocas?.length ?? 0) < info.trocasRestantes) aj.trocas = [...(aj.trocas ?? []), [sai.j.id, entra.id]];
        else console.log('  Troca inválida.');
      } else if (v === 'f' && info.intervalo) {
        const x = escolher(`  Fala: ${lista(TONS)} (Cobrar: perdendo ou apático · Acalmar: ímpeto negativo ou vantagem curta · Elogiar: jogando bem e na frente):`, 3);
        aj.fala = x === null ? undefined : TONS[x];
      }
    }
  },
  meta(metas) {
    console.log(`\n=== Ano ${m.ano}: metas da diretoria ===`);
    const niveis = (Object.keys(metas) as NivelMeta[]).filter((n) => metas[n]);
    niveis.forEach((n, i) => console.log(`  ${i + 1}) ${n}: ${metas[n]!.texto} · orçamento +${(metas[n]!.bonus * 100).toFixed(0)}%`));
    const k = escolher('  Meta (Enter = a diretoria escolhe):', niveis.length);
    return k === null ? null : niveis[k];
  },
};
m.jogador = controle;
m.eventos = { modelos: base.eventos, imprensa: base.imprensa, cenario: 'avancar', clubes: [clube.id], texto: clube.id };

// ---------- Temporadas ----------
for (let ano = 1; ano <= anosMax; ano++) {
  logLido = 0;
  rodada.length = 0;
  const t = jogarAno(m, semente, true, (j) => { if (j.dia !== rodada[rodada.length - 1]?.dia) rodada.length = 0; rodada.push(j); });
  telaResultado();
  despejarLog(t.memoria);
  const liga = Object.keys(t.tabelas).find((l) => t.tabelas[l].some((x) => x.clube === clube.id))!;
  const tab = t.tabelas[liga];
  console.log(`\n=== Fim do ano ${m.ano}: ${COMP[liga]} ===`);
  tab.forEach((x, i) => console.log(`  ${String(i + 1).padStart(2)}. ${nome(x.clube).padEnd(16)} ${String(x.pontos).padStart(3)} pts${x.clube === clube.id ? '  <<' : ''}`));
  const r = virar(m, t);
  console.log('  Campeões: ' + Object.entries(r.campeoes).map(([k, c]) => `${COMP[k] ?? k}: ${nome(c)}`).join(' · '));
  if (tecnico.clubeId !== clube.id) {
    const s = t.memoria.dir.saidas.filter((x) => x.clube === clube.id).pop();
    console.log(`\n${tecnico.nome} não é mais o técnico do ${clube.nomeCurto} (${s?.motivo ?? 'saída'}). Propostas de outros clubes chegam na 8b3. Fim da carreira.`);
    break;
  }
  if (perguntar('\nEnter = próxima temporada; s = sair:') === 's') break;
}
