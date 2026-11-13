# GDD: gestão

Complementa `GDD-motor.md`. Fonte das decisões de base: `PLANEJAMENTO.md`.

## Decisões iniciais (aprovadas em 09/11/2026)
| # | Tema | Decisão |
|---|---|---|
| 1 | Unidade de tempo | Ciclo entre jogos: uma tela de decisões por jogo, com semanas de 1 ou 2 jogos |
| 2 | Treino | Por ciclo: 1 carga (leve, normal, pesada) e 1 foco |
| 3 | Jogos dos outros clubes | Mesmo motor completo, sem atalho. A Champions segue só simulada |
| 4 | Demissão | O jogo continua: o jogador fica livre e recebe propostas conforme a reputação |
| 5 | Início de carreira | Escolha livre entre os 30 clubes brasileiros; origem do técnico e reputação definem metas e paciência iniciais |
| 6 | Janelas de transferência | 2 por temporada (início e meio do ano), com livres a qualquer momento |
| 7 | Últimos da Série B | Sem queda, pois não há Série C; perdem cota de TV e sofrem mais pressão da diretoria |
| 8 | Europa | Compra jogadores, e os clubes europeus renovam elenco a cada temporada |

## Seções
1. Calendário e ciclo entre jogos (aprovada)
2. Treino: condição física, táticas, entrosamento, treino individual (aprovada)
3. Moral e Respaldo do elenco (aprovada)
4. Lesões: tempos, departamento médico, recaída (aprovada)
5. Evolução, envelhecimento, base e perfis de jovem (aprovada)
6. Mercado: neblina, negociação, contratos, empresários, lealdade x ambição (aprovada)
7. Finanças e comercial: ingresso, sócio, patrocínio, SAF (aprovada)
8. Comissão: contratos, efeito da estrutura, delegação (aprovada)
9. Diretoria e torcida: metas, confiança, eleição, demissão (aprovada)
10. Eventos e imprensa no ciclo (aprovada)
11. Mundo: IA dos clubes, virada de temporada, aposentadorias, Europa (aprovada)
12. Metas de calibração (aprovada)

## 1. Calendário e ciclo entre jogos (aprovada)
**Ano de 52 semanas.**
| Semanas | Fase | O que acontece |
|---|---|---|
| 1 a 4 | Pré-temporada | Treino sem jogo oficial e até 2 amistosos opcionais |
| 5 a 48 | Temporada | 44 semanas de competições |
| 49 a 52 | Virada | Uma tela só, sem ciclos (seção 11) |

**Janelas.** Janela 1 nas semanas 1 a 8; janela 2 nas semanas 26 a 29. Jogadores livres podem assinar a qualquer momento.

**Datas por competição.** Ligas no fim de semana, copas no meio de semana.
| Competição | Datas | Quando |
|---|---|---|
| Série A | 38 | Fins de semana; 6 semanas livres espalhadas, no máximo 2 seguidas; termina até a semana 47 |
| Série B e ligas sul-americanas | 18 | Uma rodada a cada 2 semanas |
| Copa do Brasil | Até 9 | Meio de semana: 1ª fase em jogo único, depois 4 fases de ida e volta |
| Libertadores | Até 12 | Meio de semana: 6 de grupo, depois quartas, semi e final de ida e volta |
| Champions | Só simulada | Resultado aparece nas notícias |
| Mundial | 1 | Semana 48 |

Um clube joga até 60 partidas na Série A e até 27 na Série B, salvo classificação à Libertadores. Máximo de 2 jogos por semana. Não há datas de seleção nem estaduais na v1.

**Tipos de ciclo.** O ciclo vai do fim de um jogo até o próximo. O tipo define recuperação e efeito do treino (seção 2).
| Tipo | Dias até o próximo jogo |
|---|---|
| Curto | Até 3 |
| Normal | 4 a 7 |
| Longo | 8 ou mais |

**Ordem da tela do ciclo.**
1. Resultado: relatório, notas, lesões e placares da rodada.
2. Notícias, eventos pendentes e coletiva (seção 10).
3. Treino: carga e foco (seção 2).
4. Mercado, contratos e comissão, com negociações em andamento.
5. Próximo jogo: relatório do adversário, tática e escalação.
6. Jogar.

**Nenhum ciclo obriga decisão.** O botão "Avançar" mantém o treino e a tática, e o auxiliar corrige a escalação se houver lesão ou suspensão. Delegação completa na seção 8.

**Prazos.** Tudo que espera resposta anda por ciclo: cada rodada de negociação leva 1 ciclo. Em semana de 2 jogos, as respostas chegam mais rápido.

**Rodada e mundo.** Todos os jogos da mesma data rodam juntos, com o motor completo e semente própria. Nas pausas, o jogador vê os placares parciais dos outros jogos daquela competição.

**Ritmo (referência, medir no protótipo).** Ciclo de 1 a 3 minutos e partida de 5 a 10 minutos. Temporada completa de Série A com copas: de 6 a 10 horas.

## 2. Treino (aprovada)
**Decisão do ciclo.** 1 carga e 1 foco. Semana de 2 jogos tem 2 ciclos curtos, e cada um vale metade: treinar todos soma o mesmo de uma semana normal.

**Carga.**
| Carga | Recuperação | Ganho de treino | Risco de lesão (seção 4) |
|---|---|---|---|
| Leve | +8 | × 0,6 | × 0,8 |
| Normal | 0 | × 1,0 | × 1,0 |
| Pesada | -10 | × 1,4 | × 1,3 |

**Efeito do ciclo no ganho de treino.** Curto × 0,5 · Normal × 1,0 · Longo × 1,5. Na pré-temporada, todos os ciclos são Normais, com ganho × 1,5.

**Condição física.** De 0 a 100. É a energia inicial do jogo seguinte (motor, seção 6).

`Condição = energia ao fim do jogo + recuperação do ciclo`, com máximo de 100.
| Parcela | Valor |
|---|---|
| Base do ciclo | Curto 25 · Normal 40 · Longo 60 |
| Carga | Tabela acima |
| Recuperação do preparador físico | (Recuperação − 10) × 0,5 |
| Resistência do jogador | (Resistência − 10) × 0,3 |
| 32 anos ou mais | -4 |

- **Quem não jogou:** soma a recuperação sobre a condição que já tinha.
- **Ritmo de jogo:** 4 ciclos seguidos sem jogar limitam a condição a 90. Um amistoso ou jogo oficial retira o limite.
- **Pré-temporada:** todos começam com 60.
- **Exemplo:** volante termina com 41, ciclo Curto, carga Normal, preparador com Recuperação 14 e Resistência 10: 41 + 25 + 2 = 68. Gastando 11,2 por bloco, tem -1 no bloco 3 e -3 no bloco 6. Em ciclo Normal, começa com 83 e chega ao bloco 6 com -2. Estilos de Físico alto obrigam a rodar o elenco em semana de 2 jogos.

