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

createRoot(document.getElementById('raiz')!).render(<StrictMode><ErroGeral><App /></ErroGeral></StrictMode>);

// Abre sem internet depois da primeira visita (só no pacote final, não no servidor de desenvolvimento).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => { navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined); });
}
