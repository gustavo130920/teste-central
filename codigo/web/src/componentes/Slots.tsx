import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/componentes/ui/button';
import { pedir } from '@/nucleo/cliente';
import type { InfoSlot, Slot } from '@/nucleo/protocolo';
import { SLOTS_MANUAIS } from '@/nucleo/protocolo';

const quando = (iso: string): string => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const tamanho = (b: number): string => `${(b / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;

interface Props {
  /** Salvar: os slots manuais recebem o jogo atual. Carregar: abre o slot. */
  modo: 'salvar' | 'carregar';
  aoCarregar?: (slot: Slot) => void;
  aoSalvar?: (info: InfoSlot) => void;
  ocupado?: boolean;
}

/** Tabela dos 6 slots (automático + 5 manuais), com exportar, importar e apagar. */
export function Slots({ modo, aoCarregar, aoSalvar, ocupado }: Props) {
  const [slots, setSlots] = useState<InfoSlot[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trabalhando, setTrabalhando] = useState<Slot | null>(null);
  const [confirmar, setConfirmar] = useState<Slot | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const destino = useRef<Slot>('1');

  const atualizar = useCallback(() => { pedir('slots').then(setSlots, (e: Error) => setAviso(e.message)); }, []);
  useEffect(atualizar, [atualizar]);

  const de = (s: Slot) => slots?.find((x) => x.slot === s) ?? null;
  const fazer = async (slot: Slot, f: () => Promise<unknown>, ok?: string) => {
    setTrabalhando(slot);
    setAviso(null);
    try { await f(); if (ok) setAviso(ok); } catch (e) { setAviso((e as Error).message); } finally { setTrabalhando(null); atualizar(); }
  };
  const exportar = (slot: Slot) => fazer(slot, async () => {
    const { nome, dados } = await pedir('exportar', slot);
    const url = URL.createObjectURL(dados);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'Arquivo exportado.');
  const importar = (slot: Slot) => { destino.current = slot; arquivo.current?.click(); };
  const aoEscolherArquivo = (f: File | undefined) => {
    if (!f) return;
    void fazer(destino.current, () => pedir('importar', { slot: destino.current, dados: f }), `Save importado no slot ${destino.current}.`);
    if (arquivo.current) arquivo.current.value = '';
  };

  const linhas: Slot[] = ['auto', ...SLOTS_MANUAIS];
  return (
    <div>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Saves gravados neste navegador</caption>
        <thead className="text-musgo">
          <tr className="border-b">
            <th scope="col" className="py-1.5 pr-2 font-medium">Slot</th>
            <th scope="col" className="py-1.5 pr-2 font-medium">Carreira</th>
            <th scope="col" className="hidden py-1.5 pr-2 font-medium sm:table-cell">Gravado</th>
            <th scope="col" className="py-1.5 text-right font-medium"><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((s) => {
            const info = de(s);
            const manual = s !== 'auto';
            const ocupadoAqui = trabalhando === s;
            return (
              <tr key={s} className="border-b border-linha/60 align-middle">
                <th scope="row" className="py-2 pr-2 font-semibold">{manual ? s : 'Auto'}</th>
                <td className="py-2 pr-2">
                  {info ? (
                    <>
                      <span className="font-semibold">{info.clube}</span>{' '}
                      <span className="text-musgo">ano {info.ano}, semana {info.semana}</span>
                      <span className="block text-xs text-musgo">{info.tecnico}</span>
                    </>
                  ) : <span className="text-musgo">{manual ? 'Vazio' : 'Gravado sozinho em toda virada de ano'}</span>}
                </td>
                <td className="hidden py-2 pr-2 text-musgo sm:table-cell">{info ? <>{quando(info.criado)}<span className="block text-xs">{tamanho(info.tamanho)}</span></> : null}</td>
                <td className="py-2">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {modo === 'salvar' && manual && (
                      <Button size="sm" disabled={ocupado || !!trabalhando} onClick={() => fazer(s, async () => aoSalvar?.(await pedir('salvar', s)), `Salvo no slot ${s}.`)}>
                        {ocupadoAqui ? 'Salvando…' : info ? 'Salvar por cima' : 'Salvar aqui'}
                      </Button>
                    )}
                    {modo === 'carregar' && info && (
                      <Button size="sm" disabled={!!trabalhando} onClick={() => aoCarregar?.(s)}>Carregar</Button>
                    )}
                    {info && <Button size="sm" variant="secondary" disabled={!!trabalhando} onClick={() => exportar(s)}>Exportar</Button>}
                    {manual && modo === 'carregar' && <Button size="sm" variant="secondary" disabled={!!trabalhando} onClick={() => importar(s)}>Importar</Button>}
                    {info && (confirmar === s ? (
                      <Button size="sm" variant="destructive" onClick={() => { setConfirmar(null); void fazer(s, () => pedir('apagar', s), 'Save apagado.'); }}>Confirmar</Button>
                    ) : (
                      <Button size="sm" variant="ghost" disabled={!!trabalhando} onClick={() => setConfirmar(s)}>Apagar</Button>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <input ref={arquivo} type="file" accept=".save,application/gzip" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => aoEscolherArquivo(e.target.files?.[0])} />
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-musgo">{slots === null && !aviso ? 'Lendo os saves…' : aviso}</p>
    </div>
  );
}
