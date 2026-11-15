// Uso: npm run carreira -- [ANOS] [SEMENTE] [sem-adaptacao] [--testar EVOLUCAO.idade.0.1=0.5 ...]
// Roda várias temporadas seguidas com a virada entre elas e mostra campeões, acesso e queda, vagas e o mundo ao fim.
// --testar troca um número só nesta execução (calibração do GDD-gestao 12), nunca no arquivo.
import { APOSENTADORIA, BASE, REPOSICAO } from '../gestao/base.ts';
import { EVOLUCAO, PERFIL } from '../gestao/evolucao.ts';
import { FINANCAS, PERFIS } from '../gestao/financas.ts';
import { MERCADO } from '../gestao/mercado.ts';
import { criarMundo, jogarAno, virar } from '../temporada/virada.ts';
import { carregarBase } from './carregar.ts';

const args: string[] = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] !== '--testar') { args.push(process.argv[i]); continue; }
  const pedido = process.argv[++i] ?? '';
  const [caminho, valor] = pedido.split('=');
  const partes = caminho.split('.');
  let alvo: Record<string, unknown> = { EVOLUCAO, BASE, APOSENTADORIA, PERFIL, REPOSICAO, FINANCAS, MERCADO };
  for (const p of partes.slice(0, -1)) alvo = (alvo?.[p] ?? null) as Record<string, unknown>;
  const chave = partes[partes.length - 1];
  const novo = Number(valor);
  if (!alvo || typeof alvo[chave] !== 'number' || Number.isNaN(novo)) throw new Error(`--testar inválido: ${pedido}`);
  console.log(`TESTE (só nesta execução): ${caminho} ${alvo[chave]} → ${novo}`);
  alvo[chave] = novo;
}
const anos = Number(args[0] ?? 5);
const semente = Number(args[1] ?? 2026);
const adaptacao = args[2] !== 'sem-adaptacao';

const base = carregarBase();
const nome = new Map(base.clubes.map((c) => [c.id, c.nomeCurto]));
const n = (id: string): string => nome.get(id) ?? id;
const m = criarMundo(base);
const NOMES: Record<string, string> = {
  'serie-a': 'Série A', 'serie-b': 'Série B', argentina: 'Argentina', colombia: 'Colômbia', chile: 'Chile',
  'copa-do-brasil': 'Copa do Brasil', libertadores: 'Libertadores', champions: 'Champions', mundial: 'Mundial',
};