**Focos.**
| Foco | Efeito | Quem pesa |
|---|---|---|
| Tática | Entrosamento da tática escolhida | Treino Tático do técnico e do auxiliar |
| Físico | Atributos físicos (seção 5) e -0,3 a -0,7 no gasto de energia por bloco do próximo jogo | Condicionamento do preparador |
| Técnico | Atributos técnicos e mentais (seção 5) | Treino técnico do auxiliar |
| Bola parada | +0,5 a +1,5 em Bola Parada no próximo jogo | Bola parada ensaiada do analista |
| Adversário | Relatório pré-jogo completo, sem bônus no valor | Profundidade do analista |

**Entrosamento.** `0,7 + 0,3 × progresso ÷ semanas do estilo` (`dados/tatica/estilos.md`), com máximo de 1,0.
- **Ganho com foco Tática:** 1,0 de progresso × carga × ciclo × `(0,8 + média de Treino Tático ÷ 50)`. A média soma técnico e auxiliar.
- **Jogar com a tática:** +0,2 de progresso por partida, sem precisar do foco.
- **Tática é o par estilo + formação.** Mudar instruções não zera o progresso.
- **Técnico novo:** o progresso de todas as táticas cai pela metade.
- **Recém-chegado:** × 0,9 na eficácia das instruções nas 4 primeiras semanas.

**Mais de uma tática.** O clube guarda até 3 táticas. O foco Tática dá 100% à escolhida e 25% às outras. Tática sem treino nem jogo por 8 ciclos perde 0,1 de progresso por ciclo. "Já treinada", para o Plano B (motor, seção 7), significa entrosamento de 0,85 ou mais.

**Treino individual.** Até 3 planos ao mesmo tempo; 4 com Treino técnico do auxiliar em 16 ou mais. Não usa o foco do ciclo. O progresso segue carga e ciclo.
| Plano | Base | Regra |
|---|---|---|
| Aprender traço | 12 semanas | 8 até 21 anos; × 1,5 com 28 ou mais; respeita o limite de traços |
| Nova posição secundária | 16 semanas | Vira familiaridade 0,85 (motor, seção 3) |
| Atributo específico | Seção 5 | Direciona a evolução |

**Comissão e IA.** A estrutura do clube multiplica esses efeitos (seção 8). Os clubes da IA seguem as mesmas regras: carga Leve em ciclo Curto e Normal nos demais, com foco Tática até completar o entrosamento.

## 3. Moral e Respaldo do elenco (aprovada)
**Moral do jogador.** De 0 a 100 (motor, seção 6). Começa em 60; recém-contratado, em 65. A cada ciclo, anda 2 pontos em direção a 55.

**Mudanças depois do jogo.** Só para quem está no elenco relacionado, salvo Minutos.
| Fato | Moral |
|---|---|
| Vitória | +4 |
| Derrota | -4 |
| Clássico, decisão ou placar de 3 gols ou mais | Resultado × 1,5 |
| Nota 7,5 ou mais | +3 |
| Nota 5,0 ou menos | -3 |
| Foi titular | +1 |
| Minutos: 3 ciclos seguidos sem ser titular, entre as 6 melhores notas do elenco e com mais de 21 anos | -3 por ciclo |

**Durante o jogo, por bloco.** Gol +3 · erro que vira gol -3 · expulsão -5 · vaia -2.

**Eventos e imprensa.** Usam P/M/G. Na moral de 0 a 100: P = 5, M = 10, G = 20. "Entrosamento" de eventos é porcentagem do progresso da tática.

**Quem pesa.**
| Fonte | Efeito |
|---|---|
| Motivação do técnico | Ganhos × `(0,8 + Motivação ÷ 50)` |
| Gestão emocional do psicólogo | Quedas × `(1 − Gestão emocional ÷ 50)` |
| Paizão | Queda por Minutos × 0,75 |
| Linha-dura | Ganho por vitória -1; queda por derrota -1 a menos em jogador com Disciplina Tática 14 ou mais |
| Gestor | Nenhum |

**Moral do grupo.** Média da moral do elenco, com peso 2 para quem foi titular em metade ou mais dos jogos e para Líder de vestiário.

**Respaldo do elenco.** De 0 a 100 (motor, seção 7). Técnico novo começa em `55 + (Reputação − 10)`. A cada ciclo, anda 20% da distância até o alvo:

`Alvo = moral do grupo + (Gestão de Grupo − 10) × 2 + marcas e fatos`
| Marca ou fato | Alvo |
|---|---|
| Grupo rachado | -15 |
| Promessa quebrada, por promessa ativa | -5, até -15 |
| Líder de vestiário com moral de 50 ou mais | +5 |
| Líder de vestiário com moral de 30 ou menos | -10 |
| Título na temporada | +10 |

- **Duração das marcas:** 12 semanas, se nenhum evento as encerrar antes.
- **Exemplo:** moral do grupo 40 e Gestão de Grupo 12 dão alvo 44, sem efeito. Com grupo rachado, cai para 29 e os ajustes rendem 10% menos. A recusa, abaixo de 15, pede crise real: moral 30, Gestão de Grupo 8, grupo rachado e promessa quebrada dão alvo 6.
- **Técnicos da IA:** mesma conta.

## 4. Lesões (aprovada)
Gravidade e faixas de tempo vêm do motor (seção 8): Leve 1 a 2 semanas, Média 3 a 6, Grave 8 a 24. Esta seção define o que muda esse tempo e o que acontece na volta.

**Lesão no treino.** Sorteio para cada jogador, por ciclo.

`0,1% × (0,5 + Propensão a Lesão ÷ 10) × carga × preparador`, e × 2 com condição abaixo de 50. Só Leve (80%) ou Média (20%).

**Tempo fora.** Sorteado na faixa da gravidade, depois multiplicado:
| Fator | Valor |
|---|---|
| Tratamento do médico | × `(1,25 − Tratamento ÷ 40)`: de × 1,23 a × 0,75 |
| 23 anos ou menos | × 0,9 |
| 32 anos ou mais | × 1,2 |

O tempo corre em dias do calendário: ciclo curto cura menos que ciclo longo.

**Diagnóstico.** O jogador vê uma previsão em faixa, não o tempo exato. Margem de ± `(20 − Diagnóstico) × 3%`. Com Diagnóstico 20, a previsão é exata.

**Volta.** Retorna com condição 70 e 1 ciclo de Ritmo de jogo limitado a 90.

**Recaída.** Vale nas 4 semanas seguintes à volta, por jogo.

`Risco = base × (1,5 − Readaptação ÷ 20)`
| Gravidade original | Base |
|---|---|
| Leve | Sem recaída |
| Média | 3% |
| Grave | 6% |

A recaída repete a gravidade, com tempo de 50% a 100% do original.

