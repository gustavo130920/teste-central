// Editor visual de táticas (5b4): monta a tela e aplica as edições sobre as funções de `taticaJogador.ts`.
import type { Jogador, Tatica } from '../../../motor/dados.ts';
import { ligarSemBola, previaDoOnze } from '../../../motor/escalacao.ts';
import { zonaDeCodigo } from '../../../motor/zonas.ts';
import type { Memoria } from '../../../temporada/memoria.ts';
import { TATICA_JOGADOR, apagarTatica, definirBatedor, definirInstrucao, duplicarTatica, editarTatica, estadoTatica, opcoesNaVaga, progressoDe, treinarTatica, usarTatica } from '../../../temporada/taticaJogador.ts';
import type { TaticaSalva } from '../../../temporada/taticaJogador.ts';
import type { ElencoEditTela, PedidoTatica, PlaqTela, ResultadoTatica, TaticaEditTela, TaticasTela } from './protocolo.ts';

const estadoDe = (mem: Memoria, j: Jogador, dia: number): ElencoEditTela['estado'] => {
  const e = mem.jogadores.get(j.id);
  if (e && e.voltaDia !== null && e.voltaDia > dia) return 'lesionado';
  if (e && Object.values(e.suspensao).some((n) => n > 0)) return 'suspenso';
  return 'ok';
};

function editTela(mem: Memoria, clube: string, tatica: Tatica, x: TaticaSalva, disponiveis: Jogador[], dia: number): TaticaEditTela {
  const estilo = tatica.estilos.find((e) => e.nome === x.estilo)!;
  const padrao = { ...estilo.padrao, ...x.padrao } as Record<string, string>;
  const com = tatica.formacoes.find((f) => f.nome === x.formacaoComBola)!.pecas;
  const sem = tatica.formacoes.find((f) => f.nome === x.formacaoSemBola)!.pecas;
  const onze = previaDoOnze(disponiveis, tatica, x.formacaoComBola, x.titulares);
  // Cada um dos 11 vai à vaga da formação sem a bola como o motor liga (só com o onze completo).
  const ligacao = onze.length === com.length ? ligarSemBola(com.map((p) => ({ pos: p.posicao, zona: zonaDeCodigo(p.zona) })), sem) : null;
  const plaq = onze.map(({ j, vaga }, i): PlaqTela => {
    const ps = ligacao ? sem[ligacao[i]] : null;
    const op = (fase: 'Com' | 'Sem') => opcoesNaVaga(j, vaga, fase, tatica, x).map((o) => ({ id: o.ins.id, nome: o.ins.nome, encaixe: o.encaixe, contraria: o.contraria, combina: o.ins.combina.includes(x.estilo), auxiliar: o.auxiliar, exige: o.ins.exige ?? null }));
    return {
      id: j.id, nome: j.nome, nota: j.nota, condicao: Math.round(mem.jogadores.get(j.id)?.condicao ?? 100), estado: estadoDe(mem, j, dia),
      vagaCom: vaga, zonaCom: com[i]?.zona ?? 'CE3', vagaSem: ps?.posicao ?? vaga, zonaSem: ps?.zona ?? com[i]?.zona ?? 'CE3',
      instrCom: x.instrucoes[j.id]?.Com ?? null, instrSem: x.instrucoes[j.id]?.Sem ?? null, opcoes: { Com: op('Com'), Sem: op('Sem') },
    };
  });
  return {
    nome: x.nome, estilo: x.estilo, formacaoComBola: x.formacaoComBola, formacaoSemBola: x.formacaoSemBola, padrao,
    ajustes: Object.entries(x.padrao).map(([k, v]) => `${k} ${v}`), entrosamento: progressoDe(mem, clube, tatica, x), batedores: { ...x.batedores },
    titularesManual: !!x.titulares?.length, onze: plaq,
  };
}

