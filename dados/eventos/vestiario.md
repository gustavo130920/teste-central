# Eventos: vestiário

Data: 08/11/2026 · 20 eventos · 3 cadeias

### VES-001 · Panelinha no refeitório   [Cadeia: Vestiário rachado · Elo 1/3]
- **Gatilho:** Fase temporada, Moral elenco até 12 · **Alvo:** Camada craque ({jogador}) · Camada veterano ({jogador2})
- **Frequência:** Incomum ×0,5 com Gestão de Grupo 15+ · **Intervalo:** 1 · **Prazo:** 5 dias · **Delegado:** A
- **Texto:** O elenco se dividiu em dois grupos, um em volta de {jogador} e outro de {jogador2}. No refeitório já tem até mesa marcada.
- **A) Deixar quieto, isso se resolve em campo:** Moral jogador +P · Moral elenco −P · Segue: VES-003 em 3 semanas (60%)
- **B) Reunir os dois e cobrar paz** · Sorteio 50% + Gestão de Grupo
  - Sucesso: Moral elenco +M · Entrosamento +P
  - Falha: Moral jogador −M · Moral jogador2 −P · Segue: VES-003 em 2 semanas (70%)
- **C) Misturar os grupos nos quartos e nos treinos:** Entrosamento +P · Moral jogador −P · Segue: VES-002 em 3 semanas (50%)
- **D) Levar o caso para a psicologia do clube mediar** [Requisito: Gestão emocional 14+]: Moral elenco +P · Moral jogador +P

### VES-002 · Quem dorme com quem   [Cadeia: Vestiário rachado · Elo 2/3]
- **Gatilho:** Só em cadeia · **Alvo:** os mesmos do elo anterior
- **Frequência:** — · **Prazo:** 4 dias · **Delegado:** B
- **Texto:** A mistura deu resultado no campo, mas {jogador2} pediu para voltar a dividir quarto com os antigos parceiros. Ele diz que você mexeu no que funcionava.
- **A) Manter a mistura até o fim do turno:** Entrosamento +M · Moral jogador2 −M · Segue: VES-004 em 4 semanas (40%)
- **B) Ceder e voltar ao que era:** Moral jogador2 +M · Entrosamento −P
- **C) Dar a {jogador2} uma função de liderança no grupo** · Sorteio 55% + Gestão de Grupo
  - Sucesso: Moral jogador2 +M · Moral elenco +P
  - Falha: Moral jogador −M · Segue: VES-004 em 3 semanas (60%)

### VES-003 · Mesa separada, jogo separado   [Cadeia: Vestiário rachado · Elo 2/3]
- **Gatilho:** Só em cadeia · **Alvo:** os mesmos do elo anterior
- **Frequência:** — · **Prazo:** 3 dias · **Delegado:** A
- **Texto:** No último jogo, quase ninguém passou a bola para {jogador}, e o lance virou assunto na arquibancada. Os dois grupos já nem comemoram juntos.
- **A) Barrar os dois no próximo jogo:** Suspensão 1 jogos · Moral jogador −M · Moral jogador2 −M · Humor +P · Segue: VES-004 em 2 semanas (50%)
- **B) Escolher um lado e apoiar {jogador}:** Moral jogador +M · Moral jogador2 −M · Moral grupo −M · Marca: grupo rachado · Segue: VES-004 em 3 semanas (80%)
- **C) Pedir ao líder do elenco que resolva** [Requisito: Líder de vestiário no elenco]: Moral elenco +M · Entrosamento +P

