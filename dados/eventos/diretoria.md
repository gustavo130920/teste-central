# Eventos: diretoria

Data: 08/11/2026 · 21 eventos · 3 cadeias

### DIR-001 · Foto no CT   [Cadeia: Ano de urnas · Elo 1/3]
- **Gatilho:** Eleição ano de eleição, Gestão Associação · **Alvo:** Clube ({presidente}, {candidato})
- **Frequência:** Comum · **Intervalo:** 2 · **Prazo:** 7 dias · **Delegado:** A
- **Texto:** {candidato}, da oposição, quer uma foto com você no CT, e {presidente} mandou avisar que está de olho. As duas campanhas esperam um sinal.
- **A) Não receber ninguém até a eleição:** Moral elenco +P · Confiança −P
- **B) Apoiar {presidente} em público:** Confiança +M · Popularidade +P · Humor −P · Marca: apoiou a situação · Segue: DIR-002 em 4 semanas (70%)
- **C) Apoiar {candidato} em público:** Confiança −M · Humor +P · Popularidade −P · Marca: apoiou a oposição · Segue: DIR-003 em 4 semanas (70%)
- **D) Receber as duas campanhas e sair inteiro** [Requisito: Blindagem do técnico 14+]: Confiança +P · Humor +P

### DIR-002 · Jantar de campanha   [Cadeia: Ano de urnas · Elo 2/3]
- **Gatilho:** Só em cadeia · **Alvo:** os mesmos do elo anterior
- **Frequência:** — · **Prazo:** 5 dias · **Delegado:** B
- **Texto:** Com a sua fala, {presidente} ganhou votos no conselho e quer você no jantar de campanha. A oposição promete cobrar a conta se ganhar.
- **A) Ir ao jantar:** Confiança +M · Popularidade +M · Humor −M · Segue: DIR-004 em 3 semanas (60%)
- **B) Recuar e dizer que só fala de futebol:** Humor +P · Confiança −M
- **C) Aproveitar o momento para pedir reforço** · Sorteio 50% + Negociação
  - Sucesso: Orçamento +M · Confiança +P
  - Falha: Confiança −M · Popularidade −P · Segue: DIR-004 em 3 semanas (50%)

### DIR-003 · Telefone mudo   [Cadeia: Ano de urnas · Elo 2/3]
- **Gatilho:** Só em cadeia · **Alvo:** os mesmos do elo anterior
- **Frequência:** — · **Prazo:** 5 dias · **Delegado:** A
- **Texto:** Depois do apoio a {candidato}, {presidente} cortou sua verba de viagens e parou de atender o telefone.
- **A) Aguentar calado até a eleição:** Humor +P · Confiança −M · Segue: DIR-004 em 4 semanas (80%)
- **B) Pedir desculpas em público:** Confiança +P · Humor −M · Moral elenco −P
- **C) Manter a campanha aberta** · Sorteio 45% + Motivação
  - Sucesso: Humor +M · Popularidade −M · Segue: DIR-004 em 3 semanas (90%)
  - Falha: Confiança −M · Humor −P · Segue: DIR-004 em 3 semanas (60%)

### DIR-004 · Depois da apuração   [Cadeia: Ano de urnas · Elo 3/3]
- **Gatilho:** Só em cadeia · **Alvo:** quem venceu a eleição ({presidente})
- **Frequência:** — · **Prazo:** 3 dias · **Delegado:** A
- **Texto:** {presidente} venceu a eleição e chamou você para acertar os ponteiros. A lista de quem apoiou quem está em cima da mesa.
- **A) Prometer fidelidade à gestão:** Confiança +M · Humor −M
- **B) Cobrar autonomia total** · Sorteio 40% + Blindagem do técnico
  - Sucesso: Confiança +G · Orçamento +M
  - Falha: Confiança −G · Moral elenco −P
- **C) Colocar o cargo à disposição:** Humor +G · Confiança −M · Popularidade −M

### DIR-005 · Reforço de peso   [Cadeia: Reforço da presidência · Elo 1/3]
- **Gatilho:** Fase janela · **Alvo:** Interferência Centralizador ({presidente}) · jogador de fora ({jogador})
- **Frequência:** Comum ×0,5 com Blindagem do técnico 15+ · **Intervalo:** 0 · **Prazo:** 5 dias · **Delegado:** A
- **Texto:** {presidente} fechou a contratação de {jogador} sem falar com você e anunciou como reforço de peso. A comissão nem tinha o nome na lista.
- **A) Aceitar e dar minutos:** Confiança +M · Moral grupo −P · Folha +P · Segue: DIR-006 em 5 semanas (50%)
- **B) Aceitar e deixar no banco:** Entrosamento +P · Confiança −P · Folha +P · Segue: DIR-007 em 4 semanas (60%)
- **C) Reclamar com a presidência** · Sorteio 45% + Blindagem do técnico
  - Sucesso: Confiança +P · Marca: autonomia no mercado
  - Falha: Confiança −M

