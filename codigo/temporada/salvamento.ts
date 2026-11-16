// Salvamento da carreira em JSON (etapa 5, fatia 5c; a qualquer ciclo desde a 5d1, com o ano em `emAndamento`).
// O mundo é um grafo: o mesmo técnico, jogador ou conta aparece em vários lugares. O formato guarda cada objeto
// compartilhado uma vez ($id) e as outras aparições como referência ($ref), para o carregado se comportar igual.
// Map, Set, a classe Nomes e números não finitos ganham marcas próprias. Funções (o controle do jogador) ficam de fora.
import { Nomes } from '../gestao/base.ts';
import type { Mundo } from './virada.ts';

/** Sobe quando o formato do mundo muda de um jeito que um save antigo não carrega mais. */
export const VERSAO_SAVE = 1;

export interface Save<T = unknown> { versao: number; ano: number; criado: string; mundo: Mundo; extra: T }

const CLASSES: Record<string, { prototype: object }> = { Nomes };

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

function classeDe(v: object): string {
  const p = Object.getPrototypeOf(v);
  if (p === Object.prototype || p === null) return 'Object';
  if (p === Array.prototype) return 'Array';
  if (v instanceof Map) return 'Map';
  if (v instanceof Set) return 'Set';
  const nome = Object.entries(CLASSES).find(([, c]) => p === c.prototype)?.[0];
  if (!nome) throw new Error(`salvamento: tipo não suportado (${p?.constructor?.name ?? '?'})`);
  return nome;
}

/** Filhos de um objeto, na ordem em que o codificador os visita. */
function filhos(v: object, c: string): unknown[] {
  if (c === 'Array') return v as unknown[];
  if (c === 'Map') return [...(v as Map<unknown, unknown>)].flat();
  if (c === 'Set') return [...(v as Set<unknown>)];
  return Object.values(v);
}

export function codificar(raiz: unknown): Json {
  // 1ª passada: quantas vezes cada objeto aparece.
  const vezes = new Map<object, number>();
  const pilha: unknown[] = [raiz];
  while (pilha.length) {
    const v = pilha.pop();
    if (typeof v === 'function') throw new Error('salvamento: função no mundo (tire o controle do jogador antes)');
    if (v === null || typeof v !== 'object') continue;
    const n = vezes.get(v) ?? 0;
    vezes.set(v, n + 1);
    if (n === 0) for (const f of filhos(v, classeDe(v))) pilha.push(f); // sem espalhar: arrays grandes estouram a pilha no navegador
  }
  // 2ª passada: só os compartilhados ganham $id.
  const ids = new Map<object, number>();
  const cod = (v: unknown): Json => {
    if (v === undefined) return { $u: 1 };
    if (typeof v === 'number') return Number.isFinite(v) ? v : { $n: String(v) };
    if (v === null || typeof v !== 'object') return v as Json;
    const ja = ids.get(v);
    if (ja !== undefined) return { $ref: ja };
    const o: { [k: string]: Json } = {};
    if (vezes.get(v)! > 1) { o.$id = ids.size; ids.set(v, ids.size); }
    const c = classeDe(v);
    if (c === 'Array') o.$a = (v as unknown[]).map(cod);
    else if (c === 'Map') o.$m = [...(v as Map<unknown, unknown>)].map(([k, x]) => [cod(k), cod(x)]);
    else if (c === 'Set') o.$s = [...(v as Set<unknown>)].map(cod);
    else {
      const campos: { [k: string]: Json } = {};
      for (const [k, x] of Object.entries(v)) campos[k] = cod(x);
      if (c === 'Object' && !Object.keys(o).length && !Object.keys(campos).some((k) => k.startsWith('$'))) return campos;
      o.$o = campos;
      if (c !== 'Object') o.$c = c;
    }
    return o;
  };
  return cod(raiz);
}

export function decodificar(raiz: Json): unknown {
  const ids = new Map<number, unknown>();
  const dec = (v: Json): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(dec); // não acontece no formato, mas não custa
    if ('$u' in v) return undefined;
    if ('$n' in v) return Number(v.$n);
    if ('$ref' in v) {
      if (!ids.has(v.$ref as number)) throw new Error(`salvamento: referência ${v.$ref} antes da definição`);
      return ids.get(v.$ref as number);
    }
    const guardar = <T>(x: T): T => { if (typeof v.$id === 'number') ids.set(v.$id, x); return x; };
    if ('$a' in v) { const a = guardar([] as unknown[]); for (const x of v.$a as Json[]) a.push(dec(x)); return a; }
    if ('$m' in v) { const mp = guardar(new Map()); for (const [k, x] of v.$m as [Json, Json][]) mp.set(dec(k), dec(x)); return mp; }
    if ('$s' in v) { const s = guardar(new Set()); for (const x of v.$s as Json[]) s.add(dec(x)); return s; }
    const campos = ('$o' in v ? v.$o : v) as { [k: string]: Json };
    const c = typeof v.$c === 'string' ? CLASSES[v.$c] : undefined;
    if (typeof v.$c === 'string' && !c) throw new Error(`salvamento: classe desconhecida ${v.$c}`);
    const o = guardar(c ? Object.create(c.prototype) : {}) as Record<string, unknown>;
    for (const [k, x] of Object.entries(campos)) o[k] = dec(x);
    return o;
  };
  return dec(raiz);
}

/** Texto do save. `extra` guarda o que não é do mundo (escolhas da tela, semente). O controle do jogador não vai. */
export function salvar<T>(m: Mundo, extra: T): string {
  const { jogador: _fora, ...resto } = m;
  return JSON.stringify(codificar({ versao: VERSAO_SAVE, ano: m.ano, criado: new Date().toISOString(), mundo: resto, extra }));
}

/** Lê o save; o controle do jogador precisa ser posto de novo em `mundo.jogador`. */
export function carregar<T>(texto: string): Save<T> {
  const s = decodificar(JSON.parse(texto)) as Save<T>;
  if (s?.versao !== VERSAO_SAVE) throw new Error(`Save da versão ${s?.versao ?? '?'}; este jogo lê a versão ${VERSAO_SAVE}.`);
  return s;
}
