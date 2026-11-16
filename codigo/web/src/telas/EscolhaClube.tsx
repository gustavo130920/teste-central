import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/componentes/ui/button';
import { Input } from '@/componentes/ui/input';
import { Label } from '@/componentes/ui/label';
import { Cores } from '@/componentes/Escudo';
import { pedir } from '@/nucleo/cliente';
import type { ClubeResumo, NovoJogo, Origem } from '@/nucleo/protocolo';
import { milhoes } from '@/lib/exibir';
import { cn } from '@/lib/utils';

const ORIGENS: { valor: Origem; texto: string }[] = [
  { valor: 'Ex-jogador', texto: 'Ex-jogador: chega com mais reputação, motiva e lidera o grupo.' },
  { valor: 'Estudioso', texto: 'Estudioso: lê melhor o jogo e treina a tática mais rápido.' },
  { valor: 'Formador da base', texto: 'Formador da base: tira mais dos jovens.' },
];

export function EscolhaClube({ aoComecar, aoVoltar, ocupado }: { aoComecar: (p: NovoJogo) => void; aoVoltar: () => void; ocupado: boolean }) {
  const [clubes, setClubes] = useState<ClubeResumo[] | null>(null);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [origem, setOrigem] = useState<Origem>('Ex-jogador');
  useEffect(() => { void pedir('clubes').then(setClubes); }, []);
  const clube = useMemo(() => clubes?.find((c) => c.id === escolhido) ?? null, [clubes, escolhido]);

  const comecar = () => {
    if (!clube) return;
    aoComecar({ clube: clube.id, nome: nome.trim() || 'Técnico', origem, semente: Math.floor(Math.random() * 1e6) });
  };

  const lista = (liga: 'serie-a' | 'serie-b', titulo: string) => (
    <section aria-labelledby={`l-${liga}`}>
      <h2 id={`l-${liga}`} className="mb-1 text-lg font-semibold">{titulo}</h2>
      <table className="w-full text-sm">
        <thead className="text-left text-musgo">
          <tr className="border-b">
            <th scope="col" className="py-1 pr-2 font-medium">Clube</th>
            <th scope="col" className="hidden py-1 pr-2 font-medium sm:table-cell">Cidade</th>
            <th scope="col" className="py-1 pr-2 text-right font-medium" title="Reputação de 1 a 20">Rep.</th>
            <th scope="col" className="hidden py-1 text-right font-medium xl:table-cell">Caixa</th>
          </tr>
        </thead>
        <tbody>
          {clubes?.filter((c) => c.liga === liga).map((c) => (
            <tr key={c.id} className={cn('border-b border-linha/50', escolhido === c.id && 'bg-faixa')}>
              <td className="py-0">
                <button type="button" aria-pressed={escolhido === c.id} onClick={() => setEscolhido(c.id)}
                  className="flex w-full items-center gap-2 whitespace-nowrap py-1.5 pr-2 text-left font-semibold hover:text-led" title={c.nome}>
                  <Cores cores={c.cores} />{c.nomeCurto}
                </button>
              </td>
              <td className="hidden whitespace-nowrap py-1.5 pr-2 text-musgo sm:table-cell">{c.cidade}</td>
              <td className="py-1.5 pr-2 text-right">{c.reputacao}</td>
              <td className="hidden whitespace-nowrap py-1.5 text-right text-musgo xl:table-cell">{milhoes(c.caixa)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-bold">Escolha o seu clube</h1>
        <Button variant="ghost" onClick={aoVoltar}>Voltar ao início</Button>
      </header>
      {!clubes && <p className="text-musgo" role="status">Carregando os clubes…</p>}
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr_20rem]">
        {clubes && lista('serie-a', 'Série A')}
        {clubes && lista('serie-b', 'Série B')}
        <aside aria-label="Seu técnico" className="lg:sticky lg:top-6 lg:self-start">
          <form className="space-y-4 rounded-md border bg-relva p-4" onSubmit={(e) => { e.preventDefault(); comecar(); }}>
            {clube ? (
              <div>
                <p className="flex items-center gap-2 text-xl font-bold"><Cores cores={clube.cores} className="h-5 w-4" />{clube.nome}</p>
                <p className="text-sm text-musgo">{clube.cidade}{clube.estadio ? `, ${clube.estadio}` : ''}</p>
                <p className="mt-2 text-sm">Herda o jogo do técnico anterior, {clube.tecnico.nome}: <span className="font-semibold">{clube.tecnico.estilo}</span> no {clube.tecnico.formacao}.</p>
              </div>
            ) : <p className="text-musgo">Escolha um clube na lista.</p>}
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome do técnico</Label>
              <Input id="nome" value={nome} maxLength={40} autoComplete="off" placeholder="Seu nome" onChange={(e) => setNome(e.target.value)} />
            </div>
            <fieldset className="space-y-1.5">
              <legend className="mb-1 text-sm font-medium">Origem</legend>
              {ORIGENS.map((o) => (
                <label key={o.valor} className="flex cursor-pointer items-start gap-2 text-sm">
                  <input type="radio" name="origem" value={o.valor} checked={origem === o.valor} onChange={() => setOrigem(o.valor)} className="mt-1 accent-[var(--led)]" />
                  <span>{o.texto}</span>
                </label>
              ))}
            </fieldset>
            <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={!clube || ocupado}>
              {ocupado ? 'Preparando a temporada…' : clube ? `Assumir o ${clube.nomeCurto}` : 'Assumir o clube'}
            </Button>
          </form>
        </aside>
      </div>
    </div>
  );
}