// Retrato do mundo para a medição do GDD-gestao 12 (só os clubes das competições).
const retrato = () => {
  const js = Object.values(m.elencos).flat();
  return { nota: js.reduce((a, j) => a + j.nota, 0) / js.length, craques: js.filter((j) => j.nota >= 19).length, ativos: js.length + m.livres.length, idade: js.reduce((a, j) => a + j.idade, 0) / js.length };
};
const antes = retrato();
const aposentadorias: number[] = [];
const joias: number[] = [];
const livresNaVirada: number[] = [];
const inicio = Date.now();
const titulos = new Map<string, Record<string, number>>();
let jogos = 0;
// Coorte (GDD-gestao 12, "jovem com minutos"): quem tinha 16 ou 17 anos nos primeiros anos, com 10%+ dos minutos
// do clube em alguma temporada; quem nunca chega ao Potencial conta como "não chegou" na mediana.
const coorte = new Map<string, { ano: number; minutos: boolean; chegou: number | null }>();
const ANOS_COORTE = Math.max(1, anos - 8);
const acompanharCoorte = (i: number) => {
  const mem = m.memoria;
  if (!mem) return;
  const todos = [...Object.entries(m.elencos).flatMap(([c, js]) => js.map((j) => ({ j, c, pro: true }))),
    ...[...mem.base].flatMap(([c, js]) => js.map((j) => ({ j, c, pro: false })))];
  for (const { j, c, pro } of todos) {
    let x = coorte.get(j.id);
    if (!x && i < ANOS_COORTE && j.idade <= 17) coorte.set(j.id, (x = { ano: i, minutos: false, chegou: null }));
    if (!x) continue;
    const s = mem.evolucao.get(j.id);
    const jogosAno = mem.periodo.get(c)?.jogosAno ?? 0;
    if (pro && s && jogosAno && s.minAno / (jogosAno * 90) >= 0.1) x.minutos = true;
    if (x.chegou === null && j.nota >= j.potencial) x.chegou = j.idade;
  }
};
for (let i = 0; i < anos; i++) {
  const t = jogarAno(m, semente, adaptacao);
  jogos += t.jogos.length;
  acompanharCoorte(i);
  const r = virar(m, t);
  console.log(`\nAno ${r.ano}`);
  console.log('  ' + Object.entries(r.campeoes).map(([k, c]) => `${NOMES[k]}: ${n(c)}`).join(' · '));
  console.log(`  Caem: ${r.rebaixados.map(n).join(', ')} · Sobem: ${r.promovidos.map(n).join(', ')}`);
  console.log(`  Libertadores do ano seguinte: ${r.libertadores.map((p) => p.map(n).join(', ')).join(' | ')}`);
  console.log(`  Folgam na Copa do Brasil: ${r.folgasCopaDoBrasil.map(n).join(', ')}`);
  const rep = Object.entries(r.reputacao).map(([c, d]) => `${n(c)} ${d > 0 ? '+' : ''}${d}`);
  const tor = Object.entries(r.torcida).map(([c, d]) => `${n(c)} ${d > 0 ? '+' : ''}${d}`);
  if (rep.length) console.log(`  Reputação: ${rep.join(', ')}`);
  if (tor.length) console.log(`  Torcida: ${tor.join(', ')}`);
  const p = r.pessoas;
  if (p) {
    aposentadorias.push(...p.aposentados.map((a) => a.idade));
    joias.push(r.joias ?? 0);
    livresNaVirada.push(p.livres);
    console.log(`  Pessoas: safra ${r.safra} (joias ${r.joias}), subiram ${p.subiram}, saíram da base ${p.liberados}, aposentados ${p.aposentados.length}` +
      ` (novas carreiras ${p.novasCarreiras}), perfis bem/mal/nenhum ${p.perfis.bem}/${p.perfis.mal}/${p.perfis.nenhum}, goleiro de emergência ${p.emergencias}`);
    console.log(`  Comissão: técnicos aposentados ${p.tecnicosAposentados} (trocados ${p.tecnicosTrocados.map(n).join(', ') || 'nenhum'}), profissionais ${p.profissionaisAposentados}` +
      ` · livres ${p.livres} · saíram do mundo ${p.saidasDoMundo} · gerados ${p.gerados.jogadores}/${p.gerados.tecnicos}/${p.gerados.profissionais}`);
  }
  const f = r.financas;
  if (f) {
    console.log(`  Finanças: caixa negativo ${f.negativos.length} (${f.negativos.map(n).join(', ') || 'nenhum'}) · SAF nova ${f.safs.map(n).join(', ') || 'nenhuma'}` +
      ` · perfil ${f.perfis.map((x) => `${n(x.clube)} ${x.de} → ${x.para}`).join(', ') || 'sem mudança'} · obras ${f.obras} · cotas renovadas ${f.cotas}`);
  }
  const mk = r.mercado;
  if (mk) {
    const t = mk.transferencias;
    const conta = (f: (x: (typeof t)[number]) => boolean) => t.filter(f).length;
    console.log(`  Mercado: compras ${conta((x) => x.tipo === 'compra')} (europeias ${conta((x) => x.europa)}), livres ${conta((x) => x.tipo === 'livre')}, empréstimos ${conta((x) => x.tipo === 'emprestimo')}, pré-contratos ${conta((x) => x.tipo === 'pre-contrato')}` +
      ` · R$ ${t.reduce((a, x) => a + x.valor, 0).toFixed(0)} mi · vencidos ${mk.vencidos} · Europa: saíram ${mk.saidasEuropa}, gerados ${mk.geradosEuropa}`);
  }
  for (const [k, c] of Object.entries(r.campeoes)) {
    const x = titulos.get(c) ?? {};
    x[k] = (x[k] ?? 0) + 1;
    titulos.set(c, x);
  }
}

