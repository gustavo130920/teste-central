// Lê dados/*.md e gera gerado/*.json. Os .md são a fonte; não edite o JSON à mão.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Clube, FraseNarracao, Jogador, Profissional, Tatica, Tecnico } from '../motor/dados.ts';
import {
  Relatorio, lerClubes, lerComissoes, lerCombinacoes, lerElenco, lerEstilos, lerFormacoes, lerInstrucoes, lerNarracao, lerTecnicos,
} from './parsers.ts';
import { lerFichas, lerMarcas, lerReduzidas } from './comercial.ts';
import type { Comercial } from '../gestao/financas.ts';
import { lerEmpresarios } from './empresarios.ts';
import { lerDiretorias, lerDiretoriasReduzidas } from './diretoria.ts';
import { lerEventos, lerImprensa, lerReporteres } from './eventos.ts';
import type { Imprensa, ModeloEvento } from '../gestao/eventos.ts';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DADOS = join(raiz, 'dados');
const SAIDA = join(raiz, 'codigo', 'gerado');
const LIGAS = ['serie-a', 'serie-b', 'argentina', 'colombia', 'chile', 'europa'];

const rel = new Relatorio();
const ler = (...p: string[]): string => {
  rel.arquivo = p.join('/');
  return readFileSync(join(DADOS, ...p), 'utf8');
};
const avisos: string[] = [];

const clubes: Clube[] = [];
for (const liga of [...LIGAS, 'reserva']) clubes.push(...lerClubes(ler('clubes', `${liga}.md`), liga, rel));

const tecnicos: Tecnico[] = [];
for (const liga of [...LIGAS, 'livres']) tecnicos.push(...lerTecnicos(ler('tecnicos', `${liga}.md`), liga, rel));

const elencos: Record<string, Jogador[]> = {};
for (const liga of LIGAS) {
  for (const arq of readdirSync(join(DADOS, 'elencos', liga)).filter((a) => a.endsWith('.md')).sort()) {
    const id = basename(arq, '.md');
    const e = lerElenco(ler('elencos', liga, arq), rel, id);
    elencos[id] = e.jogadores;
    const clube = clubes.find((c) => c.id === id);
    if (!clube) { rel.add(1, `elenco sem clube: ${id}`); continue; }
    const t = tecnicos.find((x) => x.nome === e.tecnico);
    if (!t) { rel.add(2, `técnico não encontrado: ${e.tecnico}`); continue; }
    t.clubeId = id;
    clube.nomeCurto = t.clube;
  }
}
const livres = lerElenco(ler('elencos', 'livres.md'), rel, null).jogadores;

const norm = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
for (const c of clubes) {
  for (const r of c.rivais) {
    const achados = clubes.filter((o) => o.id !== c.id && (norm(o.nomeCurto) === norm(r.nome) || norm(o.nome).includes(norm(r.nome))));
    if (achados.length === 1) r.clubeId = achados[0].id;
    else avisos.push(`${c.id}: rival "${r.nome}" ${achados.length ? 'ambíguo' : 'sem clube correspondente'}`);
  }
}

// Comissões: o técnico do cabeçalho liga o bloco ao clube. A Europa não tem comissão nos dados.
const comissoes: Record<string, Profissional[]> = {};
for (const liga of LIGAS.filter((l) => l !== 'europa')) {
  for (const c of lerComissoes(ler('comissao', `${liga}.md`), rel)) {
    const t = tecnicos.find((x) => x.nome === c.tecnico);
    if (!t?.clubeId) { avisos.push(`comissão sem clube: técnico ${c.tecnico}`); continue; }
    comissoes[t.clubeId] = c.profissionais;
  }
}
const comissaoLivre = lerComissoes(ler('comissao', 'livres.md'), rel).flatMap((c) => c.profissionais);

// Comercial (gerador-comercial): fichas completas dos brasileiros, reduzidas dos demais e marcas. Depois dos elencos (nome curto).
const comercial: Comercial = {
  fichas: ['serie-a', 'serie-b'].flatMap((l) => lerFichas(ler('comercial', `${l}.md`), clubes, rel)),
  reduzidas: ['argentina', 'colombia', 'chile', 'europa'].flatMap((l) => lerReduzidas(ler('comercial', `${l}.md`), clubes, rel)),
  marcas: lerMarcas(ler('comercial', '_marcas.md'), rel),
};
for (const c of clubes.filter((x) => !x.reserva)) {
  if (![...comercial.fichas, ...comercial.reduzidas].some((f) => f.clubeId === c.id)) avisos.push(`${c.id}: sem ficha comercial`);
}

// Empresários (gerador-empresarios): carteira ligada ao jogador pelo clube e pelo nome curto.
const empresarios = ['brasil', 'america-do-sul', 'europa'].flatMap((r) => lerEmpresarios(ler('empresarios', `${r}.md`), clubes, elencos, rel));

// Diretorias (gerador-diretoria): fichas completas dos brasileiros e reduzidas dos demais.
const diretorias = [
  ...['serie-a', 'serie-b'].flatMap((l) => lerDiretorias(ler('diretoria', `${l}.md`), l, clubes, rel)),
  ...['argentina', 'colombia', 'chile', 'europa'].flatMap((l) => lerDiretoriasReduzidas(ler('diretoria', `${l}.md`), l, clubes, rel)),
];
for (const c of clubes.filter((x) => !x.reserva)) if (!diretorias.some((d) => d.clubeId === c.id)) avisos.push(`${c.id}: sem diretoria`);