**Antecipar a volta.** Decisão do técnico, quando faltam 2 semanas ou mais. Corta 25% do tempo restante e multiplica o risco de recaída por 2,5. O médico mostra o risco antes da decisão. A IA só antecipa em mata-mata, das quartas em diante.

**Marcas da lesão grave.**
- **Propensão a Lesão:** +1, até 20.
- **Sequela:** 20% de chance de -1 permanente em Velocidade ou Agilidade; 10% com Readaptação de 16 ou mais.
- **Moral:** -5 em lesão Média e -10 em Grave, ao acontecer.

**Referência.** Com as taxas do motor, um clube de Série A com copas tem cerca de 2 desfalques por lesão ao mesmo tempo, em média. O `simulador-balanceamento` confere.

## 5. Evolução, envelhecimento e base (aprovada)
**Evolução.** A cada 4 semanas, o jogador acumula pontos. Cada 1,0 acumulado vira +1 em um atributo. A nota acompanha a média dos atributos-chave da posição e nunca passa do Potencial.

`Ganho = base da idade × minutos × treino × comissão × moral × (Pot − Nota) ÷ 2`, com o último fator limitado a 1.
| Idade | Base | | Minutos no período | Fator |
|---|---|---|---|---|
| Até 18 | 0,9 | | 50% ou mais | × 1,2 |
| 19 a 21 | 0,75 | | 10% a 49% | × 1,0 |
| 22 a 24 | 0,35 | | Menos de 10% | × 0,5 |
| 25 a 28 | 0,1 | | | |
| 29 ou mais | 0 | | | |

| Fator | Valor |
|---|---|
| Treino | Média do ganho de treino dos ciclos (carga × ciclo, seção 2) |
| Comissão | × `(0,8 + Treino técnico ÷ 50)`; até 21 anos, também × `(0,8 + Desenvolvimento de Jovens ÷ 50)` |
| Exemplo profissional no elenco | × 1,1 até 21 anos; não acumula |
| Moral | 71 ou mais: × 1,1; até 20: × 0,8 |

**Para onde vão os pontos.** 70% nos atributos-chave da posição e 30% nos demais. O foco mais usado no período puxa para a área: Técnico para técnicos e mentais, Físico para físicos. O plano "Atributo específico" (seção 2) leva 40% dos pontos para o atributo escolhido.

**Envelhecimento.** A cada 4 semanas, chance de -1 em um atributo físico:
| Idade | Chance |
|---|---|
| 30 e 31 | 10% |
| 32 e 33 | 20% |
| 34 e 35 | 30% |
| 36 ou mais | 40% |

- **Condicionamento do preparador:** × `(1,25 − Condicionamento ÷ 40)` na chance.
- **Goleiros:** usam a idade menos 3 anos.
- **Mentais:** de 29 anos em diante, 5% de chance de +1 em um atributo mental a cada 4 semanas.
- **Aposentadoria:** seção 11.

**Perfis de jovem.** Até 21 anos, o jogador tem um Trabalho do perfil, entre 5 e 95, que começa em 50. Muda a cada 13 semanas:
| Fonte | Trabalho |
|---|---|
| Base | -1 |
| Formação de jovens do psicólogo | (Formação − 10) × 0,5 |
| Formação do coordenador da base | (Formação − 10) × 0,2 |
| Mentor no elenco (Exemplo profissional ou Líder) | +2 |
| Minutos: 10% ou mais / menos de 10% | +1 / -1 |
| Moral do grupo: 60 ou mais / até 35 | +1 / -2 |

**Resultado aos 22 anos.** Sorteio único:
| Resultado | Chance | Efeito |
|---|---|---|
| Bem trabalhado | Trabalho × 0,7% | Qualidade do perfil (Bloco 4) e +1 em Pot |
| Mal trabalhado | (100 − Trabalho) × 0,5% | Defeito do perfil e -1 em Pot, sem ficar abaixo da nota |
| Nenhum | O restante | Fica sem qualidade nem defeito |

Exemplos: Trabalho 95 dá 66% de bem e 3% de mal; 50 dá 35% e 25%; 15 dá 11% e 43%. Ídolo exige 5 anos de clube e jogos marcantes.

**Base.** Time próprio, não jogável na v1. A safra chega na semana 1, gerada em código.
| Item | Regra |
|---|---|
| Jovens por safra | `3 + estrutura da base ÷ 5`, arredondado para baixo |
| Idade | 16 ou 17 |
| Potencial médio | `8 + estrutura da base × 0,2 + Captação × 0,15`, ± 4 |
| Joia (Pot 17 ou mais) | `2% + (estrutura da base + Captação) × 0,2%` por jovem |
| Nota inicial | Pot − 4 a Pot − 7 |
| Perfil | Sorteado entre os 4, em partes iguais |

- **Na base:** minutos contam como 50% ou mais, com Ganho × 0,6.
- **Subir ao profissional:** decisão do técnico. A Integração do coordenador dá `(Integração − 10) × 1` de Trabalho e ajuda a moral na subida.
- **Prazo:** aos 20 anos, quem não subiu sai livre.
- **Cria da casa:** só para quem subiu da base do clube.

**IA.** Mesmas regras; os clubes sobem os melhores conforme a preferência do técnico por jovens ou veteranos.

## 6. Mercado (aprovada)
**Neblina.** O jogador vê faixas, não números exatos.
| Conhecimento | Atributos e nota | Potencial | Traços |
|---|---|---|---|
| Sem relatório | Nota ± 4 | Oculto | Ocultos |
| 1 relatório | ± `(21 − Precisão) ÷ 4` | ± `(21 − Precisão) ÷ 3`, com olheiro de potencial | Visíveis |
| 2 ou mais relatórios | Metade da margem | Metade da margem | Visíveis |
| No próprio clube há 8 semanas | Exatos | Margem do olheiro de potencial | Visíveis |

- **Alcance:** cada olheiro entrega `Alcance ÷ 2` relatórios a cada 4 semanas, arredondado para cima.
- **Olheiro de jovens:** a cada 4 semanas, indica 1 jovem; com chance de `Faro × 3%`, ele é um talento escondido (Pot 15 ou mais).
- **Ocultos:** Consistência, Jogos Grandes e Propensão a Lesão nunca aparecem como número. O relatório traz só uma frase.

**Valor de mercado.** Recalculado a cada 4 semanas pela tabela de nota e pelos multiplicadores do gerador de elenco.
| Situação | Valor |
|---|---|
| Menos de 12 meses de contrato | × 0,6 |
| Nota média de 7,5 ou mais nos últimos 8 jogos | × 1,2 |
| Nota média de 5,5 ou menos nos últimos 8 jogos | × 0,8 |

**Regras do mercado.** Compras só nas janelas da seção 1. Elenco de 18 a 30 jogadores, sem limite de estrangeiros na v1. A diretoria define orçamento de transferências e teto de folha (seção 9).

