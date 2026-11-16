import { useEffect, useState } from 'react';
import { Spinner } from '@/componentes/spinner';
import { pedir } from '@/nucleo/cliente';
import type { DiretoriaTela } from '@/nucleo/protocolo';

export function Diretoria() {
  const [t, setT] = useState<DiretoriaTela | null | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => { pedir('diretoria').then(setT).catch((e: Error) => setErro(e.message)); }, []);
  if (erro) return <p role="alert" className="text-cartao">{erro}</p>;
  if (t === undefined) return <p className="flex items-center gap-2 text-musgo"><Spinner /> Carregando…</p>;
  if (t === null) return <p className="text-musgo">Este clube não tem diretoria detalhada (só os 30 brasileiros).</p>;
  const linhas: [string, string, string?][] = [
    ['Confiança', `${Math.round(t.confianca)}`, 'De 0 a 100. Muito baixa, o técnico cai.'],
    ['Humor da torcida', t.humor === null ? '—' : `${Math.round(t.humor)}`],
    ['Jogos sem vencer', `${t.semVencer}`, '5 seguidos tiram Confiança.'],
    ['Meta do ano', t.meta ? `${t.nivel}: ${t.meta}${t.bonus !== null ? ` (orçamento +${Math.round(t.bonus * 100)}%)` : ''}` : t.nivel],
    ['Contrato do técnico até', `${t.contratoAte}`],
    ['Paciência', `${t.paciencia}`, 'Alta: tolera mais derrotas.'],
    ['Ambição', `${t.ambicao}`, '17 ou mais: exige metas ousadas.'],
    ['Perfil financeiro', t.financeiro],
    ['Interferência', t.interferencia],
    ['Popularidade', `${t.popularidade}`],
    ['Próxima eleição', t.eleicao === null ? (t.saf ? 'SAF: sem eleição' : '—') : `${t.eleicao}`],
  ];
  if (t.investidor) linhas.push(['Meta do investidor', t.investidor]);
  return (
    <section aria-labelledby="dir" className="space-y-2">
      <h2 id="dir" className="text-lg font-semibold">Diretoria</h2>
      <dl className="border-y text-sm">
        {linhas.map(([a, b, dica]) => (
          <div key={a} title={dica} className="flex justify-between gap-4 border-b border-linha/40 py-1.5 last:border-0"><dt className="text-musgo">{a}</dt><dd className="text-right font-semibold">{b}</dd></div>
        ))}
      </dl>
      <p className="text-xs text-musgo">A meta e as propostas de emprego chegam como perguntas no meio do ciclo.</p>
    </section>
  );
}
