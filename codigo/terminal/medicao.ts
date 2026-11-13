// Mede N jogos dentro das ligas, com cada técnico no próprio estilo. Só mede: não ajusta nada.
import { montarTime } from '../motor/escalacao.ts';
import { simularPartida } from '../motor/partida.ts';
import { criarRng } from '../motor/rng.ts';
import type { Base } from './carregar.ts';
import { entradaTime } from './carregar.ts';

export interface Medicao {
  jogos: number;
  golsPorJogo: number;
  finalizacoesPorJogo: number;
  noAlvoPorJogo: number;
  conversaoPct: number;
  zeroAZeroPct: number;
  contraAtaquesPorJogo: number;
  escanteiosPorJogo: number;
  faltasPorJogo: number;
  amarelosPorJogo: number;
  vermelhosPorJogo: number;
  penaltisPorJogo: number;
  diretasPorJogo: number;
  golsBolaParadaPorJogo: number;
  impedimentosPorJogo: number;
  lesoesPorJogo: number;
  /** Meta do GDD 9. */
  lesoesMediasGravesPorJogo: number;
  /** Das que tiram de campo, quantas deixaram o time sem reposição (5 trocas já usadas). */
  lesoesSemTrocaPct: number;
  /** Jogos com pelo menos um time reduzido por lesão. */
  jogosComUmAMenosPorLesaoPct: number;
  /** Lesões que tiram de campo, por bloco (1 a 6), por jogo. */
  lesoesSaemPorBloco: number[];
  cadeiasPorJogo: number;
  mandantePct: number;
  empatePct: number;
  visitantePct: number;
  fins: Record<string, number>;
  /** Só jogos entre times iguais (titulares a menos de 0,5 de nota): é o cenário da meta do GDD 9. */
  iguais: { mandantePct: number; empatePct: number; visitantePct: number };
}

/** Mesma quantidade de jogos, só entre clubes de força parecida. */
function medirIguais(base: Base, jogos: number): Medicao['iguais'] {
  const clubes = base.clubes.filter((c) => !c.reserva);
  const forca = new Map(clubes.map((c) => {
    const t = montarTime(0, entradaTime(base, c.id), base.tatica, criarRng(1), false);
    return [c.id, t.escalados.reduce((s, e) => s + e.j.nota, 0) / t.escalados.length];
  }));
  const pares = clubes.flatMap((a) => clubes.filter((b) => a !== b && Math.abs(forca.get(a.id)! - forca.get(b.id)!) < 0.5).map((b) => [a.id, b.id]));
  const rng = criarRng(20261110);
  const res = [0, 0, 0];
  for (let i = 1; i <= jogos; i++) {
    const [a, b] = rng.um(pares);
    const { placar: [x, y] } = simularPartida({ mandante: entradaTime(base, a), visitante: entradaTime(base, b), tatica: base.tatica, semente: jogos + i });
    res[x > y ? 0 : x === y ? 1 : 2] += 1;
  }
  return { mandantePct: (res[0] / jogos) * 100, empatePct: (res[1] / jogos) * 100, visitantePct: (res[2] / jogos) * 100 };
}

export function medir(base: Base, jogos: number): Medicao {
  const rng = criarRng(20261109);
  const clubes = base.clubes.filter((c) => !c.reserva);
  const soma = { gols: 0, fin: 0, alvo: 0, zz: 0, contra: 0, esc: 0, falta: 0, imp: 0, cad: 0, casa: 0, emp: 0, vis: 0, am: 0, ver: 0, pen: 0, dir: 0, gbp: 0 };
  const fins: Record<string, number> = { finalizacao: 0, perda: 0, falta: 0, fora: 0, limite: 0 };
  const les = { total: 0, saem: 0, semTroca: 0, jogosSemTroca: 0, porBloco: [0, 0, 0, 0, 0, 0] };
  for (let i = 1; i <= jogos; i++) {
    const a = rng.um(clubes);
    const mesmaLiga = clubes.filter((c) => c.liga === a.liga && c.id !== a.id);
    const b = rng.um(mesmaLiga);
    const r = simularPartida({ mandante: entradaTime(base, a.id), visitante: entradaTime(base, b.id), tatica: base.tatica, semente: i });
    const [x, y] = r.estatisticas;
    soma.gols += x.gols + y.gols;
    soma.fin += x.finalizacoes + y.finalizacoes;
    soma.alvo += x.noAlvo + y.noAlvo;
    soma.zz += x.gols + y.gols === 0 ? 1 : 0;
    soma.contra += x.contraAtaques + y.contraAtaques;
    soma.esc += x.escanteios + y.escanteios;
    soma.falta += x.faltas + y.faltas;
    soma.am += x.amarelos + y.amarelos;
    soma.ver += x.vermelhos + y.vermelhos;
    soma.pen += x.penaltis + y.penaltis;
    soma.dir += x.cobrancasDiretas + y.cobrancasDiretas;
    soma.gbp += x.golsBolaParada + y.golsBolaParada;
    soma.imp += x.impedimentos + y.impedimentos;
    soma.cad += r.cadeias;
    if (r.placar[0] > r.placar[1]) soma.casa += 1;
    else if (r.placar[0] < r.placar[1]) soma.vis += 1;
    else soma.emp += 1;
    for (const k of Object.keys(fins)) fins[k] += r.fins[k as keyof typeof r.fins] / jogos;
    const saem = r.lesoes.filter((l) => l.saiu);
    const semTroca = saem.filter((l) => l.substituto === null).length;
    les.total += r.lesoes.length;
    les.saem += saem.length;
    les.semTroca += semTroca;
    les.jogosSemTroca += semTroca > 0 ? 1 : 0;
    for (const l of saem) les.porBloco[l.bloco - 1] += 1;
  }
  return {
    jogos,
    golsPorJogo: soma.gols / jogos,
    finalizacoesPorJogo: soma.fin / jogos,
    noAlvoPorJogo: soma.alvo / jogos,
    conversaoPct: (soma.gols / soma.fin) * 100,
    zeroAZeroPct: (soma.zz / jogos) * 100,
    contraAtaquesPorJogo: soma.contra / jogos,
    escanteiosPorJogo: soma.esc / jogos,
    faltasPorJogo: soma.falta / jogos,
    amarelosPorJogo: soma.am / jogos,
    vermelhosPorJogo: soma.ver / jogos,
    penaltisPorJogo: soma.pen / jogos,
    diretasPorJogo: soma.dir / jogos,
    golsBolaParadaPorJogo: soma.gbp / jogos,
    impedimentosPorJogo: soma.imp / jogos,
    lesoesPorJogo: les.total / jogos,
    lesoesMediasGravesPorJogo: les.saem / jogos,
    lesoesSemTrocaPct: les.saem ? (les.semTroca / les.saem) * 100 : 0,
    jogosComUmAMenosPorLesaoPct: (les.jogosSemTroca / jogos) * 100,
    lesoesSaemPorBloco: les.porBloco.map((n) => n / jogos),
    cadeiasPorJogo: soma.cad / jogos,
    mandantePct: (soma.casa / jogos) * 100,
    empatePct: (soma.emp / jogos) * 100,
    visitantePct: (soma.vis / jogos) * 100,
    fins,
    iguais: medirIguais(base, jogos),
  };
}
