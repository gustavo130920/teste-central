// Leitura de dados/eventos/ e dados/imprensa/ (etapa 4, 7ª fatia). Toda condição e todo efeito passam pelo
// vocabulário de gestao/eventos.ts; o que não casar vai para o relatório.
import type { Credibilidade, Efeito, Escolha, ItemImprensa, ModeloEvento, Reporter } from '../gestao/eventos.ts';
import { EVENTOS, condicaoConhecida, lerColuna, lerEfeito } from '../gestao/eventos.ts';
import type { Relatorio } from './parsers.ts';

const celulas = (l: string): string[] => l.split('|').slice(1, -1).map((c) => c.trim());
const ehSeparador = (l: string): boolean => /^\|[\s|:-]+\|$/.test(l);

function efeitos(s: string, rel: Relatorio, n: number): Efeito[] {
  const res: Efeito[] = [];
  for (const tok of s.split(' · ').map((x) => x.trim()).filter((x) => x && x !== '0')) {
    const e = lerEfeito(tok);
    if (!e) rel.add(n, 'efeito desconhecido', tok); else res.push(e);
  }
  return res;
}

function condicoes(s: string, rel: Relatorio, n: number): string[] {
  const cs = s.split(', ').map((x) => x.trim()).filter(Boolean);
  for (const c of cs) if (!condicaoConhecida(c)) rel.add(n, 'condição desconhecida', c);
  return cs;
}

export function lerEventos(texto: string, tema: string, rel: Relatorio): ModeloEvento[] {
  const res: ModeloEvento[] = [];
  let ev: ModeloEvento | null = null;
  let escolha: Escolha | null = null;
  texto.split(/\r?\n/).forEach((l, i) => {
    const n = i + 1;
    if (!l.trim() || l.startsWith('# ') || l.startsWith('Data: ')) return;
    let m = l.match(/^### ([A-Z]{3}-\d{3}) · (.+?)(?:\s+\[Cadeia: (.+) · Elo (\d+)\/(\d+)\])?\s*$/);
    if (m) {
      ev = { id: m[1], tema, titulo: m[2].trim(), cadeia: m[3] ? { nome: m[3], elo: Number(m[4]), de: Number(m[5]) } : null, gatilho: [], alvo: 'Clube',
        peso: null, obrigatorio: false, mods: [], intervalo: 0, prazo: 0, delegado: 'A', texto: '', escolhas: [] };
      res.push(ev);
      escolha = null;
      return;
    }
    if (!ev) { if (l.startsWith('- ') || l.startsWith('  ')) rel.add(n, 'linha fora de evento', l); return; }
    const e: ModeloEvento = ev;
    if ((m = l.match(/^- \*\*Gatilho:\*\* (.+?) · \*\*Alvo:\*\* (.+)$/))) { e.gatilho = condicoes(m[1], rel, n); e.alvo = m[2].trim(); return; }
    if ((m = l.match(/^- \*\*Frequência:\*\* (.+)$/))) {
      const partes = m[1].split(' · **');
      const f = partes[0].trim();
      if (f === 'Obrigatório') e.obrigatorio = true;
      else if (f !== '—') {
        const fm = f.match(/^(Comum|Incomum|Raro)(.*)$/);
        if (!fm) rel.add(n, 'frequência', f);
        else {
          e.peso = EVENTOS.pesos[fm[1]];
          for (const md of fm[2].split('×').map((x) => x.trim()).filter(Boolean)) {
            const mm = md.match(/^(\d+(?:,\d+)?) (?:com )?(.+)$/);
            if (!mm) { rel.add(n, 'modificador', md); continue; }
            const cond = mm[2].trim();
            if (!condicaoConhecida(cond)) rel.add(n, 'condição desconhecida', cond);
            e.mods.push({ fator: Number(mm[1].replace(',', '.')), cond });
          }
        }
      }
      for (const p of partes.slice(1)) {
        const pm = p.match(/^(Intervalo|Prazo|Delegado):\*\* (.+)$/);
        if (!pm) { rel.add(n, 'campo da frequência', p); continue; }
        if (pm[1] === 'Intervalo') e.intervalo = pm[2].trim() === 'Único' ? null : Number(pm[2]);
        if (pm[1] === 'Prazo') e.prazo = Number(pm[2].match(/\d+/)?.[0] ?? 0);
        if (pm[1] === 'Delegado') e.delegado = pm[2].trim();
      }
      return;
    }
    if ((m = l.match(/^- \*\*Texto:\*\* (.+)$/))) { e.texto = m[1].trim(); return; }
    if ((m = l.match(/^- \*\*([A-F])\) (.+?)(:?)\*\*(.*)$/))) {
      let resto = m[4];
      const es: Escolha = { letra: m[1], texto: m[2].trim(), requisito: null, sorteio: null, efeitos: [], sucesso: [], falha: [] };
      if (m[3] === ':') es.efeitos = efeitos(resto, rel, n);
      else {
        const rq = resto.match(/^\s*\[Requisito: ([^\]]+)\]/);
        if (rq) {
          es.requisito = rq[1].trim();
          if (!condicaoConhecida(es.requisito)) rel.add(n, 'requisito desconhecido', es.requisito);
          resto = resto.slice(rq[0].length);
        }
        const so = resto.match(/^\s*· Sorteio (\d+)% \+ (.+)$/);
        if (so) es.sorteio = { base: Number(so[1]), atributo: so[2].trim() };
        else if (/^\s*:/.test(resto)) es.efeitos = efeitos(resto.replace(/^\s*:/, ''), rel, n);
        else rel.add(n, 'escolha', l);
      }
      e.escolhas.push(es);
      escolha = es;
      return;
    }
    if ((m = l.match(/^\s+- (Sucesso|Falha): (.+)$/)) && escolha) {
      (m[1] === 'Sucesso' ? escolha.sucesso : escolha.falha).push(...efeitos(m[2], rel, n));
      return;
    }
    rel.add(n, 'linha não interpretada', l);
  });
  for (const e of res) {
    if (!e.escolhas.some((x) => x.letra === e.delegado)) rel.add(0, `${e.id}: Delegado sem escolha`, e.delegado);
    for (const x of e.escolhas) if (x.sorteio && (!x.sucesso.length || !x.falha.length)) rel.add(0, `${e.id}: sorteio sem Sucesso/Falha`, x.letra);
  }
  return res;
}