### VES-004 · Ou ele, ou eu   [Cadeia: Vestiário rachado · Elo 3/3]
- **Gatilho:** Só em cadeia · **Alvo:** os mesmos do elo anterior
- **Frequência:** — · **Prazo:** 5 dias · **Delegado:** C
- **Texto:** {jogador} e {jogador2} avisaram que não jogam mais juntos: um dos dois quer sair na próxima janela. A diretoria já sabe.
- **A) Bancar {jogador} e liberar {jogador2}:** Moral jogador +M · Sai do clube ({jogador2}) · Moral grupo −M · Caixa +M
- **B) Bancar {jogador2} e liberar {jogador}:** Moral jogador2 +M · Sai do clube ({jogador}) · Humor −M · Caixa +G
- **C) Segurar os dois e impor paz** · Sorteio 40% + Disciplina
  - Sucesso: Moral elenco +G · Confiança +M
  - Falha: Moral elenco −G · Confiança −M · Interesse de {clube_interessado}

### VES-005 · Três da manhã   [Cadeia: Vida noturna · Elo 1/3]
- **Gatilho:** Fase temporada · **Alvo:** Defeito Indisciplinado ou Perfil de jovem Deslumbrado
- **Frequência:** Comum ×0,5 com Amenizar defeitos 15+ · **Intervalo:** 0 · **Prazo:** 3 dias · **Delegado:** B
- **Texto:** {jogador} foi visto em uma festa às três da manhã, dois dias antes do jogo. A notícia chegou pela portaria do CT.
- **A) Multar e tirar do próximo jogo:** Multa · Suspensão 1 jogos · Moral elenco +P · Moral jogador −M · Segue: VES-006 em 3 semanas (20%)
- **B) Conversa reservada, sem punição:** Moral jogador +P · Moral elenco −P · Segue: VES-006 em 2 semanas (50%)
- **C) Perdoar em troca de treino a mais** · Sorteio 55% + Disciplina
  - Sucesso: Moral jogador +M · Entrosamento +P
  - Falha: Treino perdido · Moral jogador −P · Segue: VES-006 em 2 semanas (60%)

### VES-006 · O vídeo vazou   [Cadeia: Vida noturna · Elo 2/3]
- **Gatilho:** Só em cadeia · **Alvo:** o mesmo do elo anterior
- **Frequência:** — · **Prazo:** 2 dias · **Delegado:** A
- **Texto:** Um vídeo de {jogador} na noite chegou às redes, e {reporter} já pergunta o que o clube vai fazer.
- **A) Nota oficial e punição pública:** Multa · Humor +P · Moral jogador −M · Lealdade jogador −P · Segue: VES-007 em 4 semanas (30%)
- **B) Blindar o jogador na coletiva:** Moral jogador +M · Lealdade jogador +P · Humor −M · Confiança −P · Segue: VES-007 em 3 semanas (50%)
- **C) Pedir à direção de futebol que segure a repercussão** [Requisito: Blindagem do técnico 14+]: Confiança +P · Moral jogador +P

### VES-007 · Reincidente   [Cadeia: Vida noturna · Elo 3/3]
- **Gatilho:** Só em cadeia · **Alvo:** o mesmo do elo anterior
- **Frequência:** — · **Prazo:** 4 dias · **Delegado:** B
- **Texto:** {jogador} voltou à noite e, desta vez, perdeu o treino da manhã. Metade do elenco espera a sua reação.
- **A) Afastar por tempo indeterminado:** Suspensão 6 jogos · Moral elenco +M · Humor +M · Moral jogador −G · Lealdade jogador −G
- **B) Negociar na próxima janela:** Sai do clube ({jogador}) · Caixa +M · Moral elenco +P · Humor −P
- **C) Última chance, com acompanhamento psicológico** · Sorteio 40% + Amenizar defeitos
  - Sucesso: Moral jogador +G · Lealdade jogador +M · Moral elenco +P
  - Falha: Moral elenco −G · Treino perdido · Confiança −M

