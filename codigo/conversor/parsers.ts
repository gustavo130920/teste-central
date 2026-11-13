// Interpreta os .md de dados/. Toda linha que não se encaixa vai para o relatório.
import type {
  Atributo, Clube, Combinacao, Estilo, Etiqueta, FraseNarracao, Formacao, Instrucao, Jogador,
  NotaEstilo, PadraoTime, Posicao, PosicaoSecundaria, Profissional, Rival, Tecnico,
} from '../motor/dados.ts';
import { CARGOS } from '../motor/dados.ts';

export interface Problema { arquivo: string; linha: number; motivo: string; trecho: string }
export class Relatorio {
  problemas: Problema[] = [];
  arquivo = '';
  add(linha: number, motivo: string, trecho = ''): void {
    this.problemas.push({ arquivo: this.arquivo, linha, motivo, trecho: trecho.slice(0, 120) });
  }
}

const NORM: Record<string, Atributo> = { 'Mão': 'Mao', 'Aér': 'Aer', 'Saí': 'Sai', 'Pés': 'Pes' };
const attr = (s: string): Atributo => (NORM[s] ?? s) as Atributo;
const TEC: Atributo[] = ['Pas', 'Dom', 'Dri', 'Cru', 'Fin', 'Lon', 'Cab', 'Des', 'BP'];
const TEC_GOL: Atributo[] = ['Ref', 'Mao', 'Aer', 'Sai', 'Pes', 'Com'];
const MEN: Atributo[] = ['Vis', 'Dec', 'Pos', 'Mov', 'Conc', 'DT', 'Comp', 'Lid', 'Comb'];
const FIS: Atributo[] = ['Vel', 'Res', 'For', 'Agi', 'Imp'];
const OC: Atributo[] = ['Cons', 'JG', 'Les'];
const ATRIBUTOS = new Set<string>([...TEC, ...TEC_GOL, ...MEN, ...FIS, ...OC]);
const POSICOES = new Set(['GOL', 'ZAG', 'LAT-E', 'LAT-D', 'VOL', 'MC', 'MO', 'PON-E', 'PON-D', 'CA', 'LAT', 'PON']);

export const TRACOS = new Set([
  'Corta pra dentro', 'Vai ao fundo', 'Chuta de fora', 'Encara o marcador', 'Passe em profundidade', 'Lançamento longo',
  'Tabelinha', 'Frio no 1x1', 'Cabeceador', 'Cava faltas', 'Infiltrador', 'Recua para buscar', 'Pivô de costas', 'Oportunista',
  'Marcador implacável', 'Interceptador', 'Desarme limpo', 'Xerife do jogo aéreo', 'Pressionador incansável', 'Leitor de cobertura',
  'Pegador de pênalti', 'Paredão no 1x1', 'Goleiro-líbero', 'Distribuidor', 'Cobrador de falta', 'Batedor de escanteio',
  'Cobrador de pênalti', 'Versátil', 'Adaptável',
]);
const QUALIDADES = new Set(['Incendiário', 'Ídolo', 'Cria da casa', 'Ídolo/Cria da casa', 'Raçudo', 'Decisivo', 'Gelo', 'Carismático', 'Exemplo profissional', 'Líder de vestiário']);
const DEFEITOS = new Set(['Fominha', 'Esquentado', 'Indisciplinado', 'Preguiçoso sem a bola', 'Firuleiro']);
const PERFIS = new Set(['Marrento', 'Inseguro', 'Pé no chão', 'Deslumbrado']);

const celulas = (l: string): string[] => l.split('|').slice(1, -1).map((c) => c.trim());
const ehSeparador = (l: string): boolean => /^\|[\s|:-]+\|$/.test(l);
const num = (s: string): number => Number(s.replace(/\./g, '').replace(',', '.'));
const lista = (s: string): string[] => (s === '—' || s === '' ? [] : s.split(',').map((x) => x.trim()).filter(Boolean));
const opt = (s: string): string | null => (s === '—' || s === '' ? null : s);

