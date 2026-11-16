import { coresDoClube } from '@/lib/exibir';
import { cn } from '@/lib/utils';

/** Faixas verticais com as cores do clube (sem escudo: o jogo não usa marcas). */
export function Cores({ cores, className }: { cores: string; className?: string }) {
  const cs = coresDoClube(cores);
  return (
    <span aria-hidden className={cn('inline-flex h-4 w-3 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/40', className)}>
      {cs.map((c, i) => <span key={i} className="h-full flex-1" style={{ background: c }} />)}
    </span>
  );
}
