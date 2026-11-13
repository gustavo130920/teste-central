# GDD: motor de partida

Só regras, sem código. `PLANEJAMENTO.md` continua sendo a fonte da verdade da base; aqui entra como o motor usa essa base. Números são provisórios até o `simulador-balanceamento`.

## Decisões iniciais (aprovadas em 09/11/2026)
| Tema | Decisão |
|---|---|
| O que é simulado | Cerca de 100 a 120 cadeias por jogo, com as trocas de passe sem perigo resumidas |
| Zebra | O time bem mais fraco vence cerca de 12% com plano ruim ou neutro e cerca de 25% com o plano certo |
| Gols | Sem meta dentro do jogo: o placar sai só das disputas. Cerca de 2,5 é só a referência para a média de uma temporada inteira, com todos os estilos misturados |
| Pausas | Automáticas aos 15, 30, 45, 60 e 75 minutos, com botão "seguir sem mexer" |
| Substituições | Só nas pausas, salvo lesão |

## Seções
1. Ciclo da partida (aprovada)
2. Posse como cadeia de eventos nas 30 zonas (aprovada)
3. Disputas: atributo x atributo, eficácia da instrução, traços (aprovada)
4. Sinergias, congestionamento, brechas e combinações na prática (aprovada)
5. Confronto de estilos pelas 6 notas contra o elenco em campo (aprovada)
6. Energia, empenho, moral, torcida, ímpeto e "pôr fogo" (aprovada)
7. Pausas: relatório do analista, ajustes, IA dos técnicos (aprovada)
8. Bola parada, cartões, lesões e substituições (aprovada)
9. Variância e metas de calibração (aprovada)
10. Saída para narração, estatísticas e relatório (aprovada)
- Anexo A. Qualidades, defeitos e perfis de jovem (aprovado)

## 1. Ciclo da partida (aprovada)
**Estrutura.** 90 minutos em 6 blocos de 15. Cada bloco segue a ordem: aplica os ajustes, simula as cadeias, atualiza energia, ímpeto e moral, e para (menos depois do bloco 6).

**Cadeias por bloco.** Base 18. Cada time em Ritmo Rápido soma 1 e em Ritmo Lento tira 1; depois, sorteio de -1 a +1. Fica entre 15 e 21 por bloco, cerca de 108 no jogo.

**Acréscimos.** Os blocos 3 e 6 ganham de 0 a 2 cadeias extras, conforme gols, faltas e lesões do bloco.

**Pausas.**
| Minuto | Tipo | Efeito próprio |
|---|---|---|
| 15, 30, 60, 75 | Parada técnica | Só relatório e ajustes |
| 45 | Intervalo | Relatório, ajustes, recuperação de energia e fala do técnico (Motivação) |

Em toda pausa o jogador pode ler o relatório, mudar estilo, instruções e empenho, substituir e dar a ordem de "pôr fogo". O botão "seguir sem mexer" pula tudo. Com o elenco insatisfeito, os ajustes podem render menos (ver "Respaldo do elenco" na seção 7).

**Substituições.** 5 por jogo. Lesão troca na hora: o auxiliar escolhe o reserva da posição, e a troca conta nas 5. Sem trocas restantes, o time segue com 10.

**Expulsão.** Jogador expulso: o time se reorganiza sozinho e o jogador ajusta na pausa seguinte. Técnico expulso: o auxiliar assume o comando (Bloco 5).

**Fim de jogo.** Empate vale como empate na liga e nos grupos. No mata-mata, empate no agregado vai direto aos pênaltis, sem prorrogação, como já definido em Competições.

## 2. Posse como cadeia de eventos (aprovada)
**Ponto de vista.** Cada time lê o campo pelo próprio ataque: a F5 de quem ataca é a F2 de quem defende, e a ponta esquerda de um é a ponta direita do outro. Os corredores relativos das instruções viram zonas reais pelo lado do jogador.

**Mapa de presença.** No início de cada bloco, o motor monta para cada time um mapa com a bola e um sem a bola, a partir das duas formações. Cada jogador conta na zona da formação. Ocupa e Ataca o espaço somam presença na zona da etiqueta, Cobre soma presença defensiva, Libera e Abre buraco tiram presença. Empenho e eficácia da instrução aumentam ou reduzem esse peso.

**A cadeia.** Sequência de até 6 elos do mesmo time com a bola. Cada elo define portador, ação, zona de destino e disputa (seção 3).
- **Portador:** sorteio entre quem está na zona, pelo peso no mapa.
- **Ações:** passe curto, passe em profundidade, lançamento, condução, drible, cruzamento e finalização.
- **Destino:** pesa a nota de Verticalidade (mais para a frente), a Largura (mais para os corredores) e a presença de companheiros. Sinergias aumentam o peso da zona (seção 4).

**Como a cadeia começa.**
| Início | Quando | Zona |
|---|---|---|
| Saída de bola | Pontapé inicial, gol sofrido, tiro de meta, defesa do goleiro | F3 ou F1-2 |
| Recuperação | O adversário perdeu a bola | Zona do roubo |
| Contra-ataque | Recuperação em F2 a F4 com 3 ou mais adversários fora de posição | Zona do roubo |
| Reinício | Lateral ou bola fora | Zona da saída |
| Bola parada | Falta perigosa, escanteio, pênalti | Seção 8 |

**Transição.** Quem perde a bola ainda está no mapa com a bola. A distância de cada jogador entre as duas formações diz quando ele volta para o mapa sem a bola:
| Distância | Volta |
|---|---|
| Até 1 zona | Já está no lugar |
| 2 zonas | Depois de 1 elo |
| 3 zonas ou mais | Depois de 2 elos |

É isso que define o gasto de energia na volta e onde cada defensor está nos primeiros elos.

