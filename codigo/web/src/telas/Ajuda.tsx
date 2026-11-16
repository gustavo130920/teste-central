import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/componentes/ui/dialog';

declare const __VERSAO__: string;

const PASSOS = [
  ['Escolha o clube', 'Série A ou Série B. Todos os nomes, escudos e marcas são fictícios.'],
  ['Avance o tempo', 'O botão Avançar corre até o próximo jogo do seu clube (ou uma semana, se não houver jogo). Antes da bola rolar, você escala o time e ajusta a tática.'],
  ['Comande a partida', 'Ao vivo, a narração e o campo 2D acompanham cada lance. Nas pausas (15, 30, 45, 60 e 75 minutos) você troca jogadores, estilo, formação e instruções.'],
  ['Cuide do clube', 'Na Gestão: treino, mercado, base, comercial e diretoria. Cada área pode ficar com o auxiliar, o diretor, o coordenador ou o gerente (o padrão), ou com você.'],
  ['Responda às perguntas', 'Eventos, coletivas, propostas de emprego e a meta do ano chegam como perguntas. Em todas há uma resposta padrão.'],
  ['Salve', 'Tecla S. Os saves ficam só neste navegador: exporte um arquivo para guardar uma cópia.'],
] as const;

const GLOSSARIO = [
  ['Confiança', 'Quanto a diretoria acredita em você (0 a 100). Muito baixa, o técnico é demitido.'],
  ['Humor da torcida', 'Contentamento da torcida (0 a 100). Baixo, vaia em casa e pressiona a diretoria; alto, ajuda no fator casa e na bilheteria.'],
  ['Respaldo', 'O quanto o elenco aceita o seu comando. Com pouco respaldo, os ajustes das pausas rendem menos.'],
  ['Moral', 'Ânimo de cada jogador e do grupo; mexe no desempenho em campo.'],
  ['Condição e energia', 'Condição é o preparo antes do jogo. Energia cai durante a partida e as trocas e o intervalo ajudam a recuperar.'],
  ['Entrosamento', 'Quanto o time domina a tática (estilo mais formação). Cresce com o treino de foco Tática e jogando com ela; sem ele, uma troca radical custa desempenho por 15 minutos.'],
  ['Zonas', 'O campo tem 30 zonas: cinco corredores (PE, ME, CE, MD, PD) por seis faixas (F1, a sua área, até F6, a área adversária). Cada time lê o campo pelo próprio ataque.'],
  ['Instrução individual', 'Função de um jogador numa fase (com ou sem a bola), que o manda ocupar, cobrir ou liberar zonas.'],
  ['Plano B', 'Uma tática salva que entra inteira numa pausa. Com pouco treino, ela rende menos nos primeiros 15 minutos.'],
  ['Nota e Potencial', 'De 1 a 20. Nota é o que o jogador entrega hoje; Potencial é até onde pode chegar. Jogadores de outros clubes aparecem como faixas (a neblina); relatórios dos olheiros estreitam a faixa.'],
  ['Janela de transferências', 'Semanas 1 a 8 e 26 a 29: compras e vendas. Renovar contrato vale a qualquer momento.'],
  ['Folha e teto', 'Folha é a soma dos salários; o teto é o limite que o clube pode pagar. Luvas são um bônus de assinatura, em fração do salário anual.'],
  ['Meta da diretoria', 'Escolhida no início do ano (Modesta, Padrão ou Ousada). Cumprir sobe a Confiança; falhar custa caro, e a Ousada rende mais orçamento.'],
] as const;

export function Ajuda({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  return (
    <Dialog open={aberta} onOpenChange={(o) => { if (!o) aoFechar(); }}>
      <DialogContent className="max-h-[88dvh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajuda</DialogTitle>
          <DialogDescription>Como jogar, o que cada termo quer dizer e sobre o jogo.</DialogDescription>
        </DialogHeader>
        <section aria-labelledby="como" className="space-y-2">
          <h3 id="como" className="font-semibold">Como jogar</h3>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">
            {PASSOS.map(([t, d]) => <li key={t}><span className="font-semibold">{t}.</span> {d}</li>)}
          </ol>
        </section>
        <section aria-labelledby="gloss" className="space-y-2">
          <h3 id="gloss" className="font-semibold">Glossário</h3>
          <dl className="border-y text-sm">
            {GLOSSARIO.map(([t, d]) => (
              <div key={t} className="grid gap-x-4 border-b border-linha/40 py-1.5 last:border-0 sm:grid-cols-[11rem_1fr]"><dt className="font-semibold">{t}</dt><dd className="text-musgo">{d}</dd></div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="sobre" className="space-y-1 text-sm">
          <h3 id="sobre" className="font-semibold">Sobre</h3>
          <p>Central do Técnico, versão {__VERSAO__} (nome provisório).</p>
          <p className="text-musgo">Obra de ficção: clubes, jogadores, técnicos, dirigentes, patrocinadores e imprensa são inventados; qualquer semelhança com nomes reais é coincidência.</p>
          <p className="text-musgo">Privacidade: o jogo roda inteiro no seu navegador. Não há conta, anúncio nem rastreamento: não coleta nem envia dado, e as fontes e bibliotecas vêm junto do jogo. Os saves e duas preferências (ajuda vista e campo 2D) ficam no armazenamento local deste navegador, e os arquivos do jogo ficam em cache para funcionar sem internet. Limpar os dados do site apaga os saves, então exporte uma cópia.</p>
          <p className="text-musgo">Feito com React, PixiJS e shadcn/ui; fontes Barlow Semi Condensed e Doto (licença OFL). Bibliotecas sob licenças MIT e semelhantes. <a className="underline underline-offset-2" href="./licencas.txt" target="_blank" rel="noopener noreferrer">Ver licenças completas</a>.</p>
        </section>
      </DialogContent>
    </Dialog>
  );
}
