// Transforma o registro de lances em texto (GDD 10). Puro; sorteio próprio, separado do motor.
import type { FraseNarracao } from '../motor/dados.ts';
import { PROVISORIO } from '../motor/parametros.ts';
import { criarRng } from '../motor/rng.ts';
import type { Rng } from '../motor/rng.ts';
import type { Escalado, Lance, ResultadoPartida } from '../motor/tipos.ts';

export interface LinhaNarrada { bloco: number; minuto: string; voz: 'N' | 'C'; texto: string; tema: string }
export interface OpcoesNarracao { competicao: string }

const FRASES_POR_BLOCO: [number, number] = [8, 14];
const CHANCE_COMENTARISTA = 22; // PROVISORIO: só há gol como gatilho do GDD nesta fatia; o resto completa os 20% a 30%.
const MINUTO_INICIO = 10; // PROVISORIO
const MINUTO_FIM = 80; // PROVISORIO

const LANCES_FIXOS = ['Amarelo', 'Segundo amarelo', 'Vermelho direto', 'Dividida perdida', 'Dividida ganha', 'Falta perigosa'];
const sempreNarra = (l: Lance): boolean => ['gol', 'finalizacao', 'goleiro', 'abertura', 'penalti', 'lesao', 'pausas', 'impeto', 'fogo'].includes(l.tema) || LANCES_FIXOS.includes(l.lance);
const eGolDoLance = (l: Lance): boolean => l.tema === 'gol' || (l.tema === 'penalti' && l.lance === 'Convertido');
const faixaDe = (z: string | null): number => (z ? Number(z[2]) : 0);
const candidatoMenor = (l: Lance): boolean => !sempreNarra(l) && faixaDe(l.zonaDestino ?? l.zonaOrigem) >= 4;

function atende(cond: string, l: Lance, res: ResultadoPartida, estevePerdendo: boolean): boolean {
  if (cond === 'Sempre') return true;
  const [tipo, ...resto] = cond.split(' ');
  const valor = resto.join(' ');
  const gt = l.contexto.placar[l.time];
  const go = l.contexto.placar[l.time === 0 ? 1 : 0];
  const eGol = eGolDoLance(l);
  switch (tipo) {
    case 'Placar':
      switch (valor) {
        case 'empatando': return eGol && gt === go;
        case 'virando': return eGol && gt === go + 1 && estevePerdendo;
        case 'ampliando': return eGol && gt - go >= 2;
        case 'descontando': return eGol && gt < go;
        case 'goleada': return eGol && gt - go >= 3;
        case 'vencendo': return gt > go;
        case 'perdendo': return gt < go;
      }
      return false;
    case 'Minuto':
      if (valor === 'início') return l.minuto <= MINUTO_INICIO;
      if (valor === 'fim') return l.minuto >= MINUTO_FIM;
      return valor === 'acréscimos' && l.acrescimo > 0;
    case 'Jogo':
      if (valor === 'clássico') return res.classico;
      if (valor === 'casa') return l.time === 0;
      if (valor === 'fora') return l.time === 1;
      return false; // decisão: só com competições
    case 'Ímpeto': return valor === 'alto' ? l.contexto.impeto >= PROVISORIO.impetoFraseAlta : l.contexto.impeto <= PROVISORIO.impetoFraseBaixa;
    case 'Traço': return l.contexto.tracos.includes(valor);
    case 'Qualidade':
      if (valor === 'Ídolo/Cria da casa') return l.contexto.qualidades.includes('Ídolo') || l.contexto.qualidades.includes('Cria da casa');
      return l.contexto.qualidades.includes(valor);
    case 'Defeito': return l.contexto.defeitos.includes(valor);
    case 'Perfil': return l.contexto.perfilJovem === valor.replace('de jovem ', '');
    case 'Estilo': return l.contexto.estilo === valor;
    default: return false;
  }
}

