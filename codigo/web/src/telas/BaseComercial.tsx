import { useEffect, useState } from 'react';
import { Button } from '@/componentes/ui/button';
import { Input } from '@/componentes/ui/input';
import { Spinner } from '@/componentes/spinner';
import { pedir } from '@/nucleo/cliente';
import type { BaseTela, ComercialTela, PedidoBase, PedidoComercial } from '@/nucleo/protocolo';
import { cn } from '@/lib/utils';

const mi = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
const reais = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
const dif = (v: number, ref: number) => `${v >= ref ? '+' : ''}${Math.round((v / ref - 1) * 100)}%`;

function Modo({ manual, aoMudar, ocupado, rotuloIA, rotuloEu }: { manual: boolean; aoMudar: (m: boolean) => void; ocupado: boolean; rotuloIA: string; rotuloEu: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Quem cuida">
      <Button variant={manual ? 'secondary' : 'default'} disabled={ocupado} onClick={() => aoMudar(false)}>{rotuloIA}</Button>
      <Button variant={manual ? 'default' : 'secondary'} disabled={ocupado} onClick={() => aoMudar(true)}>{rotuloEu}</Button>
    </div>
  );
}

function Avisos({ lista }: { lista: string[] }) {
  return lista.length ? <ul className="rounded-md border border-led/50 bg-relva p-3 text-sm">{lista.map((a, i) => <li key={i}>{a}</li>)}</ul> : null;
}

