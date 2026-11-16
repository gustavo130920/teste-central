import { useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Button } from '@/componentes/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/componentes/ui/dialog';
import { Cores } from '@/componentes/Escudo';
import { Kbd } from '@/componentes/kbd';
import { SpecialText } from '@/componentes/special-text';
import { Spinner } from '@/componentes/spinner';
import { Slots } from '@/componentes/Slots';
import type { JogoTela, Painel as P } from '@/nucleo/protocolo';
import { COMPETICAO, milhoes } from '@/lib/exibir';
import { cn } from '@/lib/utils';

const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Texto do placar: troca com o embaralhado de painel eletrônico, salvo com movimento reduzido. */
function Letreiro({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn('block min-w-0 truncate', className)} title={children}>
      {semMovimento() ? children : <SpecialText key={children} speed={18} className="h-auto font-[inherit] leading-[inherit]">{children}</SpecialText>}
    </span>
  );
}

function resultadoDe(j: JogoTela, clube: string): 'v' | 'e' | 'd' | null {
  if (!j.placar) return null;
  const [a, b] = j.mandante === clube ? j.placar : [j.placar[1], j.placar[0]];
  if (a === b) return j.penaltis ? ((j.mandante === clube ? j.penaltis[0] > j.penaltis[1] : j.penaltis[1] > j.penaltis[0]) ? 'v' : 'd') : 'e';
  return a > b ? 'v' : 'd';
}

function Placar({ p }: { p: P }) {
  const j = p.ultimos.at(-1) ?? null;
  const prox = p.proximo;
  const mostra = j ?? prox;
  const n = (id: string) => p.nomes[id] ?? id;
  if (!mostra) {
    return (
      <div className="placar rounded-md px-4 py-6 text-center">
        <p className="led text-2xl">{p.tecnico.clube ? 'Sem jogo marcado' : 'Técnico sem clube'}</p>
        <p className="mt-2 text-musgo">{p.tecnico.clube ? 'A semana segue com treino e mercado.' : 'O mundo segue; a diretoria do próximo clube ainda não ligou.'}</p>
      </div>
    );
  }
  const r = j ? resultadoDe(j, p.clube.id) : null;
  return (
    <div className="placar rounded-md px-3 py-5 sm:px-6" aria-live="polite">
      <p className="text-center text-sm text-musgo">
        {j ? 'Resultado' : 'Próximo jogo'}: {COMPETICAO[mostra.competicao] ?? mostra.competicao}{mostra.fase ? `, ${mostra.fase}` : ''}, semana {mostra.semana}
      </p>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        <Letreiro className="led text-right text-xl sm:text-3xl">{n(mostra.mandante)}</Letreiro>
        <span className="led whitespace-nowrap text-4xl sm:text-5xl">{mostra.placar ? `${mostra.placar[0]}-${mostra.placar[1]}` : 'x'}</span>
        <Letreiro className="led text-xl sm:text-3xl">{n(mostra.visitante)}</Letreiro>
      </div>
      {j?.penaltis && <p className="led mt-1 text-center text-lg">pên. {j.penaltis[0]}-{j.penaltis[1]}</p>}
      {r && <p className={cn('mt-2 text-center font-semibold', r === 'v' ? 'text-vitoria' : r === 'd' ? 'text-cartao' : 'text-cal')}>{r === 'v' ? 'Vitória' : r === 'd' ? 'Derrota' : 'Empate'}</p>}
      {j && prox && <p className="mt-3 text-center text-sm text-musgo">A seguir: {n(prox.mandante)} x {n(prox.visitante)}, {COMPETICAO[prox.competicao]}, semana {prox.semana}</p>}
    </div>
  );
}