export function lerReporteres(texto: string, rel: Relatorio): Reporter[] {
  return linhas(texto, rel).map(({ c }) => ({ id: c['ID'], tipo: c['Tipo'], nome: c['Nome'], veiculo: c['Veículo'], credibilidade: c['Credibilidade'] as Credibilidade }));
}

function linhas(texto: string, rel: Relatorio): { c: Record<string, string>; n: number }[] {
  const res: { c: Record<string, string>; n: number }[] = [];
  let cab: string[] | null = null;
  texto.split(/\r?\n/).forEach((l, i) => {
    if (!l.startsWith('|') || ehSeparador(l)) return;
    const c = celulas(l);
    if (c[0] === 'ID') { cab = c; return; }
    if (!cab || c.length !== cab.length) { rel.add(i + 1, 'linha de tabela', l); return; }
    res.push({ c: Object.fromEntries(cab.map((k, j) => [k, c[j]])), n: i + 1 });
  });
  return res;
}

/** Qualquer tabela de dados/imprensa/ menos a de repórteres. */
export function lerImprensa(texto: string, arquivo: string, rel: Relatorio): ItemImprensa[] {
  return linhas(texto, rel).map(({ c, n }) => {
    const contexto = c['Contexto'] ? condicoes(c['Contexto'], rel, n) : [];
    const cols = [lerColuna('Humor', c['Humor'] ?? '0'), lerColuna('Confiança', c['Confiança'] ?? '0')].filter((x): x is Efeito => !!x);
    const efs = c['Efeitos'] ? efeitos(c['Efeitos'], rel, n) : cols;
    return {
      id: c['ID'], arquivo, assunto: c['Assunto'] ?? '', reporter: c['Repórter'] ?? '', contexto,
      credibilidade: (c['Cred.'] as Credibilidade) ?? null, efeitos: efs,
      manchete: c['Manchete'] ?? '', texto: c['Texto'] ?? c['Fala'] ?? c['Resposta'] ?? c['Pergunta'] ?? '',
      tons: c['Tons'] ? c['Tons'].split('/') : [], pergunta: arquivo === 'respostas' ? c['Pergunta'] : null, tom: c['Tom'] ?? null,
      sinal: (c['Sinal'] as ItemImprensa['sinal']) ?? null,
    };
  });
}
