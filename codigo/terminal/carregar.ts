import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Clube, FraseNarracao, Jogador, Profissional, Tatica, Tecnico } from '../motor/dados.ts';
import type { EntradaTime } from '../motor/tipos.ts';
import type { Comercial } from '../gestao/financas.ts';

const GERADO = join(dirname(fileURLToPath(import.meta.url)), '..', 'gerado');
const ler = <T>(arq: string): T => JSON.parse(readFileSync(join(GERADO, arq), 'utf8')) as T;

export interface Base {
  clubes: Clube[];
  tecnicos: Tecnico[];
  elencos: Record<string, Jogador[]>;
  tatica: Tatica;
  frases: FraseNarracao[];
  /** Comissões por clube (a Europa não tem). */
  comissoes: Record<string, Profissional[]>;
  /** Jogadores, técnicos (em `tecnicos`, sem clube) e profissionais livres. */
  livres: Jogador[];
  profissionaisLivres: Profissional[];
  /** Finanças e comercial (etapa 4, 4ª fatia). */
  comercial: Comercial;
}

export function carregarBase(): Base {
  return {
    clubes: ler<Clube[]>('clubes.json'),
    tecnicos: ler<Tecnico[]>('tecnicos.json'),
    elencos: ler<Record<string, Jogador[]>>('elencos.json'),
    tatica: ler<Tatica>('tatica.json'),
    frases: ler<FraseNarracao[]>('narracao.json'),
    comissoes: ler<{ clubes: Record<string, Profissional[]> }>('comissao.json').clubes,
    livres: ler<Jogador[]>('livres.json'),
    profissionaisLivres: ler<{ livres: Profissional[] }>('comissao.json').livres,
    comercial: ler<Comercial>('comercial.json'),
  };
}

export function entradaTime(b: Base, id: string): EntradaTime {
  const clube = b.clubes.find((c) => c.id === id);
  if (!clube) throw new Error(`Clube não encontrado: ${id}`);
  const tecnico = b.tecnicos.find((t) => t.clubeId === id);
  if (!tecnico) throw new Error(`Clube sem técnico: ${id}`);
  return { clube, tecnico, elenco: b.elencos[id] };
}
