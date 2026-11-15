// Pessoas no mundo (etapa 4, 3ª fatia; GDD-gestao 5 e 11): períodos de evolução e de perfil, safra da base
// e a etapa 6 da virada (idade, perfis aos 22, aposentadorias, subidas da base, comissão) e a reposição dos livres.
import type { Jogador, Profissional, Tatica, Tecnico } from '../motor/dados.ts';
import type { Rng } from '../motor/rng.ts';
import { efetivo } from '../gestao/comissao.ts';
import type { EstadoEvolucao } from '../gestao/evolucao.ts';
import { EVOLUCAO, PERFIL, aplicarPontos, criarEvolucao, deltaTrabalho, envelhecer, ganho, limitarTrabalho, resultadoPerfil } from '../gestao/evolucao.ts';
import { APOSENTADORIA, BASE, REPOSICAO, chanceAposentar, chanceAposentarPessoa, escolherSubidas, evoluirPessoa, gerarLivre, gerarProfissional, gerarSafra, gerarTecnico, margemDoTecnico } from '../gestao/base.ts';
import { LIDER, MORAL, moralDoGrupo, respaldoInicial } from '../gestao/moral.ts';
import type { Foco } from '../gestao/treino.ts';
import type { ClubeGestao, Memoria, PeriodoClube } from './memoria.ts';
import { novoEstado } from './memoria.ts';

const EXEMPLO = 'Exemplo profissional';

function focoMaisUsado(p: PeriodoClube): Foco | null {
  const f = Object.entries(p.focos).sort((a, b) => b[1] - a[1])[0];
  return f ? (f[0] as Foco) : null;
}

const fracao = (min: number, jogos: number): number => (jogos ? min / (jogos * 90) : EVOLUCAO.minutos.medio);

function evoluir(m: Memoria, j: Jogador, s: EstadoEvolucao, pontos: number, foco: Foco | null, condicionamento: number, rng: Rng): void {
  s.pontos += pontos;
  m.evo.pontos += aplicarPontos(j, s, foco, rng);
  const r = envelhecer(j, s, condicionamento, rng);
  if (r.menos) m.evo.perdas += 1;
  if (r.mais) m.evo.ganhosMentais += 1;
  if (s.acompanhar && j.nota >= j.potencial) {
    m.evo.chegouAoPot.push(j.idade);
    s.acompanhar = false;
  }
}

/** A cada 4 semanas (GDD-gestao 5): pontos de evolução e envelhecimento, no elenco e na base. */
export function periodoDeEvolucao(m: Memoria, rng: Rng): void {
  for (const [clube, g] of m.gestao) {
    const p = m.periodo.get(clube)!;
    const treino = p.ciclos ? p.treinoSoma / p.ciclos : 1;
    const foco = focoMaisUsado(p);
    const treinoTecnico = efetivo(g.comissao, 'Auxiliar', 'TTe');
    const jovens = g.tecnico.trabalho?.['Jovens'] ?? EVOLUCAO.semDado;
    const cond = efetivo(g.comissao, 'Preparador', 'Cond');
    const elenco = m.elencos[clube];
    const exemplos = elenco.filter((j) => j.qualidades.includes(EXEMPLO));
    for (const j of elenco) {
      const s = m.evolucao.get(j.id)!;
      const pontos = ganho(j, {
        minutos: fracao(s.min28, p.jogos28), treino, treinoTecnico, jovens,
        exemplo: exemplos.some((x) => x.id !== j.id), moral: m.jogadores.get(j.id)!.moral,
      });
      evoluir(m, j, s, pontos, foco, cond, rng);
      s.min28 = 0;
    }
    for (const j of m.base.get(clube) ?? []) {
      const s = m.evolucao.get(j.id)!;
      evoluir(m, j, s, ganho(j, { minutos: null, treino, treinoTecnico, jovens, exemplo: false, moral: MORAL.repouso }), foco, cond, rng);
    }
    p.jogos28 = 0;
    p.treinoSoma = 0;
    p.ciclos = 0;
    p.focos = {};
  }
}

