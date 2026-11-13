// Números do motor. GDD = vem do GDD-motor.md. PROVISORIO = o GDD não dá o número; confirmado em 09/11/2026
// (ver etapa 2 no PLANEJAMENTO.md): parte espera a Gestão, parte será calibrada no simulador-balanceamento.
import type { Atributo } from './dados.ts';

export type AcaoDisputa = 'passeCurto' | 'passeProfundidade' | 'lancamento' | 'conducao' | 'drible' | 'cruzamento';
export type Acao = AcaoDisputa | 'finalizacao';
export type TipoChute = 'area' | 'longe' | 'cabeceio' | 'caraACara' | 'falta';

export const GDD = {
  // Seção 1
  cadeiasBase: 18,
  blocos: 6,
  blocosComAcrescimo: [3, 6],
  // Seção 2
  maxElos: 6,
  passesResumida: [4, 10],
  duracaoResumida: [30, 60],
  duracaoPorElo: 8,
  // Seção 3
  pontosPorAtributo: 1.5,
  chanceMin: 5,
  chanceMax: 95,
  pontosPorJogador: 3,
  numerosMax: 12,
  defensorAusente: 5,
  modsMax: 5,
  acoes: {
    passeCurto: { atk: ['Pas', 'Dec', 'Comp'], def: ['Pos', 'Comb'], base: 85 },
    passeProfundidade: { atk: ['Pas', 'Vis'], def: ['Pos', 'Conc'], base: 38 }, // calibrado (GDD 9), era 45
    lancamento: { atk: ['Pas', 'Vis'], def: ['Pos', 'Cab'], base: 35 }, // calibrado, era 40
    conducao: { atk: ['Dom', 'Vel'], def: ['Pos', 'Vel'], base: 62 }, // calibrado, era 70
    drible: { atk: ['Dri', 'Agi'], def: ['Des', 'Agi'], base: 45 }, // calibrado, era 50
    cruzamento: { atk: ['Cru', 'Dec'], def: ['Pos', 'Cab'], base: 30 }, // calibrado, era 35
  } as Record<AcaoDisputa, { atk: Atributo[]; def: Atributo[]; base: number }>,
  falha: { perda: 60, falta: 22, fora: 18 },
  chutes: {
    area: { atk: ['Fin', 'Comp'], gol: ['Ref', 'Mao'], ajuste: 1 },
    longe: { atk: ['Lon', 'Comp'], gol: ['Ref', 'Mao'], ajuste: 1 },
    cabeceio: { atk: ['Cab', 'Imp'], gol: ['Aer', 'Com'], ajuste: 0.7 },
    caraACara: { atk: ['Fin', 'Comp'], gol: ['Sai', 'Ref'], ajuste: 1.5 },
    falta: { atk: ['BP'], gol: ['Ref', 'Mao'], ajuste: 1 },
  } as Record<TipoChute, { atk: Atributo[]; gol: Atributo[]; ajuste: number }>,
  escalaZona: 0.8, // calibração (GDD 9): multiplica a tabela de chance por zona; 1 = tabela do GDD
  chancePorPontoGoleiro: 0.06,
  chuteComMarcador: 0.7,
  chuteSemMarcador: 1.3,
  chuteMin: 1,
  chuteMax: 60,
  chancePeFraco: 25,
  tracoBom: 2,
  tracoRuim: -1,
  tracoMinimo: 10,
  // Seção 10
  bloqueadoComMarcador: 25,
  paraFora: 60,
  traveDasSemGol: 8,
  golContraEmCruzamento: 3,
  impedimentoEmFalha: 15,
  falhaGoleiroChanceMax: 8,
  // Seção 2 (contra-ataque)
  foraDePosicaoMin: 3,
  retornoMax: 2,
  // Seção 4
  sinergia: {
    liberaAtaca: 8,
    atraiAtaca: 6,
    congestionamento: 5,
    congestionamentoMax: 15,
    brecha: { '0': 0, P: 4, M: 8, G: 12 } as Record<string, number>,
    coberturaVizinha: 0.5,
    limiteAutomatico: 15,
    limiteComCombinacao: 25,
    eficaciaMinCombinacao: 0.5,
  },
  // Seção 5
  blocoBaixo: 7,
  blocoAlto: 15,
  confronto: { eixoMax: 6, viabilidadeMax: 3, somaMax: 10, peso: 3 },
  // Seção 6
  energia: {
    base: 7, fisicoBase: 0.7, fisicoPasso: 0.03, resistencia: 0.25, minimo: 3,
    custo: { '0': 0, P: 0.5, M: 1, G: 2 } as Record<string, number>,
    cobrir: 0.5, distancia: 0.5, preguicoso: 0.5, limiarEfeito: 70, passoEfeito: 15,
  },
  impeto: { gol: 30, golSofrido: -20, defesaDificil: 10, decaimento: 10, ganhoCasa: 1.25, perdaGelo: 0.75, idolo: 10, faltaDura: 10, penaltiPerdido: -25, penaltiPerdidoOutro: 20 },
  liderQuedaMoral: 0.75,
  preguicosoPeso: 0.8, // Anexo A
  fogo: { base: 30, porPonto: 3, porSituacao: 10, min: 10, max: 85, impetoBaixo: -25, sucesso: 35, falha: 20, contaPropria: 5 },
  // Seção 1
  substituicoes: 5,
  blocoIntervalo: 3,
  // Seção 8
  bolaParada: {
    estilo: 2, chegaBase: 40, dueloBase: 45, tracoAereo: 2, diretaF4: 7, diretaF5: 12, faltaEmF6: 3 /* calibrado, era 8 */, cavaFaltas: 10,
    penalti: { base: 76, porPonto: 1.5, min: 55, max: 92, traco: 2 },
  },
  decisivo: { bonus: 2, minuto: 75, difMax: 1 }, // Anexo A
  cartoes: {
    comum: { amarelo: 20, vermelho: 1 }, ultimoDefensor: { amarelo: 40, vermelho: 15 },
    esquentadoAmarelo: 1.5, esquentadoVermelho: 2, indisciplinadoAmarelo: 1.25, marrentoAmarelo: 1.25, // Anexo A
    revide: 10, revideAmarelo: 75, amareladoDesarme: -1, impetoTecnico: -50,
  },
  dividida: { limiar: 25, apertado: -5, minutoApertado: 75, goleada: 15, emF6: 10, combatividade: 15, porCombatividade: -3, porDefeito: -5, vermelho: 85 },
  goleiroImprovisado: 3,
  banco: 9,
  lesao: {
    base: 0.4, propensaoBase: 0.5, propensaoDiv: 10, // 0,4% × (0,5 + Propensão ÷ 10), por jogador e por bloco
    energia: [{ abaixo: 25, fator: 3 }, { abaixo: 40, fator: 2 }], // do menor limite para o maior
    faltaDuraExtra: 1,
    gravidade: { leve: 60, media: 30, grave: 10 },
    semanas: { leve: [1, 2], media: [3, 6], grave: [8, 24] } as Record<'leve' | 'media' | 'grave', [number, number]>,
    levePena: -1,
    leveEnergia: -10,
  },
  // Anexo A
  fominha: { faixaMin: 4, individual: 1.3, passe: 0.8 },
  firuleiro: { drible: 1.2, dribleVencendo: 1.5, difVencendo: 2, pena: -1, faixaPenaMax: 3 },
  inseguroClassico: -1,
  indisciplinadoEficacia: -0.1,
} as const;

