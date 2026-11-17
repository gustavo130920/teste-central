// Pré-jogo enxuto (5d2): tática salva, batedores, marcação individual, escalação do auxiliar e jogar ao vivo ou simular.
import { useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Button } from '@/componentes/ui/button';
import { Kbd } from '@/componentes/kbd';
import { Spinner } from '@/componentes/spinner';
import { Escolha, Secao, pct, rotuloJogo } from '@/componentes/Campo';
import type { Batedores, EscolhaPreJogo, PreJogo as P, TipoBatedor, VagaTela } from '@/nucleo/protocolo';
import { cn } from '@/lib/utils';

const BATEDORES: { tipo: TipoBatedor; texto: string; traco: string }[] = [
  { tipo: 'penalti', texto: 'Pênalti', traco: 'Cobrador de pênalti' },
  { tipo: 'falta', texto: 'Falta', traco: 'Cobrador de falta' },
  { tipo: 'escanteio', texto: 'Escanteio', traco: 'Batedor de escanteio' },
];

export function PreJogo({ pre, ocupado, erro, aoJogar, aoVoltar, aoEditar }: { pre: P; ocupado: boolean; erro: string | null; aoJogar: (e: EscolhaPreJogo) => void; aoVoltar: () => void; aoEditar: () => void }) {
  const [tatica, setTatica] = useState(pre.ativa);
  const [bat, setBat] = useState<Batedores>(pre.taticas[pre.ativa].batedores);
  const [marcador, setMarcador] = useState('');
  const [alvo, setAlvo] = useState('');
  const botao = useRef<HTMLButtonElement>(null);
  const t = pre.taticas[tatica];
  // Onze deste jogo: mexido por você (null = o da tática, com o auxiliar poupando quem está cansado).
  const [edit, setEdit] = useState<VagaTela[] | null>(null);
  const [poupar, setPoupar] = useState(pre.taticas[pre.ativa].poupar);
  const [guardar, setGuardar] = useState(false);
  const [confirmaSim, setConfirmaSim] = useState(false);
  const onze = edit ?? t.onze;
  const n = (id: string) => pre.nomes[id] ?? id;
  const jogar = (modo: EscolhaPreJogo['modo']) => {
    if (ocupado) return;
    // Simular direto pede um segundo toque: nada de simular sem querer.
    if (modo === 'simular' && !confirmaSim) { setConfirmaSim(true); return; }
    aoJogar({ tatica, batedores: bat, marcacao: marcador && alvo ? { marcador, alvo } : null, modo, poupar, ...(edit ? { titulares: edit.map((x) => x.id) } : {}), ...(guardar ? { guardar: true } : {}) });
  };
  useEffect(() => { botao.current?.focus(); }, []);
  useHotkeys('j', () => jogar('aoVivo'), [tatica, bat, marcador, alvo, ocupado, edit, poupar, guardar]);
  useHotkeys('d', () => jogar('simular'), [tatica, bat, marcador, alvo, ocupado, edit, poupar, guardar, confirmaSim]);
  useEffect(() => { if (!confirmaSim) return; const x = setTimeout(() => setConfirmaSim(false), 5000); return () => clearTimeout(x); }, [confirmaSim]);
  // Esc volta ao painel sem jogar (a tela que tem um campo aberto fecha o campo primeiro).
  useEffect(() => {
    const aoTeclar = (ev: KeyboardEvent) => { if (ev.key === 'Escape' && !ocupado && !(ev.target instanceof HTMLSelectElement)) aoVoltar(); };
    addEventListener('keydown', aoTeclar);
    return () => removeEventListener('keydown', aoTeclar);
  }, [aoVoltar, ocupado]);
  const trocarTatica = (i: number) => { setTatica(i); setBat(pre.taticas[i].batedores); setEdit(null); setPoupar(pre.taticas[i].poupar); };
  const emCampo = new Set(onze.map((x) => x.id));
  const reservas = pre.elenco.filter((j) => !emCampo.has(j.id)).sort((a, b) => b.nota - a.nota);
  const trocar = (i: number, novo: string) => {
    const j = pre.elenco.find((x) => x.id === novo);
    if (!j) return;
    setEdit(onze.map((x, k) => (k === i ? { id: j.id, nome: j.nome, vaga: x.vaga, condicao: j.condicao } : x)));
  };
  /** Da mesma posição primeiro, depois por nota. */
  const ordemReservas = (vaga: string) => [...reservas].sort((a, b) => Number(b.posicao === vaga) - Number(a.posicao === vaga) || b.nota - a.nota);
  const candidatos = pre.elenco.filter((j) => emCampo.has(j.id)).sort((a, b) => (b.atributos?.BP ?? 0) - (a.atributos?.BP ?? 0));
  const marcadores = onze.filter((x) => x.vaga !== 'GOL');

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b py-3">
        <div>
          <p className="text-sm text-musgo">{rotuloJogo(pre.jogo)}</p>
          <h1 className="text-2xl font-bold leading-tight" tabIndex={-1}>Pré-jogo: {n(pre.jogo.mandante)} x {n(pre.jogo.visitante)}</h1>
        </div>
        <Button variant="ghost" disabled={ocupado} onClick={aoVoltar}>Voltar ao painel <Kbd keys={['Esc']} className="ml-1" /></Button>
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
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Button variant="secondary" size="sm" disabled={ocupado} onClick={aoEditar}>Editar táticas</Button>
              <p className="text-xs text-musgo">Abre o editor na Gestão; ao voltar, o pré-jogo recomeça com as mudanças.</p>
            </div>
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
          <Secao titulo={edit || t.titularesManual ? 'Escalação (sua)' : 'Escalação do auxiliar'} extra={<span className="text-sm text-musgo">{t.formacaoComBola}</span>}>
            <ol className="border-y text-sm">
              {onze.map((x, i) => (
                <li key={x.id} className="grid grid-cols-[3rem_1fr_3rem_minmax(0,9rem)] items-center gap-2 border-b border-linha/50 px-1 py-1 last:border-0">
                  <span className="text-musgo">{x.vaga}</span>
                  <span className="truncate">{x.nome}</span>
                  <span className={cn('text-right', (x.condicao ?? 100) < 70 ? 'text-cartao' : 'text-musgo')} title="Condição física">{x.condicao ?? 100}%</span>
                  <select aria-label={`Trocar ${x.nome}`} value="" disabled={ocupado} onChange={(e) => trocar(i, e.target.value)} className="h-8 rounded-md border border-linha bg-relva px-1 text-xs">
                    <option value="">Trocar…</option>
                    {ordemReservas(x.vaga).map((j) => <option key={j.id} value={j.id}>{j.posicao === x.vaga ? '★ ' : ''}{j.posicao} {j.nome} · {j.nota} · {j.condicao ?? 100}%</option>)}
                  </select>
                </li>
              ))}
            </ol>
            <div className="mt-2 space-y-1 text-sm">
              <label className="flex items-start gap-2"><input type="checkbox" className="mt-1 accent-[var(--led)]" checked={poupar} onChange={(e) => setPoupar(e.target.checked)} />
                <span>Poupar cansados: com o onze fixo, o auxiliar só troca quem está abaixo de 70 de condição.</span></label>
              <label className="flex items-start gap-2"><input type="checkbox" className="mt-1 accent-[var(--led)]" checked={guardar} onChange={(e) => setGuardar(e.target.checked)} />
                <span>Guardar este onze e esta opção na tática, para os próximos jogos.</span></label>
              {edit && <Button variant="ghost" size="sm" disabled={ocupado} onClick={() => setEdit(null)}>Descartar minhas trocas</Button>}
            </div>
            <h3 className="mt-3 text-sm font-semibold">Reservas</h3>
            <ul className="text-sm">
              {reservas.map((j) => (
                <li key={j.id} className="grid grid-cols-[3rem_1fr_auto] gap-2 border-b border-linha/40 px-1 py-0.5 last:border-0">
                  <span className="text-musgo">{j.posicao}</span><span className="truncate">{j.nome}</span>
                  <span className={cn('text-right', (j.condicao ?? 100) < 70 ? 'text-cartao' : 'text-musgo')}>nota {j.nota} · {j.condicao ?? 100}%</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-musgo">
              Troque qualquer titular por um reserva (★ = da mesma posição). Sem mexer, o auxiliar escolhe os melhores e poupa quem está abaixo de 70.
              {pre.poupados.length ? ` Poupados: ${pre.poupados.join(', ')}.` : ''}
              {pre.fora.length ? ` Fora: ${pre.fora.map((f) => `${f.nome} (${f.motivo})`).join(', ')}.` : ''}
            </p>
          </Secao>

          <div className="flex flex-wrap items-center gap-3">
            <Button ref={botao} size="lg" className="h-12 min-w-48 text-base font-semibold" disabled={ocupado} onClick={() => jogar('aoVivo')}>
              {ocupado ? <><Spinner className="mr-2" /> Entrando em campo…</> : <>Jogar ao vivo <Kbd keys={['J']} className="ml-1" /></>}
            </Button>
            <Button variant="secondary" size="lg" className="h-12" disabled={ocupado} onClick={() => jogar('simular')}>{confirmaSim ? 'Confirmar: simular sem ver' : <>Simular direto <Kbd keys={['D']} className="ml-1" /></>}</Button>
          </div>
          <p className="text-xs text-musgo">Simular direto pede uma confirmação: o auxiliar cuida das pausas e você vê só o resultado.</p>
          {erro && <p role="alert" className="text-cartao">{erro}</p>}
        </div>
      </div>
    </div>
  );
}