**Fora de posição.** A cada perda de bola, cada jogador de linha sorteia se está fora de posição, para o contra-ataque: chance por distância entre os dois mapas (0, 1, 2, 3 zonas ou mais) mais pontos por nota de Risco acima de 10, entre 0% e 95%. Valores em `PROVISORIO.foraDePosicao`.

**Posse resumida.** Cadeia que fica em F1 a F3, sem pressão Alta do adversário, se resolve em um teste único de progressão e registra de 4 a 10 passes para as estatísticas. O detalhe elo a elo vale de F4 em diante ou sob pressão. Falta nesse teste acontece na zona onde a cadeia estava, não na F4.

**Como a cadeia termina.** Os totais são referência de calibração para a média de uma temporada, nunca limite ou alvo de uma partida. O motor não compensa placar: nenhum jogo recebe chance extra por ter poucos gols. Só o número de cadeias é controlado (seção 1); o que elas produzem depende do confronto. Dois times fechados podem gerar poucas finalizações e terminar em 0 a 0; dois times abertos podem passar bem da média.
| Fim | Próxima cadeia | Referência na temporada |
|---|---|---|
| Finalização | Gol, defesa, escanteio ou tiro de meta | 25 (cerca de 10% vira gol) |
| Perda da bola | Recuperação ou contra-ataque do adversário | 50 |
| Falta | Reinício ou bola parada | 18 |
| Bola fora | Lateral, escanteio ou tiro de meta | 15 |

Referência de contra-ataques: de 8 a 12 por jogo, somando os dois times, também só na média.

**Estatísticas de posse.** Cada cadeia tem duração: de 30 a 60 segundos na resumida e 8 segundos por elo na detalhada. A posse é a soma das durações de cada time. O minuto do lance sai da ordem da cadeia dentro do bloco.

**Exemplo.** Recuperação em CE3. O meia passa ao falso 9, que recua para CE4 e puxa o zagueiro. O ponta corta para CE5 na zona liberada, a Diagonal da Morte é ativada e a cadeia termina em finalização.

## 3. Disputas (aprovada)
**Regra geral.** Cada elo é uma disputa entre o portador e o marcador, resolvida por um único sorteio.

`Chance = base da ação + 1,5 ponto × (valor do atacante − valor do defensor) + números na zona`, sempre entre 5% e 95%.

**Valor de cada lado.** Média ponderada dos atributos da ação: com 2 atributos, 60% e 40%; com 3, 50%, 30% e 20%. Depois somam-se os modificadores abaixo.

**Marcador.** O jogador sem a bola com mais peso na zona. Zona vazia: marca quem está em zona vizinha, sem contar nos números na zona. Sem ninguém na zona nem ao lado: o defensor vale 5.

**Números na zona.** Presença de quem ataca menos presença de quem defende, 3 pontos por jogador de diferença, até 12 pontos para mais ou para menos.

| Ação | Atacante | Defensor | Base |
|---|---|---|---|
| Passe curto | Pas, Dec, Comp | Pos, Comb | 85% |
| Passe em profundidade | Pas, Vis | Pos, Conc | 45% |
| Lançamento | Pas, Vis | Pos, Cab | 40% |
| Condução | Dom, Vel | Pos, Vel | 70% |
| Drible | Dri, Agi | Des, Agi | 50% |
| Cruzamento | Cru, Dec | Pos, Cab | 35% |

**Quando a ação falha.** 60% perda da bola, 22% falta, 18% bola fora. Combatividade alta do marcador e drible puxam para falta; lançamento e cruzamento puxam para bola fora.

**Finalização.** Em duas etapas: a chance da zona, depois o duelo com o goleiro.
| Zona | Chance de gol |
|---|---|
| Centro F6 | 32% |
| Meia F6 | 18% |
| Centro F5 | 14% |
| Meia F5 | 8% |
| Lado F5-6 | 5% |
| Qualquer zona em F4 | 3% |

| Tipo | Finalizador | Goleiro | Ajuste |
|---|---|---|---|
| Chute na área ou perto dela | Fin, Comp | Ref, Mão | — |
| Chute de longe (F4) | Lon, Comp | Ref, Mão | — |
| Cabeceio | Cab, Imp | Aér, Com | Chance × 0,7 |
| Cara a cara | Fin, Comp | Saí, Ref | Chance × 1,5 |

Cada ponto de diferença entre finalizador e goleiro muda a chance em 6% do valor dela. Com marcador na zona, a chance × 0,7; sem marcador, × 1,3. Limite entre 1% e 60%. Sem gol, a ordem da seção 10 define se a bola foi bloqueada, para fora ou no alvo; no alvo, Segurança nas Mãos decide entre defesa com a bola presa, rebote e escanteio.

**Eficácia da instrução** (Bloco 2). `(Disciplina Tática + média dos atributos-chave) ÷ 40`, mais 0,10 com traço compatível, multiplicada pela familiaridade com a posição: 1,0 na principal, 0,85 na secundária e 0,6 fora dela. Máximo de 1,1. Ela escala as etiquetas no mapa de presença e as sinergias (seção 4); o custo da instrução é sempre pago por inteiro.

**Modificadores no valor do jogador.**
| Fonte | Efeito |
|---|---|
| Traço que descreve a ação | +2 com o 1º atributo da ação em 10 ou mais; -1 abaixo disso (traço é tendência, e sem qualidade atrapalha). O traço também aumenta a chance de o jogador escolher essa ação |
| Forma do dia, sorteada antes do jogo | Até ± (21 − Consistência) ÷ 5 |
| Jogos Grandes, em clássico ou decisão | (Jogos Grandes − 10) ÷ 5 |
| Pé fraco, em 25% das finalizações | − (5 − pé fraco) |
| Energia, moral, ímpeto, fator casa | Seção 6 |

A soma dos modificadores fica entre -5 e +5, para o atributo continuar decidindo. A forma do dia já é uma fonte de zebra e não recebe nada para compensar.

