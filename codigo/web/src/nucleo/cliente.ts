// Lado da tela: pedidos ao Worker do jogo como promessas.
import type { Pedidos, Resposta, TipoPedido } from './protocolo.ts';

const worker = new Worker(new URL('./jogo.worker.ts', import.meta.url), { type: 'module' });
let proximo = 1;
const esperando = new Map<number, { ok: (v: unknown) => void; falha: (e: Error) => void }>();

worker.onmessage = (ev: MessageEvent<Resposta>) => {
  const r = ev.data;
  const p = esperando.get(r.id);
  if (!p) return;
  esperando.delete(r.id);
  if (r.ok) p.ok(r.resultado);
  else p.falha(new Error(r.erro));
};

export function pedir<T extends TipoPedido>(tipo: T, ...dados: Pedidos[T]['pede'] extends void ? [] : [Pedidos[T]['pede']]): Promise<Pedidos[T]['volta']> {
  const id = proximo++;
  return new Promise((ok, falha) => {
    esperando.set(id, { ok: ok as (v: unknown) => void, falha });
    worker.postMessage({ id, tipo, dados: dados[0] });
  });
}
