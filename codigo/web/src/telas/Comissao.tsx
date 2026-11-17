import { useEffect, useState } from 'react';
import { Button } from '@/componentes/ui/button';
import { Input } from '@/componentes/ui/input';
import { Spinner } from '@/componentes/spinner';
import { pedir } from '@/nucleo/cliente';
import type { CargoTela, ComissaoTela, PedidoComissao, ProfTela, ResultadoComissao } from '@/nucleo/protocolo';
import { cn } from '@/lib/utils';

const ROTULO: Record<string, string> = {
  Lei: 'Leitura de jogo', TTe: 'Treino técnico', TTa: 'Treino tático', Com: 'Comando', Rec: 'Recuperação', Prev: 'Prevenção', Cond: 'Condicionamento',
  TGol: 'Técnica de goleiro', Bat: 'Estudo de batedores', Prof: 'Profundidade', Prec: 'Precisão', Vivo: 'Leitura ao vivo', BP: 'Bola parada', Alc: 'Alcance', Faro: 'Faro',
  Form: 'Formação', Capt: 'Captação', Integ: 'Integração', Diag: 'Diagnóstico', Trat: 'Tratamento', Read: 'Readaptação', Emo: 'Gestão emocional', Jov: 'Formação de jovens',
  Def: 'Amenizar defeitos', Neg: 'Negociação', Rede: 'Rede de contatos', Elen: 'Gestão de elenco', Blind: 'Blindagem', NegC: 'Negociação comercial', Ing: 'Ingressos e sócio', Mkt: 'Marketing',
};
const NOME_CARGO: Record<string, string> = { Goleiros: 'Treinador de goleiros', Analista: 'Analista de desempenho', 'Coord. base': 'Coordenador da base', 'Médico': 'Departamento médico', Diretor: 'Diretor de futebol', Comercial: 'Gerente comercial', Preparador: 'Preparador físico', Psicólogo: 'Psicólogo esportivo', Auxiliar: 'Auxiliar técnico' };
const mi = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
const mil = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')} mil/mês`;

function Atributos({ p }: { p: ProfTela }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
      {p.atributos.map((a) => (
        <li key={a.sigla} title={ROTULO[a.sigla] ?? a.sigla}>
          <span className="text-musgo">{ROTULO[a.sigla] ?? a.sigla}</span>{' '}
          <span className="font-semibold">{a.valor}</span>
          {a.efetivo !== null && Math.round(a.efetivo) !== a.valor && <span className="text-xs text-musgo"> (efetivo {a.efetivo})</span>}
        </li>
      ))}
    </ul>
  );
}

function Perfil({ p }: { p: ProfTela }) {
  return (
    <p className="text-xs text-musgo">
      {p.idade} anos · {p.nac} · Rep {p.reputacao} · Ambição {p.ambicao} · Lealdade {p.lealdade}
      {p.quimica !== null && <> · Química {p.quimica}</>}
      {p.confianca && <span className="ml-1 text-led">homem de confiança</span>}
    </p>
  );
}

function Oferta({ p, base, rotulo, aoPropor, ocupado }: { p: ProfTela; base: number; rotulo: string; aoPropor: (oferta: number, anos: number) => void; ocupado: boolean }) {
  const [oferta, setOferta] = useState(base);
  const [anos, setAnos] = useState(2);
  return (
    <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); aoPropor(oferta, anos); }}>
      <label className="text-xs text-musgo">Salário (R$ mil/mês)
        <Input type="number" min={1} className="mt-0.5 h-8 w-28" value={oferta} onChange={(e) => setOferta(Number(e.target.value))} aria-label={`Salário para ${p.nome}`} />
      </label>
      <label className="text-xs text-musgo">Contrato
        <select className="mt-0.5 block h-8 rounded-md border border-linha bg-relva px-2 text-sm" value={anos} onChange={(e) => setAnos(Number(e.target.value))}>
          {[1, 2, 3, 4].map((a) => <option key={a} value={a}>{a} {a === 1 ? 'ano' : 'anos'}</option>)}
        </select>
      </label>
      <Button type="submit" size="sm" disabled={ocupado || !(oferta > 0)}>{rotulo}</Button>
    </form>
  );
}