**Negociação com o clube.** Cada rodada leva 1 ciclo, com até 3 rodadas. A chance aparece antes de confirmar, e o sorteio decide entre aceitar e fazer contraproposta. Na 3ª recusa, o clube fecha a negociação até a próxima janela.

`Pedido = Valor × papel × (1 − Negociação do diretor × 1%)` · `Chance = 50 + 150 × (oferta ÷ pedido − 1) + ajustes`, entre 5% e 95%.
| Item | Efeito |
|---|---|
| Titular no clube vendedor | Pedido × 1,3 e chance -10 |
| Reserva | Pedido × 0,9 |
| Rival direto | Chance -15 |
| Vendedor com caixa negativo | Chance +15 |
| Jogador quer sair | Chance +20 |
| Cada parcela além da primeira, até 3 | Chance -5 |
| Cada 5% de revenda oferecidos, até 20% | Chance +3 |

**Negociação com o jogador.** Mesmo formato: cada rodada leva 1 ciclo.

`Pedido salarial = salário atual × (1,10 + Ganância do empresário × 1%)` · `Chance = 50 + 100 × (oferta ÷ pedido − 1) + ajustes`, entre 5% e 95%.
| Item | Chance |
|---|---|
| Reputação | (reputação do destino − atual) × 3 × Ambição ÷ 10 |
| Papel prometido | Titular +10 · Rotação 0 · Reserva -15 |
| Libertadores, com Ambição de 14 ou mais | +5 |
| Luvas: a cada 10% do salário anual, até 50% | +3 |
| Bônus por gol, jogo ou título | +2 cada, até +6 |
| Memória do empresário | × 2 |

Papel prometido vira promessa: quebrar gera a marca "promessa quebrada" (seção 3).

**Contratos.** De 1 a 5 anos. Com 6 meses ou menos, o jogador pode assinar pré-contrato com outro clube e sai livre no fim. Renovar usa a negociação com o jogador, com +10 de chance se Lealdade for maior que Ambição.

**Lealdade x ambição.** Regra do Bloco 5 quando chega proposta maior, com limiar em `Ambição − 5`:
| Situação | Reação |
|---|---|
| Lealdade acima da Ambição | Fica |
| Lealdade entre o limiar e a Ambição | Pede aumento de 15% a 30% para ficar |
| Lealdade abaixo do limiar | Quer sair: Moral -10 e -3 por ciclo se a venda for recusada |

Vale também para a comissão.

**Empresários.** Todo negócio com cliente paga comissão de `2% + Ganância × 0,4%` da transferência.
| Perfil | Regra |
|---|---|
| Parceiro | Renovação com +10 de chance se a Memória for positiva |
| Protetor | Recusa transferência com papel Reserva |
| Blefador | 30% de inventar proposta na renovação. O diretor descobre com chance de `Rede de contatos × 4%`; descoberto, a Memória cai 1 |
| Mercenário | Luvas pedidas × 1,5; força saída quando o cliente recebe proposta maior |

- **Influência 16 ou mais:** pedido do clube × 1,1 e notícia de interesse na imprensa.
- **Memória (−5 a +5):** +1 em negócio justo; -1 em promessa quebrada ou venda forçada.

**Empréstimos.** Nas janelas. O clube de origem define a porcentagem do salário paga pelo destino e pode incluir opção de compra. Minutos no destino contam para a evolução (seção 5).

**Propostas da IA.** Na janela, clubes com orçamento buscam a posição mais fraca do elenco, oferecendo de 90% a 140% do Valor. Regras da Europa na seção 11.

## 7. Finanças e comercial (aprovada)
**Mês do jogo.** 4 semanas; o ano tem 13 meses, como a conta de custo de `dados/comercial/`. Salários, TV, patrocínio, mensalidades e juros são lançados por mês. Bilheteria entra a cada jogo em casa. Clubes brasileiros têm contas completas; sul-americanos e europeus usam só orçamento e teto de folha.

**TV.** Cota fixa da liga mais bônus de torcida, divididos em 13 meses. O bônus acompanha o tamanho da torcida na virada. Os 3 últimos da Série B recebem × 0,75 na temporada seguinte.

**Patrocínio.** 3 cotas, com fim definido em `dados/comercial/`. Na virada, as cotas vencidas recebem propostas de marcas de porte compatível, nunca de marca que patrocine rival.

`Valor = cota anterior × (1 + (resultado ÷ 10)) × (1 + Negociação comercial × 1%)`, em que resultado vai de -2 a +3, pela campanha. Limitado ao valor máximo da marca. Negociação manual ou pelo gerente, como na seção 6.

**Bilheteria.** Por jogo em casa.

`Ocupação = ocupação-base × humor × preço × jogo × marketing`, com máximo de 100%.
| Fator | Valor |
|---|---|
| Humor | `0,6 + Humor ÷ 125` |
| Preço | Cada 10% acima do ingresso de referência: -6% na ocupação; abaixo: +6% |
| Jogo | Clássico × 1,3 · Decisão × 1,4 · Libertadores × 1,1 · Time mal na tabela × 0,9 |
| Marketing do gerente | × `(1 + (Marketing − 10) × 0,5%)` |

Preço 30% acima da referência dá -P no Humor por mês; 30% abaixo, +P.

**Sócio-torcedor.** A cada mês, sócios × `(1 + (Humor − 50) × 0,2%)`, mais Marketing. Cada 10% de aumento na mensalidade: -4% de sócios. Máximo de 3× a capacidade do estádio.

**Preços.** Ingresso e mensalidade mudam no máximo 1 vez por mês. Manual ou delegado ao gerente: delegado, Ingressos e sócio dá +`(Ingressos e sócio − 10) × 0,5%` de receita.

**Premiação.** Liga: tabela de `gerador-comercial`. Copas (R$ mi, provisório):
| Fase | Copa do Brasil | Libertadores | Mundial |
|---|---|---|---|
| Campeão | 30 | 45 | 40 |
| Vice | 15 | 20 | 20 |
| Semifinal | 8 | 12 | — |
| Quartas | 4 | 6 | — |
| Oitavas ou grupos | 2 | 3 | — |

**Custos.** Folha, comissão, técnico, luvas, bônus, parcelas de transferências, direito de imagem (até 40% do salário, com economia de 20% dessa parcela) e manutenção da estrutura (seção 8). Multa rescisória de 2× a 4× o Valor: pagar a multa dispensa negociar com o clube; o jogador ainda precisa aceitar.

**Dívida.** Juros de 0,4% ao mês, pagos pelo caixa. Amortizar é opcional. O técnico-gestor pode pedir empréstimo bancário até 30% da receita anual, somado à dívida, com aval da diretoria (seção 9).

**Caixa negativo.**
| Situação | Efeito |
|---|---|
| Caixa negativo | Juros × 2, orçamento de transferências zerado, Confiança -M por mês |
| 2 meses sem pagar a folha | Moral do grupo -M por mês; notícia e evento de salários atrasados |
| 3 meses sem pagar a folha | Jogadores podem pedir rescisão e sair livres; atraso de imagem não libera |

