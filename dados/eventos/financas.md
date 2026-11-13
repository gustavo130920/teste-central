# Eventos: finanças

Data: 08/11/2026 · 11 eventos · 1 cadeia

### FIN-001 · A ação antiga   [Cadeia: Bloqueio judicial · Elo 1/3]
- **Gatilho:** Saúde Crítica · **Alvo:** Clube
- **Frequência:** Comum · **Intervalo:** 1 · **Prazo:** 7 dias · **Delegado:** B
- **Texto:** Uma ação antiga de um ex-jogador chegou ao fim, e a conta do clube pode ser bloqueada se nada for pago em duas semanas.
- **A) Pagar à vista:** Caixa −M · Confiança +P
- **B) Empurrar com a barriga:** Caixa +P · Confiança −P · Segue: FIN-002 em 2 semanas (70%)
- **C) Negociar parcelas** · Sorteio 55% + Negociação
  - Sucesso: Caixa −P · Confiança +P
  - Falha: Confiança −P · Segue: FIN-002 em 2 semanas (60%)

### FIN-002 · Conta bloqueada   [Cadeia: Bloqueio judicial · Elo 2/3]
- **Gatilho:** Só em cadeia · **Alvo:** Camada titular ({jogador}) · {presidente}
- **Frequência:** — · **Prazo:** 4 dias · **Delegado:** B
- **Texto:** A justiça bloqueou parte das contas e a folha deste mês não fecha. {presidente} quer vender {jogador} para pagar.
- **A) Vender {jogador}:** Sai do clube ({jogador}) · Caixa +M · Humor −M
- **B) Atrasar os salários:** Caixa +P · Moral elenco −M · Segue: FIN-003 em 3 semanas (60%)
- **C) Antecipar a cota de um patrocínio** [Requisito: Negociação comercial 14+]: Caixa +P · Patrocínio −P

### FIN-003 · Ninguém treina amanhã   [Cadeia: Bloqueio judicial · Elo 3/3]
- **Gatilho:** Só em cadeia · **Alvo:** Clube
- **Frequência:** — · **Prazo:** 1 dia · **Delegado:** B
- **Texto:** Com dois meses sem receber, o elenco avisou que não treina amanhã. A imprensa já sabe.
- **A) Pedir a antecipação da verba de TV:** Caixa +M · Moral elenco +M · Orçamento −G
- **B) Dar sua palavra de que o pagamento sai** · Sorteio 40% + Gestão de Grupo
  - Sucesso: Moral elenco +G · Confiança +P
  - Falha: Moral elenco −G · Treino perdido · Humor −M
- **C) Ficar do lado do elenco contra a diretoria:** Moral elenco +G · Confiança −G

### FIN-004 · Cota em risco
- **Gatilho:** Posição Z4 · **Alvo:** Clube
- **Frequência:** Comum · **Intervalo:** 0 · **Prazo:** 7 dias · **Delegado:** A
- **Texto:** {patrocinador} avisou que, se o time continuar no Z4, reduz a cota até o fim do ano.
- **A) Aceitar a redução:** Confiança +P · Patrocínio −P
- **B) Oferecer ações extras com o elenco:** Patrocínio +P · Moral elenco −P
- **C) Renegociar o contrato** · Sorteio 50% + Negociação comercial
  - Sucesso: Patrocínio +M
  - Falha: Patrocínio −M

### FIN-005 · Dinheiro sem origem
- **Gatilho:** Sempre · **Alvo:** Clube
- **Frequência:** Comum · **Intervalo:** 1 · **Prazo:** 7 dias · **Delegado:** B
- **Texto:** {patrocinador}, marca que quase ninguém conhece, oferece o dobro por um espaço na camisa. No clube, ninguém sabe de onde vem o dinheiro.
- **A) Aceitar:** Patrocínio +M · Humor −P
- **B) Recusar:** Humor +P · Patrocínio −P
- **C) Investigar antes de assinar** [Requisito: Rede de contatos 13+]: Patrocínio +P · Marca: patrocinador checado