**Exemplo.** Ponta com Dri 16 e Agi 14 tem valor 15,2. Lateral com Des 11 e Agi 12 tem valor 11,4. Com um defensor a mais na zona, o drible dá 50 + 1,5 × 3,8 − 3, cerca de 53%.

## 4. Sinergias, brechas e combinações (aprovada)
**Quando calcula.** No início de cada bloco, junto com o mapa de presença. As etiquetas viram zonas reais e o motor monta um mapa de efeitos por zona.

**Fase de cada etiqueta.**
- Ocupa, Libera, Atrai marcador e Ataca o espaço valem na fase da instrução. Ataca o espaço de instrução Sem a bola age nos elos de contra-ataque.
- Abre buraco de instrução Com a bola vale na transição, enquanto o time volta; de instrução Sem a bola, vale com o adversário atacando.
- Cobre vale nas duas fases, porque a cobertura é sempre de quem ficou.

**Eficácia final da instrução.** `Eficácia (seção 3) × coerência × entrosamento`.
- Coerência com o estilo do técnico: Combina × 1,05; neutra × 1,0; Contraria × 0,9.
- Entrosamento: de × 0,7 na tática nova até × 1,0 ao completar as semanas do estilo.

**Regras automáticas.**
| Situação | Efeito na zona | Valor |
|---|---|---|
| Libera + Ataca o espaço na mesma zona | Chance criada | +8%, escalado pela eficácia média da dupla |
| Atrai marcador perto de quem Ataca o espaço | Chance criada, e o marcador atraído perde peso na zona | +6%, escalado |
| Duas peças Ocupam ou Atacam a mesma zona | Congestionamento | -5% por peça a mais, até -15% |
| Abre buraco sem cobertura | Brecha para o adversário | Pelo custo de Risco da instrução: 0 ou P 4%, M 8%, G 12% |
| Buraco coberto | Brecha reduzida pela eficácia de quem cobre, e quem cobre gasta mais energia | Eficácia 1,0 anula tudo |

"Perto" é o mesmo corredor com faixa vizinha, ou corredor vizinho na mesma faixa. Brecha não é escalada pela eficácia: um jogador ruim abre o mesmo buraco.

**Cobertura vizinha.** Cobre em zona vizinha à do buraco anula metade do que anularia na própria zona. Assim o zagueiro em Cobertura ajuda quando o lateral do seu lado sobe.

**Como o bônus age.**
| Bônus | Na zona |
|---|---|
| Chance criada | Soma pontos nos elos que chegam à zona e multiplica a chance de gol nela |
| Posse | Soma pontos em passe curto e condução |
| Contra-ataque | Soma pontos nos elos de contra-ataque que passam pela zona |
| Recuperação | O marcador ganha pontos para roubar a bola |
| Proteção | Reduz a chance de gol e dos elos adversários na zona |

Zona é sempre vista por quem tem o bônus: Proteção em Centro F2 protege a própria defesa.

**Limites.** Sinergias automáticas somam até 15% por zona. Com combinações, até 25%.

**Combinações ocultas.**
- **Ativação:** todas as peças em campo com a instrução escolhida, Condição cumprida e eficácia média de pelo menos 0,5. O bônus é escalado por essa eficácia e soma-se à sinergia.
- **Efeito antes da descoberta:** a combinação funciona mesmo oculta, e vale também para a IA, que só a monta por acaso.
- **Pista:** aparece no caderno depois de 5 jogos com uma das peças em uso.
- **Descoberta:** com a combinação ativa, no primeiro elo bem-sucedido na zona. O lance é narrado, e a Revelação entra no caderno. Ao sofrer uma combinação, a descoberta depende de sorteio pela Precisão do analista.

**O que aparece na tela.** Sinergias, congestionamentos e brechas ficam visíveis no editor de táticas. Combinações, não.

**Exemplo.** Diagonal da Morte com eficácia média 0,85, em Centro F5: Libera + Ataca dá 6,8% e Atrai dá 5,1%, total de 11,9% automático. O bônus da combinação, 12% × 0,85, dá 10,2%. Total: 22,1%, dentro do limite de 25%.

## 5. Confronto de estilos (aprovada)
**Princípio.** Não existe tabela de quem ganha de quem. O motor compara as notas dos dois estilos e testa os jogadores que estão em campo. O mesmo estilo pode funcionar num clube e falhar em outro. Tudo é recalculado a cada bloco, porque energia, substituições e ajustes mudam o cenário.

**Notas efetivas.** O time parte das 6 notas do estilo. Cada instrução do time fora do padrão do estilo ajusta as notas, por degrau, sempre entre 1 e 20.
| Instrução do time | Um degrau acima | Um degrau abaixo |
|---|---|---|
| Linha | Bloco +3, Risco +2 | Bloco -3, Risco -2 |
| Pressão | Pressão +4, Físico +2 | Pressão -4, Físico -2 |
| Ritmo | Verticalidade +2, Físico +1 | Verticalidade -2, Físico -1 |
| Saída (mais direta) | Verticalidade +2, Posse -2 | Verticalidade -2, Posse +2 |

Largura não muda notas: ela só distribui o jogo pelos corredores (seção 2).

**O que cada nota faz por si.**
| Nota | Efeito |
|---|---|
| Bloco | Desloca o mapa sem a bola: até 7, uma faixa para trás; 15 ou mais, uma faixa para a frente, menos zagueiros e laterais, que seguram a linha |
| Pressão | Com Pressão Alta, o adversário não tem posse resumida (seção 2); aumenta a chance de roubo no campo dele |
| Posse | Aumenta o peso do passe curto e a duração das cadeias |
| Verticalidade | Aumenta o peso de destinos à frente e de passe em profundidade |
| Risco | Mais jogadores à frente na hora da perda, logo mais gente fora de posição na transição |
| Físico | Aumenta o gasto de energia por bloco (seção 6) |