/** Jogadores que podem jogar: o editor mostra o onze real, sem lesionados e suspensos. */
const disponiveisDe = (mem: Memoria, clube: string, dia: number): Jogador[] => (mem.elencos[clube] ?? []).filter((j) => estadoDe(mem, j, dia) === 'ok');

export function taticasTela(mem: Memoria, clube: string, tatica: Tatica, dia: number): TaticasTela {
  const est = estadoTatica(mem, clube);
  const disp = disponiveisDe(mem, clube, dia);
  const atr = (j: Jogador, a: string) => (j.atributos as Record<string, number>)[a] ?? 0;
  return {
    taticas: est.taticas.map((x) => editTela(mem, clube, tatica, x, disp, dia)),
    ativa: est.ativa, treinar: est.treinar, max: TATICA_JOGADOR.max,
    estilos: tatica.estilos.map((e) => ({ nome: e.nome, padrao: { ...e.padrao } as Record<string, string>, resumo: e.resumo })),
    formacoes: tatica.formacoes.map((f) => f.nome),
    elenco: (mem.elencos[clube] ?? []).map((j) => ({
      id: j.id, nome: j.nome, posicao: j.posicao, nota: j.nota, condicao: Math.round(mem.jogadores.get(j.id)?.condicao ?? 100), estado: estadoDe(mem, j, dia),
      BP: atr(j, 'BP'), Comp: atr(j, 'Comp'), tracos: j.tracos,
    })).sort((a, b) => b.nota - a.nota || a.nome.localeCompare(b.nome)),
  };
}

export function agirTatica(mem: Memoria, clube: string, tatica: Tatica, dia: number, p: PedidoTatica): ResultadoTatica {
  const est = estadoTatica(mem, clube);
  let erro: string | null = null;
  const x = est.taticas[p.i];
  if (!x) erro = 'Tática inexistente.';
  else if (p.acao === 'editar') erro = editarTatica(mem, clube, tatica, p.i, { nome: p.nome, estilo: p.estilo, formacaoComBola: p.formacaoComBola, formacaoSemBola: p.formacaoSemBola, padrao: p.padrao });
  else if (p.acao === 'instrucao') definirInstrucao(mem, clube, p.jogador, p.fase, p.id, p.i);
  else if (p.acao === 'batedor') definirBatedor(mem, clube, p.tipo, p.jogador, p.i);
  else if (p.acao === 'titular') {
    if (!p.sai || !p.entra) erro = editarTatica(mem, clube, tatica, p.i, { titulares: null });
    else {
      const ids = previaDoOnze(disponiveisDe(mem, clube, dia), tatica, x.formacaoComBola, x.titulares).map((o) => o.j.id);
      if (!ids.includes(p.sai)) erro = 'Esse jogador não está no onze.';
      else if (ids.includes(p.entra)) erro = 'Esse jogador já está no onze.';
      else if (!disponiveisDe(mem, clube, dia).some((j) => j.id === p.entra)) erro = 'Esse jogador está lesionado ou suspenso.';
      else {
        const novo = ids.map((id) => (id === p.sai ? p.entra! : id));
        // O motor põe cada escolhido na vaga de melhor encaixe: sem vaga para a posição dele nesta formação, a troca não vale.
        if (!previaDoOnze(disponiveisDe(mem, clube, dia), tatica, x.formacaoComBola, novo).some((o) => o.j.id === p.entra)) erro = 'Não há vaga para a posição dele nesta formação.';
        else erro = editarTatica(mem, clube, tatica, p.i, { titulares: novo });
      }
    }
  } else if (p.acao === 'duplicar') erro = duplicarTatica(mem, clube, p.i);
  else if (p.acao === 'apagar') erro = apagarTatica(mem, clube, p.i);
  else if (p.acao === 'usar') usarTatica(mem, clube, tatica, p.i);
  else treinarTatica(mem, clube, p.i);
  return { erro, tela: taticasTela(mem, clube, tatica, dia) };
}