**SAF.**
- **Quem:** Pequeno sobrevivente ou clube com dívida acima de 100% da receita, ou caixa negativo por 8 semanas.
- **Quando:** na virada, 15% de chance de proposta; 50% em situação crítica.
- **Decisão:** do presidente. O apoio ou a oposição pública do técnico muda a chance em ± 20 pontos.
- **Entrada:** aporte de 50% a 150% da receita, corta de 50% a 100% da dívida, +2 em CT e base em 2 anos, participação de 51% a 90%.
- **Custo:** Humor -M na entrada, ganhos de Humor × 0,8 por 3 anos, investidor no lugar do presidente, com meta financeira.
- **Meta perdida:** ao fim do Prazo de cada investidor, aplica a consequência registrada em `dados/diretoria/`. Em SAF nova, Prazo de 2 anos: corta o orçamento pela metade.

## 8. Comissão, estrutura e delegação (aprovada)
**Contratos.** De 1 a 4 anos, com a negociação e a regra de lealdade x ambição da seção 6. Contratações nas janelas e na virada; demitir custa 50% dos salários restantes. Rivais fazem propostas nesses mesmos períodos. Cargo vago funciona com todos os atributos em 3.

**Atributo efetivo.** Todas as fórmulas deste GDD usam o atributo efetivo, com máximo de 20:

`Atributo × estrutura × química`
| Fator | Valor |
|---|---|
| CT: auxiliar, preparador, treinador de goleiros, analista, médico, psicólogo | × `(0,8 + CT ÷ 50)` |
| Base: coordenador da base | × `(0,8 + base ÷ 50)` |
| Olheiros, diretor de futebol e gerente comercial | Sem estrutura |
| Química com o técnico | × `(0,95 + Química ÷ 200)` |

**Estrutura.** CT e base, de 1 a 20.
- **Melhorar 1 nível:** custa `nível alvo² × R$ 0,15 mi`, leva 26 semanas e precisa de aval da diretoria (seção 9). Do 5 para o 6 custa R$ 5,4 mi; do 15 para o 16, R$ 38 mi.
- **Manutenção:** R$ 0,02 mi por mês por nível acima do inicial. Os níveis iniciais já estão no custo de `dados/comercial/`.

**Química e homens de confiança.** Sobe 1 por ano de trabalho junto e muda com eventos.
- **Homem de confiança (15 ou mais):** ao sair, o técnico leva cada um com 50% de chance.
- **Técnico novo:** contrata seus homens de confiança com +15 de chance.

**Outras funções.**
| Função | Efeito |
|---|---|
| Blindagem do técnico (diretor) | Quedas de Confiança × `(1 − Blindagem ÷ 50)` |
| Comando (auxiliar) | Decide pausas e substituições quando delegado ou com o técnico expulso |
| Leitura de jogo (auxiliar) | Qualidade das sugestões nas pausas |
| Gestão de elenco (diretor) | Avisa contratos vencendo e renova, se delegado |
| Evolução e aposentadoria dos profissionais | Seção 11 |

**Delegação.** Por área, e pode ser retomada a qualquer momento.
| Área | Quem assume | Limite definido pelo jogador |
|---|---|---|
| Tática e pausas | Auxiliar, por Comando e Leitura de jogo | Estilo principal |
| Treino | Auxiliar e preparador | Carga máxima |
| Compra e venda | Diretor, por Negociação e Gestão de elenco | Teto de gasto e lista de intocáveis |
| Comercial, ingressos e sócio | Gerente | Preço mínimo e máximo |
| Base | Coordenador | Idade mínima para subir |
| Imprensa | Assessoria padrão, tom Humildade | Tom padrão |

O atalho "Técnico" liga as áreas de campo, e o atalho "Gestor" liga as de negócio. Eventos com escolha nunca são delegados, salvo com o botão "Avançar": o jogo escolhe a opção mais neutra.

**IA.** Os clubes preenchem cargos vagos nas janelas, conforme orçamento e reputação.

## 9. Diretoria e torcida (aprovada)
**Confiança no técnico.** De 0 a 100, começa em 60. Quedas × `(1,4 − Paciência ÷ 25)`, depois a Blindagem do diretor (seção 8).
| Fato | Confiança |
|---|---|
| Vitória / derrota | +1 / -2 |
| Clássico | Resultado × 2 |
| 5 jogos seguidos sem vencer | -M |
| Eliminação em copa fora da meta | -P |
| Eliminação em copa que era meta | -M |
| Humor 70 ou mais / até 30, por mês | +P / -P |
| Eventos, imprensa e caixa negativo | P/M/G |

Até 20: evento de ultimato. Em 0: demissão.

**Metas.** Na pré-temporada, escolha entre Padrão, Ousada e Modesta (`dados/diretoria/`). Avaliadas na virada.
| Resultado | Confiança | Popularidade do presidente |
|---|---|---|
| Superou | +G | +2 |
| Cumpriu | +M | +1 |
| Falhou Modesta ou Padrão | -G | -1 |
| Falhou Ousada | -G, e perde metade do bônus de orçamento no ano seguinte | -2 |

**Interferência.** Centralizador aplica a mania como regra fixa. Delegador não interfere. Todo aval (estrutura, empréstimo, venda acima de 20% do orçamento) é aprovado se o caixa cobrir e a Confiança for de 40 ou mais.

**Orçamento.** Definido na virada, com bônus da meta. Parte das vendas volta ao orçamento: Gastador 70% · Equilibrado 50% · Austero 30%.

**Eleição (associações).** Na data de `dados/diretoria/`, depois a cada 3 temporadas.
- **Chance de cada candidato:** `Força ÷ soma das forças`. O presidente entra com a Popularidade como Força.
- **Popularidade:** -2 por promessa quebrada, +1 por promessa cumprida, +3 com título e -3 com queda de desempenho grave.
- **Ano de eleição:** peso × 1,5 em boatos, cobranças e notícias.

**Apoio público do técnico.** Opcional, uma vez por eleição. O apoio soma +2 na Força do candidato, ou +3 com Reputação 14 ou mais.
| Resultado | Efeito |
|---|---|
| Apoiou quem venceu | Confiança +G |
| Apoiou quem perdeu | Confiança -G; se o vencedor "troca" o técnico, demissão |
| Neutro, presidente mantido | Sem efeito |
| Neutro, novo presidente | Confiança vira 50; se ele "troca" o técnico, 25% de demissão |

**Humor da torcida.** De 0 a 100, anda 1 ponto por mês em direção a 50. Ganhos e quedas seguem P/M/G.
| Fato | Humor |
|---|---|
| Vitória / derrota | +1 / -1 |
| Clássico | Resultado × 3 |
| Título | +G |
| Vender Ídolo / Cria da casa | -G / -M |
| Grande contratação | +M |
| Qualidades, defeitos, ingresso e imprensa | Anexo A do motor, seção 7 e P/M/G |

