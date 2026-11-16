// Campo 2D visto de cima (5e, PixiJS): grade de 5 corredores × 6 faixas, os 11 de cada time na zona da formação e a bola
// indo de zona em zona a cada lance. O motor só registra zonas, então as posições são por zona (sem inventar movimento).
import { useEffect, useRef } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import type { Lance2D } from '@/nucleo/protocolo';

const CORREDORES = ['PE', 'ME', 'CE', 'MD', 'PD'];
const COR = { gramaA: 0x1a3d29, gramaB: 0x16341f, linha: 0x93ab9b, casa: 0xffb627, fora: 0x7fb8e6, bola: 0xffffff, gol: 0xffb627 };

/** Zona "CE3" (no ponto de vista de quem ataca) → ponto do campo (0 a 1). Time 0 ataca para a direita; o time 1, para a esquerda. */
export function pontoDaZona(zona: string, time: 0 | 1): [number, number] | null {
  const c = CORREDORES.indexOf(zona.slice(0, 2));
  const f = Number(zona[2]);
  if (c < 0 || !(f >= 1 && f <= 6)) return null;
  const x = (f - 0.5) / 6;
  const y = (c + 0.5) / 5;
  return time === 0 ? [x, y] : [1 - x, 1 - y];
}

export interface Escalado2D { vaga: string; zona?: string }

const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Espalha quem divide a mesma zona em volta do centro dela. */
function posicoes(vagas: Escalado2D[], time: 0 | 1): [number, number][] {
  const cont = new Map<string, number>();
  const total = new Map<string, number>();
  const zonas = vagas.map((v) => v.zona ?? (v.vaga === 'GOL' ? 'CE1' : 'CE3'));
  for (const z of zonas) total.set(z, (total.get(z) ?? 0) + 1);
  return zonas.map((z) => {
    const p = pontoDaZona(z, time) ?? [0.5, 0.5];
    const n = total.get(z)!;
    const i = cont.get(z) ?? 0;
    cont.set(z, i + 1);
    const desloc = n > 1 ? (i - (n - 1) / 2) * 0.035 : 0;
    return [p[0], p[1] + desloc] as [number, number];
  });
}

interface Props {
  /** Quem joga: o time do jogador (lado 0 = mandante) e o rival, com a vaga de cada um. */
  meu: Escalado2D[];
  rival: Escalado2D[];
  lado: 0 | 1;
  /** Lance que está na narração agora (null: bola no meio). */
  lance: Lance2D | null;
  gol: boolean;
  velocidade: number;
}

