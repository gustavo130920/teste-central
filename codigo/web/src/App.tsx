import { useCallback, useEffect, useRef, useState } from 'react';
import { pedir } from '@/nucleo/cliente';
import type { NovoJogo, Painel as P, Slot } from '@/nucleo/protocolo';
import { Inicio } from '@/telas/Inicio';
import { EscolhaClube } from '@/telas/EscolhaClube';
import { Painel } from '@/telas/Painel';

/** Pilha de telas: Esc volta uma tela (menos no painel, onde volta só pelo botão Início). */
type Tela = 'inicio' | 'escolha' | 'painel';

export default function App() {
  const [pilha, setPilha] = useState<Tela[]>(['inicio']);
  const [painel, setPainel] = useState<P | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const tela = pilha.at(-1)!;
  const raiz = useRef<HTMLDivElement>(null);

  const ir = (t: Tela) => { setErro(null); setPilha((p) => [...p, t]); };
  const voltar = useCallback(() => { setErro(null); setPilha((p) => (p.length > 1 ? p.slice(0, -1) : p)); }, []);
  const executar = async (f: () => Promise<P>, depois?: () => void) => {
    setOcupado(true);
    setErro(null);
    try { setPainel(await f()); depois?.(); } catch (e) { setErro((e as Error).message); } finally { setOcupado(false); }
  };

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape' && tela === 'escolha') voltar(); };
    addEventListener('keydown', aoTeclar);
    return () => removeEventListener('keydown', aoTeclar);
  }, [tela, voltar]);
  // Foco vai para o topo da tela nova (o leitor de tela anuncia o título).
  useEffect(() => { raiz.current?.querySelector<HTMLElement>('[autofocus], h1')?.focus?.(); document.title = tela === 'painel' && painel ? `${painel.clube.nomeCurto}: semana ${painel.semana}, Central do Técnico` : 'Central do Técnico'; }, [tela, painel]);

  return (
    <div ref={raiz}>
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
          aoAvancar={() => executar(() => pedir('avancar'))} />
      )}
    </div>
  );
}
