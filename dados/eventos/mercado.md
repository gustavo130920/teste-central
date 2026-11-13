# Eventos: mercado

Data: 08/11/2026 · 15 eventos · 2 cadeias

### MER-001 · A oferta de fora   [Cadeia: Cobiça de fora · Elo 1/3]
- **Gatilho:** Fase janela · **Alvo:** Camada craque, Lealdade abaixo da Ambição
- **Frequência:** Incomum · **Intervalo:** 1 · **Prazo:** 7 dias · **Delegado:** B
- **Texto:** {clube_interessado} ofereceu {valor} por {jogador}, e ele já sabe. Quer uma definição até o fim da semana.
- **A) Aceitar e vender:** Sai do clube ({jogador}) · Caixa +M · Humor −M
- **B) Recusar sem conversa:** Humor +P · Moral jogador −M · Lealdade jogador −P · Segue: MER-002 em 3 semanas (60%)
- **C) Dar aumento para ele ficar:** Moral jogador +M · Lealdade jogador +P · Folha +M · Moral grupo −P · Segue: MER-002 em 8 semanas (20%)
- **D) Pedir mais dinheiro por ele** · Sorteio 45% + Negociação
  - Sucesso: Sai do clube ({jogador}) · Caixa +M · Orçamento +P
  - Falha: Moral jogador −M · Segue: MER-002 em 2 semanas (50%)

### MER-002 · Cara fechada   [Cadeia: Cobiça de fora · Elo 2/3]
- **Gatilho:** Só em cadeia · **Alvo:** o mesmo do elo anterior
- **Frequência:** — · **Prazo:** 5 dias · **Delegado:** C
- **Texto:** {jogador} parou de falar com a comissão e treina no modo automático. {clube_interessado} voltou com uma oferta um pouco melhor.
- **A) Vender agora:** Sai do clube ({jogador}) · Caixa +M · Humor −P
- **B) Barrar até ele esfriar a cabeça:** Moral jogador −M · Moral elenco +P · Segue: MER-003 em 3 semanas (50%)
- **C) Prometer a saída na próxima janela:** Fica até o fim da temporada · Moral jogador +M · Confiança −P · Marca: saída combinada
- **D) Mediar pela direção de futebol** [Requisito: Gestão de elenco 14+]: Moral jogador +M · Lealdade jogador +P

### MER-003 · Desconforto muscular   [Cadeia: Cobiça de fora · Elo 3/3]
- **Gatilho:** Só em cadeia · **Alvo:** o mesmo do elo anterior
- **Frequência:** — · **Prazo:** 3 dias · **Delegado:** A
- **Texto:** {jogador} alegou desconforto e não viajou com o time. Todo mundo no clube sabe que não é lesão.
- **A) Vender pelo que vier:** Sai do clube ({jogador}) · Caixa +P · Humor −M · Moral elenco +P
- **B) Afastar do elenco:** Suspensão 6 jogos · Moral jogador −G · Confiança +M · Caixa −M · Moral elenco +P
- **C) Sentar para um último acordo** · Sorteio 40% + Negociação
  - Sucesso: Moral jogador +G · Lealdade jogador +M · Folha +P
  - Falha: Sai do clube ({jogador}) · Caixa +P · Humor −G

### MER-004 · Proposta sem papel   [Cadeia: Proposta de gaveta · Elo 1/3]
- **Gatilho:** Fase janela · **Alvo:** perfil Blefador ({empresario}) · Camada titular ({jogador})
- **Frequência:** Comum ×0,5 com Rede de contatos 15+ · **Intervalo:** 0 · **Prazo:** 5 dias · **Delegado:** B
- **Texto:** {empresario} avisa que {jogador} tem proposta de {clube_interessado} e só fica com aumento. Documento, por enquanto, ninguém viu.
- **A) Pagar o aumento pedido:** Moral jogador +M · Folha +M · Memória +P · Moral grupo −P
- **B) Pagar para ver:** Memória −P · Moral jogador −P · Confiança +P · Segue: MER-005 em 2 semanas (50%)
- **C) Ligar para {clube_interessado} e checar** · Sorteio 50% + Rede de contatos
  - Sucesso: Memória −M · Confiança +P · Marca: blefe descoberto
  - Falha: Memória −P · Segue: MER-005 em 2 semanas (70%)
- **D) Mostrar que já sabe do blefe e renovar pelo valor atual** [Requisito: Rede de contatos 16+]: Moral jogador +P · Marca: blefe descoberto

