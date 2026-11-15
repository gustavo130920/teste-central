// Lê dados/empresarios/ (gerador-empresarios): perfil, Ganância, Influência, memória com os clubes e carteira de clientes.
import type { Clube, Jogador } from '../motor/dados.ts';
import type { Empresario } from '../gestao/mercado.ts';
import type { Relatorio } from './parsers.ts';
import { clubePorNome } from './comercial.ts';

const norm = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

export function lerEmpresarios(texto: string, clubes: Clube[], elencos: Record<string, Jogador[]>, rel: Relatorio): Empresario[] {
  const out: Empresario[] = [];
  let e: Empresario | null = null;
  texto.split(/\r?\n/).forEach((l, i) => {
    const n = i + 1;
    const h = l.match(/^### (.+?) \(\d+/);
    if (h) {
      e = { id: `EMP-${out.length + 1}-${norm(h[1]).replace(/\W+/g, '-')}`, nome: h[1], perfil: '', ganancia: 10, influencia: 10, memoria: {}, clientes: [] };
      out.push(e);
      return;
    }
    if (!e) return;
    const p = l.match(/\*\*Perfil:\*\* (\S+) · \*\*Ganância:\*\* (\d+) · \*\*Influência:\*\* (\d+)/);
    if (p) { e.perfil = p[1]; e.ganancia = Number(p[2]); e.influencia = Number(p[3]); return; }
    const mem = l.match(/\*\*Memória:\*\* (.+)$/);
    if (mem) {
      for (const parte of mem[1].split(' · ')) {
        const x = parte.match(/^([+−-]\d+) ([^:]+):/);
        if (!x) continue;
        const c = clubePorNome(clubes, x[2]);
        if (!c) { rel.add(n, `empresário ${e.nome}: clube da memória não encontrado: ${x[2]}`); continue; }
        e.memoria[c.id] = Number(x[1].replace('−', '-'));
      }
      return;
    }
    const cart = l.match(/\*\*Carteira \(\d+\):\*\* (.+)$/);
    if (cart) {
      for (const item of cart[1].split(',').map((s) => s.trim())) {
        const [sigla, ...resto] = item.split(' ');
        const nome = norm(resto.join(' '));
        const j = (elencos[sigla] ?? []).find((x) => norm(x.nome) === nome);
        if (!j) { rel.add(n, `empresário ${e.nome}: cliente não encontrado: ${item}`); continue; }
        e.clientes.push(j.id);
      }
    }
  });
  return out;
}