### DIR-006 · Vaia para o indicado   [Cadeia: Reforço da presidência · Elo 2/3]
- **Gatilho:** Só em cadeia · **Alvo:** os mesmos do elo anterior
- **Frequência:** — · **Prazo:** 4 dias · **Delegado:** B
- **Texto:** {jogador} jogou e não rendeu. A arquibancada já vaia, e {presidente} pede paciência.
- **A) Insistir:** Confiança +P · Humor −M · Entrosamento −P · Segue: DIR-007 em 3 semanas (40%)
- **B) Sacar do time:** Humor +P · Confiança −M · Segue: DIR-007 em 3 semanas (70%)
- **C) Negociar um empréstimo com discrição** [Requisito: Gestão de elenco 14+]: Confiança +P · Humor +P

### DIR-007 · Escalação por telefone   [Cadeia: Reforço da presidência · Elo 3/3]
- **Gatilho:** Só em cadeia · **Alvo:** os mesmos do elo anterior
- **Frequência:** — · **Prazo:** 1 dia · **Delegado:** A
- **Texto:** {presidente} ligou na véspera do jogo: {jogador} tem que ser titular, sem discussão. Se a ligação vazar, o problema é seu.
- **A) Escalar:** Confiança +M · Moral elenco −G · Humor −M
- **B) Não escalar:** Confiança −G · Moral elenco +M · Humor +M
- **C) Bater de frente e exigir o comando do time** · Sorteio 40% + Blindagem do técnico
  - Sucesso: Confiança +M · Moral elenco +G · Marca: autonomia no mercado
  - Falha: Confiança −G · Moral elenco −P

### DIR-008 · A planilha   [Cadeia: Planilha da SAF · Elo 1/3]
- **Gatilho:** Gestão SAF, Fase temporada · **Alvo:** {representante} · Camada titular ({jogador})
- **Frequência:** Incomum · **Intervalo:** 1 · **Prazo:** 7 dias · **Delegado:** A
- **Texto:** {representante} apareceu com uma planilha: a folha está acima do plano e {investidor} quer cortar agora.
- **A) Cortar a folha:** Folha −M · Moral elenco −M · Confiança +M
- **B) Defender o elenco atual:** Moral elenco +P · Confiança −M · Segue: DIR-009 em 4 semanas (70%)
- **C) Propor a venda de {jogador}** · Sorteio 50% + Gestão de elenco
  - Sucesso: Sai do clube ({jogador}) · Caixa +M · Confiança +M
  - Falha: Moral jogador −M · Humor −P · Segue: DIR-009 em 3 semanas (60%)

### DIR-009 · Auditoria no futebol   [Cadeia: Planilha da SAF · Elo 2/3]
- **Gatilho:** Só em cadeia · **Alvo:** os mesmos do elo anterior
- **Frequência:** — · **Prazo:** 5 dias · **Delegado:** A
- **Texto:** {investidor} mandou uma equipe revisar as contas do futebol. Querem abrir salários e premiações do elenco inteiro.
- **A) Abrir tudo:** Confiança +M · Moral elenco −M · Segue: DIR-010 em 4 semanas (30%)
- **B) Deixar a direção de futebol administrar a auditoria** [Requisito: Blindagem do técnico 15+]: Confiança +P · Moral elenco +P
- **C) Recusar a abertura:** Moral elenco +P · Confiança −M · Segue: DIR-010 em 3 semanas (80%)

### DIR-010 · Bate a meta ou vende   [Cadeia: Planilha da SAF · Elo 3/3]
- **Gatilho:** Só em cadeia · **Alvo:** os mesmos do elo anterior
- **Frequência:** — · **Prazo:** 7 dias · **Delegado:** A
- **Texto:** {representante} avisou: ou a meta do ano aparece, ou {investidor} vende a participação. A torcida já soube e está dividida.
- **A) Assumir a meta por escrito:** Confiança +G · Moral elenco −M · Marca: meta por escrito
- **B) Pedir mais prazo** · Sorteio 45% + Blindagem do técnico
  - Sucesso: Confiança +M · Orçamento +P
  - Falha: Confiança −G · Humor −M