### VES-008 · A braçadeira pesa   [Cadeia: Braçadeira em disputa · Elo 1/3]
- **Gatilho:** Sequência 3+ derrotas · **Alvo:** Qualidade Líder de vestiário ({jogador}) · Camada craque ({jogador2})
- **Frequência:** Incomum ×0,5 com Gestão de Grupo 15+ · **Intervalo:** 1 · **Prazo:** 5 dias · **Delegado:** A
- **Texto:** {jogador2} disse no vestiário que a braçadeira de {jogador} atrapalha mais do que ajuda. Ninguém respondeu, e o silêncio preocupou a comissão.
- **A) Manter o capitão e encerrar o assunto:** Moral jogador +M · Moral jogador2 −M · Segue: VES-009 em 3 semanas (50%)
- **B) Passar a braçadeira para {jogador2}:** Moral jogador2 +M · Moral jogador −M · Lealdade jogador −P · Segue: VES-010 em 4 semanas (60%)
- **C) Dividir a capitania entre os dois** · Sorteio 50% + Gestão de Grupo
  - Sucesso: Moral elenco +M
  - Falha: Moral jogador −P · Moral jogador2 −P · Moral elenco −P

### VES-009 · Dois capitães no gramado   [Cadeia: Braçadeira em disputa · Elo 2/3]
- **Gatilho:** Só em cadeia · **Alvo:** os mesmos do elo anterior
- **Frequência:** — · **Prazo:** 3 dias · **Delegado:** C
- **Texto:** Em campo, {jogador2} passou a gritar as ordens por cima de {jogador}, e os mais novos já não sabem a quem ouvir.
- **A) Cobrar {jogador2} diante do grupo:** Moral jogador +P · Moral jogador2 −M · Segue: VES-010 em 3 semanas (60%)
- **B) Conversar em particular com {jogador2}** · Sorteio 55% + Motivação
  - Sucesso: Moral jogador2 +M · Entrosamento +P
  - Falha: Moral jogador2 −M · Segue: VES-010 em 2 semanas (70%)
- **C) Deixar os dois disputarem a liderança no campo:** Ímpeto clube +P · Entrosamento −M

### VES-010 · A sala cheia   [Cadeia: Braçadeira em disputa · Elo 3/3]
- **Gatilho:** Só em cadeia · **Alvo:** os mesmos do elo anterior
- **Frequência:** — · **Prazo:** 2 dias · **Delegado:** A
- **Texto:** O grupo pediu uma decisão definitiva sobre a braçadeira. A reunião é amanhã, com o elenco inteiro na sala.
- **A) Fazer votação secreta no elenco:** Moral elenco +M · Confiança −P
- **B) Decidir sozinho e assumir o peso** [Requisito: Disciplina 14+]: Moral elenco +G · Confiança +M · Moral jogador −M
- **C) Tirar a braçadeira dos dois e dar a um veterano:** Moral jogador −G · Moral jogador2 −M · Moral grupo +M · Humor +P

### VES-011 · Empurrão no rachão
- **Gatilho:** Fase temporada · **Alvo:** Defeito Esquentado ({jogador}) · Camada titular ({jogador2})
- **Frequência:** Comum ×2 com Sequência 3+ derrotas · **Intervalo:** 0 · **Prazo:** 2 dias · **Delegado:** A
- **Texto:** {jogador} e {jogador2} se estranharam no rachão, e a discussão terminou em empurrão. Já tinha câmera no portão do CT.
- **A) Multar os dois:** Multa · Moral elenco +P · Moral jogador −P · Moral jogador2 −P
- **B) Fazer os dois falarem juntos com a imprensa:** Humor +P · Moral jogador −P
- **C) Usar a briga como combustível para o próximo jogo** · Sorteio 45% + Motivação
  - Sucesso: Ímpeto clube +M · Moral elenco +P
  - Falha: Treino perdido · Moral elenco −M · Confiança −P