**Eixos de confronto.** Valem nos dois sentidos, cada time como alvo. O grupo é a média dos atributos das posições em campo.
| Eixo | Agressor testa | Alvo testa | Peso | Afeta |
|---|---|---|---|---|
| Pressão x Saída | CA, PON, MC: Comb, Res, Vel | GOL Pés; ZAG Pas, Comp; VOL Pas | (Pressão do agressor − média de Pressão) ÷ 20 | Passes do alvo em F1 a F3 |
| Velocidade x Costas | CA, PON: Vel, Mov | ZAG: Vel, Pos | (Verticalidade do agressor − média de Verticalidade) ÷ 20 | Passe em profundidade e contra-ataque do agressor |
| Criação x Bloco | MC, MO: Vis, Pas; CA: Mov | ZAG: Pos, Conc; VOL: Des | (média de Bloco − Bloco do alvo) ÷ 20 | Elos do agressor em F4 e F5 |

`Pontos = (média do agressor − média do alvo) × peso`, entre -6 e +6, somados à chance da disputa afetada (seção 3). A média de cada nota é a dos 12 estilos (hoje Pressão 11,25, Verticalidade 12,4 e Bloco 10,25). O peso é relativo: o eixo mede o acerto do plano, e não a força do elenco, que já conta na seção 3. Com o grupo do agressor pior que o do alvo, a nota acima da média tira pontos dele, e a nota abaixo da média rende. Positivo favorece o agressor; negativo, o alvo.

**Viabilidade do estilo.** Mede se o elenco em campo tem o perfil que o estilo pede. `Média dos atributos de Favorece do estilo − média, entre os 12 estilos, dessa mesma conta no elenco em campo`, entre -3 e +3, em pontos em todas as disputas (estilo sem ninguém nas posições de Favorece fica fora da média). É relativa ao próprio elenco, para o time modesto poder acertar um plano que combine com ele: acima de zero, o estilo combina com o elenco mais do que o estilo médio.

**Limite e peso.** Eixos e viabilidade somam no máximo ±10 numa disputa, e essa soma vale × 3 (peso do confronto). Na prática, até ±30 pontos.

**Exemplo.** Posse Posicional contra Pressão Pós-Perda (Pressão 20, peso (20 − 11,25) ÷ 20 ≈ 0,44). Se o trio de pressão tem média 16 e a saída adversária tem 13, o eixo vale 1,3, e os passes do time de posse em F1 a F3 perdem cerca de 4 pontos (× 3). Se a saída tiver 17, ganham cerca de 1,3 ponto, e pressionar deixa de valer o gasto de energia.

## 6. Energia, moral e clima (aprovada)
Tudo aqui vira modificador no valor do jogador (seção 3), dentro do limite de ±5.

**Energia.** De 0 a 100 por jogador. Entra no jogo conforme a condição física da semana (GDD de Gestão). Gasto por bloco:

`7 × (0,7 + 0,03 × (Físico − 1)) + custo da instrução + empenho − (Resistência − 10) × 0,25`, com mínimo de 3.
| Parcela | Valor |
|---|---|
| Custo de Energia da instrução | 0: 0 · P: 0,5 · M: 1 · G: 2 |
| Empenho, somando ofensivo e defensivo | Baixo -1 · Normal 0 · Alto +1, cada um |
| Cobrir um buraco (seção 4) | +0,5 por buraco |
| Distância entre as duas formações | +0,5 por zona acima de 2 |

- **Intervalo:** recupera de 6 a 12, conforme a Recuperação do preparador físico.
- **Reserva:** entra com a energia da semana, sem gasto do jogo.
- **Efeito:** -1 no valor para cada 15 pontos abaixo de 70, calculado no início do bloco.
- **Exemplo:** volante em Pressão Pós-Perda (Físico 19), instrução de custo G, Empenho Defensivo Alto e Resistência 12 gasta 11,2 por bloco. Chega ao último bloco com 52 (-1) e termina com 41. Em estilo de Físico 10, com tudo normal e Resistência 10, gasta 6,8 e termina com 67.

**Empenho no mapa.** Alto dá +20% de peso na fase correspondente; Baixo, -20%.

**Moral.** De 0 a 100 por jogador, vinda da semana. Muda pouco a cada bloco, com gol, erro decisivo, cartão ou vaia. O psicólogo reduz as quedas.
| Moral | Valor |
|---|---|
| Até 20 | -2 |
| 21 a 40 | -1 |
| 41 a 70 | 0 |
| 71 a 90 | +1 |
| 91 ou mais | +2 |

**Fator casa.** Só o mandante recebe: de 0 a +2 no valor, pelo humor da torcida e pela ocupação do estádio. O visitante não perde nada; a pressão dele vem do ímpeto.

**Ímpeto.** De -100 a +100 por time. Perde 10 pontos em direção a zero a cada bloco.
| Acontecimento | Ímpeto |
|---|---|
| Fazer gol | +30 |
| Sofrer gol | -20 |
| Defesa difícil do goleiro | +10 |
| Falta dura sofrida | +10 |
| Provocação bem-sucedida | -10 no alvo |
| Pênalti perdido | -25 em quem perdeu, +20 no outro |

Em casa, os ganhos valem × 1,25. Com jogador Gelo em campo, as perdas valem × 0,75.
| Ímpeto, em módulo | Valor |
|---|---|
| Menos de 25 | 0 |
| 25 a 49 | ±1 |
| 50 a 74 | ±2 |
| 75 ou mais | ±2,5 |

Isso equivale a cerca de 3% a 8% de rendimento, como no Bloco 4.