console.log(`\n${anos} temporadas, ${jogos} jogos em ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
console.log('\nMais títulos');
for (const [c, x] of [...titulos].sort((a, b) => Object.values(b[1]).reduce((s, v) => s + v, 0) - Object.values(a[1]).reduce((s, v) => s + v, 0)).slice(0, 12)) {
  console.log(`  ${n(c).padEnd(16)} ${Object.entries(x).map(([k, v]) => `${NOMES[k]} ${v}`).join(', ')}`);
}
const c = m.memoria!.contagem;
const leituras = c.leiturasCertas + c.leiturasErradas;
console.log(`\nAdaptação entre jogos${adaptacao ? '' : ' (desligada)'}: ${c.adaptacoes} jogos com ajuste · leitura certa ${leituras ? ((c.leiturasCertas / leituras) * 100).toFixed(1) : '0'}% de ${leituras}`);
console.log(`Série A no fim: ${m.clubesPorLiga['serie-a'].map(n).join(', ')}`);

if (m.memoria?.gestao.size) {
  const depois = retrato();
  const media = (xs: number[]): string => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : '-');
  const pct = (a: number, b: number): string => `${((a / b) * 100).toFixed(0)}%`;
  const ev = m.memoria.evo;
  console.log('\nElenco e mundo (GDD-gestao 12)');
  console.log(`  Idade em que chegou ao Potencial, só quem chegou (todos os jovens, sem meta): ${media(ev.chegouAoPot)} (${ev.chegouAoPot.length} jogadores)`);
  const com = [...coorte.values()].filter((x) => x.minutos);
  const idades = com.map((x) => x.chegou ?? Infinity).sort((a, b) => a - b);
  const mediana = idades.length ? idades[Math.floor(idades.length / 2)] : NaN;
  const ate = (n: number) => pct(com.filter((x) => x.chegou !== null && x.chegou <= n).length, com.length || 1);
  console.log(`  Jovem com minutos chega ao Potencial (coorte de 16-17 anos nos ${ANOS_COORTE} primeiros anos): mediana ${Number.isFinite(mediana) ? mediana : 'não chega'} · chegaram até 22 ${ate(22)}, até 24 ${ate(24)}, até 25 ${ate(25)}, nunca ${pct(com.filter((x) => x.chegou === null).length, com.length || 1)} (${com.length} jogadores; meta 24, 23 a 25)`);
  console.log(`  Idade média de aposentadoria: ${media(aposentadorias)} (meta 36, 35 a 37; ${aposentadorias.length} aposentados)`);
  console.log(`  Joias por ano: ${media(joias)} (meta 15, 10 a 20)`);
  console.log(`  Nota 19 ou 20: ${antes.craques} → ${depois.craques}, ${pct(depois.craques, antes.craques)} (meta 100%, 70% a 130%)`);
  console.log(`  Nota média dos elencos: ${antes.nota.toFixed(2)} → ${depois.nota.toFixed(2)}, ${(depois.nota - antes.nota >= 0 ? '+' : '')}${(depois.nota - antes.nota).toFixed(2)} (meta 0, ± 0,5)`);
  console.log(`  Jogadores ativos (elencos e livres): ${antes.ativos} → ${depois.ativos}, ${pct(depois.ativos, antes.ativos)} (meta 100%, 90% a 110%)`);
  console.log(`  Livres na virada: ${media(livresNaVirada)} (meta 60, 30 a 120) · idade média dos elencos ${antes.idade.toFixed(1)} → ${depois.idade.toFixed(1)}`);
  const tamanhos = Object.values(m.elencos).map((e) => e.length);
  console.log(`  Elencos: de ${Math.min(...tamanhos)} a ${Math.max(...tamanhos)} jogadores · base ${[...m.memoria.base.values()].reduce((a, b) => a + b.length, 0)} jovens`);
}

const mm = m.memoria?.mercado;
if (mm) {
  const c = mm.contagem;
  const t = mm.transferencias;
  const por = (x: number): string => (x / anos).toFixed(1);
  const vm = mm.valorMedio;
  console.log('\nMercado (GDD-gestao 12)');
  console.log(`  Compras europeias concluídas na América do Sul por ano: ${por(c.europeias)} (meta 12, 8 a 18) · propostas ${por(c.propostasEuropa)} (GDD ~24)`);
  console.log(`  Valor médio dos jogadores após 10 anos: ${vm.length > 10 ? `${((vm[10] / vm[0]) * 100).toFixed(0)}%` : '-'} (meta 100%, 85% a 115%) · ano 1 R$ ${vm[0]?.toFixed(2)} mi → ano ${vm.length} R$ ${vm[vm.length - 1]?.toFixed(2)} mi`);
  console.log(`  Por ano: compras ${por(c.compras)}, livres ${por(c.livres)}, empréstimos ${por(c.emprestimos)}, pré-contratos ${por(c.preContratos)}, renovações ${por(c.renovacoes)} (falhas ${por(c.renovacoesFalhas)}), vencidos ${por(c.vencidos)}`);
  console.log(`  Recusas: do clube ${por(c.recusasClube)}, do jogador ${por(c.recusasJogador)}, negociações fechadas ${por(c.fechadas)} · aumentos para ficar ${por(c.aumentos)} · quer sair ${por(c.querSair)} · blefes ${por(c.blefes)} (descobertos ${por(c.blefesDescobertos)}) · comissões R$ ${por(c.comissoes)} mi`);
  const gasto = new Map<string, number>();
  for (const x of t) if (x.valor) gasto.set(x.para, (gasto.get(x.para) ?? 0) + x.valor);
  console.log(`  Maiores compradores (R$ mi em ${anos} anos): ${[...gasto].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${n(k)} ${v.toFixed(0)}`).join(', ')}`);
  const top = [...t].filter((x) => x.valor).sort((a, b) => b.valor - a.valor).slice(0, 5);
  console.log(`  Maiores transferências: ${top.map((x) => `${x.de ? n(x.de) : 'livre'} → ${n(x.para)} R$ ${x.valor.toFixed(0)} mi (ano ${x.ano})`).join(' · ')}`);
}

