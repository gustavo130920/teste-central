import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EntradaTime } from '../motor/tipos.ts';
import type { Base } from '../temporada/base.ts';
import { montarBase } from '../temporada/base.ts';

export type { Base };

const GERADO = join(dirname(fileURLToPath(import.meta.url)), '..', 'gerado');
const ler = <T>(arq: string): T => JSON.parse(readFileSync(join(GERADO, arq), 'utf8')) as T;

export function carregarBase(): Base {
  return montarBase(ler);
}

export function entradaTime(b: Base, id: string): EntradaTime {
  const clube = b.clubes.find((c) => c.id === id);
  if (!clube) throw new Error(`Clube não encontrado: ${id}`);
  const tecnico = b.tecnicos.find((t) => t.clubeId === id);
  if (!tecnico) throw new Error(`Clube sem técnico: ${id}`);
  return { clube, tecnico, elenco: b.elencos[id] };
}