**"Pôr fogo no jogo".**
- **Ordem:** dada ao Incendiário na pausa, no máximo 2 por jogo.
- **Chance:** `30% + 3 pontos × (média de Lid, Comb e Comp − 10)`, mais 10 pontos para cada situação: em casa, perdendo, ímpeto abaixo de -25. Entre 10% e 85%. Aparece antes de confirmar.
- **Sucesso:** +35 de ímpeto no próprio time.
- **Falha:** sorteio entre cartão para o Incendiário e +20 de ímpeto para o adversário. Fora de casa, os +20 acontecem sempre, porque a torcida rival inflama.
- **Por conta própria:** 5% por bloco quando o time está perdendo ou com ímpeto abaixo de -25, sem custo de ordem e com o mesmo sorteio.

**Fora desta seção.** O efeito individual das outras qualidades e dos defeitos está no Anexo A.

## 7. Pausas (aprovada)
**Ordem.** Relatório, sugestões do auxiliar, ajustes, confirmar. Os dois técnicos decidem ao mesmo tempo: a mudança do adversário só aparece no relatório seguinte.

**Relatório.** Placar, finalizações, posse, energia e ímpeto sempre aparecem. O resto depende da Profundidade do relatório do analista.
| Profundidade | Acrescenta |
|---|---|
| 1 a 7 | Nada |
| 8 a 13 | Zonas onde o time perdeu mais bolas e sofreu mais chances |
| 14 a 20 | Eixos de confronto (seção 5), brechas exploradas e jogadores adversários que mais renderam |

- **Precisão:** cada item extra tem `(20 − Precisão) × 2,5%` de chance de vir errado. Com Precisão baixa, os números aparecem como faixas.
- **Leitura ao vivo:** chance de `Leitura ao vivo × 5%` de avisar que o adversário mudou de estilo ou de formação.

**Sugestões do auxiliar.** De 1 a 3 por pausa, com botão de aplicar. Quantidade e acerto vêm da média entre a Leitura de jogo do auxiliar e a Leitura Tática do técnico.

**Custo dos ajustes** (Bloco 3). Multiplica a eficácia só no bloco seguinte.
| Ajuste | Exemplos | Eficácia no bloco seguinte |
|---|---|---|
| Leve | Instrução individual, empenho, substituição, 1 instrução do time em 1 degrau | Sem perda |
| Médio | 2 ou mais instruções do time | × 0,9 |
| Radical | Troca de estilo ou de formação | Perde `25% − (Ajuste nas Pausas − 10) × 1,5%`, entre 10% e 40% |

**Plano B.** O time pode treinar mais de uma tática, cada uma com seu entrosamento. Mudar para uma tática já treinada corta a perda radical pela metade. Tática sem treino usa o entrosamento mínimo da seção 4.

**Fala do técnico no intervalo.** O jogador escolhe entre Cobrar, Acalmar e Elogiar.
| Tom | Situação em que acerta |
|---|---|
| Cobrar | Perdendo ou apático |
| Acalmar | Ímpeto negativo ou vantagem curta |
| Elogiar | Jogando bem, placar a favor |

Tom certo: `5 + Motivação × 0,75` de ímpeto, de 6 a 20. Tom errado: -10. Situação neutra: nada.

**Delegar e expulsão.** Com o lado técnico delegado ou com o técnico expulso, o auxiliar decide por Comando, com as regras da IA.

**Técnicos da IA.** Regras fixas, sem IA generativa. A cada pausa, cada técnico segue seu perfil de reação do Bloco 6:
| Perfil | Comportamento |
|---|---|
| Conservador | Ganhando ou empatando, reduz Risco. Perdendo, só mexe a partir do minuto 60 |
| Agressivo | Empatando ou perdendo, sobe a linha e aumenta o Risco. Ganhando, mantém |
| Adaptável | Muda para reverter o eixo de confronto que está perdendo |
| Teimoso | Só mexe perdendo por 2 ou mais, ou a partir do minuto 75, e não troca de estilo |
| Calculista | Direciona instruções para a maior brecha que o adversário deixou aberta |

- **Leitura:** `Leitura Tática × 5%` de identificar o problema certo. Se errar, faz só o ajuste padrão do perfil.
- **Execução:** o Ajuste nas Pausas pesa no custo, como para o jogador.
- **Trocas:** tira quem está abaixo de 65 de energia ou com cartão em risco, a partir do minuto 60.
- **Limite:** 1 mudança radical por pausa, sujeita ao Respaldo do elenco.

### Respaldo do elenco (aprovado)
Medida de 0 a 100 da aceitação do técnico pelo grupo; insatisfação alta é Respaldo baixo. Vem da moral do grupo, da Gestão de Grupo do técnico e de marcas de vestiário como "grupo rachado". A conta entra no GDD de Gestão. Vale também para os técnicos da IA.

| Respaldo | Efeito nos ajustes da pausa |
|---|---|
| 40 a 100 | Nenhum |
| 15 a 39 | Ajustes rendem 10% menos no bloco seguinte, depois voltam ao normal |
| 0 a 14 | O mesmo, e uma mudança radical pode ser recusada |

**Recusa, só em caso extremo.**
- **O que pode ser recusado:** apenas mudança radical, ou seja, troca de estilo ou de formação. Instruções individuais, instruções do time, empenho e substituições nunca são recusadas.
- **Chance:** 25%, entre 10% e 35% conforme a Gestão de Grupo do técnico e a presença de Líder de vestiário em campo. Aparece antes de confirmar, como nas negociações.
- **Duração:** 1 bloco. O time segue na tática antiga até a pausa seguinte, quando a mudança entra sozinha, sem novo sorteio.
- **Limite:** no máximo 1 recusa por jogo.

## 8. Bola parada, cartões, lesões e substituições (aprovada)
**Bola parada ensaiada.** Atacante soma de 0 a +3 no valor da cobrança, pela Bola parada ensaiada do analista. O estilo Bola Parada soma mais +2 em BP e em Cab nessas jogadas, dentro do limite de ±5.

**Batedores.** Definidos na tática: um para escanteio, um para falta e um para pênalti. Sem definição, cobra quem tem o maior BP em campo.

