// Editor visual de táticas (5b4), no estilo do EA FC: campo com a plaquinha de cada jogador, alternando "Com bola" e "Sem bola".
// Cada tática tem as duas variações (formação, instrução de cada jogador); o onze, os batedores e o padrão do estilo são da tática inteira.
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/componentes/ui/button';
import { Spinner } from '@/componentes/spinner';
import { Escolha, Secao, pct } from '@/componentes/Campo';
import { pedir } from '@/nucleo/cliente';
import type { PedidoTatica, PlaqTela, TaticaEditTela, TaticasTela, TipoBatedor } from '@/nucleo/protocolo';
import { cn } from '@/lib/utils';

type Fase = 'Com' | 'Sem';

const BATEDORES: { tipo: TipoBatedor; texto: string; traco: string }[] = [
  { tipo: 'penalti', texto: 'Pênalti', traco: 'Cobrador de pênalti' },
  { tipo: 'falta', texto: 'Falta', traco: 'Cobrador de falta' },
  { tipo: 'escanteio', texto: 'Escanteio', traco: 'Batedor de escanteio' },
];
const PADRAO: { chave: string; texto: string; opcoes: string[] }[] = [
  { chave: 'linha', texto: 'Linha', opcoes: ['Alta', 'Média', 'Baixa'] },
  { chave: 'pressao', texto: 'Pressão', opcoes: ['Alta', 'Média', 'Baixa'] },
  { chave: 'largura', texto: 'Largura', opcoes: ['Aberta', 'Normal', 'Estreita'] },
  { chave: 'ritmo', texto: 'Ritmo', opcoes: ['Rápido', 'Normal', 'Lento'] },
  { chave: 'saida', texto: 'Saída', opcoes: ['Curta', 'Mista', 'Direta'] },
];

/** Posição da plaquinha: corredor (PE, ME, CE, MD, PD) na horizontal e faixa (1 = própria área, 5 = ataque) na vertical. */
const COLUNA = { PE: 10, ME: 30, CE: 50, MD: 70, PD: 90 } as const;
export function pontoDaZona(zona: string): { x: number; y: number } {
  const x = COLUNA[zona.slice(0, 2) as keyof typeof COLUNA] ?? 50;
  const f = Number(zona[2]) || 3;
  return { x, y: 90 - (f - 1) * 19.5 };
}

function Campo({ onze, fase, sel, aoSelecionar }: { onze: PlaqTela[]; fase: Fase; sel: string | null; aoSelecionar: (id: string) => void }) {
  // Ordem de leitura (de cima para baixo) para o foco do teclado seguir o desenho.
  const ordem = useMemo(() => onze.map((p) => ({ p, ...pontoDaZona(fase === 'Com' ? p.zonaCom : p.zonaSem) })).sort((a, b) => a.y - b.y || a.x - b.x), [onze, fase]);
  return (
    <div role="group" aria-label={`Campo, ${fase === 'Com' ? 'com a bola' : 'sem a bola'}`}
      className="relative mx-auto aspect-[3/4] w-full max-w-[560px] overflow-hidden rounded-lg border border-linha"
      style={{ background: 'repeating-linear-gradient(180deg, #17432d 0 12.5%, #153b28 12.5% 25%)' }}>
      {/* Linhas do campo: meio-campo no alto, grande área e pequena área embaixo. */}
      <div aria-hidden className="pointer-events-none absolute inset-2 rounded-sm border border-white/15" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-2 h-[14%] w-[30%] -translate-x-1/2 rounded-b-full border border-t-0 border-white/15" />
      <div aria-hidden className="pointer-events-none absolute bottom-2 left-1/2 h-[18%] w-[56%] -translate-x-1/2 border border-b-0 border-white/15" />
      <div aria-hidden className="pointer-events-none absolute bottom-2 left-1/2 h-[8%] w-[26%] -translate-x-1/2 border border-b-0 border-white/15" />
      <span aria-hidden className="pointer-events-none absolute left-1/2 top-[3%] -translate-x-1/2 text-[10px] uppercase tracking-widest text-white/30">Ataque</span>
      {ordem.map(({ p, x, y }) => {
        const instr = fase === 'Com' ? p.instrCom : p.instrSem;
        const manual = p.opcoes[fase].find((o) => o.id === instr)?.nome ?? null;
        // Sem escolha sua, mostra a que o auxiliar usaria (em tom apagado).
        const nomeInstr = manual ?? p.opcoes[fase].find((o) => o.auxiliar)?.nome ?? null;
        const vaga = fase === 'Com' ? p.vagaCom : p.vagaSem;
        return (
          <button key={p.id} type="button" aria-pressed={sel === p.id}
            aria-label={`${p.nome}, ${vaga}, instrução ${nomeInstr ?? 'nenhuma'}${manual ? '' : ' (do auxiliar)'}`}
            onClick={() => aoSelecionar(p.id)}
            style={{ left: `${x}%`, top: `${y}%` }}
            className={cn('absolute w-[19%] min-w-[64px] -translate-x-1/2 -translate-y-1/2 rounded-md border bg-noite/85 px-1 py-0.5 text-center leading-tight shadow transition-colors hover:bg-faixa focus-visible:outline-2 focus-visible:outline-led',
              sel === p.id ? 'border-led ring-2 ring-led/60' : 'border-linha')}>
            <span className="block truncate text-[11px] font-semibold sm:text-xs">{p.nome}</span>
            <span className={cn('block truncate text-[10px] sm:text-[11px]', manual ? 'font-semibold text-led' : 'text-musgo')}>{nomeInstr ?? '—'}</span>
            <span className="block text-[10px] text-cal sm:text-[11px]">{vaga} · {p.nota.toFixed(1)}</span>
          </button>
        );
      })}
    </div>
  );
}