- **C) Apoiar a saída de {investidor}:** Humor +M · Caixa −G · Confiança −M

### DIR-011 · A meta subiu
- **Gatilho:** Fase temporada, Posição G4 · **Alvo:** {presidente}
- **Frequência:** Comum · **Intervalo:** 0 · **Prazo:** 7 dias · **Delegado:** B
- **Texto:** Com o time no G4, {presidente} quer subir a meta da temporada e já contou aos conselheiros.
- **A) Aceitar a meta nova:** Orçamento +P · Confiança +P · Moral elenco −P
- **B) Manter o combinado:** Moral elenco +P · Confiança −P
- **C) Aceitar em troca de bônus** · Sorteio 50% + Negociação
  - Sucesso: Orçamento +M
  - Falha: Confiança −P

### DIR-012 · Reunião de segunda
- **Gatilho:** Sempre · **Alvo:** Interferência Centralizador
- **Frequência:** Comum · **Intervalo:** 0 · **Prazo:** 5 dias · **Delegado:** A
- **Texto:** {presidente} quer uma reunião toda segunda para revisar a escalação do fim de semana. Diz que é só para entender o trabalho.
- **A) Aceitar:** Confiança +M · Moral elenco −P
- **B) Recusar:** Confiança −M · Moral elenco +P
- **C) Passar a reunião para a direção de futebol** [Requisito: Blindagem do técnico 13+]: Confiança +P

### DIR-013 · Conta de campanha
- **Gatilho:** Promessa atrasada, Gestão Associação · **Alvo:** {presidente}
- **Frequência:** Comum · **Intervalo:** 1 · **Prazo:** 7 dias · **Delegado:** B
- **Texto:** Para cumprir uma promessa de campanha atrasada, {presidente} quer tirar dinheiro do futebol.
- **A) Ceder a verba:** Orçamento −M · Promessa cumprida · Popularidade +M · Confiança +P
- **B) Proteger o orçamento:** Promessa quebrada · Moral elenco +P · Confiança −M · Popularidade −P
- **C) Buscar um patrocínio para cobrir a promessa** · Sorteio 45% + Negociação comercial
  - Sucesso: Promessa cumprida · Popularidade +M · Patrocínio +P
  - Falha: Promessa quebrada · Popularidade −M

### DIR-014 · Conselheiros na porta
- **Gatilho:** Sequência 3+ derrotas · **Alvo:** {presidente}
- **Frequência:** Comum · **Intervalo:** 0 · **Prazo:** 2 dias · **Delegado:** C
- **Texto:** Depois de mais uma derrota, conselheiros foram à presidência pedir sua saída. {presidente} chamou você para ouvir o que tem a dizer.
- **A) Apresentar um plano para o time** · Sorteio 55% + Leitura Tática
  - Sucesso: Confiança +M
  - Falha: Confiança −M
- **B) Culpar o elenco:** Confiança +P · Moral elenco −M
- **C) Assumir a culpa:** Moral elenco +M · Confiança −M
- **D) Deixar a direção de futebol segurar os conselheiros** [Requisito: Blindagem do técnico 15+]: Confiança +M · Moral elenco +P

### DIR-015 · O prêmio da decisão
- **Gatilho:** Próximo jogo decisão · **Alvo:** {presidente}
- **Frequência:** Incomum · **Intervalo:** 0 · **Prazo:** 3 dias · **Delegado:** A
- **Texto:** {presidente} quer anunciar um prêmio especial ao elenco se o time passar. O dinheiro existe, mas faz falta em outro lugar.
- **A) Apoiar o anúncio:** Moral elenco +M · Ímpeto clube +P · Caixa −M
- **B) Pedir que guarde para depois:** Caixa +P · Moral elenco −P
- **C) Transformar em bônus por desempenho** · Sorteio 50% + Gestão de Grupo
  - Sucesso: Moral elenco +M · Caixa −P
  - Falha: Moral grupo −M

