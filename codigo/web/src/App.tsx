import { useCallback, useEffect, useRef, useState } from 'react';
import { pedir } from '@/nucleo/cliente';
import type { DecisaoTela, RespostaDecisao, Etapa, NovoJogo, Painel as P, PreJogo as PJ, Slot } from '@/nucleo/protocolo';
import { PreJogo } from '@/telas/PreJogo';
import { Partida } from '@/telas/Partida';
import type { AoVivoTela } from '@/telas/Partida';
import { Fim } from '@/telas/Fim';
import { Inicio } from '@/telas/Inicio';
import { EscolhaClube } from '@/telas/EscolhaClube';
import { Painel } from '@/telas/Painel';
import { Decisao } from '@/telas/Decisao';
import { Gestao } from '@/telas/Gestao';

/** Pilha de telas: Esc volta uma tela (menos no painel, onde volta só pelo botão Início). */
type Tela = 'inicio' | 'escolha' | 'painel' | 'prejogo' | 'partida' | 'fim' | 'gestao';

export default function App() {
  const [pilha, setPilha] = useState<Tela[]>(['inicio']);
  const [painel, setPainel] = useState<P | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pre, setPre] = useState<PJ | null>(null);
  const [decisao, setDecisao] = useState<DecisaoTela | null>(null);
  const [aoVivo, setAoVivo] = useState<AoVivoTela | null>(null);
  const tela = pilha.at(-1)!;
  const raiz = useRef<HTMLDivElement>(null);

  const ir = (t: Tela) => { setErro(null); setPilha((p) => [...p, t]); };
  const voltar = useCallback(() => { setErro(null); setPilha((p) => (p.length > 1 ? p.slice(0, -1) : p)); }, []);
  const executar = async (f: () => Promise<P>, depois?: () => void) => {
    setOcupado(true);
    setErro(null);
    try { setPainel(await f()); depois?.(); } catch (e) { setErro((e as Error).message); } finally { setOcupado(false); }
  };

  /** 5d2: o Avançar e as respostas da partida levam ao painel, ao pré-jogo, à pausa ou ao fim. */
  const simRef = useRef(false);
  const receber = (e: Etapa, pedidoSimulando: boolean) => {
    // Uma decisão no meio de uma simulação não perde o modo: o resultado vem depois dela.
    const simulando = pedidoSimulando || simRef.current;
    simRef.current = e.tipo === 'decisao' ? simulando : false;
    if (e.tipo === 'decisao') { setPainel(e.painel); setDecisao(e.decisao); return; }
    setDecisao(null);
    if (e.tipo === 'painel') { setPainel(e.painel); setPilha(['painel']); return; }
    if (e.tipo === 'prejogo') { setPre(e.pre); setAoVivo(null); setPilha(['painel', 'prejogo']); return; }
    if (e.tipo === 'pausa') {
      setAoVivo((v) => ({ jogo: e.jogo, nomes: e.nomes, linhas: [...(v?.linhas ?? []), ...e.linhas], lances: [...(v?.lances ?? []), ...e.campo], pausa: e.pausa, fim: null }));
      setPilha(['painel', 'partida']);
      return;
    }
    setPainel(e.painel);
    // Simulado (direto ou o resto): a narração vem inteira e a tela vai ao resultado.
    setAoVivo((v) => ({ jogo: e.jogo, nomes: e.nomes, linhas: simulando || !v ? e.linhas : [...v.linhas, ...e.linhas], lances: simulando || !v ? e.campo : [...v.lances, ...e.campo], pausa: null, fim: e.fim }));
    setPilha(['painel', simulando ? 'fim' : 'partida']);
  };
  const pedindo = useRef(false);
  const etapa = async (f: () => Promise<Etapa>, simulando = false) => {
    // Um pedido por vez: clique e atalho no mesmo instante não mandam a resposta duas vezes.
    if (pedindo.current) return;
    pedindo.current = true;
    setOcupado(true);
    setErro(null);
    try { receber(await f(), simulando); } catch (e) { setErro((e as Error).message); } finally { pedindo.current = false; setOcupado(false); }
  };

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape' && tela === 'escolha') voltar(); };
    addEventListener('keydown', aoTeclar);
    return () => removeEventListener('keydown', aoTeclar);
  }, [tela, voltar]);
  // Foco vai para o topo da tela nova (o leitor de tela anuncia o título).
  useEffect(() => { raiz.current?.querySelector<HTMLElement>('[autofocus], h1')?.focus?.(); document.title = tela === 'painel' && painel ? `${painel.clube.nomeCurto}: semana ${painel.semana}, Central do Técnico`
    : (tela === 'partida' || tela === 'fim') && aoVivo ? `${aoVivo.nomes[aoVivo.jogo.mandante]} x ${aoVivo.nomes[aoVivo.jogo.visitante]}, Central do Técnico` : 'Central do Técnico'; }, [tela, painel, aoVivo]);

  return (
    <main ref={raiz}>
      {tela === 'inicio' && (
        <Inicio erro={erro} aoNovo={() => ir('escolha')}
          aoCarregar={(s: Slot) => executar(() => pedir('carregar', s), () => setPilha(['painel']))} />
      )}
      {tela === 'escolha' && (
        <EscolhaClube ocupado={ocupado} aoVoltar={voltar}
          aoComecar={(n: NovoJogo) => executar(() => pedir('novoJogo', n), () => setPilha(['painel']))} />
      )}
      {tela === 'painel' && painel && (
        <Painel painel={painel} ocupado={ocupado} erro={erro} aoSair={() => setPilha(['inicio'])}
          aoAvancar={() => etapa(() => pedir('avancar'))} aoGestao={() => ir('gestao')} />
      )}
      {tela === 'gestao' && painel && <Gestao dia={painel.dia} aoVoltar={voltar} />}
      {tela === 'prejogo' && pre && (
        <PreJogo pre={pre} ocupado={ocupado} erro={erro} aoJogar={(e) => etapa(() => pedir('preJogo', e), e.modo === 'simular')} />
      )}
      {tela === 'partida' && aoVivo && (
        <Partida v={aoVivo} ocupado={ocupado} erro={erro} aoResponder={(r) => etapa(() => pedir('pausa', r), !!r.simularResto)} aoVerFim={() => setPilha(['painel', 'fim'])} />
      )}
      {decisao && <Decisao d={decisao} ocupado={ocupado} erro={erro} aoResponder={(r: RespostaDecisao) => etapa(() => pedir('decidir', r), false)} />}
      {tela === 'fim' && aoVivo?.fim && <Fim v={aoVivo} aoVoltar={() => setPilha(['painel'])} />}
    </main>
  );
}
