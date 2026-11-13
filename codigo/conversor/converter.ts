// Lê dados/*.md e gera gerado/*.json. Os .md são a fonte; não edite o JSON à mão.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Clube, FraseNarracao, Jogador, Tatica, Tecnico } from '../motor/dados.ts';
import {
  Relatorio, lerClubes, lerCombinacoes, lerElenco, lerEstilos, lerFormacoes, lerInstrucoes, lerNarracao, lerTecnicos,
} from './parsers.ts';

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
gravar('narracao.json', narracao);
const contagem = {
  clubesCompetindo: competindo.length,
  clubesReserva: clubes.length - competindo.length,
  elencos: Object.keys(elencos).length,
  jogadores: Object.values(elencos).reduce((s, e) => s + e.length, 0),
  livres: livres.length,
  tecnicos: tecnicos.length,
  tecnicosComClube: tecnicos.filter((t) => t.clubeId).length,
  estilos: tatica.estilos.length,
  formacoes: tatica.formacoes.length,
  instrucoes: tatica.instrucoes.length,
  combinacoes: tatica.combinacoes.length,
  frases: narracao.length,
};
gravar('_relatorio.json', { aviso: 'Gerado por conversor/converter.ts. Não edite gerado/ à mão.', contagem, problemas: rel.problemas, avisos });

console.log(Object.entries(contagem).map(([k, v]) => `${k}: ${v}`).join(' · '));
console.log(`Linhas não interpretadas: ${rel.problemas.length} · Avisos de cruzamento: ${avisos.length}`);
for (const p of rel.problemas.slice(0, 40)) console.log(`  ✗ ${p.arquivo}:${p.linha} ${p.motivo}${p.trecho ? ` » ${p.trecho}` : ''}`);
if (rel.problemas.length > 40) console.log(`  ... mais ${rel.problemas.length - 40} em gerado/_relatorio.json`);
for (const a of avisos.slice(0, 40)) console.log(`  ! ${a}`);
if (rel.problemas.length) process.exitCode = 1;