### FIN-006 · Gramado esburacado
- **Gatilho:** Sempre · **Alvo:** Clube
- **Frequência:** Comum · **Intervalo:** 1 · **Prazo:** 7 dias · **Delegado:** A
- **Texto:** O gramado do CT está cheio de buracos, e a preparação física culpa o campo pelas últimas lesões.
- **A) Reformar agora:** Moral elenco +M · Caixa −M
- **B) Adiar a obra:** Caixa +P · Moral elenco −P · Lesão 2 semanas
- **C) Pagar com uma campanha entre os sócios** · Sorteio 50% + Marketing
  - Sucesso: Moral elenco +P · Sócios +P
  - Falha: Caixa −P

### FIN-007 · Dez horas de estrada
- **Gatilho:** Saúde Crítica · **Alvo:** Clube
- **Frequência:** Incomum · **Intervalo:** 0 · **Prazo:** 3 dias · **Delegado:** A
- **Texto:** Para economizar, a diretoria quer que o elenco vá de ônibus ao próximo jogo. São dez horas de estrada.
- **A) Aceitar:** Caixa +P · Moral elenco −M
- **B) Exigir o voo:** Moral elenco +P · Caixa −P · Confiança −P
- **C) Conseguir o voo com um parceiro comercial** [Requisito: Negociação comercial 13+]: Moral elenco +P

### FIN-008 · Mando à venda
- **Gatilho:** Próximo jogo clássico, Saúde Média · **Alvo:** Clube
- **Frequência:** Incomum · **Intervalo:** 1 · **Prazo:** 5 dias · **Delegado:** B
- **Texto:** Um grupo de investidores locais oferece {valor} para levar o jogo em casa contra {rival} para outra cidade.
- **A) Aceitar:** Caixa +M · Humor −M · Ímpeto clube −P
- **B) Recusar:** Humor +P · Confiança −P

### FIN-009 · Vaquinha no CT
- **Gatilho:** Saúde Crítica · **Alvo:** Clube
- **Frequência:** Incomum · **Intervalo:** 1 · **Prazo:** 4 dias · **Delegado:** B
- **Texto:** Os funcionários do CT estão com o pagamento atrasado, e o elenco quer fazer uma vaquinha para ajudar.
- **A) Apoiar a vaquinha:** Moral elenco +M · Humor +P · Confiança −P
- **B) Pedir que resolvam dentro do clube:** Confiança +P · Moral elenco −M
- **C) Pressionar a diretoria a pagar** · Sorteio 55% + Negociação
  - Sucesso: Moral elenco +M · Caixa −P
  - Falha: Confiança −M

### FIN-010 · O nome do estádio
- **Gatilho:** Sempre · **Alvo:** Clube
- **Frequência:** Raro · **Intervalo:** 3 · **Prazo:** 14 dias · **Delegado:** B
- **Texto:** {patrocinador} ofereceu {valor} para dar nome ao estádio. A torcida tem apego ao nome antigo.
- **A) Aceitar:** Caixa +G · Patrocínio +M · Humor −G
- **B) Recusar:** Humor +M · Confiança −M
- **C) Aceitar mantendo o nome popular nas campanhas** · Sorteio 45% + Negociação comercial
  - Sucesso: Caixa +G · Humor −P
  - Falha: Caixa +M · Humor −G

### FIN-011 · Dois meses sem pingar
- **Gatilho:** Folha atrasada 2 meses · **Alvo:** Camada titular ({jogador})
- **Frequência:** Obrigatório · **Intervalo:** 0 · **Prazo:** 3 dias · **Delegado:** A
- **Texto:** Dois meses sem salário. {jogador} falou em nome do grupo: ou aparece uma data de pagamento, ou ninguém garante o treino de amanhã.
- **A) Pedir paciência e seguir o trabalho:** Moral elenco −P · Confiança +P
- **B) Pressionar {presidente} por uma data** · Sorteio 50% + Gestão de Grupo
  - Sucesso: Moral elenco +M · Confiança −P
  - Falha: Moral elenco −P · Confiança −M
- **C) Antecipar patrocínio para quitar parte:** Caixa +M · Patrocínio −M · Moral elenco +P
- **D) Fechar um parcelamento com o grupo** [Requisito: Gestão de Grupo 14+]: Moral elenco +P · Confiança +P
