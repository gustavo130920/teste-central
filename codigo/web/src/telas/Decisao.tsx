import { useState } from 'react';
import { Button } from '@/componentes/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/componentes/ui/dialog';
import { Spinner } from '@/componentes/spinner';
import type { DecisaoTela, RespostaDecisao } from '@/nucleo/protocolo';
import { COMPETICAO as LIGA_NOME } from '@/lib/exibir';

const mi = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;

function Opcao({ n, children, aoClicar, desligado, destaque }: { n?: number; children: React.ReactNode; aoClicar: () => void; desligado: boolean; destaque?: boolean }) {
  return (
    <button type="button" disabled={desligado} onClick={aoClicar}
      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-faixa disabled:opacity-50 ${destaque ? 'border-led/60' : 'border-linha'}`}>
      {n !== undefined && <span className="mr-2 font-semibold text-led">{n}</span>}{children}
    </button>
  );
}

export function Decisao({ d, ocupado, erro, aoResponder }: { d: DecisaoTela; ocupado: boolean; erro: string | null; aoResponder: (r: RespostaDecisao) => void }) {
  const [pedido, setPedido] = useState<0 | 10 | 20>(0);
  const titulo = {
    evento: d.tipo === 'evento' ? d.titulo : '', coletiva: `Coletiva: ${d.tipo === 'coletiva' ? d.assunto : ''}`, proposta: 'Proposta de emprego',
    renovacao: 'Fim de contrato', meta: 'Meta da diretoria', patrocinio: d.tipo === 'patrocinio' ? `Patrocínio ${d.cota}` : '',
  }[d.tipo];
  const descricao = {
    evento: d.tipo === 'evento' ? d.texto : '', coletiva: d.tipo === 'coletiva' ? d.pergunta : '',
    proposta: d.tipo === 'proposta' ? (d.empregado ? `Você é o técnico do ${d.clubeAtual}; aceitar é sair sem multa e o clube pega um técnico livre.` : 'Você está sem clube.') : '',
    renovacao: d.tipo === 'renovacao' ? `A diretoria do ${d.clube} quer renovar (Confiança ${Math.round(d.confianca)}, meta: ${d.avaliacao}).` : '',
    meta: 'Escolha a meta do ano: quanto mais alta, maior o orçamento, e o risco de falhar.',
    patrocinio: d.tipo === 'patrocinio' ? `${d.marcaAtual} (${mi(d.valorAtual)}) venceu${d.desistiram.length ? `. Desistiram: ${d.desistiram.join(', ')}` : ''}.` : '',
  }[d.tipo];
  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent className="max-w-2xl" showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {d.tipo === 'evento' && <>
            {d.opcoes.map((o, i) => (
              <Opcao key={o.letra} n={i + 1} desligado={ocupado} aoClicar={() => aoResponder({ tipo: 'evento', letra: o.letra })}>
                {o.texto}{o.chance !== null && <span className="ml-2 text-musgo">(chance {Math.round(o.chance)}%)</span>}
              </Opcao>
            ))}
            <Opcao desligado={ocupado} destaque aoClicar={() => aoResponder({ tipo: 'evento', letra: null })}>Avançar (a opção mais neutra)</Opcao>
          </>}
          {d.tipo === 'coletiva' && <>
            {d.ultimosTons.length > 0 && <p className="text-xs text-musgo">Últimos tons: {d.ultimosTons.join(', ')} (3 iguais seguidas rendem menos).</p>}
            {d.respostas.map((r, i) => (
              <Opcao key={i} n={i + 1} desligado={ocupado} aoClicar={() => aoResponder({ tipo: 'coletiva', tom: r.tom, assessoria: false })}>
                <span className="mr-2 text-xs uppercase text-led">{r.tom}</span>{r.texto}
              </Opcao>
            ))}
            <Opcao desligado={ocupado} destaque aoClicar={() => aoResponder({ tipo: 'coletiva', tom: null, assessoria: true })}>Deixar com a assessoria</Opcao>
          </>}
          {d.tipo === 'proposta' && <>
            <p className="text-sm">{d.clube} ({LIGA_NOME[d.liga] ?? d.liga}, Reputação {d.reputacao}) · Confiança inicial {d.confianca} · sua Reputação {d.suaReputacao}{d.ultimoB && ' · 26 semanas sem proposta'}</p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={ocupado} onClick={() => aoResponder({ tipo: 'proposta', aceitar: true })}>Aceitar</Button>
              <Button variant="secondary" disabled={ocupado} onClick={() => aoResponder({ tipo: 'proposta', aceitar: false })}>Recusar</Button>
            </div>
          </>}
          {d.tipo === 'renovacao' && <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((n) => <Button key={n} variant={n === d.anos ? 'default' : 'secondary'} disabled={ocupado} onClick={() => aoResponder({ tipo: 'renovacao', anos: n })}>{n} ano{n > 1 ? 's' : ''}{n === d.anos ? ' (oferta)' : ''}</Button>)}
            <Button variant="ghost" disabled={ocupado} onClick={() => aoResponder({ tipo: 'renovacao', anos: 0 })}>Recusar e ficar livre</Button>
          </div>}
          {d.tipo === 'meta' && <>
            {d.metas.map((m, i) => <Opcao key={m.nivel} n={i + 1} desligado={ocupado} aoClicar={() => aoResponder({ tipo: 'meta', nivel: m.nivel })}><span className="font-semibold">{m.nivel}:</span> {m.texto} <span className="text-musgo">· orçamento +{Math.round(m.bonus * 100)}%</span></Opcao>)}
            <Opcao desligado={ocupado} destaque aoClicar={() => aoResponder({ tipo: 'meta', nivel: null })}>A diretoria escolhe</Opcao>
          </>}
          {d.tipo === 'patrocinio' && <>
            <fieldset className="text-sm"><legend className="mb-1 text-musgo">Pedir mais?</legend>
              <span className="flex flex-wrap gap-2">{([0, 10, 20] as const).map((v) => (
                <button key={v} type="button" aria-pressed={pedido === v} onClick={() => setPedido(v)}
                  className={`rounded-md border px-3 py-1.5 ${pedido === v ? 'border-led bg-led/15 font-semibold text-led' : 'border-linha hover:bg-faixa'}`}>
                  {v === 0 ? 'Não' : `+${v}% (desiste ${d.chanceDesistir[v]}%)`}</button>))}</span>
            </fieldset>
            {d.propostas.map((p, i) => (
              <Opcao key={p.marca} n={i + 1} desligado={ocupado} aoClicar={() => aoResponder({ tipo: 'patrocinio', escolha: i, pedido })}>
                <span className="font-semibold">{p.marca}</span> {mi(p.valor)}/ano por {p.anos} ano(s) <span className="text-musgo">(teto da marca {mi(p.teto)})</span>
              </Opcao>
            ))}
            <Opcao desligado={ocupado} destaque aoClicar={() => aoResponder({ tipo: 'patrocinio', escolha: null, pedido: 0 })}>O gerente decide</Opcao>
          </>}
          {erro && <p role="alert" className="text-cartao">{erro}</p>}
          {ocupado && <p className="flex items-center gap-2 text-sm text-musgo"><Spinner /> Seguindo o ciclo…</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
