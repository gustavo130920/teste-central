// Lê dados/diretoria/ (gerador-diretoria): fichas completas dos brasileiros e reduzidas dos demais.
import type { Clube } from '../motor/dados.ts';
import type { Candidato, FichaDiretoria, Financeiro, MetaFicha, MetaInvestidor, NivelMeta } from '../gestao/diretoria.ts';
import { partesDaMeta } from '../gestao/diretoria.ts';
import { clubePorNome } from './comercial.ts';
import type { Relatorio } from './parsers.ts';

const num = (s: string): number => Number(s.trim().replace(/\./g, '').replace(',', '.'));
const celulas = (l: string): string[] => l.split('|').slice(1, -1).map((c) => c.trim());
const FIN = ['Gastador', 'Equilibrado', 'Austero'];

/** "Padrão X · Ousada Y (+10% orçamento) · Modesta Z" */
function lerMetas(texto: string, liga: string, n: number, rel: Relatorio): Record<NivelMeta, MetaFicha | null> | null {
  const out: Record<string, MetaFicha | null> = {};
  for (const p of texto.split(' · ')) {
    const m = p.match(/^(Padrão|Ousada|Modesta) (.+)$/);
    if (!m) { rel.add(n, 'meta não interpretada', p); return null; }
    if (m[2] === 'não existe') { out[m[1]] = null; continue; }
    const bonus = m[2].match(/\(\+(\d+)% orçamento/);
    const textoMeta = m[2].replace(/\s*\(.*\)$/, '').trim();
    if (!partesDaMeta(textoMeta, liga)) { rel.add(n, 'parte de meta desconhecida', textoMeta); return null; }
    out[m[1]] = { texto: textoMeta, bonus: bonus ? Number(bonus[1]) / 100 : 0 };
  }
  if (!('Padrão' in out) || !('Ousada' in out) || !('Modesta' in out)) { rel.add(n, 'metas incompletas', texto); return null; }
  return out as Record<NivelMeta, MetaFicha | null>;
}

function lerInvestidor(texto: string, n: number, rel: Relatorio): MetaInvestidor | null {
  const m = texto.match(/^(receita de pelo menos|prejuízo máximo de) R\$ ([\d.,]+) mi · \*\*Prazo:\*\* (\d+) · Se falhar: (corta o orçamento|troca o representante|vende a participação)$/);
  if (!m) { rel.add(n, 'meta do investidor não interpretada', texto); return null; }
  const falha = m[4].startsWith('corta') ? 'corta' : m[4].startsWith('troca') ? 'troca' : 'vende';
  return { tipo: m[1].startsWith('receita') ? 'receita' : 'prejuizo', valor: num(m[2]), prazo: Number(m[3]), falha };
}

/** "Nome (54) · Pac 8 · Amb 15 · Gastador · Centralizador · Força 12 · proposta · Técnico: troca" */
function lerCandidato(l: string, n: number, rel: Relatorio): Candidato | null {
  const m = l.match(/^\s+- (.+?) \(\d+\) · Pac (\d+) · Amb (\d+) · (Gastador|Equilibrado|Austero) · (Centralizador|Delegador) · Força (\d+) · .+ · Técnico: (troca|mantém)$/);
  if (!m) { rel.add(n, 'candidato não interpretado', l); return null; }
  return { nome: m[1], paciencia: Number(m[2]), ambicao: Number(m[3]), financeiro: m[4] as Financeiro, interferencia: m[5], forca: Number(m[6]), troca: m[7] === 'troca' };
}

/** Ficha completa (Séries A e B). */
export function lerDiretorias(texto: string, liga: string, clubes: Clube[], rel: Relatorio): FichaDiretoria[] {
  const out: FichaDiretoria[] = [];
  let f: Partial<FichaDiretoria> | null = null;
  let n0 = 0;
  let naOposicao = false;
  const fechar = (): void => {
    if (!f) return;
    const faltam = ['paciencia', 'metas'].filter((k) => (f as Record<string, unknown>)[k] == null);
    if (faltam.length) rel.add(n0, `diretoria ${f.clubeId} sem ${faltam.join(', ')}`);
    else out.push(f as FichaDiretoria);
  };
  texto.split(/\r?\n/).forEach((l, i) => {
    const n = i + 1;
    const h = l.match(/^### (.+) \((.+)\)$/);
    if (h) {
      fechar();
      const c = clubePorNome(clubes, h[1]);
      if (!c) { rel.add(n, `clube não encontrado: ${h[1]}`); f = null; return; }
      f = { clubeId: c.id, liga, saf: false, investidor: null, eleicao: null, oposicao: [], popularidade: 10 };
      n0 = n;
      naOposicao = false;
      return;
    }
    if (!f) return;
    if (naOposicao && /^\s+- /.test(l)) { const c = lerCandidato(l, n, rel); if (c) f.oposicao!.push(c); return; }
    if (!l.startsWith('- **')) return;
    naOposicao = false;
    let m: RegExpMatchArray | null;
    if (l.startsWith('- **Investidor:**')) f.saf = true;
    else if (l.startsWith('- **Presidente:**')) f.saf = false;
    else if ((m = l.match(/^- \*\*Paciência:\*\* (\d+) · \*\*Ambição:\*\* (\d+) · \*\*Financeiro:\*\* (\w+) · \*\*Interferência:\*\* (.+?) · \*\*Popularidade:\*\* (\d+)$/))) {
      if (!FIN.includes(m[3])) rel.add(n, 'perfil financeiro desconhecido', m[3]);
      Object.assign(f, { paciencia: Number(m[1]), ambicao: Number(m[2]), financeiro: m[3], interferencia: m[4], popularidade: Number(m[5]) });
    } else if ((m = l.match(/^- \*\*Metas:\*\* (.+)$/))) f.metas = lerMetas(m[1], liga, n, rel);
    else if ((m = l.match(/^- \*\*Meta do investidor:\*\* (.+)$/))) f.investidor = lerInvestidor(m[1], n, rel);
    else if ((m = l.match(/^- \*\*Próxima eleição:\*\* temporada (\d+)/))) f.eleicao = Number(m[1]);
    else if (l.startsWith('- **Oposição:**')) naOposicao = true;
    else if (!/^- \*\*(Promessas|História):\*\*/.test(l)) rel.add(n, 'linha de diretoria não interpretada', l);
  });
  fechar();
  return out;
}

/** Ficha reduzida (sul-americanos e Europa): | Clube | Presidente | Idade | Nac | Paciência | Ambição | Financeiro | Interferência | */
export function lerDiretoriasReduzidas(texto: string, liga: string, clubes: Clube[], rel: Relatorio): FichaDiretoria[] {
  const out: FichaDiretoria[] = [];
  texto.split(/\r?\n/).forEach((l, i) => {
    if (!l.startsWith('|') || /^\|[\s|:-]+\|$/.test(l) || l.startsWith('| Clube')) return;
    const c = celulas(l);
    const clube = clubePorNome(clubes, c[0]);
    if (!clube || c.length !== 8 || !FIN.includes(c[6])) { rel.add(i + 1, 'linha de diretoria reduzida não interpretada', l); return; }
    out.push({ clubeId: clube.id, liga, saf: false, paciencia: num(c[4]), ambicao: num(c[5]), financeiro: c[6] as Financeiro, interferencia: c[7], popularidade: 10, metas: null, investidor: null, eleicao: null, oposicao: [] });
  });
  return out;
}