**Escanteio.** Em duas etapas.
1. **A bola chega:** `40% + 1,5 ponto × (BP do batedor − Com do goleiro)`.
2. **Duelo aéreo:** `45% + 1,5 ponto × (Cab e Imp do atacante − Cab e Imp do zagueiro)`. Vencendo, cabeceio em Centro F6, sem ajuste de marcador. Xerife do jogo aéreo soma +2 ao defensor, Cabeceador ao atacante.

Se a bola não chega ou o duelo é perdido, a cadeia termina em recuperação do adversário ou novo reinício.

**Falta.** Depende da zona em que aconteceu, vista por quem ataca.
| Zona | O que acontece |
|---|---|
| F1 a F3, ou Lado | Reinício normal |
| Centro ou Meia, F4 e F5 | Cobrança direta (BP contra Ref e Mão; Chance de 7% em F4 e 12% em F5, com os ajustes da finalização) ou cruzamento na área, como no escanteio |
| F6 | Pênalti |

Na F6 a falha vira falta em 8% dos casos, em vez dos 22% da seção 3. Cava faltas soma 10 pontos à chance de falta quando o jogador falha.

**Pênalti.** `76% + 1,5 ponto × (BP e Comp do batedor − Ref e Agi do goleiro)`, entre 55% e 92%. Traços Cobrador de pênalti e Pegador de pênalti valem +2. Estudo de batedores do treinador de goleiros tira de 0 a 3 pontos.

**Disputa de pênaltis.** Cinco cobranças alternadas e depois cobranças alternadas até decidir. Base de 72%, mesma conta. Ordem definida na última pausa ou automática, por BP e Comp. Gelo e Decisivo valem +2.

**Referência de bola parada na temporada.** Cerca de 10 escanteios, 1,5 cobrança direta e 0,25 pênalti por jogo, somando cerca de 0,7 gol, parte da referência geral.

**Cartões.** Saem das faltas.
| Situação | Amarelo | Vermelho direto |
|---|---|---|
| Falta comum | 20% | 1% |
| Último defensor em contra-ataque | 40% | 15% |

- **Quem pesa:** Combatividade alta e os defeitos Esquentado e Indisciplinado aumentam a chance (valores no Anexo A); Desarme limpo reduz.
- **Jogador amarelado:** perde 1 no valor de desarme até o fim do jogo, salvo na dividida decisiva (abaixo).
- **Suspensão:** 3 amarelos dão 1 jogo de suspensão; vermelho, 1 jogo; vermelho direto, 2. Cada competição conta os seus.
- **Técnico expulso:** caso raro, conforme o temperamento, quando o ímpeto do time fica abaixo de -50.

**Dividida decisiva (aprovada).** O jogador amarelado decide sozinho se arrisca o vermelho para evitar um gol; o técnico não dá essa ordem.
- **Quando acontece:** ele é o marcador, a bola está em F5 ou F6 da visão de quem ataca, e não há outro defensor cobrindo a zona.
- **Perigo:** a chance de gol que o lance teria sem marcador (seção 3).
- **Julgamento:** o jogador entra se `Perigo ± erro de leitura ≥ limiar`. O erro é sorteado entre 0 e (20 − Decisão), para mais ou para menos: com Decisão 20 ele lê o lance exatamente; com Decisão baixa, entra sem precisar ou fica parado na hora errada.

| Situação | Limiar |
|---|---|
| Base | 25 |
| Empate ou diferença de 1 gol, do minuto 75 em diante | -5 |
| Diferença de 3 gols ou mais | +15 |
| Lance em F6 (a falta vira pênalti) | +10 |
| Combatividade 15 ou mais | -3 |
| Esquentado ou Indisciplinado | -5 |

- **Se entra:** disputa de desarme sem o -1. Ganhando, rouba a bola, sem cartão. Perdendo, comete falta e para o lance: 85% de vermelho pelo segundo amarelo. Em F6, é pênalti.
- **Se não entra:** o lance segue como zona sem marcador.
- **Exemplo:** empate aos 80 minutos, limiar 20. Num cara a cara em Centro F5, Perigo de 27: um zagueiro com Decisão 16 lê entre 23 e 31 e sempre entra. Num chute de Meia F5, Perigo de 10, ele lê entre 6 e 14 e não entra; com Decisão 5, lê até 25 e às vezes faz a falta sem necessidade.

**Lesões.** Sorteio para cada jogador a cada bloco.

`0,4% × (0,5 + Propensão a Lesão ÷ 10) × energia × preparador`
| Fator | Valor |
|---|---|
| Energia abaixo de 40 | × 2 |
| Energia abaixo de 25 | × 3 |
| Prevenção de lesões do preparador | De × 1,2 a × 0,7 |
| Falta dura sofrida | Novo sorteio na hora, com 1% extra |

| Gravidade | Peso | No jogo | Tempo fora |
|---|---|---|---|
| Leve | 60% | Continua, com -1 no valor e -10 de energia; o jogador decide na pausa | De 1 a 2 semanas |
| Média | 30% | Sai na hora (seção 1) | De 3 a 6 semanas |
| Grave | 10% | Sai na hora (seção 1) | De 8 a 24 semanas |

O departamento médico muda o tempo de recuperação e o risco de recaída (GDD de Gestão).

**Banco.** 9 reservas por jogo.

**Goleiro expulso ou lesionado sem troca.** Vai para o gol o jogador de linha com maior Agi, com todos os atributos de goleiro valendo 3.

## 9. Variância e metas de calibração (aprovada)
**Princípio.** Não existe sorteio de zebra nem correção por placar. A imprevisibilidade vem só de:
| Fonte | Onde |
|---|---|
| Sorteio de cada disputa, entre 5% e 95% | Seção 3 |
| Chance de gol por finalização | Seção 3 |
| Forma do dia, pela Consistência | Seção 3 |
| Ímpeto | Seção 6 |
| Cartões e lesões | Seção 8 |
| Decisões dos técnicos nas pausas | Seção 7 |

