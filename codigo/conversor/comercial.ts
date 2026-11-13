// Lê dados/comercial/ (gerador-comercial): fichas completas dos brasileiros, fichas reduzidas e marcas.
import type { Comercial, Cota, FichaComercial, FichaReduzida, Marca } from '../gestao/financas.ts';
import type { Clube } from '../motor/dados.ts';
import type { Relatorio } from './parsers.ts';

const num = (s: string): number => Number(s.trim().replace(/\./g, '').replace(',', '.'));
const norm = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const celulas = (l: string): string[] => l.split('|').slice(1, -1).map((c) => c.trim());

/** Acha o clube pelo nome do cabeçalho (nome curto ou parte do nome). */
export function clubePorNome(clubes: Clube[], nome: string): Clube | null {
  const n = norm(nome);
  const achados = clubes.filter((c) => !c.reserva && (norm(c.nomeCurto) === n || norm(c.nome) === n));
  if (achados.length === 1) return achados[0];
  const parte = clubes.filter((c) => !c.reserva && norm(c.nome).includes(n));
  return parte.length === 1 ? parte[0] : null;
}

/** Ficha completa (Séries A e B). */
export function lerFichas(texto: string, clubes: Clube[], rel: Relatorio): FichaComercial[] {
  const fichas: FichaComercial[] = [];
  let f: Partial<FichaComercial> | null = null;
  let n0 = 0;
  const fechar = (): void => {
    if (!f) return;
    const faltam = ['custoAnual', 'receita', 'tvFixa', 'cotas', 'ocupacao', 'saf'].filter((k) => (f as Record<string, unknown>)[k] === undefined);
    if (faltam.length) rel.add(n0, `ficha ${f.clubeId} sem ${faltam.join(', ')}`);
    else fichas.push(f as FichaComercial);
  };
  texto.split(/\r?\n/).forEach((l, i) => {
    const n = i + 1;
    const h = l.match(/^### (.+) \((.+)\)$/);
    if (h) {
      fechar();
      const c = clubePorNome(clubes, h[1]);
      if (!c) { rel.add(n, `clube não encontrado: ${h[1]}`); f = null; return; }
      f = { clubeId: c.id, perfil: h[2], atrasados: 0 };
      n0 = n;
      return;
    }
    if (!f || !l.startsWith('- **')) return;
    let m: RegExpMatchArray | null;
    if ((m = l.match(/Custo anual:\*\* R\$ ([\d.,]+) mi \(folha ([\d.]+) \+ comissão ([\d.]+) \+ técnico ([\d.]+)/))) {
      Object.assign(f, { custoAnual: num(m[1]), folha: num(m[2]), comissao: num(m[3]), tecnico: num(m[4]) });
    } else if ((m = l.match(/Receita:\*\* R\$ ([\d.,]+) mi · \*\*Caixa:\*\* R\$ (-?[\d.,]+) mi · \*\*Dívida:\*\* R\$ ([\d.,]+) mi/))) {
      Object.assign(f, { receita: num(m[1]), caixa: num(m[2]), divida: num(m[3]) });
    } else if ((m = l.match(/TV:\*\* fixa ([\d,]+) \+ bônus de torcida ([\d.,]+) · \*\*Orçamento de transferências:\*\* R\$ ([\d.,]+) mi · \*\*Teto de folha:\*\* ([\d.]+)/))) {
      Object.assign(f, { tvFixa: num(m[1]), tvBonus: num(m[2]), orcamento: num(m[3]), teto: num(m[4]) });
    } else if (l.startsWith('- **Patrocínio:**')) {
      const cotas: Cota[] = [];
      for (const p of l.replace('- **Patrocínio:** ', '').split(' · ')) {
        const c = p.match(/^(Máster|Material|Secundário) (.+) ([\d,]+) \(até (\d{4})\)$/);
        if (!c) { rel.add(n, 'cota não interpretada', p); continue; }
        cotas.push({ tipo: c[1] as Cota['tipo'], marca: c[2], valor: num(c[3]), ate: Number(c[4]) });
      }
      f.cotas = cotas;
    } else if ((m = l.match(/ocupação (\d+)% · ingresso R\$ (\d+) · ([\d.]+) sócios a R\$ (\d+) · total R\$ ([\d,]+) mi/))) {
      Object.assign(f, { ocupacao: num(m[1]) / 100, ingresso: num(m[2]), socios: num(m[3]), mensalidade: num(m[4]), publico: num(m[5]) });
    } else if ((m = l.match(/Gestão:\*\* (.+)$/))) {
      const s = m[1].match(/^SAF \((.+), (\d+)%, meta: (.+)\)$/);
      f.saf = s ? { investidor: s[1], participacao: Number(s[2]), meta: s[3] } : null;
    } else if (l.startsWith('- **Obs:**')) {
      // Só atraso de salário conta (atraso de direito de imagem não libera; GDD-gestao 7).
      const a = l.match(/Salários atrasados há (\d+) meses/) ?? l.match(/(\d+) m[eê]s(?:es)? de salário/);
      if (a) f.atrasados = Number(a[1]);
    } else rel.add(n, 'linha de ficha comercial não interpretada', l);
  });
  fechar();
  return fichas;
}

/** Ficha reduzida (sul-americanos e Europa). */
export function lerReduzidas(texto: string, clubes: Clube[], rel: Relatorio): FichaReduzida[] {
  const out: FichaReduzida[] = [];
  texto.split(/\r?\n/).forEach((l, i) => {
    if (!l.startsWith('|') || /^\|[\s|:-]+\|$/.test(l) || l.startsWith('| Clube')) return;
    const c = celulas(l);
    const clube = clubePorNome(clubes, c[0]);
    if (!clube || c.length !== 5) { rel.add(i + 1, 'linha de ficha reduzida não interpretada', l); return; }
    out.push({ clubeId: clube.id, perfil: c[1], folha: num(c[2]), teto: num(c[3]), orcamento: num(c[4]) });
  });
  return out;
}

export function lerMarcas(texto: string, rel: Relatorio): Marca[] {
  const out: Marca[] = [];
  texto.split(/\r?\n/).forEach((l, i) => {
    if (!l.startsWith('|') || /^\|[\s|:-]+\|$/.test(l) || l.startsWith('| Marca')) return;
    const c = celulas(l);
    if (c.length !== 5) { rel.add(i + 1, 'marca não interpretada', l); return; }
    out.push({ nome: c[0], segmento: c[1], porte: c[2], teto: num(c[3]), uso: c[4].split(',').map((x) => x.trim()).filter(Boolean) });
  });
  return out;
}

export type { Comercial };
