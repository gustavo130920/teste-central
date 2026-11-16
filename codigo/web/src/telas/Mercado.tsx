import { useEffect, useState } from 'react';
import { Button } from '@/componentes/ui/button';
import { Input } from '@/componentes/ui/input';
import { Spinner } from '@/componentes/spinner';
import { pedir } from '@/nucleo/cliente';
import type { MercadoTela, NegTela, PapelTela, PedidoMercado, TermosTela, VistoTela } from '@/nucleo/protocolo';
import { cn } from '@/lib/utils';

const mi = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`;
const PAPEIS: { id: PapelTela; nome: string }[] = [{ id: 'titular', nome: 'Titular' }, { id: 'rotacao', nome: 'Rotação' }, { id: 'reserva', nome: 'Reserva' }];

function Negociacao({ n, ocupado, aoEnviar }: { n: NegTela; ocupado: boolean; aoEnviar: (t: TermosTela) => void }) {
  const [t, setT] = useState<TermosTela>({ oferta: n.oferta, salario: n.salario, papel: n.papel, anos: n.anos, luvas: n.luvas });
  const [chance, setChance] = useState<{ chance: number; luvasMi: number } | null>(null);
  const noClube = n.fase === 'clube';
  useEffect(() => {
    let vivo = true;
    pedir('chanceMercado', { neg: n.id, termos: t }).then((c) => { if (vivo) setChance(c); }).catch(() => { if (vivo) setChance(null); });
    return () => { vivo = false; };
  }, [n.id, t]);
  const num = (k: keyof TermosTela, v: string) => { const x = Number(v.replace(',', '.')); if (Number.isFinite(x)) setT((a) => ({ ...a, [k]: x })); };
  const enviada = n.estado === 'enviada';
  return (
    <li className="space-y-2 border-b border-linha/40 py-3 last:border-0">
      <p><span className="font-semibold">{n.rotulo}: {n.jogador}</span> <span className="text-sm text-musgo">com {noClube ? 'o clube' : 'o jogador'} · recusas {n.rodada} de 3
        {n.contra !== null && <> · pedem {noClube ? mi(n.contra) : `${n.contra} mil/mês`}</>}</span>
        {enviada && <span className="ml-2 text-led">enviada, resposta no próximo ciclo</span>}</p>
      {!enviada && (
        <div className="flex flex-wrap items-end gap-3">
          {noClube ? (
            <label className="text-sm">Oferta (R$ mi)<Input inputMode="decimal" className="mt-1 w-28" value={t.oferta ?? ''} onChange={(e) => num('oferta', e.target.value)} /></label>
          ) : (
            <>
              <label className="text-sm">Salário (R$ mil/mês)<Input inputMode="numeric" className="mt-1 w-28" value={t.salario ?? ''} onChange={(e) => num('salario', e.target.value)} /></label>
              <label className="text-sm">Anos (1 a 5)<Input inputMode="numeric" className="mt-1 w-20" value={t.anos ?? ''} onChange={(e) => num('anos', e.target.value)} /></label>
              <label className="text-sm">Luvas (% do salário anual, até 50)<Input inputMode="numeric" className="mt-1 w-28" value={t.luvas ?? ''} onChange={(e) => num('luvas', e.target.value)} /></label>
              <fieldset className="text-sm"><legend className="mb-1">Papel prometido</legend>
                <span className="flex gap-1">{PAPEIS.map((p) => (
                  <button key={p.id} type="button" aria-pressed={t.papel === p.id} onClick={() => setT((a) => ({ ...a, papel: p.id }))}
                    className={cn('rounded-md border px-2.5 py-1.5', t.papel === p.id ? 'border-led bg-led/15 font-semibold text-led' : 'border-linha hover:bg-faixa')}>{p.nome}</button>))}</span>
              </fieldset>
            </>
          )}
          <Button disabled={ocupado} onClick={() => aoEnviar(t)}>Enviar{chance ? ` (chance ${chance.chance}%)` : ''}</Button>
        </div>
      )}
      {!enviada && chance && !noClube && chance.luvasMi > 0 && <p className="text-xs text-musgo">Luvas: {mi(chance.luvasMi)}.</p>}
    </li>
  );
}

function Busca({ t, agir, ocupado }: { t: MercadoTela; agir: (p: PedidoMercado) => void; ocupado: boolean }) {
  const [grupo, setGrupo] = useState('');
  const [idade, setIdade] = useState('');
  const [nota, setNota] = useState('');
  const [valor, setValor] = useState('');
  const [lista, setLista] = useState<VistoTela[] | null>(null);
  const [aberto, setAberto] = useState<{ v: VistoTela; texto: string[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const buscar = async () => {
    setErro(null); setAberto(null);
    try { setLista(await pedir('buscarMercado', { grupo: grupo || undefined, idadeMax: Number(idade) || undefined, notaMin: Number(nota) || undefined, valorMax: valor ? Number(valor.replace(',', '.')) : undefined })); } catch (e) { setErro((e as Error).message); }
  };
  const ver = async (v: VistoTela) => { try { setAberto({ v, texto: await pedir('relatorioMercado', v.id) }); } catch (e) { setErro((e as Error).message); } };
  return (
    <section aria-labelledby="busca" className="space-y-2">
      <h3 id="busca" className="font-semibold">Buscar jogadores</h3>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Posição<select className="mt-1 block h-9 rounded-md border border-linha bg-relva px-2" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
          <option value="">Todas</option>{t.grupos.map((g) => <option key={g}>{g}</option>)}</select></label>
        <label className="text-sm">Idade máxima<Input inputMode="numeric" className="mt-1 w-20" value={idade} onChange={(e) => setIdade(e.target.value)} /></label>
        <label className="text-sm">Nota mínima<Input inputMode="numeric" className="mt-1 w-20" value={nota} onChange={(e) => setNota(e.target.value)} /></label>
        <label className="text-sm">Valor máx. (R$ mi; vazio = orçamento)<Input inputMode="decimal" className="mt-1 w-28" value={valor} onChange={(e) => setValor(e.target.value)} /></label>
        <Button onClick={buscar}>Buscar</Button>
      </div>
      {erro && <p role="alert" className="text-cartao">{erro}</p>}
      {lista && <Lista lista={lista} aoVer={ver} />}
      {aberto && (
        <div className="rounded-md border border-led/50 bg-relva p-3 text-sm">
          {aberto.texto.map((l, i) => <p key={i} className="whitespace-pre-wrap">{l}</p>)}
          <div className="mt-2 flex flex-wrap gap-2">
            {!aberto.v.meu && <>
              <Button size="sm" disabled={ocupado || !t.podeComprar} title={t.podeComprar ? '' : 'Só nas janelas.'} onClick={() => agir({ acao: 'comprar', id: aberto.v.id, pre: false })}>Comprar</Button>
              <Button size="sm" variant="secondary" disabled={ocupado} onClick={() => agir({ acao: 'comprar', id: aberto.v.id, pre: true })}>Pré-contrato</Button>
              <Button size="sm" variant="secondary" disabled={ocupado} onClick={() => agir({ acao: 'observar', id: aberto.v.id })}>{aberto.v.observado ? 'Deixar de observar' : 'Observar'}</Button>
            </>}
            <Button size="sm" variant="ghost" onClick={() => setAberto(null)}>Fechar</Button>
          </div>
        </div>
      )}
    </section>
  );
}

function Lista({ lista, aoVer }: { lista: VistoTela[]; aoVer: (v: VistoTela) => void }) {
  if (!lista.length) return <p className="text-musgo">Ninguém.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm [&_td]:px-2 [&_th]:px-2">
        <thead className="text-musgo"><tr className="border-b text-right">
          <th scope="col" className="py-1 text-left font-medium">Jogador</th><th scope="col" className="text-left font-medium">Pos</th><th scope="col" className="font-medium">Id</th>
          <th scope="col" className="hidden text-left font-medium sm:table-cell">Clube</th><th scope="col" className="font-semibold text-cal">Nota</th><th scope="col" className="font-medium">Pot</th>
          <th scope="col" className="font-medium">Valor</th><th scope="col" className="hidden font-medium md:table-cell" title="Relatórios dos olheiros">Rel.</th>
        </tr></thead>
        <tbody>
          {lista.map((v) => (
            <tr key={v.id} className="border-b border-linha/40 text-right hover:bg-faixa">
              <td className="py-1 text-left"><button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => aoVer(v)}>{v.nome}</button>{v.observado && <span className="ml-1 text-xs text-led">obs.</span>}</td>
              <td className="text-left text-musgo">{v.posicao}</td><td className="text-musgo">{v.idade}</td>
              <td className="hidden text-left sm:table-cell">{v.clube ?? 'livre'}</td><td className="font-semibold">{v.nota}</td><td className="text-musgo">{v.pot}</td>
              <td>{mi(v.valor)}</td><td className="hidden text-musgo md:table-cell">{v.relatorios}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Mercado() {
  const [t, setT] = useState<MercadoTela | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string[]>([]);
  const [contra, setContra] = useState<Record<number, string>>({});
  useEffect(() => { pedir('mercado').then((m) => { setT(m); setAviso(m.avisos); }).catch((e: Error) => setErro(e.message)); }, []);
  const agir = async (p: PedidoMercado) => {
    setOcupado(true); setErro(null);
    try { const r = await pedir('agirMercado', p); setT(r.tela); setErro(r.erro); setAviso(r.tela.avisos); } catch (e) { setErro((e as Error).message); } finally { setOcupado(false); }
  };
  if (!t) return <p className={cn('flex items-center gap-2', erro ? 'text-cartao' : 'text-musgo')}>{erro ?? <><Spinner /> Carregando…</>}</p>;
  return (
    <section aria-labelledby="mercado" className="space-y-5">
      <h2 id="mercado" className="text-lg font-semibold">Mercado <span className="text-sm font-normal text-musgo">{t.janela}</span></h2>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quem cuida">
        <Button variant={t.manual ? 'secondary' : 'default'} disabled={ocupado} onClick={() => agir({ acao: 'modo', manual: false })}>Diretor cuida</Button>
        <Button variant={t.manual ? 'default' : 'secondary'} disabled={ocupado} onClick={() => agir({ acao: 'modo', manual: true })}>Eu cuido</Button>
      </div>
      <p className="text-sm text-musgo">{t.manual ? 'Você negocia à mão. Cada rodada leva um ciclo; a resposta chega no ciclo seguinte. Voltar ao diretor fecha o que estiver aberto.' : 'O diretor de futebol cuida do mercado, como a IA. Assuma para comprar, renovar e responder propostas.'}</p>
      <dl className="grid grid-cols-2 gap-3 border-y py-2 sm:grid-cols-4">
        {[['Orçamento de transferências', mi(t.orcamento)], ['Folha / teto', `${t.folha.toLocaleString('pt-BR')} / ${t.teto.toLocaleString('pt-BR')} mil`], ['Elenco', String(t.elenco)], ['Caixa', t.caixa === null ? '—' : mi(t.caixa)]].map(([a, b]) => (
          <div key={a}><dt className="text-xs text-musgo">{a}</dt><dd className="font-semibold">{b}</dd></div>
        ))}
      </dl>
      {aviso.length > 0 && <ul className="rounded-md border border-led/50 bg-relva p-3 text-sm">{aviso.map((a, i) => <li key={i}>{a}</li>)}</ul>}
      {erro && <p role="alert" className="text-cartao">{erro}</p>}

      {t.propostas.length > 0 && (
        <div>
          <h3 className="mb-1 font-semibold">Propostas recebidas ({t.propostas.length})</h3>
          <ul className="border-y text-sm">
            {t.propostas.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-linha/40 py-2 last:border-0">
                <span><span className="font-semibold">{p.comprador}</span> oferece {mi(p.oferta)} por <span className="font-semibold">{p.jogador}</span> <span className="text-musgo">(valor {mi(p.valor)})</span>
                  {p.maior && <span className="ml-1 text-xs text-led">clube maior: ele pode querer sair se recusar</span>}</span>
                <span className="flex flex-wrap items-center gap-1">
                  <Button size="sm" disabled={ocupado || !t.manual} onClick={() => agir({ acao: 'proposta', id: p.id, resposta: 'aceitar' })}>Aceitar</Button>
                  <Button size="sm" variant="secondary" disabled={ocupado || !t.manual} onClick={() => agir({ acao: 'proposta', id: p.id, resposta: 'recusar' })}>Recusar</Button>
                  <Input aria-label="Contraproposta em R$ mi" inputMode="decimal" placeholder="R$ mi" className="h-8 w-20" value={contra[p.id] ?? ''} onChange={(e) => setContra((c) => ({ ...c, [p.id]: e.target.value }))} />
                  <Button size="sm" variant="secondary" disabled={ocupado || !t.manual || !(Number((contra[p.id] ?? '').replace(',', '.')) > 0)} onClick={() => agir({ acao: 'proposta', id: p.id, resposta: Number((contra[p.id] ?? '').replace(',', '.')) })}>Contrapor</Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-1 font-semibold">Negociações ({t.negociacoes.length})</h3>
        {t.negociacoes.length === 0 ? <p className="text-sm text-musgo">Nenhuma aberta. Busque um jogador abaixo ou renove um contrato no seu elenco.</p>
          : <ul>{t.negociacoes.map((n) => <Negociacao key={`${n.id}-${n.fase}-${n.rodada}-${n.estado}`} n={n} ocupado={ocupado} aoEnviar={(termos) => agir({ acao: 'enviar', neg: n.id, termos })} />)}</ul>}
      </div>

      <Busca t={t} agir={agir} ocupado={ocupado || !t.manual} />

      {t.observados.length > 0 && (
        <div>
          <h3 className="mb-1 font-semibold">Observados ({t.observados.length})</h3>
          <Lista lista={t.observados} aoVer={(v) => agir({ acao: 'observar', id: v.id })} />
          <p className="mt-1 text-xs text-musgo">Clicar no nome tira da lista. Os olheiros fazem os relatórios deles primeiro (a cada 4 semanas).</p>
        </div>
      )}

      <div>
        <h3 className="mb-1 font-semibold">Meu elenco: renovar e transferíveis</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:px-2 [&_th]:px-2">
            <thead className="text-musgo"><tr className="border-b text-right">
              <th scope="col" className="py-1 text-left font-medium">Jogador</th><th scope="col" className="text-left font-medium">Pos</th><th scope="col" className="font-medium">Id</th>
              <th scope="col" className="font-semibold text-cal">Nota</th><th scope="col" className="font-medium">Contr.</th><th scope="col" className="hidden font-medium sm:table-cell">Salário</th>
              <th scope="col" className="hidden font-medium sm:table-cell">Valor</th><th scope="col" className="text-left font-medium">Ações</th>
            </tr></thead>
            <tbody>
              {t.meus.map((j) => (
                <tr key={j.id} className="border-b border-linha/40 text-right">
                  <td className="py-1 text-left font-semibold">{j.nome}{j.vencendo && <span className="ml-1 text-xs font-normal text-cartao">contrato acaba</span>}{j.querSair && <span className="ml-1 text-xs font-normal text-led">quer sair</span>}</td>
                  <td className="text-left text-musgo">{j.posicao}</td><td className="text-musgo">{j.idade}</td><td className="font-semibold">{j.nota.toFixed(1)}</td>
                  <td className="text-musgo">{j.contrato ?? '—'}</td><td className="hidden sm:table-cell">{j.salario.toLocaleString('pt-BR')}</td><td className="hidden sm:table-cell">{j.valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</td>
                  <td className="py-1 text-left"><span className="flex flex-wrap gap-1">
                    <Button size="sm" variant="secondary" disabled={ocupado || !t.manual} onClick={() => agir({ acao: 'renovar', id: j.id })}>Renovar</Button>
                    <Button size="sm" variant={j.transferivel ? 'default' : 'ghost'} aria-pressed={j.transferivel} disabled={ocupado || !t.manual} onClick={() => agir({ acao: 'transferivel', id: j.id })}>{j.transferivel ? 'Transferível' : 'Pôr à venda'}</Button>
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