Quedas: Gigante × 1,2 · Pequeno × 0,8. Em casa, com Humor até 25 e o time perdendo, há vaia (moral, motor seção 6).

**Fator casa.** `2 × Humor ÷ 100 × ocupação`, de 0 a +2 (motor, seção 6).

**Contrato e Reputação do técnico.** Contrato de 1 a 3 anos; meta cumprida abre renovação. Reputação de 1 a 20: +1 por título de liga, copa ou Libertadores, -1 por demissão. Propostas de outros clubes chegam nas janelas e na virada.

**Demissão.** O jogo continua e o técnico recebe a multa do contrato. Livre, recebe propostas a cada 4 semanas de clubes brasileiros com vaga, conforme a Reputação. Sem proposta em 26 semanas, o último colocado da Série B oferece emprego. Técnicos da IA seguem as mesmas regras, com substituto entre os livres.

## 10. Eventos e imprensa no ciclo (aprovada)
Tudo acontece na etapa 2 da tela do ciclo (seção 1). Eventos, coletivas e falas existem só para o clube do jogador. Na virada (seção 11) não há sorteio.

**Definições.**
| Termo | Regra |
|---|---|
| Fase boa / ruim | 10 pontos ou mais / até 4 pontos nos últimos 5 jogos oficiais; neutra no resto |
| Crise | Grupo rachado, Confiança até 40, Humor até 30 ou moral do grupo até 35 |
| Reta final | Semanas 41 a 48 |

### Eventos
**Quantos aparecem.** Máximo de 2 por ciclo; o excedente passa para o ciclo seguinte, com obrigatórios primeiro.
| Tipo | Regra |
|---|---|
| Sorteado | No máximo 1 por ciclo. Chance de `5% × dias até o próximo jogo`, entre 10% e 50% |
| Elo de cadeia | No primeiro ciclo depois das N semanas do `Segue` |
| Obrigatório | Quando a condição ocorre: ultimato (`DIR-021`, Confiança até 20, seção 9) e salários atrasados (`FIN-011`, 2 meses, seção 7) |

Referência: cerca de 16 sorteados por temporada na Série A com copas e 11 na Série B, mais os elos.

**Sorteio.** Entram os modelos com gatilho atendido, alvo existente e Intervalo cumprido. Peso: Comum 12 · Incomum 5 · Raro 1, com os modificadores da ficha. O tema do último evento fica de fora do sorteio seguinte.

**Prazo.** Corre em dias do calendário. Sem resposta, o evento segue pendente enquanto houver prazo. Ao clicar em "Jogar", a tela avisa quais prazos vencem antes do próximo ciclo; esses aplicam a escolha `Delegado`.

**"Avançar".** Resolve na hora tudo que está pendente: eventos pela escolha `Delegado` da ficha (a "opção mais neutra" da seção 8) e coletiva pela assessoria. Se a escolha tiver sorteio, ele roda normalmente. Ela pode abrir cadeia: ignorar problema tem preço.

**Efeitos.** Tabela P/M/G única de `gerador-eventos`, passando pelos multiplicadores das seções 3 e 9. Evento nunca demite: quem demite é a Confiança zerada.

**Cadeias e marcas.** Elo que cairia na virada entra no primeiro ciclo da pré-temporada. Se o alvo deixou o clube, a cadeia termina sem efeito. Ao trocar de clube, o técnico deixa para trás cadeias e marcas.

### Notícias
**Tela.** Até 3 notícias do clube, mais um resumo do mundo sem efeito e sem repórter (placares, campeões, Champions, grandes transferências, técnicos demitidos).
| Vaga | Conteúdo |
|---|---|
| 1 | Resultado do último jogo |
| 2 | Fato do ciclo: lesão, retorno, contratação, venda, renovação, interesse divulgado por empresário de Influência 16 ou mais, repercussão de coletiva com Provocar ou Arbitragem |
| 3 | Ambiente, com 50% de chance por ciclo: sorteio pelos pesos abaixo |

| Ambiente | Peso |
|---|---|
| Rumor | 3; × 2 na janela |
| Crise, só no assunto cuja condição estiver ativa | 4 |
| Eleição, só em ano de eleição | 4 |
| Provocação e arbitragem | 1 |

O modelo sai pelo contexto mais específico e não repete em 8 jogos (`gerador-imprensa`).

**Só a manchete tem efeito.** Por ciclo, só a notícia de maior efeito muda Humor e Confiança, multiplicada pela credibilidade (Alta 100% · Média 70% · Baixa 40%). Vitória, Empate e Derrota simples nunca têm efeito, porque a seção 9 já conta o resultado. Goleada, Clássico, Título e Sequência têm.

**Rumor.** A verdade é sorteada ao publicar: Alta 85% · Média 55% · Baixa 25%.
| Rumor | Verdadeiro | Falso |
|---|---|---|
| Saída | `{clube_interessado}` faz proposta real na janela atual ou na próxima | Desmentido em até 4 semanas |
| Chegada | O alvo está disponível de fato: quer sair, é reserva ou tem menos de 12 meses de contrato | Alvo qualquer de nível compatível |

O jogador conhece o repórter, mas não sabe se o rumor é verdadeiro. O bom rumor de chegada funciona como dica de mercado.

### Coletiva
**Quando.** Não obriga decisão.
| Situação | Coletiva | Perguntas |
|---|---|---|
| Próximo jogo é clássico ou decisão | Sempre | 2 |
| Crise | 50% | 1 |
| Ciclo Normal ou Longo | 30% | 1 |
| Ciclo Curto | Não há | — |

Fora de clássico e decisão, não há coletiva em 2 ciclos seguidos. Referência: cerca de 20 por temporada na Série A.

**Assunto.** Clássico vem sempre primeiro quando se aplica. As demais perguntas saem por sorteio:
| Assunto | Peso |
|---|---|
| Pós-vitória / Pós-derrota, conforme o último jogo | 3 |
| Pré-jogo (contexto de decisão quando for o caso) | 2 |
| Pressão, em crise ou fase ruim | 4 |
| Mercado, na janela | 2 |
| Escalação | 1 |
| Diretoria | 1 |

**Efeitos.** `Moral` vale para o elenco todo e `Ímpeto`, para o rival no próximo jogo. Momento: em fase ruim, efeito negativo sobe um nível; em fase boa, desce um nível (P vira 0); no clássico, Ímpeto sobe um nível.

**Assessoria.** Responde com "Avançar", ao clicar em "Jogar" sem responder ou com a área Imprensa delegada. Usa o tom padrão; sem ele na pergunta, Humildade; sem Humildade, a primeira opção. Ganhos × 0,5.