function PainelJogador({ t, i, p, fase, tela, agir, ocupado }: { t: TaticaEditTela; i: number; p: PlaqTela; fase: Fase; tela: TaticasTela; agir: (a: PedidoTatica) => void; ocupado: boolean }) {
  const atual = fase === 'Com' ? p.instrCom : p.instrSem;
  const noOnze = new Set(t.onze.map((x) => x.id));
  const banco = tela.elenco.filter((j) => !noOnze.has(j.id) && j.estado === 'ok');
  return (
    <div className="space-y-3 rounded-lg border border-linha bg-relva p-3">
      <div>
        <h3 className="text-base font-semibold">{p.nome}</h3>
        <p className="text-sm text-musgo">{fase === 'Com' ? `Com bola: ${p.vagaCom} (${p.zonaCom})` : `Sem bola: ${p.vagaSem} (${p.zonaSem})`} · nota {p.nota.toFixed(1)} · condição {p.condicao}%</p>
      </div>
      <fieldset disabled={ocupado} className="min-w-0">
        <legend className="mb-1 text-sm text-musgo">Instrução {fase === 'Com' ? 'com a bola' : 'sem a bola'}</legend>
        <div role="radiogroup" aria-label="Instrução individual" className="grid max-h-64 gap-1 overflow-y-auto pr-1">
          <button type="button" role="radio" aria-checked={atual === null} onClick={() => agir({ acao: 'instrucao', i, jogador: p.id, fase, id: null })}
            className={cn('rounded-md border px-2 py-1 text-left text-sm', atual === null ? 'border-led bg-led/15' : 'border-linha hover:bg-faixa')}>
            Auxiliar escolhe <span className="text-xs text-musgo">(a melhor para o estilo)</span>
          </button>
          {p.opcoes[fase].map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={atual === o.id} onClick={() => agir({ acao: 'instrucao', i, jogador: p.id, fase, id: o.id })}
              className={cn('grid grid-cols-[1fr_auto] gap-x-2 rounded-md border px-2 py-1 text-left text-sm', atual === o.id ? 'border-led bg-led/15' : 'border-linha hover:bg-faixa', o.contraria && 'opacity-70')}>
              <span>{o.nome}{o.auxiliar && <span className="ml-1 text-xs text-musgo" title="A que o auxiliar escolheria">auxiliar</span>}</span>
              <span className="tabular-nums" title="Encaixe do jogador na instrução">{pct(o.encaixe)}</span>
              <span className="col-span-2 text-xs text-musgo">
                {o.combina ? 'combina com o estilo' : o.contraria ? <span className="text-cartao">contraria o estilo</span> : 'neutra'}{o.exige ? ` · exige ${o.exige}` : ''}
              </span>
            </button>
          ))}
          {p.opcoes[fase].length === 0 && <p className="text-sm text-musgo">Sem instruções para esta vaga.</p>}
        </div>
      </fieldset>
      <Escolha rotulo="Trocar no onze por" valor="" desativado={ocupado} aoMudar={(v) => v && agir({ acao: 'titular', i, sai: p.id, entra: v })}
        opcoes={[{ valor: '', texto: 'Escolher do elenco…' }, ...banco.map((j) => ({ valor: j.id, texto: `${j.posicao} ${j.nome} · nota ${j.nota.toFixed(1)} · ${j.condicao}%` }))]} />
      {t.titularesManual && <Button variant="secondary" size="sm" disabled={ocupado} onClick={() => agir({ acao: 'titular', i })}>Auxiliar volta a escolher o onze</Button>}
    </div>
  );
}