/** A cada 13 semanas: Trabalho do perfil de jovem (GDD-gestao 5). */
export function periodoDePerfil(m: Memoria): void {
  for (const [clube, g] of m.gestao) {
    const p = m.periodo.get(clube)!;
    const elenco = m.elencos[clube];
    const est = (id: string) => m.jogadores.get(id)!;
    const grupo = moralDoGrupo(elenco, (id) => est(id).moral, (id) => est(id).titularidades, g.jogos);
    const psicologo = efetivo(g.comissao, 'Psicólogo', 'Jov');
    const coordenador = efetivo(g.comissao, 'Coord. base', 'Form');
    const mentor = elenco.some((j) => j.qualidades.includes(EXEMPLO) || j.qualidades.includes(LIDER));
    for (const j of elenco) {
      const s = m.evolucao.get(j.id)!;
      if (s.trabalho !== null) s.trabalho = limitarTrabalho(s.trabalho + deltaTrabalho({ naBase: false, psicologo, coordenador, mentor, minutos: fracao(s.min91, p.jogos91), grupo }));
      s.min91 = 0;
    }
    for (const j of m.base.get(clube) ?? []) {
      const s = m.evolucao.get(j.id)!;
      if (s.trabalho !== null) s.trabalho = limitarTrabalho(s.trabalho + deltaTrabalho({ naBase: true, psicologo, coordenador, mentor, minutos: 1, grupo }));
    }
    p.jogos91 = 0;
  }
}

