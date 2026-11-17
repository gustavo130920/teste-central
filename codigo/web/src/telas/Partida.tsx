// Partida ao vivo (5d2): placar em LED, relógio, narração lance a lance (1x, 2x, 4x, pular até a pausa), estatísticas
// e a pausa tática com tudo o que o terminal faz. A narração chega do Worker em trechos, de pausa em pausa.
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Button } from '@/componentes/ui/button';
import { Kbd } from '@/componentes/kbd';
import { Spinner } from '@/componentes/spinner';
import { Escolha, Secao, pct, rotuloJogo } from '@/componentes/Campo';
// O PixiJS só carrega quando a primeira partida ao vivo abre (tela inicial mais leve).
const Campo2D = lazy(() => import('@/componentes/Campo2D').then((m) => ({ default: m.Campo2D })));
import type { Lance2D, AjustePausa, EstatTela, FimJogo, InfoJogoTela, MarcacaoIndividual, Narrada, RespostaPausa, TelaPausa, Tom } from '@/nucleo/protocolo';
import { PADRAO } from '@/lib/exibir';
import { cn } from '@/lib/utils';

/** PROVISORIO (5d2): tempo entre linhas da narração em 1x; 2x e 4x dividem. */
const MS_POR_LINHA = 1400;
const VELOCIDADES = [1, 2, 4] as const;
const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface AoVivoTela { jogo: InfoJogoTela; nomes: Record<string, string>; linhas: Narrada[]; lances: Lance2D[]; pausa: TelaPausa | null; fim: FimJogo | null }

function PlacarAoVivo({ v, placar, relogio, gol }: { v: AoVivoTela; placar: [number, number]; relogio: string; gol: boolean }) {
  const n = (id: string) => v.nomes[id] ?? id;
  return (
    <div className={cn('placar rounded-md px-3 py-4 sm:px-6', gol && 'ring-2 ring-led')}>
      <p className="text-center text-sm text-musgo">{rotuloJogo(v.jogo)}</p>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        <span className={cn('led truncate text-right text-lg sm:text-2xl', v.jogo.lado === 0 && 'underline decoration-2 underline-offset-8')}>{n(v.jogo.mandante)}</span>
        <span className="led whitespace-nowrap text-4xl sm:text-6xl" aria-label={`Placar ${placar[0]} a ${placar[1]}`}>{placar[0]}-{placar[1]}</span>
        <span className={cn('led truncate text-lg sm:text-2xl', v.jogo.lado === 1 && 'underline decoration-2 underline-offset-8')}>{n(v.jogo.visitante)}</span>
      </div>
      <p className="led mt-2 text-center text-2xl" aria-label={`Minuto ${relogio}`}>{relogio}</p>
    </div>
  );
}

