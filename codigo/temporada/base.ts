// Base de dados do jogo (os JSON de `gerado/`) sem depender de Node: quem chama diz como ler cada arquivo
// (o terminal pelo disco, a interface web pelos JSON embutidos no pacote).
import type { Clube, FraseNarracao, Jogador, Profissional, Tatica, Tecnico } from '../motor/dados.ts';
import type { Comercial } from '../gestao/financas.ts';
import type { Empresario } from '../gestao/mercado.ts';
import type { FichaDiretoria } from '../gestao/diretoria.ts';
import type { Imprensa, ModeloEvento } from '../gestao/eventos.ts';

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
  /** Empresários (etapa 4, 5ª fatia). */
  empresarios: Empresario[];
  /** Diretorias (etapa 4, 6ª fatia). */
  diretoria: FichaDiretoria[];
  /** Eventos e imprensa (etapa 4, 7ª fatia). */
  eventos: ModeloEvento[];
  imprensa: Imprensa;
}

export function montarBase(ler: <T>(arq: string) => T): Base {
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
    empresarios: ler<Empresario[]>('empresarios.json'),
    diretoria: ler<FichaDiretoria[]>('diretoria.json'),
    eventos: ler<ModeloEvento[]>('eventos.json'),
    imprensa: ler<Imprensa>('imprensa.json'),
  };
}