### DIR-016 · Recado difícil
- **Gatilho:** Saúde Crítica · **Alvo:** {presidente}
- **Frequência:** Incomum · **Intervalo:** 0 · **Prazo:** 3 dias · **Delegado:** B
- **Texto:** Os salários vão atrasar de novo, e {presidente} pede que você segure o grupo até o mês que vem.
- **A) Segurar o grupo com a própria palavra:** Confiança +M · Moral elenco −M
- **B) Dizer que a conversa é com a diretoria:** Moral elenco +P · Confiança −M
- **C) Reunir o elenco e negociar um prazo** · Sorteio 50% + Gestão de Grupo
  - Sucesso: Moral elenco +P · Confiança +M
  - Falha: Moral elenco −M · Treino perdido

### DIR-017 · Oferta pelo futebol
- **Gatilho:** Gestão Associação, Saúde Crítica · **Alvo:** Clube ({presidente}, {investidor})
- **Frequência:** Raro · **Intervalo:** 3 · **Prazo:** 14 dias · **Delegado:** C
- **Texto:** {investidor} ofereceu comprar o futebol de {clube}. {presidente} quer saber a sua posição antes de levar ao conselho.
- **A) Apoiar a venda:** Orçamento +G · Humor −G · Confiança +M · Popularidade −M · Marca: SAF apoiada
- **B) Ficar contra:** Humor +M · Orçamento −M · Confiança −M
- **C) Pedir garantias antes de opinar** · Sorteio 40% + Negociação
  - Sucesso: Orçamento +M · Humor +P
  - Falha: Humor −M · Confiança −P

### DIR-018 · Renúncia
- **Gatilho:** Popularidade até 5, Gestão Associação · **Alvo:** {presidente}
- **Frequência:** Raro · **Intervalo:** 3 · **Prazo:** 5 dias · **Delegado:** C
- **Texto:** {presidente} renunciou ao cargo e a vice-presidência assumiu no improviso. O futebol ficou sem saber quem manda no orçamento.
- **A) Declarar apoio à gestão interina:** Confiança +G · Humor −P
- **B) Cobrar uma definição do orçamento** · Sorteio 50% + Negociação
  - Sucesso: Orçamento +G
  - Falha: Confiança −G
- **C) Ficar de fora e cuidar do time:** Moral elenco +P · Confiança −M

### DIR-019 · Vitrine do grupo
- **Gatilho:** Gestão SAF, Fase janela · **Alvo:** {investidor} · Camada titular ({jogador})
- **Frequência:** Incomum · **Intervalo:** 1 · **Prazo:** 5 dias · **Delegado:** A
- **Texto:** {investidor} tem outro clube no portfólio e quer levar {jogador} para lá. {representante} chamou de movimento interno.
- **A) Liberar:** Sai do clube ({jogador}) · Confiança +M · Humor −M
- **B) Recusar:** Moral jogador +P · Confiança −M
- **C) Pedir um reforço em troca** · Sorteio 45% + Negociação
  - Sucesso: Sai do clube ({jogador}) · Orçamento +M · Confiança +P
  - Falha: Confiança −P · Moral jogador −P

### DIR-020 · Assembleia dos sócios
- **Gatilho:** Gestão Associação, Fase pré-temporada · **Alvo:** {presidente}
- **Frequência:** Incomum · **Intervalo:** 1 · **Prazo:** 7 dias · **Delegado:** B
- **Texto:** {presidente} quer você na assembleia dos sócios para falar do planejamento do ano. A plateia costuma ser menos educada que a arquibancada.
- **A) Ir e falar sem rodeios** · Sorteio 50% + Motivação
  - Sucesso: Humor +M · Confiança +M
  - Falha: Humor −M
- **B) Mandar alguém da comissão:** Entrosamento +P · Confiança −P
- **C) Ir e prometer título:** Humor +M · Confiança +P · Moral elenco −P · Marca: promessa em assembleia

### DIR-021 · A última conversa
- **Gatilho:** Confiança até 20 · **Alvo:** {presidente}
- **Frequência:** Obrigatório · **Intervalo:** 1 · **Prazo:** 5 dias · **Delegado:** A
- **Texto:** {presidente} chamou você na sala e foi direto: a paciência acabou. Sem reação nos próximos jogos, a cadeira fica vaga.
- **A) Ouvir e voltar ao trabalho:** Confiança +P · Moral elenco −P
- **B) Assumir a pressão e cobrar o elenco:** Confiança +M · Moral elenco −M
- **C) Defender o trabalho com números na mesa** · Sorteio 50% + Gestão de Grupo
  - Sucesso: Confiança +M · Moral elenco +P
  - Falha: Confiança −P · Humor −P
- **D) Pedir a mediação da diretoria de futebol** [Requisito: Blindagem do técnico 14+]: Confiança +M · Moral elenco +P
