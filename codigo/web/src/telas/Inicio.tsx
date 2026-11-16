import { Button } from '@/componentes/ui/button';
import { Slots } from '@/componentes/Slots';
import type { Slot } from '@/nucleo/protocolo';

export function Inicio({ aoNovo, aoCarregar, erro }: { aoNovo: () => void; aoCarregar: (s: Slot) => void; erro: string | null }) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl content-center gap-10 px-4 py-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
      <section aria-labelledby="titulo" className="self-center">
        <div className="placar rounded-md px-5 py-6">
          <h1 id="titulo" className="led text-4xl leading-tight sm:text-5xl">Central do<br />Técnico</h1>
        </div>
        <p className="mt-5 max-w-[46ch] text-lg text-musgo">
          Assuma um clube da Série A ou da Série B e comande a temporada inteira: liga, copas, diretoria e torcida.
        </p>
        <Button size="lg" className="mt-6 h-12 px-6 text-base font-semibold" autoFocus onClick={aoNovo}>Novo jogo</Button>
        {erro && <p role="alert" className="mt-4 text-cartao">{erro}</p>}
      </section>
      <section aria-labelledby="saves" className="self-center">
        <h2 id="saves" className="mb-2 text-xl font-semibold">Continuar uma carreira</h2>
        <Slots modo="carregar" aoCarregar={aoCarregar} />
      </section>
    </main>
  );
}
