import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/barlow-semi-condensed/400.css';
import '@fontsource/barlow-semi-condensed/500.css';
import '@fontsource/barlow-semi-condensed/600.css';
import '@fontsource/barlow-semi-condensed/700.css';
import '@fontsource/doto/700.css';
import '@fontsource/doto/900.css';
import App from './App';
import { ErroGeral } from './componentes/ErroGeral';
import './index.css';

// Navegador antigo demais para o jogo (worker de módulo, compressão dos saves, IndexedDB): avisa em vez de ficar em branco.
const faltando = [typeof Worker === 'undefined' && 'Web Workers', typeof CompressionStream === 'undefined' && 'compressão de arquivos', typeof indexedDB === 'undefined' && 'armazenamento local'].filter(Boolean);
if (faltando.length) {
  document.getElementById('raiz')!.innerHTML = `<main style="max-width:36rem;margin:4rem auto;padding:0 1rem;font-family:sans-serif;color:#dfe8e2"><h1>Navegador não suportado</h1><p>O Central do Técnico precisa de: ${faltando.join(', ')}. Use uma versão recente do Chrome, Edge, Firefox ou Safari (16.4 ou mais novo).</p></main>`;
} else {
createRoot(document.getElementById('raiz')!).render(<StrictMode><ErroGeral><App /></ErroGeral></StrictMode>);
}

// Abre sem internet depois da primeira visita (só no pacote final, não no servidor de desenvolvimento).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => { navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined); });
}