// Linhas de cabeçalho e comentário que não têm dado a interpretar.
const ignoravel = (l: string): boolean => l.trim() === '' || /^(# |Gerado em |Data: |Ordem: |\*\*Obs|\*\*Titulares)/.test(l);

/** Pares `**Chave:** valor` de um item de lista. */
function pares(linha: string): [string, string][] {
  const res: [string, string][] = [];
  const re = /\*\*([^*:]+):\*\*\s*(.*?)(?=\s*·\s*\*\*[^*:]+:\*\*|$)/g;
  for (const m of linha.matchAll(re)) res.push([m[1].trim(), m[2].trim()]);
  return res;
}

function notas(s: string, nomes: Atributo[], alvo: Partial<Record<Atributo, number>>): boolean {
  const v = s.split(/\s+/).map(Number);
  if (v.length !== nomes.length || v.some((n) => !Number.isInteger(n) || n < 1 || n > 20)) return false;
  nomes.forEach((a, i) => { alvo[a] = v[i]; });
  return true;
}

function secundarias(s: string): PosicaoSecundaria[] | null {
  const res: PosicaoSecundaria[] = [];
  for (const parte of s.split(/[,·]/)) {
    const m = parte.trim().match(/^(\S+) (\d+)$/);
    if (!m || !POSICOES.has(m[1])) return null;
    res.push({ posicao: m[1] as Posicao, nota: Number(m[2]) });
  }
  return res;
}

export interface ElencoLido { clubeId: string | null; nome: string; tecnico: string | null; jogadores: Jogador[] }

export function lerElenco(texto: string, rel: Relatorio, idArquivo: string | null): ElencoLido {
  const linhas = texto.split(/\r?\n/);
  const saida: ElencoLido = { clubeId: idArquivo, nome: '', tecnico: null, jogadores: [] };
  let cab: string[] | null = null;
  linhas.forEach((l, i) => {
    const n = i + 1;
    const t = l.match(/^# (.+?) \(([A-Z0-9]+)\) — elenco/);
    if (t) { saida.nome = t[1]; if (t[2] !== idArquivo) rel.add(n, 'sigla do título difere do nome do arquivo', l); return; }
    const g = l.match(/técnico: (.+?) \(/);
    if (g) saida.tecnico = g[1];
    if (ignoravel(l) || l.startsWith('### ')) { cab = null; return; }
    if (!l.startsWith('|')) { rel.add(n, 'linha não interpretada', l); return; }
    if (ehSeparador(l)) return;
    const c = celulas(l);
    if (c.includes('Jogador') && c.includes('Téc')) { cab = c; return; }
    if (!cab) { rel.add(n, 'tabela sem cabeçalho', l); return; }
    if (c.length !== cab.length) { rel.add(n, `esperava ${cab.length} colunas, veio ${c.length}`, l); return; }
    const col: Record<string, string> = Object.fromEntries(cab.map((h, k) => [h, c[k]]));
    const j = lerJogador(col, saida.clubeId, rel, n, l);
    if (j) saida.jogadores.push(j);
  });
  return saida;
}

function lerJogador(col: Record<string, string>, clubeId: string | null, rel: Relatorio, n: number, l: string): Jogador | null {
  const erro = (m: string): null => { rel.add(n, m, l); return null; };
  const nomeM = col['Jogador'].match(/^\*\*(.+?)\*\*(?: \((.+)\))?$/);
  if (!nomeM) return erro('nome do jogador');
  const posM = col['Pos'].match(/^(\S+?)(?: \((.+)\))?$/);
  if (!posM || !POSICOES.has(posM[1])) return erro('posição');
  const sec = posM[2] ? secundarias(posM[2]) : [];
  if (!sec) return erro('posições secundárias');
  const peM = col['Pé'].match(/^([DEA])\/(\d)$/);
  if (!peM) return erro('pé');
  const fis = col['Alt/Peso'].match(/^(\d,\d+)\/(\d+)$/);
  if (!fis) return erro('altura/peso');
  const amb = col['Amb/Leal'].match(/^(\d+)\/(\d+)$/);
  if (!amb) return erro('ambição/lealdade');
  const atributos: Partial<Record<Atributo, number>> = {};
  const gol = posM[1] === 'GOL';
  if (!notas(col['Téc'], gol ? TEC_GOL : TEC, atributos)) return erro('atributos técnicos');
  if (!notas(col['Men'], MEN, atributos)) return erro('atributos mentais');
  if (!notas(col['Fís'], FIS, atributos)) return erro('atributos físicos');
  if (!notas(col['Oc'], OC, atributos)) return erro('atributos ocultos');
  const tracos = lista(col['Traços']);
  for (const t of tracos) if (!TRACOS.has(t)) return erro(`traço desconhecido: ${t}`);
  const qualidades: string[] = [];
  const defeitos: string[] = [];
  let perfilJovem: string | null = null;
  for (const p of lista(col['Pers'])) {
    if (QUALIDADES.has(p)) qualidades.push(p);
    else if (DEFEITOS.has(p)) defeitos.push(p);
    else if (PERFIS.has(p)) perfilJovem = p;
    else return erro(`personalidade desconhecida: ${p}`);
  }
  const numeroM = col['Nº']?.match(/^(\d+)(©?)$/);
  if (col['Nº'] !== undefined && !numeroM) return erro('número da camisa');
  const valores = [col['Id'], col['Nota'], col['Pot'], col['Sal'], col['Valor']].map(num);
  if (valores.some(Number.isNaN)) return erro('campo numérico');
  const contrato = col['Contr'] ? Number(col['Contr']) : null;
  if (contrato !== null && Number.isNaN(contrato)) return erro('contrato');
  const numero = numeroM ? Number(numeroM[1]) : null;
  return {
    id: `${clubeId ?? 'LIVRE'}-${numero ?? nomeM[1]}`,
    clubeId, numero, capitao: numeroM?.[2] === '©',
    nome: nomeM[1], nomeCompleto: nomeM[2] ?? nomeM[1],
    idade: valores[0], nacionalidade: col['Nac'],
    posicao: posM[1] as Posicao, secundarias: sec,
    pe: peM[1], peFraco: Number(peM[2]),
    altura: num(fis[1]), peso: Number(fis[2]),
    atributos, nota: valores[1], potencial: valores[2],
    tracos, qualidades, defeitos, perfilJovem,
    ambicao: Number(amb[1]), lealdade: Number(amb[2]),
    salario: valores[3], valor: valores[4], contrato,
    tipo: col['Tipo'] ?? null,
  };
}

const CHAVES_CLUBE = new Set(['Apelido', 'Cidade', 'Fundação', 'Cores', 'Mascote', 'Escudo', 'Estádio', 'Torcida', 'Perfil', 'Reputação', 'Estrutura', 'Força', 'Estilo tradicional', 'Rivais', 'Rival europeu', 'História']);

export function lerClubes(texto: string, liga: string, rel: Relatorio): Clube[] {
  const clubes: Clube[] = [];
  let atual: Record<string, string> | null = null;
  let cab: { nome: string; id: string; n: number } | null = null;
  const fechar = (): void => { if (atual && cab) clubes.push(montarClube(cab, atual, liga, rel)); };
  texto.split(/\r?\n/).forEach((l, i) => {
    const n = i + 1;
    if (ignoravel(l)) return;
    const h = l.match(/^### (.+) \(([A-Z0-9]+)\)$/);
    if (h) { fechar(); atual = {}; cab = { nome: h[1], id: h[2], n }; return; }
    if (!l.startsWith('- **') || !atual) { rel.add(n, 'linha não interpretada', l); return; }
    for (const [k, v] of pares(l)) {
      if (!CHAVES_CLUBE.has(k)) { rel.add(n, `campo de clube desconhecido: ${k}`, l); continue; }
      atual[k] = v;
    }
  });
  fechar();
  return clubes;
}

function montarClube(cab: { nome: string; id: string; n: number }, c: Record<string, string>, liga: string, rel: Relatorio): Clube {
  const falta = (campo: string): string => { if (c[campo] === undefined) rel.add(cab.n, `clube ${cab.id} sem ${campo}`); return c[campo] ?? ''; };
  const est = c['Estádio']?.match(/^(.*) · (\d+) mil(?: \(.*\))?$/);
  if (c['Estádio'] && !est) rel.add(cab.n, 'estádio', c['Estádio']);
  const tor = c['Torcida']?.match(/^(.*) · tamanho (\d+) · exigência (\d+)$/);
  if (c['Torcida'] && !tor) rel.add(cab.n, 'torcida', c['Torcida']);
  const estru = c['Estrutura']?.match(/CT (\d+) · base (\d+)/);
  if (c['Estrutura'] && !estru) rel.add(cab.n, 'estrutura', c['Estrutura']);
  const rivais: Rival[] = [];
  if (c['Rivais'] && c['Rivais'] !== '—') {
    const achados = [...c['Rivais'].matchAll(/([^,;·()]+?)\s*\(([^()]*?), intensidade (\d+)\)/g)];
    if (!achados.length) rel.add(cab.n, 'rivais', c['Rivais']);
    for (const m of achados) rivais.push({ nome: m[1].trim(), clubeId: null, classico: m[2].trim(), intensidade: Number(m[3]) });
  }
  if (c['Rival europeu'] && c['Rival europeu'] !== 'nenhum na lista') {
    for (const nome of c['Rival europeu'].split(',')) rivais.push({ nome: nome.trim(), clubeId: null, classico: null, intensidade: null });
  }
  return {
    id: cab.id, nome: cab.nome, nomeCurto: cab.nome, liga, reserva: liga === 'reserva',
    apelido: c['Apelido'] ?? null,
    cidade: falta('Cidade'),
    fundacao: c['Fundação'] ? Number(c['Fundação']) : null,
    cores: falta('Cores'), mascote: falta('Mascote'), escudo: c['Escudo'] ?? null,
    estadio: est?.[1] ?? null, capacidadeMil: est ? Number(est[2]) : null,
    torcida: tor?.[1] ?? null, torcidaTamanho: tor ? Number(tor[2]) : null, torcidaExigencia: tor ? Number(tor[3]) : null,
    perfil: c['Perfil'] ?? null,
    reputacao: Number(falta('Reputação')),
    forca: c['Força'] ? Number(c['Força']) : null,
    estruturaCT: estru ? Number(estru[1]) : null, estruturaBase: estru ? Number(estru[2]) : null,
    estiloTradicional: falta('Estilo tradicional'),
    rivais, historia: c['História'] ?? null,
  };
}

const CHAVES_TECNICO = new Set(['Clube', 'Contrato até', 'Salário', 'Origem', 'Temperamento', 'Reação nas pausas', 'Imprensa', 'Prefere', 'Estilo', 'Formações', 'Trabalho', 'Reputação', 'Ambição', 'Lealdade', 'História']);

function formacoesPar(s: string, rel: Relatorio, n: number): [string, string] {
  const m = s.match(/^(\S+) \/ (\S+)$/);
  if (!m) { rel.add(n, 'par de formações', s); return ['', '']; }
  return [m[1], m[2]];
}

export function lerTecnicos(texto: string, liga: string, rel: Relatorio): Tecnico[] {
  const res: Tecnico[] = [];
  let atual: Record<string, string> | null = null;
  let cab: { nome: string; idade: number; nac: string; n: number } | null = null;
  let tab: string[] | null = null;
  const fechar = (): void => {
    if (!atual || !cab) return;
    const c = atual;
    const [com, sem] = formacoesPar(c['Formações'] ?? '', rel, cab.n);
    let trabalho: Record<string, number> | null = null;
    if (c['Trabalho']) {
      trabalho = {};
      for (const p of c['Trabalho'].split(' · ')) {
        const m = p.match(/^(.+) (\d+)$/);
        if (!m) rel.add(cab.n, 'trabalho do técnico', p); else trabalho[m[1]] = Number(m[2]);
      }
    }
    res.push({
      nome: cab.nome, idade: cab.idade, nacionalidade: cab.nac, clube: c['Clube'] ?? '', clubeId: null, liga,
      estilo: c['Estilo'] ?? '', formacaoComBola: com, formacaoSemBola: sem,
      reacao: c['Reação nas pausas'] ?? null, temperamento: c['Temperamento'] ?? null, origem: c['Origem'] ?? null,
      trabalho, reputacao: Number(c['Reputação']), ambicao: c['Ambição'] ? Number(c['Ambição']) : null,
      lealdade: c['Lealdade'] ? Number(c['Lealdade']) : null, historia: c['História'] ?? '',
    });
  };
  texto.split(/\r?\n/).forEach((l, i) => {
    const n = i + 1;
    if (ignoravel(l)) return;
    const h = l.match(/^### (.+) \((\d+), (.+)\)$/);
    if (h) { fechar(); atual = {}; cab = { nome: h[1], idade: Number(h[2]), nac: h[3], n }; return; }
    if (l.startsWith('|')) {
      if (ehSeparador(l)) return;
      const c = celulas(l);
      if (c[0] === 'Técnico') { tab = c; return; }
      if (!tab || c.length !== tab.length) { rel.add(n, 'linha de tabela de técnicos', l); return; }
      const col: Record<string, string> = Object.fromEntries(tab.map((t, k) => [t, c[k]]));
      const [com, sem] = formacoesPar(col['Formações'], rel, n);
      res.push({
        nome: col['Técnico'], idade: Number(col['Idade']), nacionalidade: col['Nacionalidade'], clube: col['Clube'], clubeId: null, liga,
        estilo: col['Estilo'], formacaoComBola: com, formacaoSemBola: sem, reacao: null, temperamento: null, origem: null,
        trabalho: null, reputacao: Number(col['Reputação']), ambicao: null, lealdade: null, historia: col['História'],
      });
      return;
    }
    if (!l.startsWith('- **') || !atual) { rel.add(n, 'linha não interpretada', l); return; }
    for (const [k, v] of pares(l)) {
      if (!CHAVES_TECNICO.has(k)) { rel.add(n, `campo de técnico desconhecido: ${k}`, l); continue; }
      atual[k] = v;
    }
  });
  fechar();
  return res;
}

const NOTAS: Record<string, NotaEstilo> = { Bloco: 'Bloco', 'Pressão': 'Pressao', Posse: 'Posse', Verticalidade: 'Verticalidade', Risco: 'Risco', 'Físico': 'Fisico' };

export function lerEstilos(texto: string, rel: Relatorio): Estilo[] {
  const res: Estilo[] = [];
  let atual: Record<string, string> | null = null;
  let cab: { id: string; nome: string; n: number } | null = null;
  const fechar = (): void => {
    if (!atual || !cab) return;
    const c = atual;
    const n = cab.n;
    const nt = {} as Record<NotaEstilo, number>;
    for (const p of (c['Notas'] ?? '').split(' · ')) {
      const m = p.match(/^(\S+) (\d+)$/);
      if (!m || !NOTAS[m[1]]) rel.add(n, 'nota de estilo', p); else nt[NOTAS[m[1]]] = Number(m[2]);
    }
    const pad = c['Padrão']?.match(/^Linha (\S+) · Pressão (\S+) · Largura (\S+) · Ritmo (\S+) · Saída (\S+)$/);
    if (!pad) rel.add(n, 'padrão do estilo', c['Padrão'] ?? '');
    const padrao = { linha: pad?.[1], pressao: pad?.[2], largura: pad?.[3], ritmo: pad?.[4], saida: pad?.[5] } as PadraoTime;
    const [com, sem] = formacoesPar(c['Formações'] ?? '', rel, n);
    const favorece: Estilo['favorece'] = [];
    for (const p of (c['Favorece'] ?? '').split(' · ')) {
      const m = p.match(/^(\S+) (.+)$/);
      if (!m) { rel.add(n, 'favorece', p); continue; }
      const atributos = m[2].split(',').map((x) => attr(x.trim()));
      if (atributos.some((a) => !ATRIBUTOS.has(a))) rel.add(n, 'atributo em favorece', p);
      favorece.push({ posicao: m[1], atributos });
    }
    res.push({
      id: cab.id, nome: cab.nome, notas: nt, padrao, formacaoComBola: com, formacaoSemBola: sem,
      forca: c['Força'] ?? '', brecha: c['Brecha'] ?? '', favorece,
      entrosamentoSemanas: Number((c['Entrosamento'] ?? '').replace(/\D/g, '')), resumo: c['Resumo'] ?? '',
    });
  };
  texto.split(/\r?\n/).forEach((l, i) => {
    const n = i + 1;
    if (ignoravel(l)) return;
    const h = l.match(/^### (EST-\d+) · (.+)$/);
    if (h) { fechar(); atual = {}; cab = { id: h[1], nome: h[2], n }; return; }
    if (!l.startsWith('- **') || !atual) { rel.add(n, 'linha não interpretada', l); return; }
    for (const [k, v] of pares(l)) atual[k] = v;
  });
  fechar();
  return res;
}

function linhasTabela(texto: string, rel: Relatorio, colunas: number, cb: (c: string[], n: number, l: string) => void): void {
  let cabecalho = false;
  texto.split(/\r?\n/).forEach((l, i) => {
    const n = i + 1;
    if (ignoravel(l)) return;
    if (!l.startsWith('|')) { rel.add(n, 'linha não interpretada', l); return; }
    if (ehSeparador(l)) return;
    if (!cabecalho) { cabecalho = true; return; }
    const c = celulas(l);
    if (c.length !== colunas) { rel.add(n, `esperava ${colunas} colunas, veio ${c.length}`, l); return; }
    cb(c, n, l);
  });
}

export function lerFormacoes(texto: string, rel: Relatorio): Formacao[] {
  const res: Formacao[] = [];
  linhasTabela(texto, rel, 3, (c, n, l) => {
    const pecas = c[2].split(' · ').map((p) => p.match(/^(\S+) ((?:PE|ME|CE|MD|PD)[1-6])$/));
    if (pecas.length !== 11 || pecas.some((p) => !p || !POSICOES.has(p[1]))) { rel.add(n, 'peças da formação', l); return; }
    res.push({ id: c[0], nome: c[1], pecas: pecas.map((p) => ({ posicao: p![1] as Posicao, zona: p![2] })) });
  });
  return res;
}

function etiquetas(s: string, rel: Relatorio, n: number): Etiqueta[] {
  const res: Etiqueta[] = [];
  for (const p of s.split(';')) {
    const m = p.trim().match(/^(Ocupa|Libera|Ataca o espaço|Atrai marcador|Abre buraco|Cobre) (Centro|Meia oposta|Meia|Lado oposto|Lado) F(\d)(?:-(\d))?$/);
    if (!m) { rel.add(n, 'etiqueta de instrução', p); continue; }
    const de = Number(m[3]);
    const ate = m[4] ? Number(m[4]) : de;
    const faixas: number[] = [];
    for (let f = de; f <= ate; f++) faixas.push(f);
    res.push({ tipo: m[1], corredor: m[2], faixas });
  }
  return res;
}

export function lerInstrucoes(texto: string, rel: Relatorio): Instrucao[] {
  const res: Instrucao[] = [];
  linhasTabela(texto, rel, 12, (c, n, l) => {
    const custo = c[7].match(/^Energia (\S) · Risco (\S) · Posse (\S)$/);
    if (!custo || (c[3] !== 'Com' && c[3] !== 'Sem')) { rel.add(n, 'custo ou fase da instrução', l); return; }
    const chaves = c[5].split(',').map((x) => attr(x.trim()));
    if (chaves.some((a) => !ATRIBUTOS.has(a))) rel.add(n, 'chave da instrução', c[5]);
    res.push({
      id: c[0], posicao: c[1], nome: c[2], fase: c[3], etiquetas: etiquetas(c[4], rel, n), chaves,
      tracos: lista(c[6]), custo: { energia: custo[1], risco: custo[2], posse: custo[3] }, exige: opt(c[8]),
      combina: c[9] === '—' ? [] : c[9].split('/').map((x) => x.trim()),
      contraria: c[10] === '—' ? [] : c[10].split('/').map((x) => x.trim()), resumo: c[11],
    });
  });
  return res;
}

export function lerCombinacoes(texto: string, rel: Relatorio): Combinacao[] {
  const res: Combinacao[] = [];
  linhasTabela(texto, rel, 8, (c, n, l) => {
    const pecas = c[2].split('+').map((x) => x.trim());
    const bonus = c[5].match(/^(.+) \+(\d+)%$/);
    if (!bonus || pecas.some((p) => !/^INS-\d+$/.test(p))) { rel.add(n, 'peças ou bônus da combinação', l); return; }
    res.push({ id: c[0], nome: c[1], pecas, zona: c[3], condicao: opt(c[4]), bonusTipo: bonus[1], bonusValor: Number(bonus[2]), pista: c[6], revelacao: c[7] });
  });
  return res;
}

export function lerNarracao(texto: string, tema: string, rel: Relatorio): FraseNarracao[] {
  const res: FraseNarracao[] = [];
  linhasTabela(texto, rel, 5, (c, n, l) => {
    if (c[2] !== 'N' && c[2] !== 'C') { rel.add(n, 'voz', l); return; }
    res.push({ id: c[0], tema, lance: c[1], voz: c[2], contexto: c[3] === 'Sempre' ? [] : c[3].split(',').map((x) => x.trim()), texto: c[4] });
  });
  return res;
}

export interface ComissaoLida { tecnico: string | null; profissionais: Profissional[] }

/** Comissões (`dados/comissao/`): um bloco `### Clube (técnico: Nome)` por clube; nos livres, uma tabela só. */
export function lerComissoes(texto: string, rel: Relatorio): ComissaoLida[] {
  const res: ComissaoLida[] = [];
  let atual: ComissaoLida | null = null;
  texto.split(/\r?\n/).forEach((l, i) => {
    const n = i + 1;
    const cab = l.match(/^### .+\(técnico: (.+)\)\s*$/);
    if (cab) { atual = { tecnico: cab[1].trim(), profissionais: [] }; res.push(atual); return; }
    if (!l.startsWith('|') || ehSeparador(l)) return;
    const c = celulas(l);
    if (c[0] === 'Cargo') return;
    if (c.length !== 11) { rel.add(n, `esperava 11 colunas, veio ${c.length}`, l); return; }
    if (!(CARGOS as readonly string[]).includes(c[0])) { rel.add(n, `cargo desconhecido: ${c[0]}`, l); return; }
    const atributos: Record<string, number> = {};
    for (const p of c[4].split('·')) {
      const m = p.trim().match(/^(\S+) (\d+)$/);
      if (!m) { rel.add(n, 'atributo da comissão', p); return; }
      atributos[m[1]] = Number(m[2]);
    }
    const quim = c[8].replace('★', '');
    if (!atual) { atual = { tecnico: null, profissionais: [] }; res.push(atual); }
    atual.profissionais.push({
      cargo: c[0] as Profissional['cargo'], nome: c[1], idade: Number(c[2]), nacionalidade: c[3], atributos,
      reputacao: Number(c[5]), ambicao: Number(c[6]), lealdade: Number(c[7]),
      quimica: /^\d+$/.test(quim) ? Number(quim) : null, homemDeConfianca: c[8].includes('★'),
      salario: Number(c[9]), contrato: /^\d{4}$/.test(c[10]) ? Number(c[10]) : null,
    });
  });
  return res;
}
