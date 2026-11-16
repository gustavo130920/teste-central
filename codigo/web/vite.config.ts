import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// O núcleo (motor, gestão, temporada) e os JSON de `gerado/` ficam em `codigo/`, um nível acima: importados, não copiados.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  worker: { format: 'es' },
  server: { fs: { allow: ['..'] } },
});
