import { Fragment, useEffect, useState } from 'react';
import { Button } from '@/componentes/ui/button';
import { Spinner } from '@/componentes/spinner';
import { pedir } from '@/nucleo/cliente';
import type { Carga, ElencoTela, Foco, LinhaElenco, TreinoTela } from '@/nucleo/protocolo';
import { Base, Comercial } from '@/telas/BaseComercial';
import { Mercado } from '@/telas/Mercado';
import { cn } from '@/lib/utils';

const CARGAS: { id: Carga; nome: string; dica: string }[] = [
  { id: 'leve', nome: 'Leve', dica: 'Recupera mais, evolui menos e arrisca menos lesão.' },
  { id: 'normal', nome: 'Normal', dica: 'O equilíbrio.' },
  { id: 'pesada', nome: 'Pesada', dica: 'Evolui mais, cansa e arrisca mais lesão.' },
];
const FOCOS: { id: Foco; nome: string; dica: string }[] = [
  { id: 'tatica', nome: 'Tática', dica: 'Sobe o entrosamento da tática marcada para treino.' },
  { id: 'fisico', nome: 'Físico', dica: 'O time gasta menos energia no jogo seguinte.' },
  { id: 'tecnico', nome: 'Técnico', dica: 'Ganho de atributos técnicos.' },
  { id: 'bolaParada', nome: 'Bola parada', dica: 'Mais bolas paradas ensaiadas no jogo seguinte.' },
  { id: 'adversario', nome: 'Adversário', dica: 'Preparação para o próximo rival.' },
];
const pct = (v: number) => `${Math.round(v * 100)}%`;
const corBarra = (v: number) => (v >= 75 ? 'bg-vitoria' : v >= 50 ? 'bg-led' : 'bg-cartao');

function Barra({ v, rotulo }: { v: number; rotulo: string }) {
  return (
    <span className="inline-flex items-center justify-end gap-1.5" title={`${rotulo} ${v}`}>
      <span aria-hidden className="h-1.5 w-10 overflow-hidden rounded bg-faixa"><span className={cn('block h-full', corBarra(v))} style={{ width: `${v}%` }} /></span>
      <span className="w-6 text-right tabular-nums">{v}</span>
    </span>
  );
}