export function EditorTaticas({ tela, agir, ocupado, erro }: { tela: TaticasTela; agir: (a: PedidoTatica) => void; ocupado: boolean; erro: string | null }) {
  const [i, setI] = useState(tela.ativa);
  const [fase, setFase] = useState<Fase>('Com');
  const [sel, setSel] = useState<string | null>(null);
  const idx = Math.min(i, tela.taticas.length - 1);
  const t = tela.taticas[idx];
  const [nome, setNome] = useState(t.nome);
  useEffect(() => { setNome(t.nome); }, [t.nome, idx]);
  const jogador = t.onze.find((p) => p.id === sel) ?? null;
  const emCampo = new Set(t.onze.map((p) => p.id));
  const candidatos = tela.elenco.filter((j) => emCampo.has(j.id)).sort((a, b) => b.BP - a.BP);
  const formacaoAtual = fase === 'Com' ? t.formacaoComBola : t.formacaoSemBola;
  const estiloDe = tela.estilos.find((e) => e.nome === t.estilo);

  return (
    <div className="space-y-5">
      <div role="radiogroup" aria-label="Tática salva" className="flex flex-wrap items-center gap-2">
        {tela.taticas.map((x, k) => (
          <button key={k} type="button" role="radio" aria-checked={k === idx} onClick={() => { setI(k); setSel(null); }}
            className={cn('rounded-md border px-3 py-1.5 text-left text-sm', k === idx ? 'border-led bg-led/15 font-semibold text-led' : 'border-linha hover:bg-faixa')}>
            {x.nome}
            {k === tela.ativa && <span className="ml-2 text-xs font-normal text-vitoria">jogo</span>}
            {k === tela.treinar && <span className="ml-2 text-xs font-normal text-cal">treino</span>}
          </button>
        ))}
        <Button variant="secondary" size="sm" disabled={ocupado || tela.taticas.length >= tela.max} onClick={() => { agir({ acao: 'duplicar', i: idx }); setI(tela.taticas.length); }}
          title={tela.taticas.length >= tela.max ? `Até ${tela.max} táticas` : 'Copia esta tática numa nova'}>Duplicar</Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-0.5 text-sm">
          <span className="text-xs text-musgo">Nome</span>
          <input value={nome} maxLength={24} onChange={(e) => setNome(e.target.value)} onBlur={() => nome.trim() && nome !== t.nome && agir({ acao: 'editar', i: idx, nome })}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            className="h-9 w-44 rounded-md border border-linha bg-relva px-2 text-cal" />
        </label>
        <Button size="sm" disabled={ocupado || idx === tela.ativa} onClick={() => agir({ acao: 'usar', i: idx })}>Usar no jogo</Button>
        <Button variant="secondary" size="sm" disabled={ocupado || idx === tela.treinar} onClick={() => agir({ acao: 'treinar', i: idx })}>Treinar esta</Button>
        <Button variant="ghost" size="sm" disabled={ocupado || idx === tela.ativa} onClick={() => { agir({ acao: 'apagar', i: idx }); setI(tela.ativa); }}
          title={idx === tela.ativa ? 'A tática em uso não pode ser apagada' : 'Apaga esta tática'}>Apagar</Button>
        <span className="text-sm text-musgo" title="Entrosamento do time com esta tática">entrosamento {pct(t.entrosamento)}</span>
      </div>
      {erro && <p role="alert" className="text-cartao">{erro}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="radiogroup" aria-label="Variação da tática" className="inline-flex overflow-hidden rounded-md border border-linha">
              {(['Com', 'Sem'] as const).map((f) => (
                <button key={f} type="button" role="radio" aria-checked={fase === f} onClick={() => setFase(f)}
                  className={cn('px-4 py-1.5 text-sm', fase === f ? 'bg-led/15 font-semibold text-led' : 'hover:bg-faixa')}>{f === 'Com' ? 'Com bola' : 'Sem bola'}</button>
              ))}
            </div>
            <Escolha rotulo={`Formação ${fase === 'Com' ? 'com' : 'sem'} bola`} valor={formacaoAtual} desativado={ocupado}
              aoMudar={(v) => agir({ acao: 'editar', i: idx, ...(fase === 'Com' ? { formacaoComBola: v } : { formacaoSemBola: v }) })}
              opcoes={tela.formacoes.map((f) => ({ valor: f, texto: f }))} />
          </div>
          <Campo onze={t.onze} fase={fase} sel={sel} aoSelecionar={(id) => setSel(sel === id ? null : id)} />
          <p className="text-xs text-musgo">
            Clique num jogador para dar a instrução {fase === 'Com' ? 'com' : 'sem'} a bola ou trocá-lo no onze. A vaga sem a bola é a que o motor liga a cada um.
            {t.titularesManual ? ' Onze escolhido por você.' : ' O auxiliar escolhe o onze (poupa quem está abaixo de 70 de condição).'}
          </p>
        </div>

        <div className="space-y-5">
          {jogador
            ? <PainelJogador t={t} i={idx} p={jogador} fase={fase} tela={tela} agir={agir} ocupado={ocupado} />
            : <p className="rounded-lg border border-dashed border-linha p-3 text-sm text-musgo">Escolha um jogador no campo para ver as instruções dele.</p>}

          <Secao titulo="Estilo e padrão">
            <div className="grid gap-2 sm:grid-cols-2">
              <Escolha rotulo="Estilo" valor={t.estilo} desativado={ocupado} aoMudar={(v) => agir({ acao: 'editar', i: idx, estilo: v })} opcoes={tela.estilos.map((e) => ({ valor: e.nome, texto: e.nome }))} />
            </div>
            {estiloDe && <p className="mt-1 text-xs text-musgo">{estiloDe.resumo}</p>}
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PADRAO.map((c) => (
                <Escolha key={c.chave} rotulo={`${c.texto}${t.padrao[c.chave] !== estiloDe?.padrao[c.chave] ? ' (ajustado)' : ''}`} valor={t.padrao[c.chave]} desativado={ocupado}
                  aoMudar={(v) => agir({ acao: 'editar', i: idx, padrao: { [c.chave]: v } })} opcoes={c.opcoes.map((o) => ({ valor: o, texto: o }))} />
              ))}
            </div>
          </Secao>

          <Secao titulo="Batedores">
            <div className="grid gap-2 sm:grid-cols-3">
              {BATEDORES.map((b) => (
                <Escolha key={b.tipo} rotulo={b.texto} valor={t.batedores[b.tipo] ?? ''} desativado={ocupado}
                  aoMudar={(v) => agir({ acao: 'batedor', i: idx, tipo: b.tipo, jogador: v || null })}
                  opcoes={[{ valor: '', texto: 'Maior BP em campo' }, ...candidatos.map((j) => ({
                    valor: j.id, texto: `${j.nome} · BP ${j.BP}${b.tipo === 'penalti' ? ` · Comp ${j.Comp}` : ''}${j.tracos.includes(b.traco) ? ' ★' : ''}`,
                  }))]} />
              ))}
            </div>
            <p className="mt-1 text-xs text-musgo">★ tem o traço da cobrança. A marcação individual fica no pré-jogo (vale só para aquele jogo).</p>
          </Secao>
        </div>
      </div>
    </div>
  );
}

/** Aba "Táticas" da Gestão: carrega a tela e aplica cada edição no mundo. */
export function Taticas() {
  const [tela, setTela] = useState<TaticasTela | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => { pedir('taticas').then(setTela).catch((e: Error) => setErro(e.message)); }, []);
  const agir = async (a: PedidoTatica) => {
    if (ocupado) return;
    setOcupado(true); setErro(null);
    try { const r = await pedir('agirTatica', a); setTela(r.tela); setErro(r.erro); } catch (e) { setErro((e as Error).message); } finally { setOcupado(false); }
  };
  if (!tela) return erro ? <p role="alert" className="text-cartao">{erro}</p> : <p className="flex items-center gap-2 text-musgo"><Spinner /> Carregando…</p>;
  return <EditorTaticas tela={tela} agir={agir} ocupado={ocupado} erro={erro} />;
}