function Calendario({ p }: { p: P }) {
  const lista = useRef<HTMLOListElement>(null);
  const n = (id: string) => p.nomes[id] ?? id;
  useEffect(() => {
    const l = lista.current;
    const alvo = l?.querySelector<HTMLElement>('[data-proximo]');
    if (l && alvo) l.scrollTop = alvo.offsetTop - l.offsetTop - l.clientHeight / 2 + alvo.clientHeight / 2;
  }, [p.dia]);
  const proximo = p.calendario.find((j) => !j.placar);
  return (
    <section aria-labelledby="cal" className="min-w-0">
      <h2 id="cal" className="mb-1 text-lg font-semibold">Calendário do {p.clube.nomeCurto}</h2>
      <ol ref={lista} className="max-h-[28rem] overflow-y-auto border-y text-sm">
        {p.calendario.map((j, i) => {
          const r = resultadoDe(j, p.clube.id);
          const casa = j.mandante === p.clube.id;
          return (
            <li key={`${j.dia}-${j.competicao}-${i}`} data-proximo={j === proximo ? '' : undefined}
              className={cn('grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 border-b border-linha/50 px-1 py-1.5 last:border-0', j === proximo && 'bg-faixa')}>
              <span className="text-musgo">S{j.semana}</span>
              <span className="min-w-0 truncate">
                <span className={casa ? 'font-semibold' : ''}>{n(j.mandante)}</span> x <span className={!casa ? 'font-semibold' : ''}>{n(j.visitante)}</span>
                <span className="block truncate text-xs text-musgo">{COMPETICAO[j.competicao] ?? j.competicao}{j.fase ? `, ${j.fase}` : ''}</span>
              </span>
              <span className={cn('w-14 text-right font-semibold', r === 'v' && 'text-vitoria', r === 'd' && 'text-cartao')}>
                {j.placar ? `${j.placar[0]}-${j.placar[1]}` : j === proximo ? 'próximo' : ''}
                {j.penaltis && <span className="block text-xs font-normal text-musgo">pên. {j.penaltis[0]}-{j.penaltis[1]}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Tabela({ p }: { p: P }) {
  const zonas = p.tabela.liga === 'serie-a' ? { topo: 4, queda: 4 } : p.tabela.liga === 'serie-b' ? { topo: 4, queda: 0 } : { topo: 0, queda: 0 };
  const total = p.tabela.linhas.length;
  return (
    <section aria-labelledby="tab" className="min-w-0">
      <h2 id="tab" className="mb-1 text-lg font-semibold">{COMPETICAO[p.tabela.liga] ?? p.tabela.liga}</h2>
      <table className="w-full text-sm">
        <thead className="text-musgo">
          <tr className="border-b text-right">
            <th scope="col" className="w-7 py-1 text-left font-medium">#</th>
            <th scope="col" className="py-1 text-left font-medium">Clube</th>
            <th scope="col" className="w-9 py-1 font-semibold text-cal" title="Pontos">P</th>
            <th scope="col" className="w-8 py-1 font-medium" title="Jogos">J</th>
            <th scope="col" className="w-8 py-1 font-medium" title="Vitórias">V</th>
            <th scope="col" className="hidden w-8 py-1 font-medium sm:table-cell" title="Empates">E</th>
            <th scope="col" className="hidden w-8 py-1 font-medium sm:table-cell" title="Derrotas">D</th>
            <th scope="col" className="hidden w-10 py-1 font-medium md:table-cell" title="Gols pró e contra">GP:GC</th>
            <th scope="col" className="w-9 py-1 font-medium" title="Saldo de gols">SG</th>
          </tr>
        </thead>
        <tbody>
          {p.tabela.linhas.map((l) => (
            <tr key={l.clube} className={cn('border-b border-linha/40 text-right', l.clube === p.clube.id && 'bg-faixa font-semibold')}>
              <td className={cn('py-1 text-left', l.pos <= zonas.topo && 'text-vitoria', l.pos > total - zonas.queda && 'text-cartao')}>{l.pos}</td>
              <td className="truncate py-1 text-left">{p.nomes[l.clube] ?? l.clube}</td>
              <td className="py-1 font-semibold">{l.pts}</td>
              <td className="py-1 text-musgo">{l.j}</td>
              <td className="py-1">{l.v}</td>
              <td className="hidden py-1 sm:table-cell">{l.e}</td>
              <td className="hidden py-1 sm:table-cell">{l.d}</td>
              <td className="hidden py-1 text-musgo md:table-cell">{l.gp}:{l.gc}</td>
              <td className="py-1">{l.sg > 0 ? `+${l.sg}` : l.sg}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-xs text-musgo">
        {p.tabela.liga === 'serie-a' ? 'Verde: vagas da Libertadores pela liga. Vermelho: rebaixamento.' : p.tabela.liga === 'serie-b' ? 'Verde: acesso à Série A.' : ''}
      </p>
    </section>
  );
}

function Virada({ p }: { p: P }) {
  const v = p.virada!;
  const n = (id: string) => p.nomes[id] ?? id;
  return (
    <section aria-labelledby="virada" className="rounded-md border border-led/50 bg-relva p-4">
      <h2 id="virada" className="text-lg font-semibold">Fim do ano {v.ano}: começa o ano {p.ano}</h2>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {Object.entries(v.campeoes).map(([c, id]) => (
          <div key={c} className="flex justify-between gap-3 border-b border-linha/40 py-0.5"><dt className="text-musgo">{COMPETICAO[c] ?? c}</dt><dd className="font-semibold">{n(id)}</dd></div>
        ))}
      </dl>
      <p className="mt-2 text-sm"><span className="text-musgo">Sobem:</span> {v.promovidos.map(n).join(', ')}. <span className="text-musgo">Caem:</span> {v.rebaixados.map(n).join(', ')}.</p>
      <p className="mt-1 text-xs text-musgo">Gravado no slot automático.</p>
    </section>
  );
}

export function Painel({ painel: p, aoAvancar, aoGestao, ocupado, aoSair, erro }: { painel: P; aoAvancar: () => void; aoGestao: () => void; ocupado: boolean; aoSair: () => void; erro: string | null }) {
  const [salvando, setSalvando] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  useHotkeys('a', () => { if (!ocupado && !salvando) aoAvancar(); }, [ocupado, salvando, aoAvancar]);
  useHotkeys('e', () => { if (!ocupado && p.tecnico.clube) aoGestao(); }, [ocupado, aoGestao, p.tecnico.clube]);
  useHotkeys('s', () => setSalvando(true), []);
  useEffect(() => { if (!ocupado) botao.current?.focus(); }, [ocupado]);
  const indicador = (rotulo: string, valor: string, dica: string) => (
    <div title={dica}><dt className="text-xs text-musgo">{rotulo}</dt><dd className="text-lg font-semibold">{valor}</dd></div>
  );
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Cores cores={p.clube.cores} className="h-7 w-5" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold leading-tight">{p.clube.nome}</h1>
            <p className="text-sm text-musgo">{p.tecnico.nome}{p.tecnico.clube ? '' : ' (sem clube)'}, reputação {p.tecnico.reputacao}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="mr-2 text-right leading-tight"><span className="block text-xs text-musgo">Ano {p.ano}</span><span className="text-lg font-semibold">Semana {Math.min(p.semana, 52)}</span></p>
          <Button variant="secondary" disabled={!p.tecnico.clube} onClick={aoGestao}>Elenco e treino <Kbd keys={['E']} className="ml-1" /></Button>
          <Button variant="secondary" onClick={() => setSalvando(true)}>Salvar <Kbd keys={['S']} className="ml-1" /></Button>
          <Button variant="ghost" onClick={aoSair}>Início</Button>
        </div>
      </header>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Placar p={p} />
          <div className="flex flex-wrap items-center gap-4">
            <Button ref={botao} size="lg" className="h-12 min-w-56 text-base font-semibold" disabled={ocupado} onClick={aoAvancar}>
              {ocupado ? <><Spinner className="mr-2" /> Jogando a rodada…</> : p.proximo ? 'Avançar até o próximo jogo' : 'Avançar uma semana'}
            </Button>
            <span className="text-sm text-musgo">ou <Kbd keys={['A']} /></span>
          </div>
          {erro && <p role="alert" className="text-cartao">{erro}</p>}
          <dl className="grid grid-cols-3 gap-3 border-y py-2">
            {indicador('Confiança da diretoria', p.confianca === null ? '—' : `${Math.round(p.confianca)}`, 'De 0 a 100. Muito baixa, o técnico cai.')}
            {indicador('Humor da torcida', p.humor === null ? '—' : `${Math.round(p.humor)}`, 'De 0 a 100. Baixo, a torcida vaia em casa.')}
            {indicador('Caixa', milhoes(p.caixa), 'Dinheiro do clube agora.')}
          </dl>
          {p.virada && <Virada p={p} />}
          <Calendario p={p} />
        </div>
        <Tabela p={p} />
      </div>

      <Dialog open={salvando} onOpenChange={setSalvando}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Salvar a carreira</DialogTitle>
            <DialogDescription>Grava o ano como está agora, neste navegador. Exporte para levar o save a outro lugar.</DialogDescription>
          </DialogHeader>
          <Slots modo="salvar" ocupado={ocupado} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