export function Campo2D({ meu, rival, lado, lance, gol, velocidade }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const estado = useRef<{ app: Application | null; desenhar: () => void; alvo: [number, number]; atual: [number, number]; gol: boolean; flash: number }>({
    app: null, desenhar: () => undefined, alvo: [0.5, 0.5], atual: [0.5, 0.5], gol: false, flash: 0,
  });
  const dados = useRef({ meu, rival, lado, velocidade });
  dados.current = { meu, rival, lado, velocidade };

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    let morto = false;
    const app = new Application();
    const E = estado.current;
    (async () => {
      await app.init({ resizeTo: el, antialias: true, backgroundAlpha: 0, resolution: window.devicePixelRatio || 1, autoDensity: true });
      if (morto) { app.destroy(true, { children: true }); return; }
      el.appendChild(app.canvas);
      // O canvas não pode empurrar o tamanho da caixa (senão não encolhe no celular).
      Object.assign(app.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
      const campo = new Graphics();
      const jogadores = new Graphics();
      const bola = new Container();
      const miolo = new Graphics();
      const aro = new Graphics();
      bola.addChild(aro, miolo);
      app.stage.addChild(campo, jogadores, bola);
      E.app = app;
      const dim = () => ({ w: app.screen.width, h: app.screen.height });
      const desenhar = () => {
        const { w, h } = dim();
        campo.clear();
        for (let f = 0; f < 6; f++) campo.rect((f * w) / 6, 0, w / 6 + 1, h).fill(f % 2 ? COR.gramaB : COR.gramaA);
        campo.rect(1, 1, w - 2, h - 2).stroke({ width: 2, color: COR.linha, alpha: 0.7 });
        campo.moveTo(w / 2, 0).lineTo(w / 2, h).stroke({ width: 2, color: COR.linha, alpha: 0.7 });
        campo.circle(w / 2, h / 2, Math.min(w, h) * 0.14).stroke({ width: 2, color: COR.linha, alpha: 0.7 });
        for (const lado of [0, 1]) {
          const x0 = lado === 0 ? 1 : w * (1 - 1 / 6) - 1;
          campo.rect(x0, h * 0.2, w / 6, h * 0.6).stroke({ width: 2, color: COR.linha, alpha: 0.7 });
          campo.rect(lado === 0 ? 1 : w - 1 - w * 0.035, h * 0.4, w * 0.035, h * 0.2).stroke({ width: 2, color: COR.linha, alpha: 0.7 });
        }
        const d = dados.current;
        jogadores.clear();
        const raio = Math.max(5, Math.min(w, h) * 0.028);
        // O time do jogador é o `lado` (0 = mandante); as vagas de cada um estão no ponto de vista do próprio ataque.
        const desenharTime = (vagas: Escalado2D[], time: 0 | 1, cor: number) => {
          for (const [x, y] of posicoes(vagas, time)) jogadores.circle(x * w, y * h, raio).fill({ color: cor, alpha: 0.92 }).stroke({ width: 1.5, color: 0x07110a, alpha: 0.8 });
        };
        desenharTime(d.meu, d.lado, d.lado === 0 ? COR.casa : COR.fora);
        desenharTime(d.rival, d.lado === 0 ? 1 : 0, d.lado === 0 ? COR.fora : COR.casa);
      };
      E.desenhar = desenhar;
      desenhar();
      const ro = new ResizeObserver(() => { app.resize(); desenhar(); });
      ro.observe(el);
      (app as unknown as { __ro: ResizeObserver }).__ro = ro;
      app.ticker.add((t) => {
        const { w, h } = dim();
        const rapido = semMovimento();
        const k = rapido ? 1 : Math.min(1, (t.deltaMS / 320) * dados.current.velocidade);
        E.atual = [E.atual[0] + (E.alvo[0] - E.atual[0]) * k, E.atual[1] + (E.alvo[1] - E.atual[1]) * k];
        const r = Math.max(3.5, Math.min(w, h) * 0.016);
        miolo.clear().circle(0, 0, r).fill(COR.bola).stroke({ width: 1, color: 0x07110a });
        E.flash = Math.max(0, E.flash - t.deltaMS / 900);
        aro.clear();
        if (E.gol || E.flash > 0) aro.circle(0, 0, r + 6 + (1 - E.flash) * 18).stroke({ width: 3, color: COR.gol, alpha: E.flash > 0 ? E.flash : 0.9 });
        bola.position.set(E.atual[0] * w, E.atual[1] * h);
      });
    })();
    return () => {
      morto = true;
      const a = E.app;
      E.app = null;
      E.desenhar = () => undefined;
      if (a) { (a as unknown as { __ro?: ResizeObserver }).__ro?.disconnect(); a.destroy(true, { children: true }); }
    };
  }, []);

  // Posições dos times mudam nas pausas (trocas, formação).
  useEffect(() => { estado.current.desenhar(); }, [meu, rival, lado]);

  // Bola: vai para a zona de destino do lance (ou a de origem, sem destino).
  useEffect(() => {
    const E = estado.current;
    const z = lance ? lance.para ?? lance.de : null;
    const p = lance && z ? pontoDaZona(z, lance.time) : null;
    if (p) E.alvo = p; else if (!lance) { E.alvo = [0.5, 0.5]; E.atual = [0.5, 0.5]; }
    if (gol && lance?.tema === 'gol') E.flash = 1;
    E.gol = false;
  }, [lance, gol]);

  return <div ref={caixa} className="relative aspect-[3/2] w-full min-w-0 overflow-hidden rounded-md border border-linha bg-relva" role="img"
    aria-label="Campo visto de cima com os dois times e a bola. A narração ao lado descreve cada lance." />;
}