function Elenco({ e, dia }: { e: ElencoTela; dia: number }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const estado = (j: LinhaElenco) => j.estado === 'lesionado'
    ? <span className="text-cartao">Lesão, volta em {Math.max(1, (j.voltaDia ?? dia) - dia)} dias</span>
    : j.estado === 'suspenso' ? <span className="text-cal">Suspenso</span> : <span className="text-musgo">Disponível</span>;
  return (
    <section aria-labelledby="elenco">
      <h2 id="elenco" className="mb-1 text-lg font-semibold">Elenco ({e.jogadores.length}) <span className="text-sm font-normal text-musgo">folha R$ {e.folhaMes.toLocaleString('pt-BR')} mil/mês</span></h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm [&_td]:px-2 [&_th]:px-2">
          <thead className="text-musgo">
            <tr className="border-b text-right">
              <th scope="col" className="py-1 text-left font-medium">Jogador</th>
              <th scope="col" className="w-12 py-1 text-left font-medium">Pos</th>
              <th scope="col" className="w-10 py-1 font-medium" title="Idade">Id</th>
              <th scope="col" className="w-12 py-1 font-semibold text-cal" title="Nota">Nota</th>
              <th scope="col" className="w-12 py-1 font-medium" title="Potencial">Pot</th>
              <th scope="col" className="py-1 font-medium">Condição</th>
              <th scope="col" className="py-1 font-medium">Moral</th>
              <th scope="col" className="hidden py-1 text-left font-medium md:table-cell">Situação</th>
              <th scope="col" className="hidden w-14 py-1 font-medium lg:table-cell" title="Fim do contrato">Contr.</th>
              <th scope="col" className="hidden w-16 py-1 font-medium lg:table-cell" title="R$ mil por mês">Salário</th>
              <th scope="col" className="hidden w-16 py-1 font-medium lg:table-cell" title="R$ mi">Valor</th>
            </tr>
          </thead>
          <tbody>
            {e.jogadores.map((j) => (
              <Fragment key={j.id}>
                <tr className="border-b border-linha/40 text-right hover:bg-faixa">
                  <td className="py-1 text-left">
                    <button type="button" className="text-left font-semibold underline-offset-2 hover:underline" aria-expanded={aberto === j.id} onClick={() => setAberto(aberto === j.id ? null : j.id)}>{j.nome}</button>
                  </td>
                  <td className="py-1 text-left text-musgo">{j.posicao}</td>
                  <td className="py-1 text-musgo">{j.idade}</td>
                  <td className="py-1 font-semibold">{j.nota.toFixed(1)}</td>
                  <td className="py-1 text-musgo">{j.potencial.toFixed(1)}</td>
                  <td className="py-1"><Barra v={j.condicao} rotulo="Condição" /></td>
                  <td className="py-1"><Barra v={j.moral} rotulo="Moral" /></td>
                  <td className="hidden py-1 text-left md:table-cell">{estado(j)}</td>
                  <td className="hidden py-1 text-musgo lg:table-cell">{j.contrato ?? '—'}</td>
                  <td className="hidden py-1 lg:table-cell">{j.salario.toLocaleString('pt-BR')}</td>
                  <td className="hidden py-1 lg:table-cell">{j.valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</td>
                </tr>
                {aberto === j.id && (
                  <tr className="border-b border-linha/40 bg-relva text-left">
                    <td colSpan={11} className="px-2 py-2 text-xs">
                      <p>{estado(j)} · {j.titularidades} jogos como titular no ano</p>
                      <p><span className="text-musgo">Traços:</span> {j.tracos.join(', ') || '—'}</p>
                      <p><span className="text-musgo">Qualidades:</span> {j.qualidades.join(', ') || '—'} · <span className="text-musgo">Defeitos:</span> {j.defeitos.join(', ') || '—'}</p>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Opcoes<T extends string>({ rotulo, lista, atual, ativo, escolher }: { rotulo: string; lista: { id: T; nome: string; dica: string }[]; atual: T; ativo: boolean; escolher: (v: T) => void }) {
  return (
    <fieldset disabled={!ativo} className="min-w-0">
      <legend className="mb-1 text-sm text-musgo">{rotulo}</legend>
      <div className="flex flex-wrap gap-2">
        {lista.map((x) => (
          <button key={x.id} type="button" title={x.dica} aria-pressed={atual === x.id} onClick={() => escolher(x.id)}
            className={cn('rounded-md border px-3 py-1.5 text-sm disabled:opacity-50', atual === x.id ? 'border-led bg-led/15 font-semibold text-led' : 'border-linha hover:bg-faixa')}>{x.nome}</button>
        ))}
      </div>
    </fieldset>
  );
}

function Treino({ t, aoMudar, ocupado }: { t: TreinoTela; aoMudar: (p: { carga: Carga; foco: Foco } | null) => void; ocupado: boolean }) {
  const manual = t.plano !== null;
  const carga = t.plano?.carga ?? 'normal';
  const foco = t.plano?.foco ?? 'tatica';
  return (
    <section aria-labelledby="treino" className="space-y-4">
      <h2 id="treino" className="text-lg font-semibold">Treino</h2>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quem decide o treino">
        <Button variant={manual ? 'secondary' : 'default'} disabled={ocupado} onClick={() => aoMudar(null)}>Auxiliar decide</Button>
        <Button variant={manual ? 'default' : 'secondary'} disabled={ocupado} onClick={() => aoMudar({ carga, foco })}>Eu decido</Button>
      </div>
      <p className="text-sm text-musgo">
        {manual ? 'Este plano vale em todo ciclo, até você mudar.' : 'O auxiliar escolhe a cada ciclo: tática até completar o entrosamento, depois físico; carga leve em ciclo curto.'}
        {' '}Último treino: carga {t.ultimo.carga}{t.ultimo.foco ? `, foco ${FOCOS.find((f) => f.id === t.ultimo.foco)?.nome.toLowerCase()}` : ''}.
      </p>
      <Opcoes rotulo="Carga" lista={CARGAS} atual={carga} ativo={manual && !ocupado} escolher={(c) => aoMudar({ carga: c, foco })} />
      <Opcoes rotulo="Foco" lista={FOCOS} atual={foco} ativo={manual && !ocupado} escolher={(f) => aoMudar({ carga, foco: f })} />
      <div>
        <h3 className="mb-1 text-sm text-musgo">Táticas salvas</h3>
        <ul className="border-y text-sm">
          {t.taticas.map((x) => (
            <li key={x.nome} className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-linha/40 py-1.5 last:border-0">
              <span className="min-w-0 truncate"><span className="font-semibold">{x.nome}</span> · {x.estilo}, {x.formacao}
                {x.ativa && <span className="ml-2 text-led">[jogo]</span>}{x.treinar && <span className="ml-2 text-vitoria">[treino]</span>}</span>
              <span className="tabular-nums" title="Entrosamento">{pct(x.entrosamento)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-musgo">O foco Tática dá 100% à tática marcada para treino e 25% às outras. Trocar a tática de jogo e a de treino fica no pré-jogo.</p>
      </div>
    </section>
  );
}

export function Gestao({ dia, aoVoltar }: { dia: number; aoVoltar: () => void }) {
  const [aba, setAba] = useState<'elenco' | 'treino' | 'base' | 'comercial' | 'mercado'>('elenco');
  const [elenco, setElenco] = useState<ElencoTela | null>(null);
  const [treino, setTreino] = useState<TreinoTela | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([pedir('elenco'), pedir('treino')]).then(([e, t]) => { setElenco(e); setTreino(t); }).catch((e: Error) => setErro(e.message));
  }, []);
  useEffect(() => {
    const aoTeclar = (ev: KeyboardEvent) => { if (ev.key === 'Escape') aoVoltar(); };
    addEventListener('keydown', aoTeclar);
    return () => removeEventListener('keydown', aoTeclar);
  }, [aoVoltar]);
  const mudar = async (p: { carga: Carga; foco: Foco } | null) => {
    setOcupado(true); setErro(null);
    try { setTreino(await pedir('definirTreino', p)); } catch (e) { setErro((e as Error).message); } finally { setOcupado(false); }
  };
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
        <h1 className="text-2xl font-bold" tabIndex={-1}>Gestão</h1>
        <Button variant="ghost" onClick={aoVoltar}>Voltar ao painel</Button>
      </header>
      <div role="tablist" aria-label="Áreas" className="mt-4 flex gap-2">
        {(['elenco', 'treino', 'mercado', 'base', 'comercial'] as const).map((a) => (
          <button key={a} role="tab" type="button" aria-selected={aba === a} onClick={() => setAba(a)}
            className={cn('rounded-md border px-4 py-1.5 text-sm', aba === a ? 'border-led bg-led/15 font-semibold text-led' : 'border-linha hover:bg-faixa')}>{{ elenco: 'Elenco', treino: 'Treino', mercado: 'Mercado', base: 'Base', comercial: 'Comercial' }[a]}</button>
        ))}
      </div>
      {erro && <p role="alert" className="mt-3 text-cartao">{erro}</p>}
      <div className="mt-4" role="tabpanel">
        {aba === 'mercado' ? <Mercado /> : aba === 'base' ? <Base /> : aba === 'comercial' ? <Comercial />
          : !elenco || !treino ? <p className="flex items-center gap-2 text-musgo"><Spinner /> Carregando…</p>
          : aba === 'elenco' ? <Elenco e={elenco} dia={dia} /> : <Treino t={treino} aoMudar={mudar} ocupado={ocupado} />}
      </div>
    </div>
  );
}