const tatica: Tatica = {
  estilos: lerEstilos(ler('tatica', 'estilos.md'), rel),
  formacoes: lerFormacoes(ler('tatica', 'formacoes.md'), rel),
  instrucoes: lerInstrucoes(ler('tatica', 'instrucoes.md'), rel),
  combinacoes: lerCombinacoes(ler('tatica', 'combinacoes.md'), rel),
};

const narracao: FraseNarracao[] = [];
for (const arq of readdirSync(join(DADOS, 'narracao')).filter((a) => a.endsWith('.md')).sort()) {
  narracao.push(...lerNarracao(ler('narracao', arq), basename(arq, '.md'), rel));
}

// Cruzamentos que o motor precisa para rodar.
const eventos: ModeloEvento[] = [];
for (const arq of readdirSync(join(DADOS, 'eventos')).filter((a) => a.endsWith('.md')).sort()) eventos.push(...lerEventos(ler('eventos', arq), basename(arq, '.md'), rel));
for (const e of eventos) for (const x of e.escolhas) for (const f of [...x.efeitos, ...x.sucesso, ...x.falha]) {
  if (f.k === 'Segue' && !eventos.some((o) => o.id === f.id)) avisos.push(`${e.id}: Segue para ${f.id}, que não existe`);
}
const imprensa: Imprensa = { reporteres: lerReporteres(ler('imprensa', 'reporteres.md'), rel), itens: [] };
for (const arq of readdirSync(join(DADOS, 'imprensa')).filter((a) => a.endsWith('.md') && a !== 'reporteres.md').sort()) {
  imprensa.itens.push(...lerImprensa(ler('imprensa', arq), basename(arq, '.md'), rel));
}

const competindo = clubes.filter((c) => !c.reserva);
for (const c of competindo) {
  const t = tecnicos.find((x) => x.clubeId === c.id);
  if (!t) { avisos.push(`${c.id}: sem técnico`); continue; }
  if (!tatica.estilos.some((e) => e.nome === t.estilo)) avisos.push(`${c.id}: estilo desconhecido "${t.estilo}"`);
  for (const f of [t.formacaoComBola, t.formacaoSemBola]) {
    if (!tatica.formacoes.some((x) => x.nome === f)) avisos.push(`${c.id}: formação fora do catálogo "${f}"`);
  }
  if (!elencos[c.id]?.length) avisos.push(`${c.id}: sem elenco`);
}

mkdirSync(SAIDA, { recursive: true });
const gravar = (nome: string, v: unknown): void => writeFileSync(join(SAIDA, nome), JSON.stringify(v));
gravar('clubes.json', clubes);
gravar('tecnicos.json', tecnicos);
gravar('elencos.json', elencos);
gravar('livres.json', livres);
gravar('tatica.json', tatica);
gravar('comissao.json', { clubes: comissoes, livres: comissaoLivre });
gravar('narracao.json', narracao);
gravar('comercial.json', comercial);
gravar('empresarios.json', empresarios);
gravar('diretoria.json', diretorias);
gravar('eventos.json', eventos);
gravar('imprensa.json', imprensa);
const contagem = {
  clubesCompetindo: competindo.length,
  clubesReserva: clubes.length - competindo.length,
  elencos: Object.keys(elencos).length,
  jogadores: Object.values(elencos).reduce((s, e) => s + e.length, 0),
  livres: livres.length,
  comissoes: Object.keys(comissoes).length,
  profissionais: Object.values(comissoes).reduce((s, c) => s + c.length, 0),
  profissionaisLivres: comissaoLivre.length,
  tecnicos: tecnicos.length,
  tecnicosComClube: tecnicos.filter((t) => t.clubeId).length,
  estilos: tatica.estilos.length,
  formacoes: tatica.formacoes.length,
  instrucoes: tatica.instrucoes.length,
  combinacoes: tatica.combinacoes.length,
  frases: narracao.length,
  fichasComerciais: comercial.fichas.length,
  fichasReduzidas: comercial.reduzidas.length,
  marcas: comercial.marcas.length,
  empresarios: empresarios.length,
  clientes: empresarios.reduce((s, e) => s + e.clientes.length, 0),
  diretorias: diretorias.length,
  diretoriasCompletas: diretorias.filter((d) => d.metas).length,
  eventos: eventos.length,
  imprensa: imprensa.itens.length,
};
gravar('_relatorio.json', { aviso: 'Gerado por conversor/converter.ts. Não edite gerado/ à mão.', contagem, problemas: rel.problemas, avisos });

console.log(Object.entries(contagem).map(([k, v]) => `${k}: ${v}`).join(' · '));
console.log(`Linhas não interpretadas: ${rel.problemas.length} · Avisos de cruzamento: ${avisos.length}`);
for (const p of rel.problemas.slice(0, 40)) console.log(`  ✗ ${p.arquivo}:${p.linha} ${p.motivo}${p.trecho ? ` » ${p.trecho}` : ''}`);
if (rel.problemas.length > 40) console.log(`  ... mais ${rel.problemas.length - 40} em gerado/_relatorio.json`);
for (const a of avisos.slice(0, 40)) console.log(`  ! ${a}`);
if (rel.problemas.length) process.exitCode = 1;