const LINHAS_EST: [keyof EstatTela, string][] = [
  ['posse', 'Posse (%)'], ['finalizacoes', 'Finalizações'], ['noAlvo', 'No alvo'], ['escanteios', 'Escanteios'], ['faltas', 'Faltas'], ['impedimentos', 'Impedimentos'], ['amarelos', 'Amarelos'], ['vermelhos', 'Vermelhos'],
];
export function Estatisticas({ e, nomes, jogo, nota }: { e: EstatTela[]; nomes: Record<string, string>; jogo: InfoJogoTela; nota?: string }) {
  if (!e.length) return <p className="text-sm text-musgo">As estatísticas aparecem na primeira pausa.</p>;
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Estatísticas</caption>
      <thead className="text-musgo"><tr className="border-b"><th scope="col" className="py-1 text-left font-medium">{nomes[jogo.mandante]}</th><th scope="col" className="py-1 font-medium">{nota ?? ''}</th><th scope="col" className="py-1 text-right font-medium">{nomes[jogo.visitante]}</th></tr></thead>
      <tbody>
        {LINHAS_EST.map(([k, t]) => (
          <tr key={k} className="border-b border-linha/40">
            <td className="py-1 font-semibold">{e[0][k]}</td><td className="py-1 text-center text-musgo">{t}</td><td className="py-1 text-right font-semibold">{e[1][k]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Narracao({ linhas, nomes, jogo, viva }: { linhas: Narrada[]; nomes: Record<string, string>; jogo: InfoJogoTela; viva?: boolean }) {
  const fim = useRef<HTMLLIElement>(null);
  useEffect(() => { if (viva) fim.current?.scrollIntoView({ block: 'nearest', behavior: semMovimento() ? 'auto' : 'smooth' }); }, [linhas.length, viva]);
  const lado = (t: 0 | 1) => nomes[t === 0 ? jogo.mandante : jogo.visitante];
  return (
    <ol className="max-h-[26rem] overflow-y-auto border-y text-sm" aria-live={viva ? 'polite' : undefined} aria-relevant="additions">
      {linhas.map((l, i) => (
        <li key={i} ref={i === linhas.length - 1 ? fim : undefined}
          className={cn('grid grid-cols-[3.2rem_1fr] gap-2 border-b border-linha/40 px-1 py-1.5', l.gol && 'bg-faixa font-semibold', l.voz === 'C' && 'text-musgo italic')}>
          <span className={cn('text-right', l.gol && l.voz === 'N' ? 'led' : 'text-musgo')}>{l.minuto}</span>
          <span>{l.gol && l.voz === 'N' && <span className="led mr-2">GOL {lado(l.time)}!</span>}{l.voz === 'C' && <span className="sr-only">Comentarista: </span>}{l.texto}</span>
        </li>
      ))}
      {!linhas.length && <li className="px-1 py-2 text-musgo">Bola rolando…</li>}
    </ol>
  );
}

export function Partida({ v, ocupado, erro, aoResponder, aoVerFim }: { v: AoVivoTela; ocupado: boolean; erro: string | null; aoResponder: (r: RespostaPausa) => void; aoVerFim: () => void }) {
  const [mostradas, setMostradas] = useState(0);
  const [vel, setVel] = useState<(typeof VELOCIDADES)[number]>(1);
  const total = v.linhas.length;
  const chegou = mostradas >= total;
  useEffect(() => {
    if (chegou) return;
    const id = setTimeout(() => setMostradas((m) => m + 1), MS_POR_LINHA / vel);
    return () => clearTimeout(id);
  }, [mostradas, chegou, vel]);
  useHotkeys('1', () => setVel(1));
  useHotkeys('2', () => setVel(2));
  useHotkeys('4', () => setVel(4));
  useHotkeys('p', () => setMostradas(total), [total]);
  const visiveis = v.linhas.slice(0, mostradas);
  const ult = visiveis.at(-1);
  const placar: [number, number] = chegou && v.fim ? v.fim.placar : chegou && v.pausa ? v.pausa.placar : ult?.placar ?? [0, 0];
  const relogio = chegou && v.pausa ? (v.pausa.intervalo ? 'INTERVALO' : `${v.pausa.minuto}'`) : chegou && v.fim ? 'FIM' : ult?.minuto ?? "0'";
  // Estatísticas só mudam quando a narração chega na pausa (ou no fim), não antes.
  const [est, setEst] = useState<EstatTela[]>([]);
  const [estAte, setEstAte] = useState<number | null>(null);
  useEffect(() => {
    if (!chegou) return;
    if (v.fim) { setEst(v.fim.estatisticas); setEstAte(null); } else if (v.pausa) { setEst(v.pausa.estatisticas); setEstAte(v.pausa.minuto); }
  }, [chegou, v.fim, v.pausa]);
  // Campo 2D (5e): posições da última pausa; a bola segue o lance que está na narração.
  const [campoVisivel, setCampoVisivel] = useState(() => { try { return localStorage.getItem('campo2d') !== 'oculto'; } catch { return true; } });
  const alternarCampo = () => setCampoVisivel((c) => { try { localStorage.setItem('campo2d', c ? 'oculto' : 'visivel'); } catch { /* sem armazenamento */ } return !c; });
  const pausaRef = useRef<TelaPausa | null>(null);
  if (v.pausa) pausaRef.current = v.pausa;
  const minutoAtual = ult ? parseInt(ult.minuto, 10) : 0;
  const lanceAtual = ult ? [...v.lances].reverse().find((l) => l.minuto <= minutoAtual && l.bloco <= ult.bloco) ?? null : null;
  const botaoFim = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (chegou && v.fim) botaoFim.current?.focus(); }, [chegou, v.fim]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10">
      <h1 className="sr-only">Partida ao vivo</h1>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <PlacarAoVivo v={v} placar={placar} relogio={relogio} gol={!!ult?.gol && !chegou} />
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Velocidade da narração">
            {VELOCIDADES.map((x) => (
              <Button key={x} size="sm" variant={vel === x ? 'default' : 'secondary'} aria-pressed={vel === x} onClick={() => setVel(x)}>{x}x <Kbd keys={[String(x)]} className="ml-1" /></Button>
            ))}
            <Button size="sm" variant="ghost" aria-pressed={campoVisivel} onClick={alternarCampo}>{campoVisivel ? 'Ocultar campo' : 'Mostrar campo'}</Button>
            <Button size="sm" variant="secondary" disabled={chegou} onClick={() => setMostradas(total)}>{v.fim ? 'Pular até o fim' : 'Pular até a pausa'} <Kbd keys={['P']} className="ml-1" /></Button>
          </div>
          {campoVisivel && pausaRef.current && (
            <Suspense fallback={<div className="aspect-[3/2] w-full rounded-md border border-linha bg-relva" aria-busy="true" />}>
              <Campo2D meu={pausaRef.current.emCampo} rival={pausaRef.current.rival} lado={v.jogo.lado} lance={lanceAtual} gol={!!ult?.gol && !chegou} velocidade={vel} />
            </Suspense>
          )}
          {campoVisivel && pausaRef.current && (
            <p className="-mt-1 flex flex-wrap gap-x-4 text-xs text-musgo">
              <span><span aria-hidden className="mr-1 inline-block size-2.5 rounded-full bg-led align-middle" />{v.nomes[v.jogo.mandante]} (ataca para a direita)</span>
              <span><span aria-hidden className="mr-1 inline-block size-2.5 rounded-full bg-[#7fb8e6] align-middle" />{v.nomes[v.jogo.visitante]}</span>
              <span>Posições por zona, como na formação.</span>
            </p>
          )}
          <Narracao linhas={visiveis} nomes={v.nomes} jogo={v.jogo} viva />
          {chegou && v.fim && (
            <Button ref={botaoFim} size="lg" className="h-12 text-base font-semibold" onClick={aoVerFim}>Apito final: ver o resultado</Button>
          )}
        </div>
        <Secao titulo="Estatísticas">
          <Estatisticas e={est} nomes={v.nomes} jogo={v.jogo} nota={estAte ? `até os ${estAte}'` : undefined} />
        </Secao>
      </div>
      {chegou && v.pausa && <PainelPausa key={v.pausa.minuto} v={v} p={v.pausa} ocupado={ocupado} erro={erro} aoResponder={aoResponder} />}
    </div>
  );
}

// ---------- Pausa ----------

type Aba = 'relatorio' | 'trocas' | 'tatica' | 'individual';
const ABAS: [Aba, string][] = [['relatorio', 'Relatório'], ['trocas', 'Trocas e fala'], ['tatica', 'Tática'], ['individual', 'Individual']];
const TONS: { tom: Tom; dica: string }[] = [
  { tom: 'Cobrar', dica: 'Perdendo ou apático.' }, { tom: 'Acalmar', dica: 'Ímpeto negativo ou vantagem curta.' }, { tom: 'Elogiar', dica: 'Jogando bem e na frente.' },
];
const AUX = '__aux';
const MANTER = '__manter';

function PainelPausa({ v, p, ocupado, erro, aoResponder }: { v: AoVivoTela; p: TelaPausa; ocupado: boolean; erro: string | null; aoResponder: (r: RespostaPausa) => void }) {
  const [aba, setAba] = useState<Aba>('relatorio');
  const [sug, setSug] = useState<Set<number>>(new Set());
  const [trocas, setTrocas] = useState<[string, string][]>([]);
  const [sai, setSai] = useState('');
  const [entra, setEntra] = useState('');
  const [fala, setFala] = useState<Tom | null>(null);
  const [padrao, setPadrao] = useState<Record<string, string>>({});
  const [estilo, setEstilo] = useState(p.estilo);
  const [fCom, setFCom] = useState(p.formacaoComBola);
  const [fSem, setFSem] = useState(p.formacaoSemBola);
  const [instr, setInstr] = useState<NonNullable<AjustePausa['instrucoes']>>({});
  const [marc, setMarc] = useState<{ marcador: string; alvo: string } | null | undefined>(undefined);
  const [planoB, setPlanoB] = useState<number | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titulo.current?.focus(); }, []);
  const lado = v.jogo.lado;
  const outro = lado === 0 ? 1 : 0;
  const vagaSai = p.emCampo.find((x) => x.id === sai)?.vaga ?? '';
  const nomeDe = (id: string) => p.emCampo.find((x) => x.id === id)?.nome ?? p.banco.find((x) => x.id === id)?.nome ?? p.rival.find((x) => x.id === id)?.nome ?? id;

  const nomeIns = (id: string) => p.emCampo.flatMap((e) => [...(e.opcoes?.Com ?? []), ...(e.opcoes?.Sem ?? [])]).find((o) => o.id === id)?.nome ?? id;
  const ajuste = (): AjustePausa => {
    const aj: AjustePausa = {};
    if (sug.size) aj.sugestoes = [...sug].sort();
    const pd = Object.fromEntries(Object.entries(padrao).filter(([k, x]) => x !== p.padrao[k]));
    if (Object.keys(pd).length) aj.padrao = pd;
    if (estilo !== p.estilo) aj.estilo = estilo;
    if (fCom !== p.formacaoComBola || fSem !== p.formacaoSemBola) Object.assign(aj, { formacaoComBola: fCom, formacaoSemBola: fSem });
    if (Object.keys(instr).length) aj.instrucoes = instr;
    if (marc !== undefined) aj.marcacao = marc as MarcacaoIndividual | null;
    if (trocas.length) aj.trocas = trocas;
    if (fala && p.intervalo) aj.fala = fala;
    return aj;
  };
  const resumo = useMemo(() => {
    const aj = ajuste();
    return [
      planoB !== null ? `Plano B: ${p.planoB[planoB].nome}` : '',
      aj.estilo && planoB === null ? `estilo ${aj.estilo}` : '', aj.formacaoComBola && planoB === null ? `formação ${aj.formacaoComBola} / ${aj.formacaoSemBola}` : '',
      ...Object.entries(aj.padrao ?? {}).map(([k, x]) => `${PADRAO.find(([c]) => c === k)?.[1] ?? k} ${x}`),
      ...Object.entries(aj.instrucoes ?? {}).map(([id, x]) => `${nomeDe(id)}: ${[x.Com, x.Sem].filter((y) => y !== undefined).map((y) => (y === null ? 'auxiliar' : nomeIns(y))).join(' / ')}`),
      aj.marcacao !== undefined ? (aj.marcacao ? `${nomeDe(aj.marcacao.marcador)} marca ${nomeDe(aj.marcacao.alvo)}` : 'sem marcação') : '',
      ...(aj.trocas ?? []).map(([s, e]) => `sai ${nomeDe(s)}, entra ${nomeDe(e)}`), aj.fala ? `fala: ${aj.fala}` : '', ...(aj.sugestoes ?? []).map((k) => `sugestão ${k + 1}`),
    ].filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sug, trocas, fala, padrao, estilo, fCom, fSem, instr, marc, planoB]);

  const seguir = () => { if (!ocupado) aoResponder({ ajuste: ajuste(), planoB }); };
  useHotkeys('s', seguir, [seguir]);
  useHotkeys('x', () => { if (!ocupado) aoResponder({ ajuste: null }); }, [ocupado]);
  const restantes = p.trocasRestantes - trocas.length;
  const nInstrTime = Object.entries(padrao).filter(([k, x]) => x !== p.padrao[k]).length;
  const radical = planoB !== null || estilo !== p.estilo || fCom !== p.formacaoComBola || fSem !== p.formacaoSemBola;

  return (
    <section aria-labelledby="pausa-t" className="mt-6 rounded-md border border-led/50 bg-relva p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pausa-t" ref={titulo} tabIndex={-1} className="text-xl font-bold">{p.intervalo ? 'Intervalo' : `Pausa dos ${p.minuto}'`}: {v.nomes[v.jogo.mandante]} {p.placar[0]} x {p.placar[1]} {v.nomes[v.jogo.visitante]}</h2>
        <p className="text-sm text-musgo">{p.estilo} · {p.formacaoComBola} / {p.formacaoSemBola} · trocas restantes {restantes}</p>
      </div>
      <div role="tablist" aria-label="Partes da pausa" className="mt-3 flex flex-wrap gap-1 border-b">
        {ABAS.map(([k, t]) => (
          <button key={k} type="button" role="tab" aria-selected={aba === k} onClick={() => setAba(k)}
            className={cn('-mb-px border-b-2 px-3 py-1.5 text-sm font-semibold', aba === k ? 'border-led text-led' : 'border-transparent text-musgo hover:text-cal')}>{t}</button>
        ))}
      </div>

      <div role="tabpanel" className="mt-3">
        {aba === 'relatorio' && (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <table className="w-full text-sm">
                <thead className="text-musgo"><tr className="border-b"><th scope="col" className="py-1 text-left font-medium">{v.nomes[v.jogo.mandante]}</th><th scope="col" /><th scope="col" className="py-1 text-right font-medium">{v.nomes[v.jogo.visitante]}</th></tr></thead>
                <tbody>
                  {([['finalizacoes', 'Finalizações'], ['posse', 'Posse (%)'], ['energia', 'Energia média'], ['impeto', 'Ímpeto']] as const).map(([k, t]) => (
                    <tr key={k} className="border-b border-linha/40"><td className="py-1 font-semibold">{p.relatorio[0][k]}</td><td className="py-1 text-center text-musgo">{t}</td><td className="py-1 text-right font-semibold">{p.relatorio[1][k]}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-sm"><span className="text-musgo">Adversário:</span> {p.adversario.length ? p.adversario.join(', ') : 'sem leitura das mudanças'}</p>
              {p.extras.map((x, i) => <p key={i} className="mt-1 text-sm"><span className="text-musgo">Analista:</span> {x}</p>)}
            </div>
            <fieldset>
              <legend className="mb-1 font-semibold">Sugestões do auxiliar</legend>
              {p.sugestoes.length ? p.sugestoes.map((s, i) => (
                <label key={i} className="flex items-start gap-2 py-1 text-sm">
                  <input type="checkbox" className="mt-1 accent-[var(--led)]" checked={sug.has(i)} onChange={(e) => setSug((x) => { const y = new Set(x); if (e.target.checked) y.add(i); else y.delete(i); return y; })} />
                  <span>{s}</span>
                </label>
              )) : <p className="text-sm text-musgo">Nenhuma sugestão nesta pausa.</p>}
            </fieldset>
          </div>
        )}

        {aba === 'trocas' && (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="mb-1 font-semibold">Substituições</h3>
              <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <Escolha rotulo="Sai" valor={sai} aoMudar={setSai} opcoes={[{ valor: '', texto: '—' }, ...p.emCampo.filter((e) => !trocas.some(([s]) => s === e.id)).map((e) => ({
                  valor: e.id, texto: `${e.vaga} ${e.nome} · energia ${e.energia}${e.amarelos ? ' · amarelo' : ''}${e.lesao ? ` · lesão ${e.lesao}` : ''}`,
                }))]} />
                <Escolha rotulo="Entra" valor={entra} aoMudar={setEntra} opcoes={[{ valor: '', texto: '—' }, ...p.banco.filter((j) => !trocas.some(([, e]) => e === j.id)).sort((a, b) => Number(b.posicao === vagaSai) - Number(a.posicao === vagaSai) || b.nota - a.nota).map((j) => ({ valor: j.id, texto: `${j.posicao === vagaSai ? '★ ' : ''}${j.posicao} ${j.nome} · nota ${j.nota} · cond. ${j.condicao ?? 100}%` }))]} />
                <Button variant="secondary" disabled={!sai || !entra || restantes <= 0} onClick={() => { setTrocas((t) => [...t, [sai, entra]]); setSai(''); setEntra(''); }}>Incluir</Button>
              </div>
              <ul className="mt-2 text-sm">
                {trocas.map(([s, e], i) => (
                  <li key={i} className="flex items-center justify-between border-b border-linha/40 py-1">
                    <span>Sai {nomeDe(s)}, entra {nomeDe(e)}</span>
                    <Button size="xs" variant="ghost" onClick={() => setTrocas((t) => t.filter((_, k) => k !== i))}>Tirar</Button>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-musgo">Restam {restantes} troca(s). ★ = reserva da mesma posição de quem sai. Em campo, energia de 0 a 100.</p>
            </div>
            <fieldset disabled={!p.intervalo}>
              <legend className="mb-1 font-semibold">Fala do intervalo</legend>
              {!p.intervalo && <p className="text-sm text-musgo">Só no intervalo.</p>}
              {p.intervalo && (
                <div className="flex flex-wrap gap-2">
                  {TONS.map((t) => (
                    <Button key={t.tom} size="sm" variant={fala === t.tom ? 'default' : 'secondary'} aria-pressed={fala === t.tom} title={t.dica} onClick={() => setFala((f) => (f === t.tom ? null : t.tom))}>{t.tom}</Button>
                  ))}
                </div>
              )}
              {p.intervalo && <p className="mt-1 text-xs text-musgo">{TONS.map((t) => `${t.tom}: ${t.dica}`).join(' ')} Tom errado tira ímpeto.</p>}
            </fieldset>
          </div>
        )}

        {aba === 'tatica' && (
          <div className="grid gap-5 md:grid-cols-2">
            <fieldset disabled={planoB !== null} className="min-w-0">
              <legend className="mb-1 font-semibold">Instruções do time</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PADRAO.map(([k, t, ops]) => (
                  <Escolha key={k} rotulo={t} valor={padrao[k] ?? p.padrao[k]} aoMudar={(x) => setPadrao((y) => ({ ...y, [k]: x }))} opcoes={ops.map((o) => ({ valor: o, texto: o }))} />
                ))}
              </div>
              <p className="mt-1 text-xs text-musgo">{nInstrTime <= 1 ? 'Uma instrução: ajuste leve, sem perda.' : 'Duas ou mais: eficácia × 0,9 nos próximos 15 minutos.'}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Escolha rotulo="Estilo" valor={estilo} aoMudar={setEstilo} opcoes={p.estilos.map((s) => ({ valor: s, texto: s }))} />
                <Escolha rotulo="Formação com a bola" valor={fCom} aoMudar={setFCom} opcoes={p.formacoes.map((s) => ({ valor: s, texto: s }))} />
                <Escolha rotulo="Formação sem a bola" valor={fSem} aoMudar={setFSem} opcoes={p.formacoes.map((s) => ({ valor: s, texto: s }))} />
              </div>
              <p className="mt-1 text-xs text-musgo">Estilo e formação são mudanças radicais: perdem {pct(p.custoRadical)} de eficácia por 15 minutos.</p>
            </fieldset>
            <fieldset className="min-w-0">
              <legend className="mb-1 font-semibold">Plano B</legend>
              {p.planoB.length ? (
                <div role="radiogroup" aria-label="Plano B" className="grid gap-1">
                  {[null, ...p.planoB.map((_, i) => i)].map((i) => (
                    <button key={String(i)} type="button" role="radio" aria-checked={planoB === i} onClick={() => setPlanoB(i)}
                      className={cn('rounded-md border px-3 py-1.5 text-left text-sm', planoB === i ? 'border-led bg-faixa' : 'border-linha hover:bg-faixa/60')}>
                      {i === null ? 'Sem Plano B' : (() => { const o = p.planoB[i]; return <><b>{o.nome}</b>: {o.estilo}, {o.formacaoComBola} / {o.formacaoSemBola} · entrosamento {pct(o.entrosamento)} · {o.planoB ? 'Plano B treinado' : 'sem treino suficiente'}, perde {pct(o.perda)}</>; })()}
                    </button>
                  ))}
                </div>
              ) : <p className="text-sm text-musgo">Nenhuma outra tática salva.</p>}
              <p className="mt-1 text-xs text-musgo">A tática salva entra inteira (estilo, formações, ajustes, instruções e batedores). Com 85% de entrosamento, perde metade.</p>
            </fieldset>
          </div>
        )}

        {aba === 'individual' && (
          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            <fieldset disabled={planoB !== null} className="min-w-0">
              <legend className="mb-1 font-semibold">Instrução individual</legend>
              <div className="grid gap-1">
                {p.emCampo.filter((e) => e.opcoes).map((e) => (
                  <div key={e.id} className="grid grid-cols-1 gap-1 border-b border-linha/40 pb-1 sm:grid-cols-[9rem_1fr_1fr] sm:items-end">
                    <span className="truncate text-sm"><span className="text-musgo">{e.vaga}</span> {e.nome}</span>
                    {(['Com', 'Sem'] as const).map((f) => (
                      <Escolha key={f} rotulo={f === 'Com' ? 'Com a bola' : 'Sem a bola'}
                        valor={instr[e.id]?.[f] === undefined ? MANTER : instr[e.id]![f] === null ? AUX : instr[e.id]![f]!}
                        aoMudar={(x) => setInstr((y) => {
                          const z = { ...y, [e.id]: { ...y[e.id] } };
                          if (x === MANTER) delete z[e.id][f]; else z[e.id][f] = x === AUX ? null : x;
                          if (z[e.id].Com === undefined && z[e.id].Sem === undefined) delete z[e.id];
                          return z;
                        })}
                        opcoes={[{ valor: MANTER, texto: `Manter: ${(f === 'Com' ? e.instrCom : e.instrSem) ?? '—'}` }, { valor: AUX, texto: 'Auxiliar escolhe (melhor encaixe)' },
                          ...e.opcoes![f].map((o) => ({ valor: o.id, texto: `${o.nome} · ${pct(o.encaixe)}${o.contraria ? ' · contraria o estilo' : o.combina ? ' · combina' : ''}${o.auxiliar ? ' · auxiliar' : ''}${o.exige ? ` · exige ${o.exige}` : ''}` }))]} />
                    ))}
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-musgo">Ajuste leve, sem perda. Opções e encaixe pela tática em campo agora.</p>
            </fieldset>
            <fieldset className="min-w-0">
              <legend className="mb-1 font-semibold">Marcação individual</legend>
              <p className="mb-1 text-sm text-musgo">Agora: {p.marcacao ? `${nomeDe(p.marcacao.marcador)} marca ${nomeDe(p.marcacao.alvo)}` : 'nenhuma'}</p>
              <div className="grid gap-2">
                <Escolha rotulo="Marcador" valor={marc === undefined ? MANTER : marc === null ? '' : marc.marcador}
                  aoMudar={(x) => setMarc(x === MANTER ? undefined : x === '' ? null : { marcador: x, alvo: marc?.alvo ?? '' })}
                  opcoes={[{ valor: MANTER, texto: 'Manter como está' }, { valor: '', texto: 'Sem marcação' }, ...p.emCampo.filter((e) => !e.goleiro).map((e) => ({ valor: e.id, texto: `${e.vaga} ${e.nome}` }))]} />
                <Escolha rotulo="Alvo" valor={marc?.alvo ?? ''} desativado={!marc} aoMudar={(x) => setMarc((m) => (m ? { ...m, alvo: x } : m))}
                  opcoes={[{ valor: '', texto: '—' }, ...p.rival.filter((e) => e.vaga !== 'GOL').map((e) => ({ valor: e.id, texto: `${e.vaga} ${e.nome}` }))]} />
              </div>
              <p className="mt-1 text-xs text-musgo">Ajuste leve, sem perda. A zona do marcador fica descoberta.</p>
            </fieldset>
          </div>
        )}
      </div>

      <div className="mt-4 border-t pt-3">
        <p className="text-sm"><span className="text-musgo">A aplicar:</span> {resumo.length ? resumo.join(' · ') : 'nada (segue como está)'}{radical && <span className="ml-1 text-cartao">· mudança radical</span>}</p>
        {marc && !marc.alvo && <p className="text-sm text-cartao">Escolha o alvo da marcação.</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="lg" className="h-11 min-w-40 font-semibold" disabled={ocupado || (!!marc && !marc.alvo)} onClick={seguir}>
            {ocupado ? <><Spinner className="mr-2" /> Voltando a campo…</> : <>Seguir o jogo <Kbd keys={['S']} className="ml-1" /></>}
          </Button>
          <Button variant="secondary" disabled={ocupado} onClick={() => aoResponder({ ajuste: null })}>Deixar com o auxiliar <Kbd keys={['X']} className="ml-1" /></Button>
          <Button variant="ghost" disabled={ocupado} onClick={() => aoResponder({ ajuste: null, simularResto: true })}>Simular o resto</Button>
        </div>
        {erro && <p role="alert" className="mt-2 text-cartao">{erro}</p>}
      </div>
    </section>
  );
}
