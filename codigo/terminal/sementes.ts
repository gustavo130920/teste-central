// Uso: npm run sementes -- [ANOS] [SEMENTE] [N] [--cenario ia|avancar|aleatorio] [--testar CAMINHO=VALOR ...]
// Roda N carreiras em paralelo (sementes SEMENTE a SEMENTE + N − 1) e mostra a média das medições do
// GDD-gestao 12 (Elenco e mundo, Mercado e Finanças). Cada linha sai com os números trocados pela média;
// o 1º número de cada linha também mostra o menor e o maior entre as sementes.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const testes: string[] = [];
const resto: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--testar' || args[i] === '--cenario') testes.push(args[i], args[++i] ?? '');
  else resto.push(args[i]);
}
const anos = Number(resto[0] ?? 20);
const semente = Number(resto[1] ?? 2026);
const n = Number(resto[2] ?? 5);
const carreira = fileURLToPath(new URL('./carreira.ts', import.meta.url));

const rodar = (s: number): Promise<string> => new Promise((ok, falha) => {
  const p = spawn(process.execPath, [carreira, String(anos), String(s), ...testes], { stdio: ['ignore', 'pipe', 'inherit'] });
  let saida = '';
  p.stdout.on('data', (d) => (saida += d));
  p.on('close', (codigo) => (codigo === 0 ? ok(saida) : falha(new Error(`semente ${s} terminou com ${codigo}`))));
});

const NUM = /-?\d+(?:\.\d+)?/g;
// Só os blocos de medição; linhas de nomes (compradores, transferências) variam demais entre sementes.
const SECOES = ['Elenco e mundo', 'Diretoria e torcida', 'Eventos e imprensa', 'Mercado (GDD', 'Finanças por perfil', 'Finanças gerais'];
const FORA = /Maiores compradores|Maiores transferências|^\s+meta:/;
function medicoes(saida: string): string[] {
  const linhas = saida.split('\n');
  const ini = linhas.findIndex((l) => l.startsWith('Elenco e mundo'));
  return ini < 0 ? [] : linhas.slice(ini).filter((l) => l.trim() && !FORA.test(l));
}

const inicio = Date.now();
const sementes = Array.from({ length: n }, (_, i) => semente + i);
const saidas = await Promise.all(sementes.map(rodar));
const testesLinha = saidas[0].split('\n').filter((l) => l.startsWith('TESTE'));
for (const l of testesLinha) console.log(l);
console.log(`${n} carreiras de ${anos} temporadas (sementes ${sementes[0]} a ${sementes[n - 1]}) em ${((Date.now() - inicio) / 1000).toFixed(0)} s · média (menor a maior no 1º número)\n`);

const porSemente = saidas.map(medicoes);
const fmt = (v: number, casas: number): string => v.toFixed(casas);
for (let i = 0; i < porSemente[0].length; i++) {
  const linha = porSemente[0][i];
  if (SECOES.some((s) => linha.startsWith(s))) { console.log(`\n${linha}`); continue; }
  const molde = linha.replace(NUM, '#');
  const iguais = porSemente.map((ls) => ls[i]).filter((l) => l !== undefined && l.replace(NUM, '#') === molde);
  if (iguais.length < n) { console.log(`${linha}  [varia entre sementes: semente ${sementes[0]}]`); continue; }
  const nums = iguais.map((l) => (l.match(NUM) ?? []).map(Number));
  // Números iguais em todas (rótulos como "Nota 19 ou 20") ficam como estão; o 1º que varia leva a faixa.
  const varia = nums[0].map((_, p) => nums.some((x) => x[p] !== nums[0][p]));
  const primeiro = varia.indexOf(true);
  let k = 0;
  const saida = linha.replace(NUM, (orig) => {
    const p = k++;
    if (!varia[p]) return orig;
    const casas = orig.includes('.') ? orig.split('.')[1].length : 0;
    const vs = nums.map((x) => x[p]);
    const media = vs.reduce((a, b) => a + b, 0) / vs.length;
    return p === primeiro ? `${fmt(media, Math.max(casas, 1))} (${fmt(Math.min(...vs), casas)} a ${fmt(Math.max(...vs), casas)})` : fmt(media, Math.max(casas, 1));
  });
  console.log(saida);
}
