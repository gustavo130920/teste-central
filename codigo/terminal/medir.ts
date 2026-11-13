// Uso: npm run medir -- [JOGOS]
import { carregarBase } from './carregar.ts';
import { medir } from './medicao.ts';

const jogos = Number(process.argv[2] ?? 1000);
const m = medir(carregarBase(), jogos);
const f = (v: number, d = 2): string => v.toFixed(d).padStart(8);
const situacao = (v: number, a: number, b: number): string => (v < a ? 'ABAIXO' : v > b ? 'ACIMA' : 'dentro');
console.log(`${jogos} jogos, dentro das ligas, cada técnico no próprio estilo\n`);
console.log('Medida                 Medido   Meta (faixa, GDD 9)');
console.log(`Gols por jogo        ${f(m.golsPorJogo)}   2,5 (2,3 a 2,7)  ${situacao(m.golsPorJogo, 2.3, 2.7)}`);
console.log(`Finalizações         ${f(m.finalizacoesPorJogo)}   25 (18 a 32)     ${situacao(m.finalizacoesPorJogo, 18, 32)}`);
console.log(`0 a 0 (%)            ${f(m.zeroAZeroPct)}   8 (6 a 10)       ${situacao(m.zeroAZeroPct, 6, 10)}`);
console.log(`Contra-ataques       ${f(m.contraAtaquesPorJogo)}   10 (8 a 12)      ${situacao(m.contraAtaquesPorJogo, 8, 12)}`);
console.log(`Escanteios           ${f(m.escanteiosPorJogo)}   10 (8 a 12)      ${situacao(m.escanteiosPorJogo, 8, 12)}`);
console.log(`Amarelos             ${f(m.amarelosPorJogo)}   4 (3 a 5)        ${situacao(m.amarelosPorJogo, 3, 5)}`);
console.log(`Lesões médias/graves ${f(m.lesoesMediasGravesPorJogo)}   0,3 (0,2 a 0,4)  ${situacao(m.lesoesMediasGravesPorJogo, 0.2, 0.4)}`);
console.log(`Lesões, todas ${f(m.lesoesPorJogo)} · das que tiram de campo, sem troca ${f(m.lesoesSemTrocaPct, 1)}% · jogos com time reduzido por lesão ${f(m.jogosComUmAMenosPorLesaoPct, 1)}% · saídas por bloco ${m.lesoesSaemPorBloco.map((v) => v.toFixed(3)).join(' ')}`);
console.log(`Bola parada (referência GDD 8): cobranças diretas ${f(m.diretasPorJogo)} (1,5) · pênaltis ${f(m.penaltisPorJogo)} (0,25) · gols ${f(m.golsBolaParadaPorJogo)} (0,7) · vermelhos ${f(m.vermelhosPorJogo)}`);
console.log(`\nNo alvo ${f(m.noAlvoPorJogo)} · gol por finalização ${f(m.conversaoPct)}% (referência ~10%) · faltas ${f(m.faltasPorJogo)} · impedimentos ${f(m.impedimentosPorJogo)} · cadeias ${f(m.cadeiasPorJogo)}`);
console.log(`Times iguais, casa/empate/fora: ${f(m.iguais.mandantePct, 1)}% ${situacao(m.iguais.mandantePct, 41, 49)} · ${f(m.iguais.empatePct, 1)}% ${situacao(m.iguais.empatePct, 23, 31)} · ${f(m.iguais.visitantePct, 1)}% ${situacao(m.iguais.visitantePct, 24, 32)} (meta 45/27/28, ±4)`);
console.log(`Jogos da liga, forças misturadas: ${f(m.mandantePct, 1)}% ${f(m.empatePct, 1)}% ${f(m.visitantePct, 1)}% (sem meta)`);
console.log(`Fim das cadeias (referência 25/50/18/15): finalização ${f(m.fins.finalizacao, 1)} · perda ${f(m.fins.perda, 1)} · falta ${f(m.fins.falta, 1)} · fora ${f(m.fins.fora, 1)} · limite de elos ${f(m.fins.limite, 1)}`);
