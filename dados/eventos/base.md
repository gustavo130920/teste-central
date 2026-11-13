# Eventos: base

Data: 08/11/2026 · 10 eventos · 1 cadeia

As marcas `bem trabalhado` e `mal trabalhado` alimentam a evolução dos perfis de jovem (Bloco 4).

### BAS-001 · Carro na vaga da comissão   [Cadeia: Joia deslumbrada · Elo 1/3]
- **Gatilho:** Sempre · **Alvo:** Perfil de jovem Deslumbrado
- **Frequência:** Comum ×0,5 com Formação de jovens 15+ · **Intervalo:** 1 · **Prazo:** 4 dias · **Delegado:** C
- **Texto:** {jogador}, ainda garoto, apareceu no CT de carro importado logo depois do primeiro contrato. {empresario} já fala em Europa.
- **A) Chamar para uma conversa dura:** Moral grupo +P · Moral jogador −P · Marca: bem trabalhado
- **B) Deixar curtir:** Moral jogador +M · Moral grupo −P · Marca: mal trabalhado · Segue: BAS-002 em 3 semanas (60%)
- **C) Colocar em acompanhamento psicológico** · Sorteio 55% + Formação de jovens
  - Sucesso: Moral jogador +P · Marca: bem trabalhado
  - Falha: Moral jogador −P · Segue: BAS-002 em 3 semanas (50%)

### BAS-002 · Questão de tempo   [Cadeia: Joia deslumbrada · Elo 2/3]
- **Gatilho:** Só em cadeia · **Alvo:** o mesmo do elo anterior
- **Frequência:** — · **Prazo:** 3 dias · **Delegado:** A
- **Texto:** {jogador} disse a {reporter} que a Europa é questão de tempo, antes mesmo de virar titular.
- **A) Tirar do time por uns jogos:** Moral grupo +M · Moral jogador −M · Segue: BAS-003 em 4 semanas (50%)
- **B) Dar a titularidade:** Moral jogador +M · Entrosamento −P · Moral grupo −M · Marca: mal trabalhado
- **C) Colocar ao lado de um veterano exemplar** [Requisito: Exemplo profissional no elenco]: Moral jogador +P · Marca: bem trabalhado

### BAS-003 · Cedo demais   [Cadeia: Joia deslumbrada · Elo 3/3]
- **Gatilho:** Só em cadeia · **Alvo:** o mesmo do elo anterior
- **Frequência:** — · **Prazo:** 7 dias · **Delegado:** A
- **Texto:** {clube_interessado} ofereceu {valor} por {jogador}, que nem completou uma temporada. Ele quer ir, e a base acha cedo.
- **A) Vender:** Sai do clube ({jogador}) · Caixa +G · Humor −M
- **B) Segurar até o fim da temporada:** Fica até o fim da temporada · Humor +M · Lealdade jogador −G · Moral jogador −M
- **C) Vender e trazer de volta por empréstimo** · Sorteio 45% + Negociação
  - Sucesso: Caixa +G · Marca: volta de empréstimo
  - Falha: Sai do clube ({jogador}) · Caixa +M · Humor −M

### BAS-004 · Conta do alojamento
- **Gatilho:** Fase pré-temporada · **Alvo:** cargo Coordenador da base
- **Frequência:** Comum · **Intervalo:** 1 · **Prazo:** 7 dias · **Delegado:** B
- **Texto:** {profissional} diz que esta geração é promissora, mas o alojamento precisa de mais verba para segurar os garotos.
- **A) Liberar a verba:** Lealdade profissional +P · Caixa −M · Marca: safra reforçada
- **B) Negar:** Caixa +P · Lealdade profissional −M
- **C) Buscar patrocínio só para a base** [Requisito: Negociação comercial 13+]: Patrocínio +P · Marca: safra reforçada

### BAS-005 · Riu da cara do veterano
- **Gatilho:** Sempre · **Alvo:** Perfil de jovem Marrento ({jogador}) · Camada veterano ({jogador2})
- **Frequência:** Comum · **Intervalo:** 0 · **Prazo:** 2 dias · **Delegado:** B
- **Texto:** {jogador} deu um drible de efeito em {jogador2} no treino e ainda riu. O veterano saiu bufando.
- **A) Bancar o garoto:** Moral jogador +M · Moral jogador2 −M · Marca: mal trabalhado
- **B) Cobrar em público:** Moral jogador2 +P · Moral jogador −M
- **C) Colocar os dois para trabalhar juntos** · Sorteio 50% + Desenvolvimento de Jovens
  - Sucesso: Moral jogador +P · Moral jogador2 +P · Marca: bem trabalhado
  - Falha: Moral jogador −P · Marca: mal trabalhado

