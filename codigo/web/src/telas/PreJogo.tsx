// Pré-jogo enxuto (5d2): tática salva, batedores, marcação individual, escalação do auxiliar e jogar ao vivo ou simular.
import { useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Button } from '@/componentes/ui/button';
import { Kbd } from '@/componentes/kbd';
import { Spinner } from '@/componentes/spinner';
import { Escolha, Secao, pct, rotuloJogo } from '@/componentes/Campo';
import type { Batedores, EscolhaPreJogo, PreJogo as P, TipoBatedor } from '@/nucleo/protocolo';
import { cn } from '@/lib/utils';

const BATEDORES: { tipo: TipoBatedor; texto: string; traco: string }[] = [
  { tipo: 'penalti', texto: 'Pênalti', traco: 'Cobrador de pênalti' },
  { tipo: 'falta', texto: 'Falta', traco: 'Cobrador de falta' },
  { tipo: 'escanteio', texto: 'Escanteio', traco: 'Batedor de escanteio' },
];

export function PreJogo({ pre, ocupado, erro, aoJogar }: { pre: P; ocupado: boolean; erro: string | null; aoJogar: (e: EscolhaPreJogo) => void }) {
  const [tatica, setTatica] = useState(pre.ativa);
  const [bat, setBat] = useState<Batedores>(pre.taticas[pre.ativa].batedores);
  const [marcador, setMarcador] = useState('');
  const [alvo, setAlvo] = useState('');
  const botao = useRef<HTMLButtonElement>(null);
  const t = pre.taticas[tatica];
  const n = (id: string) => pre.nomes[id] ?? id;
  const jogar = (modo: EscolhaPreJogo['modo']) => {
    if (ocupado) return;
    aoJogar({ tatica, batedores: bat, marcacao: marcador && alvo ? { marcador, alvo } : null, modo });
  };
  useEffect(() => { botao.current?.focus(); }, []);
  useHotkeys('j', () => jogar('aoVivo'), [tatica, bat, marcador, alvo, ocupado]);
  useHotkeys('d', () => jogar('simular'), [tatica, bat, marcador, alvo, ocupado]);
  const trocarTatica = (i: number) => { setTatica(i); setBat(pre.taticas[i].batedores); };
  const emCampo = new Set(t.onze.map((x) => x.id));
  const candidatos = pre.elenco.filter((j) => emCampo.has(j.id)).sort((a, b) => (b.atributos?.BP ?? 0) - (a.atributos?.BP ?? 0));
  const marcadores = t.onze.filter((x) => x.vaga !== 'GOL');

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10">
      <header className="border-b py-3">
        <p className="text-sm text-musgo">{rotuloJogo(pre.jogo)}</p>
        <h1 className="text-2xl font-bold leading-tight">Pré-jogo: {n(pre.jogo.mandante)} x {n(pre.jogo.visitante)}</h1>
      </header>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <Secao titulo="Tática">
            <div role="radiogroup" aria-label="Tática salva" className="grid gap-1">
              {pre.taticas.map((x, i) => (
                <button key={i} type="button" role="radio" aria-checked={i === tatica} onClick={() => trocarTatica(i)}
                  className={cn('grid grid-cols-[1fr_auto] gap-x-3 rounded-md border px-3 py-2 text-left', i === tatica ? 'border-led bg-faixa' : 'border-linha hover:bg-faixa/60')}>
                  <span className="font-semibold">{x.nome}{i === pre.ativa && <span className="ml-2 text-xs font-normal text-musgo">(em uso)</span>}</span>
                  <span className="text-right text-sm" title="Entrosamento do time com esta tática">entrosamento {pct(x.entrosamento)}</span>
                  <span className="col-span-2 text-sm text-musgo">
                    {x.estilo}, {x.formacaoComBola} / {x.formacaoSemBola}
                    {x.ajustes.length ? ` · ${x.ajustes.join(', ')}` : ''}
                    {x.instrucoes ? ` · ${x.instrucoes} instruções suas` : ''}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-musgo">Criar e editar táticas fica nas telas de gestão (5d3); aqui só escolhe qual usar.</p>
          </Secao>

          <Secao titulo="Batedores">
            <div className="grid gap-2 sm:grid-cols-3">
              {BATEDORES.map((b) => (
                <Escolha key={b.tipo} rotulo={b.texto} valor={bat[b.tipo] ?? ''}
                  aoMudar={(v) => setBat((x) => { const y = { ...x }; if (v) y[b.tipo] = v; else delete y[b.tipo]; return y; })}
                  opcoes={[{ valor: '', texto: 'Maior BP em campo' }, ...candidatos.map((j) => ({
                    valor: j.id, texto: `${j.nome} · BP ${j.atributos?.BP ?? '-'}${b.tipo === 'penalti' ? ` · Comp ${j.atributos?.Comp ?? '-'}` : ''}${j.tracos?.includes(b.traco) ? ' ★' : ''}`,
                  }))]} />
              ))}
            </div>
            <p className="mt-1 text-xs text-musgo">★ tem o traço da cobrança. A escolha fica gravada na tática.</p>
          </Secao>

          <Secao titulo="Marcação individual">
            <div className="grid gap-2 sm:grid-cols-2">
              <Escolha rotulo="Marcador" valor={marcador} aoMudar={setMarcador}
                opcoes={[{ valor: '', texto: 'Sem marcação' }, ...marcadores.map((x) => {
                  const a = pre.elenco.find((j) => j.id === x.id)?.atributos;
                  return { valor: x.id, texto: `${x.vaga} ${x.nome} · Des ${a?.Des ?? '-'} · Pos ${a?.Pos ?? '-'} · Vel ${a?.Vel ?? '-'}` };
                })]} />
              <Escolha rotulo={`Alvo (provável time do ${n(pre.jogo.lado === 0 ? pre.jogo.visitante : pre.jogo.mandante)})`} valor={alvo} aoMudar={setAlvo} desativado={!marcador}
                opcoes={[{ valor: '', texto: '—' }, ...pre.rival.filter((x) => x.vaga !== 'GOL').map((x) => ({ valor: x.id, texto: `${x.vaga} ${x.nome}` }))]} />
            </div>
            <p className="mt-1 text-xs text-musgo">Sem a bola, o marcador segue o alvo e ganha +2 nos duelos com ele; a zona dele fica descoberta. Vale só para este jogo.</p>
          </Secao>
        </div>

        <div className="space-y-6">
          <Secao titulo="Escalação do auxiliar" extra={<span className="text-sm text-musgo">{t.formacaoComBola}</span>}>
            <ol className="border-y text-sm">
              {t.onze.map((x) => (
                <li key={x.id} className="grid grid-cols-[3rem_1fr_auto] gap-2 border-b border-linha/50 px-1 py-1 last:border-0">
                  <span className="text-musgo">{x.vaga}</span>
                  <span className="truncate">{x.nome}</span>
                  <span className={cn('text-right', (x.condicao ?? 100) < 80 ? 'text-cartao' : 'text-musgo')} title="Condição física">{x.condicao ?? 100}%</span>
                </li>
              ))}
            </ol>
            <p className="mt-1 text-xs text-musgo">
              O auxiliar escolhe os melhores e poupa quem está abaixo de 70 de condição.
              {pre.poupados.length ? ` Poupados: ${pre.poupados.join(', ')}.` : ''}
              {pre.fora.length ? ` Fora: ${pre.fora.map((f) => `${f.nome} (${f.motivo})`).join(', ')}.` : ''}
            </p>
          </Secao>

          <div className="flex flex-wrap items-center gap-3">
            <Button ref={botao} size="lg" className="h-12 min-w-48 text-base font-semibold" disabled={ocupado} onClick={() => jogar('aoVivo')}>
              {ocupado ? <><Spinner className="mr-2" /> Entrando em campo…</> : <>Jogar ao vivo <Kbd keys={['J']} className="ml-1" /></>}
            </Button>
            <Button variant="secondary" size="lg" className="h-12" disabled={ocupado} onClick={() => jogar('simular')}>Simular direto <Kbd keys={['D']} className="ml-1" /></Button>
          </div>
          <p className="text-xs text-musgo">Simular direto: o auxiliar cuida das pausas e você vê só o resultado.</p>
          {erro && <p role="alert" className="text-cartao">{erro}</p>}
        </div>
      </div>
    </div>
  );
}
