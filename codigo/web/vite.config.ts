import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import pacote from './package.json' with { type: 'json' };

// O núcleo (motor, gestão, temporada) e os JSON de `gerado/` ficam em `codigo/`, um nível acima: importados, não copiados.
export default defineConfig({
  // Caminhos relativos: o jogo roda na raiz, em subpasta e dentro do iframe do itch.io.
  base: './',
  define: { __VERSAO__: JSON.stringify(pacote.version) },
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  worker: { format: 'es' },
  server: { fs: { allow: ['..'] } },
});
