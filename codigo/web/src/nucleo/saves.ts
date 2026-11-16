// Saves no IndexedDB (5d1): um registro por slot, o texto do save com gzip nativo (CompressionStream).
import type { InfoSlot, Slot } from './protocolo.ts';

const BANCO = 'central-do-tecnico';
const LOJA = 'saves';

interface Registro { info: InfoSlot; dados: Blob }

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, falha) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(LOJA);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => falha(r.error);
  });
}

async function emLoja<T>(modo: IDBTransactionMode, f: (l: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  try {
    // Só vale quando a transação termina (gravação confirmada), não no sucesso do pedido.
    return await new Promise<T>((ok, falha) => {
      const tx = db.transaction(LOJA, modo);
      const r = f(tx.objectStore(LOJA));
      tx.oncomplete = () => ok(r.result);
      tx.onabort = tx.onerror = () => falha(tx.error ?? r.error ?? new Error('Falha ao gravar o save no navegador.'));
    });
  } finally {
    db.close();
  }
}

export async function comprimir(texto: string): Promise<Blob> {
  const fluxo = new Blob([texto]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(fluxo).blob();
}

export async function descomprimir(dados: Blob): Promise<string> {
  return new Response(dados.stream().pipeThrough(new DecompressionStream('gzip'))).text();
}

export const gravar = (info: InfoSlot, dados: Blob): Promise<IDBValidKey> => emLoja('readwrite', (l) => l.put({ info, dados } satisfies Registro, info.slot));
export const ler = (slot: Slot): Promise<Registro | undefined> => emLoja('readonly', (l) => l.get(slot) as IDBRequest<Registro | undefined>);
export const apagar = (slot: Slot): Promise<undefined> => emLoja('readwrite', (l) => l.delete(slot) as IDBRequest<undefined>);
export async function listar(): Promise<InfoSlot[]> {
  const todos = await emLoja('readonly', (l) => l.getAll() as IDBRequest<Registro[]>);
  return todos.map((r) => r.info);
}
