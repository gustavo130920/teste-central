// Fim da partida (5d2): resultado, gols, estatísticas, notas, lesões e os outros placares da rodada.
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/componentes/ui/button';
import { Secao, rotuloJogo } from '@/componentes/Campo';
import { Estatisticas, Narracao } from '@/telas/Partida';
import type { AoVivoTela } from '@/telas/Partida';
import { cn } from '@/lib/utils';

export function Fim({ v, aoVoltar }: { v: AoVivoTela; aoVoltar: () => void }) {
  const f = v.fim!;
  const n = (id: string) => v.nomes[id] ?? id;
  const [verNarracao, setVerNarracao] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => { botao.current?.focus(); }, []);
  const meu = f.placar[v.jogo.lado];
  const deles = f.placar[v.jogo.lado === 0 ? 1 : 0];
  const pen = f.penaltis ? f.penaltis[v.jogo.lado] - f.penaltis[v.jogo.lado === 0 ? 1 : 0] : 0;
  const r = meu > deles || (meu === deles && pen > 0) ? 'v' : meu < deles || pen < 0 ? 'd' : 'e';
  const gols = (t: 0 | 1) => f.gols.filter((g) => g.time === t).map((g) => `${g.nome} ${g.minuto}${g.obs ? ` (${g.obs})` : ''}`).join(', ');

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10">
      <div className="placar mt-4 rounded-md px-3 py-5 sm:px-6">
        <p className="text-center text-sm text-musgo">Fim de jogo · {rotuloJogo(v.jogo)}</p>
        <h1 className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <span className="led truncate text-right text-xl sm:text-3xl">{n(v.jogo.mandante)}</span>
          <span className="led whitespace-nowrap text-4xl sm:text-6xl">{f.placar[0]}-{f.placar[1]}</span>
          <span className="led truncate text-xl sm:text-3xl">{n(v.jogo.visitante)}</span>
        </h1>
        {f.penaltis && <p className="led mt-1 text-center text-lg">pên. {f.penaltis[0]}-{f.penaltis[1]}</p>}
        <div className="mt-2 grid grid-cols-2 gap-6 text-sm text-musgo">
          <p className="text-right">{gols(0)}</p><p>{gols(1)}</p>
        </div>
        <p className={cn('mt-2 text-center text-lg font-semibold', r === 'v' ? 'text-vitoria' : r === 'd' ? 'text-cartao' : 'text-cal')}>{r === 'v' ? 'Vitória' : r === 'd' ? 'Derrota' : 'Empate'}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button ref={botao} size="lg" className="h-12 min-w-48 text-base font-semibold" onClick={aoVoltar}>Voltar ao painel</Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Secao titulo="Notas do time">
          <ol className="border-y text-sm">
            {f.notas.map((x, i) => (
              <li key={i} className="grid grid-cols-[3rem_1fr_auto] gap-2 border-b border-linha/40 px-1 py-1 last:border-0">
                <span className="text-musgo">{x.vaga}</span>
                <span className="truncate">{x.nome}{x.entrou && <span className="ml-1 text-xs text-musgo">(entrou)</span>}</span>
                <span className={cn('text-right font-semibold', x.nota >= 7 ? 'text-vitoria' : x.nota < 5.5 ? 'text-cartao' : '')}>{x.nota.toFixed(1)}</span>
              </li>
            ))}
          </ol>
          {f.lesoes.length > 0 && <p className="mt-2 text-sm"><span className="text-cartao">Lesões:</span> {f.lesoes.map((l) => `${l.nome} (${l.gravidade}, ${l.semanas} sem.)`).join(', ')}</p>}
        </Secao>
        <Secao titulo="Estatísticas"><Estatisticas e={f.estatisticas} nomes={v.nomes} jogo={v.jogo} /></Secao>
        <Secao titulo="Outros jogos da rodada">
          {f.rodada.length ? (
            <ul className="border-y text-sm">
              {f.rodada.map((j, i) => (
                <li key={i} className="grid grid-cols-[1fr_auto_1fr] gap-2 border-b border-linha/40 py-1 last:border-0">
                  <span className="truncate text-right">{n(j.mandante)}</span>
                  <span className="font-semibold">{j.placar[0]}-{j.placar[1]}{j.penaltis ? ` (${j.penaltis[0]}-${j.penaltis[1]})` : ''}</span>
                  <span className="truncate">{n(j.visitante)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-musgo">Nenhum outro jogo desta competição no dia.</p>}
        </Secao>
      </div>

      <div className="mt-6">
        <Button variant="secondary" aria-expanded={verNarracao} onClick={() => setVerNarracao((x) => !x)}>{verNarracao ? 'Esconder a narração' : 'Ver a narração'}</Button>
        {verNarracao && <div className="mt-2"><Narracao linhas={v.linhas} nomes={v.nomes} jogo={v.jogo} /></div>}
      </div>
    </div>
  );
}