export function narrar(res: ResultadoPartida, frases: FraseNarracao[], semente: number, op: OpcoesNarracao): LinhaNarrada[] {
  const rng: Rng = criarRng(semente ^ 0x5eed);
  const porId = new Map<string, Escalado>();
  for (const t of res.times) for (const e of t.participantes) porId.set(e.j.id, e);
  const nome = (id: string | null): string | undefined => (id ? porId.get(id)?.j.nome : undefined);

  const porLance = new Map<string, FraseNarracao[]>();
  for (const f of frases) {
    const k = `${f.tema}|${f.lance}`;
    porLance.set(k, [...(porLance.get(k) ?? []), f]);
  }
  const usadaEm = new Map<string, number>();
  let relogio = 0;

  const linhas: LinhaNarrada[] = [];
  const perdeuAlguma = [false, false];

  const escolher = (l: Lance, voz: 'N' | 'C', valores: Record<string, string | undefined>, estevePerdendo: boolean, repete: boolean): FraseNarracao | null => {
    const todas = (porLance.get(`${l.tema}|${l.lance}`) ?? []).filter((f) => f.voz === voz);
    const validas = todas.filter((f) => {
      const espacos = [...f.texto.matchAll(/\{([a-z_0-9]+)\}/g)].map((m) => m[1]);
      return espacos.every((s) => valores[s] !== undefined) && f.contexto.every((c) => atende(c, l, res, estevePerdendo));
    });
    const novas = validas.filter((f) => !usadaEm.has(f.id));
    if (novas.length) {
      const max = Math.max(...novas.map((f) => f.contexto.length));
      return rng.um(novas.filter((f) => f.contexto.length === max));
    }
    if (!repete || !validas.length) return null;
    return [...validas].sort((a, b) => (usadaEm.get(a.id) ?? 0) - (usadaEm.get(b.id) ?? 0))[0];
  };

  const narrarLance = (l: Lance): void => {
    const adv = l.time === 0 ? 1 : 0;
    const estevePerdendo = perdeuAlguma[l.time];
    const valores: Record<string, string | undefined> = {
      jogador: nome(l.jogador), jogador2: nome(l.jogador2), goleiro: nome(l.goleiro),
      clube: res.times[l.time].clube.nomeCurto, adversario: res.times[adv].clube.nomeCurto,
      rival: res.classico ? res.times[adv].clube.nomeCurto : undefined,
      minuto: `${l.minuto}${l.acrescimo ? `+${l.acrescimo}` : ''}`,
      placar: `${l.contexto.placar[0]} a ${l.contexto.placar[1]}`,
      competicao: op.competicao, estilo: res.times[l.time].estilo.nome,
      tecnico: res.times[l.time].tecnico.nome, tecnico_rival: res.times[adv].tecnico.nome,
    };
    const minuto = `${l.minuto}${l.acrescimo ? `+${l.acrescimo}` : ''}'`;
    const dizer = (f: FraseNarracao): void => {
      relogio += 1;
      usadaEm.set(f.id, relogio);
      let texto = f.texto;
      for (const [k, v] of Object.entries(valores)) if (v !== undefined) texto = texto.replaceAll(`{${k}}`, v);
      linhas.push({ bloco: l.bloco, minuto, voz: f.voz, texto, tema: l.tema });
    };
    const n = escolher(l, 'N', valores, estevePerdendo, sempreNarra(l));
    if (!n) return;
    dizer(n);
    if (l.tema === 'gol' || rng.pct(CHANCE_COMENTARISTA)) {
      const c = escolher(l, 'C', valores, estevePerdendo, false);
      if (c) dizer(c);
    }
  };

  const blocos = [...new Set(res.lances.map((l) => l.bloco))];
  for (const b of blocos) {
    const doBloco = res.lances.filter((l) => l.bloco === b);
    const fixos = doBloco.filter(sempreNarra);
    const menores = doBloco.filter(candidatoMenor);
    const alvo = rng.int(FRASES_POR_BLOCO[0], FRASES_POR_BLOCO[1]);
    const escolhidos = new Set<Lance>();
    const baralho = [...menores];
    while (fixos.length + escolhidos.size < alvo && baralho.length) {
      const i = rng.int(0, baralho.length - 1);
      escolhidos.add(baralho[i]);
      baralho.splice(i, 1);
    }
    for (const l of doBloco) {
      if (fixos.includes(l) || escolhidos.has(l)) narrarLance(l);
      if (eGolDoLance(l)) {
        const perdendo: 0 | 1 = l.contexto.placar[0] < l.contexto.placar[1] ? 0 : 1;
        if (l.contexto.placar[0] !== l.contexto.placar[1]) perdeuAlguma[perdendo] = true;
      }
    }
  }
  return linhas;
}
