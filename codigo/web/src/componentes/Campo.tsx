// Peças pequenas das telas da partida: lista de escolha nativa (acessível no teclado e no celular) e cabeçalho do jogo.
import type { ReactNode } from 'react';
import type { InfoJogoTela } from '@/nucleo/protocolo';
import { COMPETICAO } from '@/lib/exibir';
import { cn } from '@/lib/utils';

export function Escolha({ rotulo, valor, aoMudar, opcoes, className, desativado, dica }: {
  rotulo: string; valor: string; aoMudar: (v: string) => void; opcoes: { valor: string; texto: string }[]; className?: string; desativado?: boolean; dica?: string;
}) {
  return (
    <label className={cn('grid min-w-0 gap-0.5 text-sm', className)} title={dica}>
      <span className="text-xs text-musgo">{rotulo}</span>
      <select value={valor} disabled={desativado} onChange={(e) => aoMudar(e.target.value)}
        className="h-9 min-w-0 rounded-md border border-linha bg-relva px-2 text-cal disabled:opacity-50">
        {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
      </select>
    </label>
  );
}

export function Secao({ titulo, children, className, extra }: { titulo: string; children: ReactNode; className?: string; extra?: ReactNode }) {
  const id = `s-${titulo.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section aria-labelledby={id} className={cn('min-w-0', className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 id={id} className="text-lg font-semibold">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function rotuloJogo(j: InfoJogoTela): string {
  return [COMPETICAO[j.competicao] ?? j.competicao, j.fase, `semana ${j.semana}`, j.classico ? 'clássico' : '', j.decisao ? 'decisão' : '', j.estadio ?? ''].filter(Boolean).join(' · ');
}

export const pct = (x: number): string => `${Math.round(x * 100)}%`;