function Cargo({ c, t, agir, ocupado }: { c: CargoTela; t: ComissaoTela; agir: (p: PedidoComissao) => void; ocupado: boolean }) {
  const [vendo, setVendo] = useState<'candidatos' | 'renovar' | null>(null);
  const titulo = NOME_CARGO[c.cargo] ?? c.cargo;
  const daDiretoria = c.cargo === 'Diretor' || c.cargo === 'Comercial';
  return (
    <li className="rounded-md border border-linha p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{titulo}</h3>
        {c.atual && <span className="text-sm text-musgo">{mil(c.atual.salario)} · até {c.atual.contrato ?? '—'}</span>}
      </div>
      {c.atual ? (
        <div className="mt-1 space-y-1">
          <p className="font-semibold">{c.atual.nome}</p>
          <Perfil p={c.atual} />
          <Atributos p={c.atual} />
          {daDiretoria && <p className="text-xs text-musgo">Cargo acima do técnico: a diretoria escolhe, demite e renova.</p>}
          {!daDiretoria && <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="secondary" disabled={ocupado} onClick={() => setVendo(vendo === 'renovar' ? null : 'renovar')}>Renovar / negociar</Button>
            <Button size="sm" variant="ghost" disabled={ocupado} title={`Rescisão: 50% dos salários restantes (${mi(c.rescisaoMi ?? 0)})`}
              onClick={() => { if (confirm(`Demitir ${c.atual!.nome}? Custa ${mi(c.rescisaoMi ?? 0)} (50% dos salários restantes).`)) agir({ acao: 'demitir', cargo: c.cargo }); }}>
              Demitir ({mi(c.rescisaoMi ?? 0)})
            </Button>
          </div>}
          {vendo === 'renovar' && !daDiretoria && (
            <div className="rounded-md bg-faixa p-2 text-sm">
              <p>Ele pede {mil(c.pedidoRenovacao ?? c.atual.salario)}{(c.pedidoRenovacao ?? 0) > c.atual.salario ? ' (ambição acima da lealdade: quer aumento para ficar)' : ''}.</p>
              <Oferta p={c.atual} base={c.pedidoRenovacao ?? c.atual.salario} rotulo="Propor renovação" ocupado={ocupado} aoPropor={(oferta, anos) => agir({ acao: 'renovar', cargo: c.cargo, oferta, anos })} />
            </div>
          )}
        </div>
      ) : (
        <p className="mt-1 text-sm text-cartao">Cargo vago: todos os atributos valem 3.</p>
      )}
      {!c.atual && daDiretoria && <p className="mt-1 text-xs text-musgo">A diretoria preenche este cargo.</p>}
      {!c.atual && !daDiretoria && (
        <div className="pt-2">
          <Button size="sm" disabled={ocupado || !t.janela} title={t.janela ? '' : 'Contratações só nas janelas de transferência.'} onClick={() => setVendo(vendo === 'candidatos' ? null : 'candidatos')}>
            Contratar ({c.livres.length} disponíveis)
          </Button>
          {!t.janela && <span className="ml-2 text-xs text-musgo">só nas janelas</span>}
        </div>
      )}
      {!c.atual && vendo === 'candidatos' && t.janela && (
        <ul className="mt-2 space-y-2">
          {c.livres.length === 0 && <li className="text-sm text-musgo">Ninguém disponível neste cargo agora.</li>}
          {c.livres.map((l) => (
            <li key={l.nome} className="rounded-md bg-faixa p-2">
              <p className="font-semibold">{l.nome} <span className="text-sm font-normal text-musgo">pede {mil(l.salario)}</span></p>
              <Perfil p={l} />
              <Atributos p={l} />
              <Oferta p={l} base={l.salario} rotulo="Propor contrato" ocupado={ocupado} aoPropor={(oferta, anos) => agir({ acao: 'contratar', nome: l.nome, oferta, anos })} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function Comissao() {
  const [t, setT] = useState<ComissaoTela | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [msgs, setMsgs] = useState<string[]>([]);
  useEffect(() => { pedir('comissao').then(setT).catch((e: Error) => setErro(e.message)); }, []);
  const agir = async (p: PedidoComissao) => {
    setOcupado(true); setErro(null);
    try {
      const r: ResultadoComissao = await pedir('agirComissao', p);
      setT(r.tela); setErro(r.erro);
      const texto = r.aviso ?? (r.resposta && r.resposta.tipo !== 'aceita' ? r.resposta.texto : null);
      if (texto) setMsgs((m) => [texto, ...m].slice(0, 5));
    } catch (e) { setErro((e as Error).message); } finally { setOcupado(false); }
  };
  if (!t) return <p className="flex items-center gap-2 text-musgo"><Spinner /> {erro ?? 'Carregando…'}</p>;
  if (!t.temComissao) return <p className="text-musgo">Este clube não tem comissão técnica nos dados.</p>;
  const vagos = t.cargos.filter((c) => !c.atual).length;
  return (
    <section aria-labelledby="comissao" className="space-y-3">
      <h2 id="comissao" className="text-lg font-semibold">Comissão técnica <span className="text-sm font-normal text-musgo">{12 - vagos}/12 cargos · folha {mil(t.folhaMil)} · CT {t.ct ?? '—'} · base {t.base ?? '—'}{t.caixa !== null && <> · caixa {mi(t.caixa)}</>}</span></h2>
      <p className={cn('text-sm', t.janela ? 'text-led' : 'text-musgo')}>
        {t.janela ? 'Janela aberta: dá para contratar.' : 'Fora da janela: só dá para demitir e renovar. Contratações nas janelas de transferência.'}
        {' '}Demitir custa 50% dos salários restantes. A estrutura (CT e base) sobe na aba Comercial.
      </p>
      {msgs.length > 0 && <ul className="rounded-md border border-led/50 bg-relva p-3 text-sm" aria-live="polite">{msgs.map((m, i) => <li key={i}>{m}</li>)}</ul>}
      {erro && <p role="alert" className="text-cartao">{erro}</p>}
      <ul className="grid gap-3 lg:grid-cols-2">
        {t.cargos.map((c) => <Cargo key={c.cargo + (c.atual?.nome ?? '')} c={c} t={t} agir={agir} ocupado={ocupado} />)}
      </ul>
    </section>
  );
}