### MER-005 · Plantada no jornal   [Cadeia: Proposta de gaveta · Elo 2/3]
- **Gatilho:** Só em cadeia · **Alvo:** os mesmos do elo anterior
- **Frequência:** — · **Prazo:** 3 dias · **Delegado:** B
- **Texto:** {reporter} publicou que {clube_interessado} estaria perto de levar {jogador}. A fonte, dizem no CT, é o próprio escritório de {empresario}.
- **A) Desmentir em público:** Confiança +P · Memória −M · Moral jogador −P · Segue: MER-006 em 3 semanas (40%)
- **B) Ceder e pagar luvas:** Moral jogador +P · Caixa −P
- **C) Chamar {empresario} para uma conversa dura** · Sorteio 45% + Negociação
  - Sucesso: Memória +P · Moral jogador +P
  - Falha: Memória −M · Segue: MER-006 em 3 semanas (70%)

### MER-006 · Escritório fechado   [Cadeia: Proposta de gaveta · Elo 3/3]
- **Gatilho:** Só em cadeia · **Alvo:** os mesmos do elo anterior
- **Frequência:** — · **Prazo:** 7 dias · **Delegado:** A
- **Texto:** {empresario} mandou avisar que, enquanto você estiver aí, nenhum cliente do escritório assina com {clube}.
- **A) Fazer as pazes, com concessão:** Memória +G · Caixa −M · Confiança −P
- **B) Manter a posição e ir a público:** Memória −G · Humor +M · Confiança +P · Moral jogador −P
- **C) Costurar um acordo discreto** [Requisito: Negociação 15+]: Memória +M · Moral jogador +P

### MER-007 · Seis meses de contrato
- **Gatilho:** Fase temporada · **Alvo:** Camada titular
- **Frequência:** Comum · **Intervalo:** 0 · **Prazo:** 10 dias · **Delegado:** B
- **Texto:** O contrato de {jogador} acaba em seis meses e {empresario} não respondeu à última oferta. Daqui a pouco ele pode assinar com quem quiser.
- **A) Melhorar a oferta:** Moral jogador +P · Lealdade jogador +P · Folha +P · Caixa −P
- **B) Manter a oferta e esperar** · Sorteio 40% + Negociação
  - Sucesso: Moral jogador +P · Lealdade jogador +P
  - Falha: Sai do clube ({jogador}) · Moral jogador −P
- **C) Vender agora, por menos:** Sai do clube ({jogador}) · Caixa +P · Humor −P

### MER-008 · A fase boa cobra
- **Gatilho:** Sequência 5+ vitórias · **Alvo:** Camada craque, Lealdade abaixo da Ambição
- **Frequência:** Comum · **Intervalo:** 1 · **Prazo:** 7 dias · **Delegado:** B
- **Texto:** Com o time voando, {jogador} pediu para rever o contrato. Diz que ganha menos do que entrega.
- **A) Dar o aumento:** Moral jogador +M · Lealdade jogador +P · Folha +M · Moral grupo −P
- **B) Recusar até o fim da temporada:** Confiança +P · Moral jogador −M
- **C) Oferecer bônus por metas** · Sorteio 55% + Negociação
  - Sucesso: Moral jogador +M · Folha +P
  - Falha: Moral jogador −P · Interesse de {clube_interessado}

### MER-009 · Sem clube no portão
- **Gatilho:** Fase janela · **Alvo:** jogador livre
- **Frequência:** Comum ×2 com Perfil Pequeno sobrevivente · **Intervalo:** 0 · **Prazo:** 5 dias · **Delegado:** C
- **Texto:** {jogador}, sem contrato, apareceu no CT pedindo uma chance. Aceita ganhar pouco e treinar em separado até ser avaliado.
- **A) Contratar agora:** Folha +P · Humor +P · Entrosamento −P
- **B) Deixar treinar um mês antes de decidir** · Sorteio 50% + Gestão de elenco
  - Sucesso: Moral grupo +P · Folha +P
  - Falha: Moral grupo −P · Treino perdido
- **C) Agradecer e dispensar:** Moral grupo +P · Humor −P