**Tom repetido.** Da 3ª coletiva seguida com o mesmo tom em diante, ganhos × 0,5. Não acumula com a assessoria.

**Técnico rival.** Depois de Provocar ou de fala de provocação, responde com chance de 70% (polêmico) ou 20% (discreto). A resposta ocupa a vaga 3.

### Falas de jogador
- **Quando:** intervalo mínimo de 3 jogos desde a última. Depois disso, 40% de chance por ciclo; 60% em crise. Referência: cerca de 13 por temporada na Série A.
- **Quem:** sorteio entre os perfis presentes no elenco (Qualidade, Defeito ou Perfil de jovem) com contexto atendido.
- **Sinal:** fase boa 75% Positiva · neutra 50% · ruim 25%.
- **Efeito:** cheio, sem credibilidade, e sem contar como manchete. Sem escolha na hora: a reação do técnico vem por evento. `Moral` vale para o elenco todo.

### Ano de eleição
Só em associações, com peso × 1,5 em:
| Onde | O que |
|---|---|
| Eventos | Tema `diretoria` e gatilho Eleição |
| Notícias | Ambiente: Rumor, Crise e Eleição |
| Coletiva | Assuntos Diretoria e Pressão |

## 11. Mundo (aprovada)
### Virada (semanas 49 a 52)
Uma tela só, sem ciclos. O jogo processa nesta ordem e mostra o resumo:
| # | Etapa | Regra |
|---|---|---|
| 1 | Encerramento | Campeões, premiação e artilheiros |
| 2 | Metas | Avaliação e Confiança (seção 9); orçamento do ano seguinte |
| 3 | Acesso e queda | 4 piores da Série A trocam com os 4 melhores da Série B. Os 3 últimos da Série B: TV × 0,75 no ano seguinte (seção 7) e Confiança -M |
| 4 | Vagas | Libertadores e Copa do Brasil, conforme `PLANEJAMENTO.md` |
| 5 | Clube | Reputação, torcida, perfil, patrocínios e SAF |
| 6 | Pessoas | Idade +1, contratos vencidos, pré-contratos, aposentadorias e evolução da comissão |
| 7 | Europa | Renovação dos elencos |
| 8 | Reposição | Gerador em código completa os livres |
| 9 | Ano novo | Novo calendário, sorteios e abertura da pré-temporada |

**Decisões do jogador na tela.** Opcionais: patrocínios, comissão e propostas de outros clubes ao técnico. Com "Avançar", o gerente e o diretor decidem, e as propostas ao técnico são recusadas.

**Clube na virada.**
| Item | Regra |
|---|---|
| Reputação | +1 com título de liga, copa ou Libertadores (no máximo +1 por ano); -1 com queda; -1 a cada 3 anos sem Libertadores, se for 15 ou mais |
| Torcida | Pontos: título +2 · Libertadores +1 · queda -2 · Humor médio 70 ou mais +1 · até 30, -1. A cada 5 pontos acumulados, tamanho ± 1, e o contador zera |
| Bônus de TV | × `(tamanho atual ÷ tamanho inicial)` |

**Perfil do clube.** Muda quando a condição vale em 2 viradas seguidas. Lido de cima para baixo; vale o primeiro que couber.
| Perfil | Condição |
|---|---|
| Emergente | SAF nova ou aporte nos últimos 5 anos, com torcida até 12 |
| Gigante endividado | Reputação 15 ou mais e dívida acima de 100% da receita |
| Gigante rico | Reputação 16 ou mais, torcida 15 ou mais e dívida abaixo de 50% da receita |
| Formador | Base 14 ou mais e vendas de crias acima de 30% da receita, em média de 3 anos |
| Pequeno sobrevivente | Receita no terço inferior dos 30 clubes brasileiros |
| Tradicional médio | Nenhuma das anteriores |

### Aposentadorias e evolução
**Jogadores.** Sorteio na virada. Goleiros usam a idade menos 3 anos.
| Idade | Chance | | Fator | Efeito |
|---|---|---|---|---|
| Até 32 | 0 | | Livre | × 2 |
| 33 e 34 | 10% | | Nota até 8 | × 1,5 |
| 35 e 36 | 30% | | 50% ou mais dos minutos | × 0,5 |
| 37 e 38 | 60% | | | |
| 39 ou mais | 90% | | | |

O contrato restante se encerra sem custo. Com Liderança 15 ou mais, ou Ídolo, há 30% de chance de virar técnico ou profissional livre, gerado em código.

**Técnicos e profissionais.** Chance de aposentadoria: 65 a 69 anos, 15% · 70 a 74, 35% · 75 ou mais, 70%. Contrato ativo reduz à metade. O técnico do jogador nunca se aposenta.

**Evolução anual.** Em um atributo do cargo, sorteado:
| Idade | +1 | -1 |
|---|---|---|
| Até 39 | 50% | 0 |
| 40 a 54 | 20% | 5% |
| 55 ou mais | 5% | 20% |

CT 15 ou mais soma 10 pontos na chance de +1. A Reputação segue a regra do técnico (seção 9). O técnico do jogador evolui pela mesma tabela, sem a parte de -1.

### IA dos clubes
**Base.** Mesmas regras do jogador, sem eventos, coletivas e falas. Treino na seção 2, base na seção 5, comissão na seção 8, demissão na seção 9, tática no motor. Preços de ingresso ficam na referência. Na janela 1, cada clube faz até 3 compras; na janela 2, até 2.

**Política de mercado por perfil.** O alvo é a posição mais fraca (seção 6).
| Perfil | Compra | Vende |
|---|---|---|
| Gigante rico | Nota acima da média do elenco; oferta até 140% | Só acima de 130% do Valor |
| Gigante endividado | Livres e empréstimos | Aceita a partir de 100% com caixa negativo |
| Formador | Até 23 anos | Até 23 anos, a partir de 110% |
| Emergente | Oferta até 130%; aceita 28 anos ou mais | Só acima de 120% |
| Tradicional médio | Oferta até 110% | A partir de 110% |
| Pequeno sobrevivente | Livres e empréstimos | A partir de 90% |

**Renovação.** A partir de 12 meses do fim, a IA renova com titulares e com quem tem Pot 2 ou mais acima da nota. De 33 anos em diante, só contratos de 1 ano. Os demais saem no vencimento.

**Estrutura.** Na virada, sobe 1 nível de CT ou base se o caixa for maior que 50% da receita e cobrir o custo. Formador prioriza a base; os demais, o CT.

### Europa
**Clubes.** 16, com elenco e técnico próprios, sem comissão e sem finanças além de orçamento e teto de folha. A Força (1 a 20) vira a média das 11 melhores notas, mudando no máximo 1 por ano.

**Champions e Mundial.** Em cada jogo da Champions, o mais forte vence com chance de `50% + diferença de Força × 6%`, entre 15% e 85%. O placar é sorteado para as notícias. No Mundial, roda o motor completo, e os atributos do técnico europeu vêm da Reputação.