/** Chance de gol por zona, na visão de quem ataca (GDD 3). */
export function chanceDaZona(corredor: number, faixa: number): number {
  const centro = corredor === 2;
  const lado = corredor === 0 || corredor === 4;
  if (faixa === 6) return centro ? 32 : lado ? 5 : 18;
  if (faixa === 5) return centro ? 14 : lado ? 5 : 8;
  return 3; // F4
}

/** Traço que descreve a ação (GDD 3). Só os que nomeiam a ação com clareza. */
export const TRACO_DA_ACAO: Record<string, AcaoDisputa | TipoChute | 'escanteio'> = {
  'Batedor de escanteio': 'escanteio',
  'Cobrador de falta': 'falta',
  Tabelinha: 'passeCurto',
  'Passe em profundidade': 'passeProfundidade',
  'Lançamento longo': 'lancamento',
  'Encara o marcador': 'drible',
  'Vai ao fundo': 'cruzamento',
  'Chuta de fora': 'longe',
  Cabeceador: 'cabeceio',
  'Frio no 1x1': 'caraACara',
};

export const PROVISORIO = {
  /** Peso de cada ação por faixa, antes de filtrar o que é possível na zona. */
  pesoAcao: {
    1: { passeCurto: 70, passeProfundidade: 8, lancamento: 12, conducao: 10, drible: 0, cruzamento: 0, finalizacao: 0 },
    2: { passeCurto: 65, passeProfundidade: 10, lancamento: 10, conducao: 13, drible: 2, cruzamento: 0, finalizacao: 0 },
    3: { passeCurto: 60, passeProfundidade: 14, lancamento: 4, conducao: 14, drible: 4, cruzamento: 0, finalizacao: 0 },
    4: { passeCurto: 46, passeProfundidade: 6, lancamento: 1.5, conducao: 12, drible: 9, cruzamento: 6, finalizacao: 8 },
    5: { passeCurto: 40, passeProfundidade: 4, lancamento: 0, conducao: 6, drible: 12, cruzamento: 14, finalizacao: 16 },
    6: { passeCurto: 20, passeProfundidade: 0, lancamento: 0, conducao: 0, drible: 6, cruzamento: 6, finalizacao: 50 },
  } as Record<number, Record<Acao, number>>,
  finalizacaoNoLado: 0.4,
  cruzamentoNoLado: 2,
  pesoTracoNaAcao: 1.5,
  baseProgressaoResumida: 45, // teste único da posse resumida até a F4 (GDD 2 não dá a base)
  // Destino
  pesoPresencaDestino: 1,
  verticalidadePorFaixa: 0.05, // peso × (1 + (Verticalidade − 10) × isto) para destinos à frente
  destinoParaTras: 0.6,
  larguraAberta: 1.25,
  larguraEstreita: 0.75,
  // Falha
  driblePuxaFalta: 8,
  combatividadeAlta: 15,
  combatividadePuxaFalta: 5,
  altoPuxaFora: 15,
  // Bola fora na F6: tiro de meta ou escanteio
  escanteioEmForaF6: 85,
  bloqueioViraEscanteio: 85,
  // Defesa
  seguraBase: 45,
  seguraPorPonto: 3,
  seguraMin: 15,
  seguraMax: 85,
  reboteDoRestante: 25,
  defesaDificilChance: 13,
  // Acréscimos: min(2, gols + lesões + faltas ÷ este valor)
  faltasPorAcrescimo: 3,
  // Texto
  furadaMediaMax: 8,
  furadaChance: 15,
  maoBaixa: 10,
  // 2ª fatia: etiquetas e sinergias
  entrosamentoInicial: 1, // sem treino ainda; a IA treina até completar (GDD Gestão 2)
  presencaEtiqueta: 0.5, // presença total que uma etiqueta move, dividida entre as zonas dela, × eficácia
  atraiPesoMarcador: 0.5, // presença que o marcador atraído perde na zona, × eficácia
  sinergiaNoDestino: 0.03, // peso do destino × (1 + Chance criada × isto)
  sinergiaNoDestinoMin: 0.1,
  brechaMax: 15, // o GDD limita sinergias, não brechas somadas
  // 2ª fatia: o que cada nota faz (GDD 5 diz o quê, sem o quanto)
  pressaoRouboPorNota: 0.3, // pontos de roubo em F1 a F3 por nota de Pressão acima de 10
  posseNoPasseCurto: 0.03, // peso do passe curto × (1 + (Posse − 10) × isto)
  posseNaDuracao: 0.02, // duração da cadeia × (1 + (Posse − 10) × isto)
  verticalidadeNaProfundidade: 0.05, // peso do passe em profundidade × (1 + (Verticalidade − 10) × isto)
  riscoAlto: 15, // daqui para cima, quem sai do lugar demora 1 elo a mais para voltar
  riscoBaixo: 7, // daqui para baixo, 1 elo a menos
  // Fora de posição na perda (aprovado em 09/11/2026): sorteio por jogador de linha, a calibrar
  foraDePosicao: { chancePorDistancia: [5, 12, 40, 75], porNotaRisco: 3 }, // % por distância entre os mapas (0, 1, 2, 3+) + pontos por nota de Risco acima de 10
  // 3ª fatia: entradas que virão da Gestão
  energiaInicial: 100,
  moralInicial: 60, // faixa neutra da tabela de moral
  recuperacaoIntervalo: 8, // GDD: 6 a 12 pelo preparador; 8 é o usado no exemplo da seção 6
  fatorCasaBase: 1, // sem humor e ocupação ainda
  fatorCasaPorTorcida: 0.1,
  // 3ª fatia: moral ("muda pouco", GDD 6)
  moralGolTime: 2,
  moralGolAutor: 5,
  moralGolSofrido: -2,
  moralFalha: -5,
  moralVaia: -2,
  // 3ª fatia: IA nas pausas
  degrausMax: 1, // quanto o técnico se afasta do padrão do estilo durante o jogo
  eixoPerdidoMin: 1, // pontos de vantagem do adversário para o eixo contar como perdido
  atributoTecnicoSemDado: 10, // técnicos da Europa e livres sem esses atributos nos dados
  trocaMinuto: 60, // GDD 7
  trocaEnergia: 65, // GDD 7, era 50 (a IA quase não trocava)
  falaErrada: -10, // GDD 7
  // 3ª fatia: quando o ímpeto vira narração
  impetoNarraAlto: 50,
  impetoNarraBaixo: -50,
  impetoViraClima: 25,
  impetoFraseAlta: 50,
  impetoFraseBaixa: -25,
  // 4ª fatia: entradas que virão da Gestão (comissão)
  ensaiadaAnalista: 0, // GDD: 0 a +3
  estudoBatedores: 0, // GDD: 0 a 3 pontos
  // 4ª fatia: bola parada
  duracaoBolaParada: 25,
  disputamNoAlto: 3, // sobem na área os 3 melhores pelo alto; sorteia um de cada lado
  afastadaRecupera: 70, // bola não chega ou duelo perdido: recuperação da defesa; o resto é lateral para o ataque
  cobrancaDireta: 25, // % das faltas perigosas batidas direto, para chegar perto de 1,5 por jogo (GDD 8); o resto é cruzamento na área
  penaltiDefendido: 65, // % dos pênaltis sem gol que o goleiro defende; o resto vai para fora
  lateralLongoMin: 14, // Força e Passe, só muda o texto (GDD 10)
  // 4ª fatia: cartões (GDD 8 só diz que aumentam ou reduzem)
  cartaoCombatividade: 1.25,
  cartaoDesarmeLimpo: 0.75,
  moralCartao: -3,
  reclamacao: 25, // % dos cartões com reclamação narrada
  tecnicoExpulso: { 'Linha-dura': 6, 'Paizão': 2, Gestor: 1, semDado: 2 } as Record<string, number>, // % por bloco com ímpeto abaixo de -50
  // 5ª fatia: lesões
  preparadorLesao: 1, // Prevenção de lesões do preparador (GDD: × 1,2 a × 0,7); neutro até a Gestão
} as const;

/** Comissão e treino neutros: o motor sem a Gestão (etapas 2 e 3). */
export const APOIO_NEUTRO = {
  entrosamento: PROVISORIO.entrosamentoInicial,
  recuperacaoIntervalo: PROVISORIO.recuperacaoIntervalo,
  prevencao: PROVISORIO.preparadorLesao,
  ensaiada: PROVISORIO.ensaiadaAnalista,
  estudoBatedores: PROVISORIO.estudoBatedores,
  menosGasto: 0,
  quedaMoral: 1,
  respaldo: 100,
};

/** GDD 7: Respaldo do elenco nos ajustes da pausa. Decisão do Gustavo (13/11/2026): eficácia das instruções do time × 0,9 no bloco seguinte. */
export const RESPALDO = { fraco: 40, recusa: 15, fator: 0.9 } as const;