### BAS-006 · Pediu para não jogar
- **Gatilho:** Fase temporada · **Alvo:** Perfil de jovem Inseguro
- **Frequência:** Comum · **Intervalo:** 0 · **Prazo:** 3 dias · **Delegado:** B
- **Texto:** {jogador} errou feio no último jogo e pediu para não entrar no próximo. A voz quase não saiu.
- **A) Escalar mesmo assim** · Sorteio 45% + Gestão emocional
  - Sucesso: Moral jogador +M · Marca: bem trabalhado
  - Falha: Moral jogador −M · Marca: mal trabalhado
- **B) Poupar por um tempo:** Moral jogador +P · Entrosamento −P
- **C) Aceitar o pedido de empréstimo:** Sai do clube ({jogador}) · Moral jogador +P · Marca: mal trabalhado · Marca: emprestado

### BAS-007 · A vaga do mais esforçado
- **Gatilho:** Fase pré-temporada · **Alvo:** Perfil de jovem Pé no chão
- **Frequência:** Incomum · **Intervalo:** 1 · **Prazo:** 5 dias · **Delegado:** B
- **Texto:** {jogador} treina mais que todo mundo, mas a diretoria quer dar a vaga no profissional a um garoto com mais mercado.
- **A) Subir {jogador}:** Moral jogador +M · Lealdade jogador +M · Confiança −P · Marca: bem trabalhado
- **B) Seguir a diretoria:** Confiança +P · Moral jogador −M
- **C) Subir os dois** [Requisito: Integração ao profissional 14+]: Moral jogador +M · Marca: bem trabalhado

### BAS-008 · Convocado para a seleção de base
- **Gatilho:** Fase temporada · **Alvo:** Camada jovem, titular
- **Frequência:** Incomum · **Intervalo:** 1 · **Prazo:** 3 dias · **Delegado:** A
- **Texto:** {jogador} foi chamado para a seleção de base e vai perder cinco rodadas no momento em que o time mais precisa.
- **A) Liberar sem discussão:** Moral jogador +M · Entrosamento −P
- **B) Tentar segurar o jogador** · Sorteio 40% + Blindagem do técnico
  - Sucesso: Entrosamento +P · Moral jogador −P
  - Falha: Moral jogador −M · Confiança −P

### BAS-009 · Rodar para crescer
- **Gatilho:** Fase janela · **Alvo:** Camada jovem, sem minutos
- **Frequência:** Incomum · **Intervalo:** 0 · **Prazo:** 5 dias · **Delegado:** A
- **Texto:** {clube_interessado}, de divisão menor, quer {jogador} emprestado e promete que ele vai jogar todo domingo.
- **A) Emprestar:** Sai do clube ({jogador}) · Moral jogador +M · Marca: emprestado
- **B) Manter no elenco:** Entrosamento +P · Moral jogador −P
- **C) Emprestar com cláusula de minutos** · Sorteio 50% + Negociação
  - Sucesso: Sai do clube ({jogador}) · Caixa +P · Marca: emprestado
  - Falha: Moral jogador −P

### BAS-010 · Geração que ganhou tudo
- **Gatilho:** Fase pré-temporada · **Alvo:** Camada jovem
- **Frequência:** Raro · **Intervalo:** 3 · **Prazo:** 10 dias · **Delegado:** B
- **Texto:** A base de {clube} ganhou tudo, e a torcida quer ver os garotos no profissional agora. O elenco principal já olha de lado.
- **A) Promover os melhores de uma vez:** Humor +G · Moral grupo −M · Entrosamento −M
- **B) Promover aos poucos:** Humor +P · Entrosamento −P · Marca: bem trabalhado
- **C) Abrir uma disputa de vagas com o elenco** · Sorteio 50% + Integração ao profissional
  - Sucesso: Humor +G · Moral elenco +M
  - Falha: Humor −M · Moral grupo −M