export function Base() {
  const [t, setT] = useState<BaseTela | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string[]>([]);
  useEffect(() => { pedir('base').then((b) => { setT(b); setAviso(b.avisos); }).catch((e: Error) => setErro(e.message)); }, []);
  const agir = async (p: PedidoBase, ok?: string) => {
    setOcupado(true); setErro(null);
    try { const r = await pedir('agirBase', p); setT(r.tela); setErro(r.erro); if (!r.erro && ok) setAviso((a) => [ok, ...a]); } catch (e) { setErro((e as Error).message); } finally { setOcupado(false); }
  };
  if (!t) return <p className="flex items-center gap-2 text-musgo"><Spinner /> {erro ?? 'Carregando…'}</p>;
  return (
    <section aria-labelledby="base" className="space-y-3">
      <h2 id="base" className="text-lg font-semibold">Base ({t.jovens.length} jovens) <span className="text-sm font-normal text-musgo">elenco {t.elenco}/{t.elencoMax}; sobe aos 20 ou sai</span></h2>
      <Modo manual={t.manual} ocupado={ocupado} rotuloIA="Coordenador cuida" rotuloEu="Eu cuido" aoMudar={(m) => agir({ acao: 'modo', manual: m, idadeMinima: t.idadeMinima })} />
      <p className="text-sm text-musgo">
        {t.manual ? 'Você sobe, dispensa e empresta. Sem subidas automáticas na virada.' : 'O coordenador sobe jovens na virada, como a IA.'}
        {!t.manual && <label className="ml-3 inline-flex items-center gap-2">Idade mínima para subir
          <Input type="number" min={16} max={20} className="h-8 w-16" defaultValue={t.idadeMinima ?? ''} placeholder="—"
            onBlur={(e) => agir({ acao: 'modo', manual: false, idadeMinima: e.target.value ? Number(e.target.value) : null })} />
        </label>}
      </p>
      <Avisos lista={aviso} />
      {erro && <p role="alert" className="text-cartao">{erro}</p>}
      {t.jovens.length === 0 ? <p className="text-musgo">Nenhum jovem na base.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:px-2 [&_th]:px-2">
            <thead className="text-musgo"><tr className="border-b text-right">
              <th scope="col" className="py-1 text-left font-medium">Jovem</th><th scope="col" className="text-left font-medium">Pos</th>
              <th scope="col" className="font-medium">Id</th><th scope="col" className="font-semibold text-cal">Nota</th><th scope="col" className="font-medium">Pot</th>
              <th scope="col" className="hidden text-left font-medium md:table-cell">Perfil</th><th scope="col" className="text-left font-medium">Ações</th>
            </tr></thead>
            <tbody>
              {t.jovens.map((j) => (
                <tr key={j.id} className="border-b border-linha/40 text-right">
                  <td className="py-1 text-left font-semibold">{j.nome}{j.emprestimoPedido && <span className="ml-2 text-xs font-normal text-led">empréstimo pedido</span>}</td>
                  <td className="text-left text-musgo">{j.posicao}</td>
                  <td className="text-musgo">{j.idade}</td>
                  <td className="font-semibold">{j.nota}</td>
                  <td className="text-musgo">{j.pot ? `${j.pot[0]}-${j.pot[1]}` : '?'}</td>
                  <td className="hidden text-left text-musgo md:table-cell">{j.perfil ?? '—'}</td>
                  <td className="py-1 text-left">
                    <span className="flex flex-wrap gap-1">
                      <Button size="sm" variant="secondary" disabled={ocupado} onClick={() => agir({ acao: 'subir', id: j.id }, `${j.nome} sobe ao profissional.`)}>Subir</Button>
                      <Button size="sm" variant="secondary" disabled={ocupado || !t.janela} title={t.janela ? 'O diretor procura um clube; resposta no próximo ciclo.' : 'Só nas janelas de transferência.'} onClick={() => agir({ acao: 'emprestar', id: j.id }, `${j.nome}: o diretor procura um clube (resposta no próximo ciclo).`)}>Emprestar</Button>
                      <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => { if (confirm(`Dispensar ${j.nome}? Não tem volta.`)) agir({ acao: 'dispensar', id: j.id }, `${j.nome} dispensado.`); }}>Dispensar</Button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function Comercial() {
  const [t, setT] = useState<ComercialTela | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string[]>([]);
  const [ingresso, setIngresso] = useState('');
  const [mensal, setMensal] = useState('');
  const [valor, setValor] = useState('');
  useEffect(() => { pedir('comercial').then((c) => { setT(c); setAviso(c.avisos); setIngresso(String(Math.round(c.ingresso))); setMensal(String(Math.round(c.mensalidade))); }).catch((e: Error) => setErro(e.message)); }, []);
  const agir = async (p: PedidoComercial, ok?: string) => {
    setOcupado(true); setErro(null);
    try { const r = await pedir('agirComercial', p); setT(r.tela); setErro(r.erro); if (!r.erro && ok) setAviso((a) => [ok, ...a]); } catch (e) { setErro((e as Error).message); } finally { setOcupado(false); }
  };
  if (!t) return <p className={cn('flex items-center gap-2', erro ? 'text-cartao' : 'text-musgo')}>{erro ?? <><Spinner /> Carregando…</>}</p>;
  const n = Number(valor.replace(',', '.'));
  return (
    <section aria-labelledby="com" className="space-y-4">
      <h2 id="com" className="text-lg font-semibold">Comercial <span className="text-sm font-normal text-musgo">mês {t.mes + 1}</span></h2>
      <Modo manual={t.manual} ocupado={ocupado} rotuloIA="Gerente cuida" rotuloEu="Eu cuido" aoMudar={(m) => agir({ acao: 'modo', manual: m })} />
      <p className="text-sm text-musgo">{t.manual ? 'Preços, empréstimos, amortização e obras são seus (sem o bônus do gerente nos preços). O patrocínio na virada fica com o gerente.' : 'O gerente joga os preços na referência. Assuma para mexer em preços, dívida e obras.'}</p>
      <Avisos lista={aviso} />
      {erro && <p role="alert" className="text-cartao">{erro}</p>}
      <dl className="grid grid-cols-2 gap-3 border-y py-2 sm:grid-cols-4">
        {[['Caixa', mi(t.caixa)], ['Dívida', mi(t.divida)], ['Banco', `${mi(t.banco)} (cabe ${mi(t.cabeMais)})`], ['Humor da torcida', String(Math.round(t.humor))]].map(([a, b]) => (
          <div key={a}><dt className="text-xs text-musgo">{a}</dt><dd className="font-semibold">{b}</dd></div>
        ))}
      </dl>

      <fieldset disabled={!t.manual || ocupado} className="space-y-2">
        <legend className="font-semibold">Preços {!t.podeMudarPreco && <span className="text-sm font-normal text-musgo">(já mudaram neste mês)</span>}</legend>
        <p className="text-sm text-musgo">{Math.round(t.socios).toLocaleString('pt-BR')} sócios. Entre {t.precoMin * 100}% e {t.precoMax * 100}% da referência; 30% acima tira Humor, 30% abaixo soma.</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">Ingresso (ref. {reais(t.ingressoRef)}, hoje {dif(t.ingresso, t.ingressoRef)})
            <Input inputMode="numeric" className="mt-1 w-32" value={ingresso} onChange={(e) => setIngresso(e.target.value)} /></label>
          <label className="text-sm">Mensalidade (ref. {reais(t.mensalidadeRef)}, hoje {dif(t.mensalidade, t.mensalidadeRef)})
            <Input inputMode="numeric" className="mt-1 w-32" value={mensal} onChange={(e) => setMensal(e.target.value)} /></label>
          <Button disabled={!t.manual || ocupado || !t.podeMudarPreco} onClick={() => agir({ acao: 'precos', ingresso: Number(ingresso) || undefined, mensalidade: Number(mensal) || undefined }, 'Preços mudados.')}>Aplicar</Button>
        </div>
      </fieldset>

      <fieldset disabled={!t.manual || ocupado} className="space-y-2">
        <legend className="font-semibold">Dívida</legend>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">Valor (R$ mi)<Input inputMode="decimal" className="mt-1 w-32" value={valor} onChange={(e) => setValor(e.target.value)} /></label>
          <Button variant="secondary" disabled={!t.manual || ocupado || !(n > 0)} onClick={() => agir({ acao: 'emprestimo', valor: n }, `Empréstimo de ${mi(n)} tomado.`)}>Tomar empréstimo</Button>
          <Button variant="secondary" disabled={!t.manual || ocupado || !(n > 0)} onClick={() => agir({ acao: 'amortizar', valor: n }, `Amortizado ${mi(n)} da dívida.`)}>Amortizar</Button>
        </div>
        <p className="text-xs text-musgo">Empréstimo precisa do aval da diretoria (Confiança 40+). Amortizar usa o caixa; o banco sai primeiro.</p>
      </fieldset>

      <div>
        <h3 className="mb-1 font-semibold">Estrutura</h3>
        <ul className="border-y text-sm">
          {t.obras.map((o) => (
            <li key={o.tipo} className="flex flex-wrap items-center justify-between gap-2 border-b border-linha/40 py-1.5 last:border-0">
              <span><span className="font-semibold">{o.tipo === 'ct' ? 'Centro de treinamento' : 'Base'}</span> nível {o.nivel}{o.obraAte !== null && <span className="ml-2 text-led">obra até o dia {o.obraAte}</span>}</span>
              <Button size="sm" variant="secondary" disabled={!t.manual || ocupado || o.obraAte !== null} onClick={() => agir({ acao: 'obra', tipo: o.tipo }, `Obra ${o.tipo === 'ct' ? 'do CT' : 'da base'} iniciada.`)}>
                {o.obraAte !== null ? 'Em obra' : `+1 nível por ${mi(o.custo ?? 0)}`}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-1 font-semibold">Patrocínios</h3>
        <ul className="border-y text-sm">
          {t.cotas.map((c) => <li key={c.tipo} className="flex justify-between gap-2 border-b border-linha/40 py-1.5 last:border-0"><span><span className="text-musgo">{c.tipo}</span> {c.marca}</span><span>{mi(c.valor)}/ano até {c.ate}</span></li>)}
        </ul>
      </div>
    </section>
  );
}