### VES-012 · Sem jogar, eu saio
- **Gatilho:** Fase temporada · **Alvo:** Camada reserva, Lealdade abaixo da Ambição
- **Frequência:** Comum · **Intervalo:** 0 · **Prazo:** 7 dias · **Delegado:** B
- **Texto:** {jogador} bateu na sua sala e avisou: sem minutos, vai pedir para sair na próxima janela.
- **A) Prometer minutos nas próximas rodadas:** Moral jogador +M · Moral grupo −P · Marca: promessa de minutos
- **B) Dizer que a vaga se conquista no treino:** Moral elenco +P · Moral jogador −M · Lealdade jogador −P
- **C) Procurar um empréstimo:** Caixa +P · Moral jogador +P · Sai do clube ({jogador}) · Moral grupo −P
- **D) Buscar uma função nova para ele no elenco** [Requisito: Gestão de elenco 13+]: Moral jogador +M · Lealdade jogador +P

### VES-013 · O padrinho
- **Gatilho:** Sempre · **Alvo:** Qualidade Exemplo profissional ({jogador}) · Camada jovem ({jogador2})
- **Frequência:** Incomum · **Intervalo:** 1 · **Prazo:** 7 dias · **Delegado:** B
- **Texto:** {jogador} se ofereceu para acompanhar {jogador2} nos treinos extras e dividir o quarto nas viagens. O garoto está animado; a preparação física, nem tanto.
- **A) Aceitar a ideia:** Moral jogador2 +M · Marca: mentor ativo · Entrosamento −P
- **B) Manter a rotina da comissão:** Entrosamento +P · Moral jogador −P
- **C) Formalizar o acompanhamento com a base** · Sorteio 60% + Formação de jovens
  - Sucesso: Moral jogador2 +M · Lealdade jogador2 +M · Marca: mentor ativo
  - Falha: Moral jogador2 −P

### VES-014 · Recado do capitão
- **Gatilho:** Sequência 3+ vitórias · **Alvo:** Clube
- **Frequência:** Comum · **Intervalo:** 0 · **Prazo:** 2 dias · **Delegado:** B
- **Texto:** Depois da boa sequência, o elenco mandou um recado pelo capitão: quer dois dias de folga antes da próxima viagem.
- **A) Dar os dois dias:** Moral elenco +M · Entrosamento −P
- **B) Manter a programação:** Entrosamento +M · Moral elenco −P
- **C) Dar a folga em troca de um compromisso do grupo** · Sorteio 55% + Motivação
  - Sucesso: Moral elenco +M · Entrosamento +P
  - Falha: Moral elenco −P · Treino perdido

### VES-015 · Livre na área
- **Gatilho:** Fase temporada · **Alvo:** Defeito Fominha ({jogador}) · Camada titular ({jogador2})
- **Frequência:** Comum ×0,5 com Amenizar defeitos 15+ · **Intervalo:** 0 · **Prazo:** 3 dias · **Delegado:** B
- **Texto:** {jogador} ignorou {jogador2} livre na área e chutou de onde não dava. No vestiário, o colega cobrou na frente de todo mundo.
- **A) Dar razão a {jogador2}:** Moral jogador2 +M · Moral grupo +P · Moral jogador −M
- **B) Não se meter:** Moral jogador +P · Moral jogador2 −P · Entrosamento −P
- **C) Mostrar o lance no vídeo para o grupo** · Sorteio 50% + Disciplina
  - Sucesso: Moral jogador +P · Entrosamento +M
  - Falha: Moral jogador −M · Moral grupo −P

### VES-016 · Nascimento na véspera
- **Gatilho:** Próximo jogo decisão · **Alvo:** Camada titular
- **Frequência:** Incomum · **Intervalo:** 1 · **Prazo:** 2 dias · **Delegado:** A
- **Texto:** O filho de {jogador} deve nascer na véspera da decisão, em outra cidade. Ele pediu para ser liberado e prometeu voltar a tempo.
- **A) Liberar:** Moral jogador +M · Lealdade jogador +M · Ímpeto clube −P
- **B) Negar:** Entrosamento +P · Moral jogador −M · Lealdade jogador −M · Humor −P
- **C) Pagar um voo fretado para ele ir e voltar** [Requisito: Caixa 1 folha]: Moral jogador +M · Lealdade jogador +M · Caixa −P