**As metas não existem dentro do jogo.** O motor não as conhece. Elas servem para o `simulador-balanceamento` medir milhares de jogos e indicar qual número ajustar.

**Definições para medir a zebra.**
- **Bem mais fraco:** média das notas dos titulares de 3 a 4 pontos abaixo da do adversário.
- **Plano neutro ou ruim:** o estilo padrão do técnico, sem encaixe com o elenco ou com o adversário.
- **Plano certo:** viabilidade de +1 ou mais e estar entre os 3 melhores dos 12 estilos naquele confronto, pela soma dos 3 eixos menos a brecha média por zona.
- **Elenco compatível:** os 20 clubes com maior viabilidade naquele estilo.
- **Risco alto:** estilo com nota de Risco 15 ou mais (hoje Pressão Pós-Perda, Encaixe Individual e Jogo Apoiado).

**Metas.** Medidas com 5.000 jogos por cenário.
| Cenário | Meta | Faixa aceita |
|---|---|---|
| Bem mais fraco vence, com plano neutro ou ruim | 12% | 10% a 15% |
| Bem mais fraco vence, com plano certo | 25% | 22% a 28% |
| Times iguais: casa, empate e fora | 45%, 27% e 28% | ±4 pontos cada |
| Gols por jogo, temporada completa | 2,5 | 2,3 a 2,7 |
| Dois times de Bloco Baixo: gols por jogo | 1,3 | 1,0 a 1,6 |
| Dois times de Risco alto: gols por jogo | 2,7 | 2,4 a 3,0 |
| 0 a 0, temporada completa | 8% | 6% a 10% |
| 0 a 0 entre dois times de Bloco Baixo | 25% | 18% a 32% |
| Finalizações por jogo | 25 | 18 a 32 |
| Contra-ataques por jogo | 10 | 8 a 12 |
| Escanteios por jogo | 10 | 8 a 12 |
| Amarelos por jogo | 4 | 3 a 5 |
| Lesões médias ou graves por jogo | 0,3 | 0,2 a 0,4 |

**Equilíbrio entre os 12 estilos.** Com elenco compatível, nenhum estilo pode superar a média em mais de 8 pontos percentuais de aproveitamento em uma temporada. O plano certo nunca faz o time bem mais fraco passar de 35% de vitórias: o elenco continua dando a vantagem.

**O que ajustar, nesta ordem.** Um número por vez, medindo de novo a cada mudança.
1. Pontos por diferença de atributo (seção 3), para o peso do elenco.
2. Bases das ações e chance por zona, para finalizações e gols.
3. Limites de eixos e viabilidade (seção 5), para o peso do plano.
4. Valores de sinergia e brecha (seção 4).
5. Fator casa e ímpeto (seção 6).
6. Taxas de falta, cartão e lesão (seções 3 e 8).

Se uma meta não fechar, a solução é mudar um desses números. Nunca criar compensação dentro da partida.

**Calibração em vigor (aprovada em 09/11/2026).** Vale sobre os números das seções 3 e 8: chance por zona × 0,80; bases de profundidade 38, lançamento 35, condução 62, drible 45 e cruzamento 30; falta na F6 em 3%. Com isso, o Perigo do exemplo da dividida decisiva (seção 8) fica em cerca de 22, e não 27.

## 10. Saída para narração, estatísticas e relatório (aprovada)
**Registro de lances.** O motor não escreve texto: ele produz uma lista de lances, e o resto do jogo lê essa lista. Serve hoje para o texto e, depois, para o 2D.

Campos de cada lance: minuto, bloco, cadeia, tema e lance (os mesmos nomes de `dados/narracao/`), clube, jogador, jogador2, goleiro, zona de origem e de destino, resultado, contexto (placar, minuto, tipo de jogo, ímpeto, traço, qualidade, defeito, perfil de jovem, estilo) e combinação ativa.

**Partida reproduzível.** Toda partida tem uma semente de sorteio. Mesma semente, táticas e decisões dão o mesmo jogo. Isso facilita testes, salvamento e o replay no 2D.

**Do motor para a narração.**
| Resultado do motor | Tema | Lances |
|---|---|---|
| Gol | `gol` | Comum, de cabeça, de fora da área, de contra-ataque, contra |
| Finalização sem gol | `finalizacao`, `goleiro` | Para fora, trave, bloqueado, furada, cara a cara perdido; defesa simples, defesa difícil, rebote, saída do gol, falha |
| Elo de passe, drible ou roubo | `jogada` | Drible, desarme, passe decisivo, cruzamento, contra-ataque, perda de bola, pressão, combinação descoberta |
| Falta e cartão | `falta` | Falta, amarelo, segundo amarelo, vermelho direto, reclamação |
| Dividida decisiva | `falta` | Dividida ganha, dividida perdida (só com vermelho; sem vermelho, usa Falta), dividida evitada |
| Lesão | `lesao` | Pancada, atendimento, saída de campo, substituição |
| Bola parada | `bola_parada`, `penalti` | Escanteio, falta perigosa, lateral longo, impedimento; marcado, convertido, perdido, defendido |
| Início, intervalo, fim | `abertura` | Conforme o momento |
| Pausa | `pausas` | Pausa de 15 minutos, troca de estilo, ajuste do adversário, recusa do elenco |
| Ímpeto cruzando uma faixa | `impeto` | Torcida empurra, vaia, jogo muda de clima, time apático |
| "Pôr fogo" | `fogo` | Tentativa, sucesso, cartão, torcida rival inflamada |

**Finalização sem gol.** Sorteio do motor, nesta ordem. Define o reinício.
| Etapa | Regra | Reinício |
|---|---|---|
| Bloqueado | 25% com marcador na zona | Escanteio ou recuperação da defesa |
| Para fora | 60% do restante | Tiro de meta |
| No alvo | O que sobrar | Segurança nas Mãos decide (seção 3) |