if (m.memoria?.financas.size) {
  const contas = [...m.memoria.financas.values()];
  const inicial = new Map(base.comercial.fichas.map((x) => [x.clubeId, x]));
  const pc = (x: number): string => `${(x * 100).toFixed(0)}%`;
  const med = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
  const anos5 = Math.min(5, anos);
  console.log(`
Finanças por perfil inicial (GDD-gestao 12; média das ${anos5} primeiras temporadas, todos na IA; vendas só no mercado, 5ª fatia)`);
  const METAS: Record<string, string> = {
    'Gigante rico': 'dívida < 50% da receita; caixa positivo em 90%',
    'Gigante endividado': 'dívida 70% a 150%; 30% a 50% viram SAF em 10 anos',
    Formador: 'vendas 20% a 35% da receita; caixa positivo em 70%',
    Emergente: 'caixa positivo durante o aporte; dívida < 60%',
    'Tradicional médio': 'resultado entre −10% e +10% da receita',
    'Pequeno sobrevivente': 'folha até 70% da receita; caixa negativo em até 30%',
  };
  for (const perfil of PERFIS) {
    const cs = contas.filter((c) => inicial.get(c.clubeId)?.perfil === perfil);
    const hs = cs.flatMap((c) => c.historico.slice(0, anos5));
    if (!hs.length) continue;
    const elegiveis = cs.filter((c) => !inicial.get(c.clubeId)!.saf);
    const saf10 = elegiveis.filter((c) => c.historico.slice(0, 10).some((h) => h.safNova)).length;
    console.log(`  ${perfil.padEnd(21)} (${cs.length}) dívida ${pc(med(hs.map((h) => h.divida / h.receita)))} da receita · caixa positivo ${pc(hs.filter((h) => h.caixa >= 0).length / hs.length)}` +
      ` · resultado ${pc(med(hs.map((h) => h.resultado / h.receita)))} (operação ${pc(med(hs.map((h) => (h.receita - h.custo) / h.receita)))}, vendas ${pc(med(hs.map((h) => h.lanc.vendas / h.receita)))}, compras ${pc(med(hs.map((h) => (h.lanc.compras + h.lanc.comissoes) / h.receita)))}) · folha ${pc(med(hs.map((h) => h.lanc.folha / h.receita)))} · SAF em 10 anos ${saf10} de ${elegiveis.length}` +
      `
    meta: ${METAS[perfil]}`);
  }
  const todos = contas.flatMap((c) => c.historico);
  const porAno = (fn: (h: (typeof todos)[number]) => boolean): string => (todos.filter(fn).length / anos).toFixed(2);
  console.log('Finanças gerais');
  console.log(`  Caixa negativo na virada: ${pc(todos.filter((h) => h.caixa < 0).length / todos.length)} (meta 15%, 10% a 25%)`);
  console.log(`  SAFs novas por temporada: ${porAno((h) => h.safNova)} (meta 1, 0,5 a 2) · SAFs no fim ${contas.filter((c) => c.saf).length} de ${contas.length}`);
  console.log(`  Mudanças de perfil por temporada: ${porAno((h) => !!h.mudouPerfil)} (meta 2, 1 a 3)`);
  console.log(`  Clubes por perfil no fim: ${PERFIS.map((p) => `${p} ${contas.filter((c) => c.perfil === p).length}`).join(' · ')} (meta 2 ou mais em cada)`);
  const r1 = contas.map((c) => c.historico[0]), rn = contas.map((c) => c.historico[c.historico.length - 1]);
  const soma = (hs: typeof r1, k: 'receita' | 'divida' | 'caixa') => hs.reduce((a, h) => a + h[k], 0).toFixed(0);
  console.log(`  Soma dos 30 (R$ mi), ano 1 → ano ${anos}: receita ${soma(r1, 'receita')} → ${soma(rn, 'receita')} · caixa ${soma(r1, 'caixa')} → ${soma(rn, 'caixa')} · dívida ${soma(r1, 'divida')} → ${soma(rn, 'divida')}`);
  console.log(`  Folha ÷ receita, ano 1 → ano ${anos}: ${pc(med(r1.map((h) => h.lanc.folha / h.receita)))} → ${pc(med(rn.map((h) => h.lanc.folha / h.receita)))} · meses com folha atrasada (2+) por ano ${(todos.reduce((a, h) => a + h.lanc.mesesAtraso, 0) / anos).toFixed(1)} · com rescisão possível (3+) ${(todos.reduce((a, h) => a + h.lanc.mesesRescisao, 0) / anos).toFixed(1)}`);
}