### VES-017 · Porta fechada
- **Gatilho:** Sequência 4+ derrotas, Moral elenco até 9 · **Alvo:** Camada veterano
- **Frequência:** Raro ×2 com Marca: grupo rachado · **Intervalo:** 2 · **Prazo:** 2 dias · **Delegado:** B
- **Texto:** O elenco fez uma reunião no hotel sem avisar a comissão, e {jogador} tomou a palavra. A porta fechada virou notícia antes do almoço.
- **A) Entrar na reunião e abrir o jogo** · Sorteio 45% + Gestão de Grupo
  - Sucesso: Moral elenco +G · Confiança +M · Entrosamento +M
  - Falha: Moral elenco −G · Confiança −M
- **B) Ignorar e cobrar em campo:** Moral grupo +P · Moral elenco −M · Confiança −P
- **C) Punir quem convocou:** Multa · Confiança +M · Moral jogador −G · Moral elenco −M
- **D) Pedir à direção de futebol que segure a pressão de cima** [Requisito: Blindagem do técnico 15+]: Confiança +M · Moral elenco +P

### VES-018 · O relatório do GPS
- **Gatilho:** Fase temporada · **Alvo:** Defeito Preguiçoso sem a bola
- **Frequência:** Comum ×0,5 com Amenizar defeitos 15+ · **Intervalo:** 0 · **Prazo:** 4 dias · **Delegado:** B
- **Texto:** O GPS mostrou {jogador} com a menor distância do time nos três últimos jogos. A preparação física quer levar o número para a sala do elenco.
- **A) Expor os números ao grupo:** Moral elenco +P · Moral jogador −M
- **B) Tratar em particular:** Moral jogador +P · Entrosamento −P
- **C) Montar um treino específico** · Sorteio 50% + Motivação
  - Sucesso: Entrosamento +M · Moral jogador +P
  - Falha: Moral jogador −M · Treino perdido

### VES-019 · Fogo no clássico
- **Gatilho:** Próximo jogo clássico · **Alvo:** Qualidade Incendiário
- **Frequência:** Incomum · **Intervalo:** 0 · **Prazo:** 2 dias · **Delegado:** A
- **Texto:** Na véspera do jogo contra {rival}, {jogador} prometeu no vestiário que vai botar fogo na partida. O grupo adorou; a comissão ficou em dúvida.
- **A) Pedir calma:** Confiança +P · Moral jogador −P
- **B) Liberar:** Ímpeto clube +M · Ímpeto rival +P · Confiança −P
- **C) Apoiar, mas combinar até onde ele pode ir** · Sorteio 50% + Compostura
  - Sucesso: Ímpeto clube +M · Humor +P
  - Falha: Suspensão 1 jogos · Ímpeto rival +M · Humor −P

### VES-020 · A última temporada
- **Gatilho:** Fase reta final · **Alvo:** Qualidade Ídolo/Cria da casa, Camada veterano
- **Frequência:** Raro · **Intervalo:** Único · **Prazo:** 10 dias · **Delegado:** A
- **Texto:** {jogador} chamou você depois do treino e disse que esta será a última temporada dele. Quer saber se terá despedida em casa, e a notícia ainda não saiu.
- **A) Anunciar e preparar a despedida:** Humor +G · Público +M · Moral jogador +M · Moral elenco −P
- **B) Pedir para esperar o fim do campeonato:** Moral elenco +P · Moral jogador −P
- **C) Tentar convencê-lo a jogar mais um ano** · Sorteio 40% + Motivação
  - Sucesso: Humor +M · Lealdade jogador +M · Moral elenco +P · Marca: despedida adiada
  - Falha: Moral jogador −M · Humor −P
- **D) Convidá-lo para a comissão quando parar** [Requisito: Gestão de Grupo 13+]: Humor +G · Moral jogador +G · Caixa −P