Referência: cerca de 10 finalizações no alvo em 25 por jogo.

**Subtipos.** Só mudam o texto e as estatísticas, nunca o resultado.
| Lance | Regra |
|---|---|
| Trave | 8% das finalizações sem gol, tirados de Para fora |
| Furada | Mais provável com Compostura e Finalização baixas |
| Gol contra | 3% dos gols de cruzamento e escanteio |
| Falha do goleiro | Gol em chance de até 8%, com Mão baixa |
| Impedimento | 15% das falhas de passe em profundidade e lançamento; mais comum contra Linha Alta. Conta como Bola fora |
| Lateral longo | Reinício em Lado F4 ou F5 com jogador de Força e Passe altos |

**O que vira frase.** Gols, finalizações, cartões, lesões, bolas paradas perigosas e elos de F4 em diante. Posse resumida raramente. De 8 a 14 frases por bloco. O Comentarista fala depois de gol, mudança de estilo ou queda de energia, em 20% a 30% das frases. A escolha da frase segue a regra do gerador de narração: vence o contexto mais específico.

**Repetição de frases.** A frase só repete quando as do lance acabarem, e volta a que saiu há mais tempo. Em lance menor (`jogada`, escanteio comum), o jogo fica em silêncio em vez de repetir. Gol, cartão, lesão e pênalti sempre têm frase.

**Estatísticas do jogo.** Gols, finalizações, no alvo, chances esperadas (soma das chances de gol), posse, passes, desarmes, faltas, cartões, escanteios, impedimentos, contra-ataques e mapa de calor por zona. Chances esperadas mostram quando o placar foi injusto.

**Nota do jogador, de 1 a 10.** Parte de 6,0 e soma os lances dele:
| Lance | Nota |
|---|---|
| Gol | +1,0 |
| Assistência | +0,6 |
| Passe decisivo ou drible certo, de F4 em diante | +0,1 |
| Finalização com chance alta perdida | -0,3 |
| Desarme ou interceptação em F1 a F3 | +0,1 |
| Perda em F1 a F3 | -0,2 |
| Defesa difícil | +0,3 |
| Gol sofrido (goleiro e defesa) | -0,3 |
| Jogo sem sofrer gol (goleiro e defesa) | +0,3 |
| Pênalti defendido | +1,0 |
| Pênalti perdido | -0,5 |
| Pênalti cometido | -0,5 |
| Gol contra | -0,6 |
| Amarelo | -0,3 |
| Vermelho | -1,5 |

**Relatório.** O relatório da seção 7 lê só o registro. Os erros de Precisão do analista acontecem apenas no que é exibido, sem mudar o que aconteceu.

**Depois do jogo.** O registro alimenta notícias e rumores, moral, Respaldo do elenco, humor da torcida, confiança da diretoria, suspensões e lesões.

## Anexo A. Qualidades, defeitos e perfis de jovem (aprovado)
Bônus e penalidades no valor respeitam o limite de ±5 (seção 3). Os números finais saem do `simulador-balanceamento`.

**Qualidades.**
| Qualidade | Na partida | Fora da partida (GDD de Gestão) |
|---|---|---|
| Incendiário | "Pôr fogo" (seção 6) | Nenhum |
| Gelo | Seções 6 e 8, e não perde moral com vaia, provocação ou cartão | Nenhum |
| Líder de vestiário | Recusa (seção 7), e as quedas de moral do time valem × 0,75 com ele em campo; não acumula | Sobe o Respaldo |
| Decisivo | +2 em finalização e pênalti do minuto 75 em diante, com empate ou diferença de 1 gol; disputa de pênaltis (seção 8) | Nenhum |
| Raçudo | +1 com o time perdendo nos blocos 5 e 6; penalidade de energia 1 ponto menor | Nenhum |
| Ídolo/Cria da casa | Gol ou assistência em casa dá +10 de ímpeto extra | Vender irrita muito a torcida |
| Carismático | Nenhum | Imagem e patrocínio |
| Exemplo profissional | Nenhum | Jovens perto dele evoluem mais |

**Defeitos.** O efeito na torcida usa a escala P/M/G da imprensa e entra no pós-jogo, com teto de M por jogador.
| Defeito | Na partida | Torcida |
|---|---|---|
| Fominha | De F4 em diante, peso × 1,3 em drible e finalização e × 0,8 em passe | Perder a bola em F5 ou F6 com companheiro livre: -P |
| Esquentado | Amarelo × 1,5 e vermelho direto × 2; ao sofrer falta dura, 10% de revidar (75% amarelo, 25% vermelho) | Expulsão: -M |
| Indisciplinado | Amarelo × 1,25; eficácia da instrução -0,10 | Cartão: -P |
| Preguiçoso sem a bola | Peso × 0,8 na fase defensiva; Empenho Defensivo Alto vale Normal; não cobre buraco; gasta 0,5 a menos de energia por bloco | Derrota em casa: -P |
| Firuleiro | Peso × 1,2 em drible, × 1,5 vencendo por 2 gols ou mais; -1 no drible em F1 a F3 | Perda por drible em F1 a F3: -P; goleada a favor: +P |

**Psicólogo.** O excesso de cada defeito é multiplicado por `1 − Amenizar ÷ 50`: com Amenizar 20, reduz 40%, e o defeito nunca some. Exemplo: amarelo × 1,5 vira × 1,3.

**Perfis de jovem.**
| Perfil | Na partida |
|---|---|
| Marrento | Amarelo × 1,25 |
| Inseguro | -1 em clássico e decisão |
| Pé no chão, Deslumbrado | Nenhum; só na evolução |

## Pendências do GDD
Nenhuma. Conta do Respaldo, condição física, treino de mais de uma tática e tempos de lesão estão em `GDD-gestao.md`, seções 2 a 4.