### MER-010 · Oferta do outro lado
- **Gatilho:** Fase janela · **Alvo:** Camada titular
- **Frequência:** Incomum · **Intervalo:** 1 · **Prazo:** 5 dias · **Delegado:** B
- **Texto:** {rival} ofereceu {valor} por {jogador}. O dinheiro é bom, mas a torcida já avisou nas redes o que acha de negociar com esse lado.
- **A) Vender:** Sai do clube ({jogador}) · Caixa +M · Humor −M
- **B) Recusar:** Humor +M · Moral jogador −P
- **C) Vender, garantindo percentual de revenda** · Sorteio 45% + Negociação
  - Sucesso: Sai do clube ({jogador}) · Caixa +M · Orçamento +P · Humor −P
  - Falha: Moral jogador −P · Humor −P

### MER-011 · Pacote fechado
- **Gatilho:** Fase janela · **Alvo:** perfil Mercenário ({empresario}) · Camada titular ({jogador})
- **Frequência:** Incomum · **Intervalo:** 1 · **Prazo:** 4 dias · **Delegado:** B
- **Texto:** {empresario} oferece {jogador} por preço de ocasião, desde que o clube leve junto outro cliente, que não joga há meses.
- **A) Aceitar o pacote:** Orçamento +P · Folha +P · Moral grupo −P · Memória +P
- **B) Recusar:** Memória −P · Confiança +P
- **C) Tentar levar só {jogador}** · Sorteio 40% + Negociação
  - Sucesso: Orçamento +P · Memória −P
  - Falha: Memória −M

### MER-012 · Última hora da janela
- **Gatilho:** Fase janela · **Alvo:** Clube ({jogador} de {clube_interessado})
- **Frequência:** Comum · **Intervalo:** 0 · **Prazo:** 1 dia · **Delegado:** B
- **Texto:** Faltam poucas horas para a janela fechar e a lista tem um nome só. {clube_interessado} empresta {jogador} se o clube pagar o salário inteiro.
- **A) Fechar:** Moral elenco +P · Folha +M · Entrosamento −P
- **B) Deixar passar:** Moral elenco −P · Orçamento +P
- **C) Buscar uma alternativa pelos contatos** [Requisito: Rede de contatos 14+]: Moral elenco +P · Folha +P

### MER-013 · Minutos em contrato
- **Gatilho:** Sempre · **Alvo:** perfil Protetor ({empresario}) · Camada jovem ({jogador})
- **Frequência:** Incomum · **Intervalo:** 1 · **Prazo:** 7 dias · **Delegado:** C
- **Texto:** Para renovar, {empresario} exige minutos garantidos em contrato para {jogador}. Sem isso, o garoto sai de graça.
- **A) Aceitar a cláusula:** Moral jogador +M · Lealdade jogador +M · Moral grupo −P · Marca: minutos em contrato
- **B) Recusar:** Memória −M · Lealdade jogador −M · Confiança +P
- **C) Apresentar um plano de carreira** · Sorteio 55% + Desenvolvimento de Jovens
  - Sucesso: Memória +M · Lealdade jogador +M
  - Falha: Memória −P · Interesse de {clube_interessado}

### MER-014 · A multa foi paga
- **Gatilho:** Fase janela · **Alvo:** Camada craque
- **Frequência:** Raro · **Intervalo:** 3 · **Prazo:** 3 dias · **Delegado:** B
- **Texto:** {clube_interessado} depositou a multa rescisória de {jogador}. O clube não pode impedir; resta decidir o que fazer com o dinheiro e com o jogador.
- **A) Reinvestir tudo no mercado:** Sai do clube ({jogador}) · Orçamento +G · Humor −M
- **B) Guardar o dinheiro para as contas:** Sai do clube ({jogador}) · Caixa +G · Humor −G · Confiança +M
- **C) Tentar convencer {jogador} a recusar** · Sorteio 20% + Motivação
  - Sucesso: Moral jogador +G · Lealdade jogador +G · Folha +M · Humor +G
  - Falha: Sai do clube ({jogador}) · Caixa +G · Moral elenco −M

### MER-015 · O filho volta
- **Gatilho:** Fase janela · **Alvo:** Qualidade Ídolo/Cria da casa, em outro clube
- **Frequência:** Raro · **Intervalo:** Único · **Prazo:** 7 dias · **Delegado:** C
- **Texto:** {jogador} mandou avisar que volta para {clube} ganhando menos. Na arquibancada, o reencontro já aconteceu.
- **A) Trazer de volta:** Humor +G · Público +M · Folha +M · Entrosamento −P · Moral grupo −P
- **B) Recusar:** Humor −G · Confiança +P · Orçamento +P
- **C) Oferecer contrato por produtividade** · Sorteio 50% + Negociação
  - Sucesso: Humor +G · Folha +P
  - Falha: Humor −M