/** Nacionalidade mais comum do elenco (a da safra). */
const paisDoElenco = (elenco: Jogador[]): string => {
  const n = new Map<string, number>();
  for (const j of elenco) n.set(j.nacionalidade, (n.get(j.nacionalidade) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'BRA';
};

/** Safra da semana 1 (GDD-gestao 5). */
export function novaSafra(m: Memoria, rng: Rng): void {
  for (const [clube, g] of m.gestao) {
    const estrutura = g.comissao.base ?? BASE.semEstrutura;
    const captacao = efetivo(g.comissao, 'Coord. base', 'Capt');
    const elenco = m.elencos[clube];
    const { jovens, joias } = gerarSafra(clube, estrutura, captacao, elenco, paisDoElenco(elenco), () => `BASE-${++m.seq}`, m.nomes, rng);
    for (const j of jovens) m.evolucao.set(j.id, criarEvolucao(j));
    m.base.get(clube)!.push(...jovens);
    m.evo.joias += joias;
    m.evo.safra += jovens.length;
  }
}

// ---------- Virada, etapa 6 (Pessoas) e 8 (Reposição) ----------

/** O que a virada precisa do mundo (virada.ts), sem import circular. */
export interface MundoPessoas {
  ano: number;
  tecnicos: Tecnico[];
  tatica: Tatica;
  livres: Jogador[];
  profissionaisLivres: Profissional[];
  /** Ano em que ficou livre e se saiu da base (para a saída do mundo). */
  livreDesde: Map<string, { ano: number; dispensado: boolean }>;
  estruturaCT: Map<string, number | null>;
  /** Mercado (5ª fatia): antes das subidas, completa os elencos com livres melhores que a base. Devolve quantos assinaram. */
  antesDasSubidas?: (livres: Jogador[]) => number;
}

export interface ResumoPessoas {
  aposentados: { id: string; nome: string; idade: number; clube: string | null }[];
  novasCarreiras: number;
  subiram: number;
  liberados: number;
  emergencias: number;
  perfis: { bem: number; mal: number; nenhum: number };
  tecnicosAposentados: number;
  profissionaisAposentados: number;
  tecnicosTrocados: string[];
  saidasDoMundo: number;
  gerados: { jogadores: number; tecnicos: number; profissionais: number };
  livres: number;
  livresAssinados: number;
}

export function viradaPessoas(mem: Memoria, w: MundoPessoas, rng: Rng): ResumoPessoas {
  const r: ResumoPessoas = {
    aposentados: [], novasCarreiras: 0, subiram: 0, liberados: 0, emergencias: 0, perfis: { bem: 0, mal: 0, nenhum: 0 },
    tecnicosAposentados: 0, profissionaisAposentados: 0, tecnicosTrocados: [], saidasDoMundo: 0, gerados: { jogadores: 0, tecnicos: 0, profissionais: 0 }, livres: 0, livresAssinados: 0,
  };
  const clubes = [...mem.gestao.keys()];
  const evo = (j: Jogador): EstadoEvolucao => mem.evolucao.get(j.id) ?? mem.evolucao.set(j.id, criarEvolucao(j)).get(j.id)!;

  // Idade +1 para todos.
  for (const c of clubes) for (const j of [...mem.elencos[c], ...mem.base.get(c)!]) j.idade += 1;
  for (const j of w.livres) j.idade += 1;
  for (const t of w.tecnicos) t.idade += 1;
  for (const g of mem.gestao.values()) for (const p of g.comissao.profissionais) p.idade += 1;
  for (const p of w.profissionaisLivres) p.idade += 1;

  // Livres envelhecem como se treinassem num clube comum (13 períodos, Condicionamento 10).
  for (const j of w.livres) {
    const s = evo(j);
    for (let i = 0; i < 52 / 4; i++) envelhecer(j, s, EVOLUCAO.semDado, rng);
  }

  // Perfis de jovem: sorteio único aos 22.
  for (const c of clubes) {
    for (const j of [...mem.elencos[c], ...mem.base.get(c)!]) {
      const s = evo(j);
      if (s.trabalho === null || j.idade < PERFIL.idadeResultado) continue;
      r.perfis[resultadoPerfil(j, s.trabalho, rng)] += 1;
      s.trabalho = null;
    }
  }

  // Aposentadoria de jogadores.
  const novaCarreira = (j: Jogador): void => {
    const n = APOSENTADORIA.novaCarreira;
    if (!((j.atributos.Lid ?? 0) >= n.lideranca || j.qualidades.includes('Ídolo')) || !rng.pct(n.chance)) return;
    const base = { nome: j.nomeCompleto, idade: j.idade, nacionalidade: j.nacionalidade };
    if (rng.pct(50) && w.tecnicos.length) {
      const molde = w.tecnicos[rng.int(0, w.tecnicos.length - 1)];
      w.tecnicos.push(gerarTecnico(molde, mem.nomes, rng, undefined, { ...base, nacionalidade: molde.nacionalidade }));
    } else {
      const moldes = [...w.profissionaisLivres, ...[...mem.gestao.values()].flatMap((g) => g.comissao.profissionais)];
      if (moldes.length) w.profissionaisLivres.push(gerarProfissional(moldes[rng.int(0, moldes.length - 1)], mem.nomes, rng, base));
    }
    r.novasCarreiras += 1;
  };
  for (const c of clubes) {
    const p = mem.periodo.get(c)!;
    const fica: Jogador[] = [];
    for (const j of mem.elencos[c]) {
      if (rng.pct(chanceAposentar(j, false, fracao(evo(j).minAno, p.jogosAno)))) {
        r.aposentados.push({ id: j.id, nome: j.nome, idade: j.idade, clube: c });
        novaCarreira(j);
      } else fica.push(j);
    }
    mem.elencos[c] = fica;
  }
  w.livres = w.livres.filter((j) => {
    if (!rng.pct(chanceAposentar(j, true, 0))) return true;
    r.aposentados.push({ id: j.id, nome: j.nome, idade: j.idade, clube: null });
    novaCarreira(j);
    return false;
  });
  for (const a of r.aposentados) { mem.evolucao.delete(a.id); mem.jogadores.delete(a.id); w.livreDesde.delete(a.id); }

  // Mercado: livres melhores que a base entram antes das subidas (decisão de 14/11/2026).
  r.livresAssinados = w.antesDasSubidas?.(w.livres) ?? 0;
  // Subidas da base (IA) e saída aos 20.
  for (const c of clubes) {
    const g = mem.gestao.get(c)!;
    const base = mem.base.get(c)!;
    const integ = efetivo(g.comissao, 'Coord. base', 'Integ');
    for (const j of escolherSubidas(mem.elencos[c], base, margemDoTecnico(g.tecnico))) {
      base.splice(base.indexOf(j), 1);
      subir(mem, c, j, integ);
      r.subiram += 1;
    }
    for (const j of base.filter((x) => x.idade >= BASE.prazo)) {
      base.splice(base.indexOf(j), 1);
      // Quem não subiu até os 20 sai do mundo na hora, sem virar livre (decisão de 14/11/2026; GDD pedia 13 semanas).
      j.clubeId = null;
      r.liberados += 1;
      r.saidasDoMundo += 1;
      mem.evolucao.delete(j.id);
    }
    // Emergência (PROVISORIO): sem 2 goleiros nem jovem goleiro na base, assina o melhor goleiro livre.
    while (mem.elencos[c].filter((j) => j.posicao === 'GOL').length < BASE.goleirosMin) {
      const gol = w.livres.filter((j) => j.posicao === 'GOL').sort((a, b) => b.nota - a.nota)[0];
      if (!gol) break;
      w.livres.splice(w.livres.indexOf(gol), 1);
      w.livreDesde.delete(gol.id);
      gol.clubeId = c;
      mem.elencos[c].push(gol);
      mem.jogadores.set(gol.id, novoEstado());
      evo(gol);
      r.emergencias += 1;
    }
  }

  // Técnicos: aposentadoria e evolução anual; o livre de maior reputação assume (decisão de 13/11/2026).
  const ct = (clube: string | null): number | null => (clube ? w.estruturaCT.get(clube) ?? null : null);
  const fora = new Set<Tecnico>();
  for (const t of w.tecnicos) {
    if (rng.pct(chanceAposentarPessoa(t.idade, t.clubeId !== null))) fora.add(t);
    else if (t.trabalho) evoluirPessoa(t.trabalho, t.idade, ct(t.clubeId), rng);
  }
  for (const t of fora) {
    w.tecnicos.splice(w.tecnicos.indexOf(t), 1);
    r.tecnicosAposentados += 1;
    if (t.clubeId === null) continue;
    const novo = w.tecnicos.filter((x) => x.clubeId === null).sort((a, b) => b.reputacao - a.reputacao)[0];
    if (!novo) continue;
    Object.assign(novo, { clubeId: t.clubeId, clube: t.clube, liga: t.liga });
    const g = mem.gestao.get(t.clubeId);
    if (g) trocarTecnico(g, novo, w.tatica);
    r.tecnicosTrocados.push(t.clubeId);
  }

  // Profissionais: aposentadoria e evolução anual; o livre de maior reputação no cargo assume.
  for (const [clube, g] of mem.gestao) {
    const ficam: Profissional[] = [];
    for (const p of g.comissao.profissionais) {
      if (!rng.pct(chanceAposentarPessoa(p.idade, true))) {
        evoluirPessoa(p.atributos, p.idade, ct(clube), rng);
        ficam.push(p);
        continue;
      }
      r.profissionaisAposentados += 1;
      const novo = w.profissionaisLivres.filter((x) => x.cargo === p.cargo).sort((a, b) => b.reputacao - a.reputacao)[0];
      if (novo) {
        w.profissionaisLivres.splice(w.profissionaisLivres.indexOf(novo), 1);
        ficam.push({ ...novo, contrato: p.contrato });
      }
    }
    g.comissao.profissionais = ficam;
  }
  w.profissionaisLivres = w.profissionaisLivres.filter((p) => {
    if (rng.pct(chanceAposentarPessoa(p.idade, false))) { r.profissionaisAposentados += 1; return false; }
    evoluirPessoa(p.atributos, p.idade, null, rng);
    return true;
  });

  // Saída do mundo (PROVISORIO): livre desde a virada anterior com nota até REPOSICAO.saidaNota (20 = todo livre); o dispensado da base já sai na subida.
  w.livres = w.livres.filter((j) => {
    const d = w.livreDesde.get(j.id);
    const sai = d !== undefined && d.ano < w.ano && (j.nota <= REPOSICAO.saidaNota || d.dispensado);
    if (sai) { r.saidasDoMundo += 1; w.livreDesde.delete(j.id); mem.evolucao.delete(j.id); }
    else if (!d) w.livreDesde.set(j.id, { ano: w.ano, dispensado: false });
    return !sai;
  });

  // 8. Reposição: o gerador completa os livres.
  const moldes = clubes.flatMap((c) => mem.elencos[c]);
  while (w.livres.length < REPOSICAO.jogadores) {
    const j = gerarLivre(moldes[rng.int(0, moldes.length - 1)], `LIVRE-G${++mem.seq}`, mem.nomes, rng);
    w.livres.push(j);
    w.livreDesde.set(j.id, { ano: w.ano, dispensado: false });
    r.gerados.jogadores += 1;
  }
  while (w.tecnicos.filter((t) => t.clubeId === null).length < REPOSICAO.tecnicos) {
    w.tecnicos.push(gerarTecnico(w.tecnicos[rng.int(0, w.tecnicos.length - 1)], mem.nomes, rng));
    r.gerados.tecnicos += 1;
  }
  const moldesPro = [...mem.gestao.values()].flatMap((g) => g.comissao.profissionais);
  while (w.profissionaisLivres.length < REPOSICAO.profissionais && moldesPro.length) {
    // Repõe o cargo com menos livres.
    const porCargo = new Map<string, number>();
    for (const p of moldesPro) porCargo.set(p.cargo, 0);
    for (const p of w.profissionaisLivres) porCargo.set(p.cargo, (porCargo.get(p.cargo) ?? 0) + 1);
    const cargo = [...porCargo].sort((a, b) => a[1] - b[1])[0][0];
    const opcoes = moldesPro.filter((p) => p.cargo === cargo);
    w.profissionaisLivres.push(gerarProfissional(opcoes[rng.int(0, opcoes.length - 1)], mem.nomes, rng));
    r.gerados.profissionais += 1;
  }
  r.livres = w.livres.length;
  return r;
}

/** Subida ao profissional: Integração do coordenador no Trabalho e na moral (PROVISORIO: moral 60 + (Integração − 10)); vira Cria da casa. */
function subir(mem: Memoria, clube: string, j: Jogador, integracao: number): void {
  const s = mem.evolucao.get(j.id)!;
  if (s.trabalho !== null) s.trabalho = limitarTrabalho(s.trabalho + (integracao - 10) * PERFIL.integracao);
  if (!j.qualidades.includes('Cria da casa')) j.qualidades.push('Cria da casa');
  j.tipo = 'Jovem';
  mem.elencos[clube].push(j);
  mem.jogadores.set(j.id, novoEstado(Math.round(MORAL.inicial + (integracao - 10))));
}

/** Técnico novo (GDD-gestao 2 e 3): progresso das táticas pela metade, Respaldo inicial do novo técnico. */
function trocarTecnico(g: ClubeGestao, novo: Tecnico, tatica: Tatica): void {
  g.tecnico = novo;
  g.semanas = tatica.estilos.find((s) => s.nome === novo.estilo)?.entrosamentoSemanas || 1;
  for (const t of g.treino.taticas.values()) t.progresso /= 2;
  g.respaldo = respaldoInicial(novo);
}

