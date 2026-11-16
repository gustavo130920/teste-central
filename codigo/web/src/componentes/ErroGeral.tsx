import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from '@/componentes/ui/button';

declare const __VERSAO__: string;

interface Estado { erro: Error | null; copiado: boolean }

/** Último recurso: uma falha não esperada vira uma tela com o diagnóstico para copiar (os saves não são tocados). */
export class ErroGeral extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { erro: null, copiado: false };
  static getDerivedStateFromError(erro: Error): Estado { return { erro, copiado: false }; }
  componentDidCatch(erro: Error, info: ErrorInfo): void { console.error(erro, info.componentStack); }

  diagnostico(): string {
    const e = this.state.erro!;
    return [`Central do Técnico ${__VERSAO__}`, navigator.userAgent, new Date().toISOString(), `${e.name}: ${e.message}`, e.stack ?? ''].join('\n');
  }

  render(): ReactNode {
    if (!this.state.erro) return this.props.children;
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-2xl font-bold" tabIndex={-1}>Algo deu errado</h1>
        <p className="mt-3 text-musgo">O jogo parou por um erro inesperado. Seus saves continuam guardados neste navegador. Recarregue a página; se o erro voltar, copie o diagnóstico e envie junto do que você estava fazendo.</p>
        <pre className="mt-4 max-h-48 overflow-auto rounded-md border border-linha bg-relva p-3 text-xs">{this.state.erro.message}</pre>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => location.reload()}>Recarregar</Button>
          <Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(this.diagnostico()); this.setState({ copiado: true }); } catch { /* sem permissão da área de transferência */ } }}>
            {this.state.copiado ? 'Copiado' : 'Copiar diagnóstico'}
          </Button>
        </div>
      </main>
    );
  }
}