**Compras.** Janela 1: 2 tentativas por clube; janela 2: 1. Cada tentativa tem 50% de chance de virar proposta.
- **Alvo:** até 26 anos, com Nota ou Pot igual ou acima da Força − 3.
- **Oferta:** de 110% a 180% do Valor. O vendedor decide pela seção 6; a regra de lealdade x ambição vale.
- **Volume:** cerca de 24 propostas por ano em toda a América do Sul.

**Comprar da Europa.** Pelo mercado normal, com pedido × 1,5. Quem tem menos de 30 anos e é titular entra com chance -30.

**Renovação anual.**
1. Evolução pela seção 5, com treino e comissão × 1,0. Titulares contam 50% ou mais dos minutos.
2. Com 31 anos ou mais, 50% de chance de sair e virar livre, até o elenco ficar com 26.
3. Com menos de 26, o gerador cria jogadores de 18 a 28 anos com nota Força ± 3. Um por clube, por ano, é jovem com Pot igual à Força + 2.

### Gerador em código (longo prazo)
| Item | Regra |
|---|---|
| Livres | A cada virada, completa até 30 jogadores, 15 técnicos e 36 profissionais; nível de 6 a 14, como os lotes iniciais |
| Saída do mundo | Livre há 26 semanas com nota até 9, ou jovem dispensado sem clube em 13 semanas, sai do jogo |
| Nomes | `dados/elencos/_nomes.md`, sem repetir ativos |
| Semente | Própria de cada carreira: o mundo inicial é igual para todos e depois diverge |

## 12. Metas de calibração (aprovada)
**As metas não existem dentro do jogo.** O `simulador-balanceamento` mede carreiras inteiras e indica qual número ajustar. A calibração do motor (`GDD-motor.md`, seção 9) vem antes desta.

**Como medir.** 100 carreiras de 20 temporadas, com semente própria, em três cenários para o clube do jogador:
| Cenário | Comportamento |
|---|---|
| IA | Segue as regras da IA, sem eventos nem coletivas |
| "Avançar" | Aceita tudo: `Delegado` nos eventos, assessoria na coletiva, auxiliar no resto |
| Escolha aleatória | Escolha sorteada em eventos e coletivas, para medir o efeito médio deles |

**Ritmo (fora do simulador).** Medido com cronômetro no protótipo.
| Item | Meta | Faixa aceita |
|---|---|---|
| Ciclo | 2 min | 1 a 3 min |
| Partida | 7 min | 5 a 10 min |
| Temporada de Série A com copas | 8 h | 6 a 10 h |

**Elenco e mundo.**
| Métrica | Meta | Faixa aceita |
|---|---|---|
| Desfalques por lesão ao mesmo tempo, Série A com copas (seção 4) | 2 | 1,5 a 3 |
| Idade em que o jovem com minutos chega ao Potencial (seção 5) | 24 | 23 a 25 |
| Idade média de aposentadoria | 36 | 35 a 37 |
| Joias (Pot 17 ou mais) surgidas por ano | 15 | 10 a 20 |
| Jogadores de nota 19 ou 20 após 20 anos, sobre o início | 100% | 70% a 130% |
| Nota média dos elencos após 20 anos, sobre o início | 0 | ± 0,5 |
| Jogadores ativos após 20 anos, sobre o início | 100% | 90% a 110% |
| Jogadores livres, na virada | 60 | 30 a 120 |
| Compras europeias concluídas na América do Sul, por ano | 12 | 8 a 18 |
| Valor médio dos jogadores após 10 anos, sobre o início | 100% | 85% a 115% |

**Vestiário, diretoria e torcida.**
| Métrica | Meta | Faixa aceita |
|---|---|---|
| Moral do grupo, média | 55 | 45 a 65 |
| Humor médio dos clubes | 50 | 42 a 58 |
| Tempo com Humor até 10 ou de 90 em diante | 5% | até 10% |
| Técnicos demitidos por temporada, nos 30 clubes brasileiros | 7 | 4 a 10 |
| Tempo no cargo, média | 2 temporadas | 1,5 a 3 |
| Cenário "Avançar" em Tradicional médio: demitido em até 3 temporadas | 40% | 30% a 50% |
| Ganho líquido de Confiança por temporada só com a assessoria (seção 10) | +8 | até +12 |

**Eventos e imprensa, por temporada.**
| Métrica | Série A com copas | Série B |
|---|---|---|
| Eventos sorteados | 16 (13 a 19) | 11 (8 a 14) |
| Coletivas | 20 (15 a 25) | 12 (8 a 15) |
| Falas de jogador | 13 (10 a 16) | 6 (4 a 8) |

Nenhuma opção de evento pode ser a melhor em todos os perfis de clube. Moral, Humor e Confiança médios no cenário de escolha aleatória não podem se afastar mais de 5 pontos dos do cenário IA.

**Finanças por perfil.** Média das 5 primeiras temporadas, com o clube na IA.
| Perfil | Saúde esperada |
|---|---|
| Gigante rico | Dívida abaixo de 50% da receita; caixa positivo em 90% das viradas |
| Gigante endividado | Dívida entre 70% e 150% da receita; 30% a 50% viram SAF em 10 anos |
| Formador | Vendas de 20% a 35% da receita; caixa positivo em 70% das viradas |
| Emergente | Caixa positivo durante o aporte; dívida abaixo de 60% da receita |
| Tradicional médio | Resultado anual entre -10% e +10% da receita |
| Pequeno sobrevivente | Folha de até 70% da receita; caixa negativo em até 30% das viradas |

| Métrica geral | Meta | Faixa aceita |
|---|---|---|
| Clubes brasileiros com caixa negativo na virada | 15% | 10% a 25% |
| SAFs novas por temporada | 1 | 0,5 a 2 |
| Clubes que mudam de perfil por temporada | 2 | 1 a 3 |
| Clubes em cada perfil após 20 anos | 2 ou mais | Nenhum perfil vazio |

**Competição.** Em 10 temporadas de Série A, 4 campeões diferentes ou mais, e nenhum clube com mais de 50% dos títulos. Clubes Gigante rico no G4 em 60% a 75% das temporadas.

**O que ajustar, nesta ordem.** Um número por vez, medindo de novo a cada mudança.
1. Evolução, envelhecimento e aposentadoria (seções 5 e 11), para o tamanho e o nível do mundo.
2. Volume e preços do mercado (seções 6 e 11).
3. Receitas, custos e juros (seção 7).
4. Confiança e Humor (seção 9), depois a tabela P/M/G, ajustada em um lugar só.
5. Frequência de eventos, coletivas e falas, e cortes da assessoria (seção 10).
6. Lesões de treino e fatores do departamento médico (seção 4).

Se uma meta não fechar, a solução é mudar um desses números. Nunca criar ajuda oculta para o jogador ou para a IA.