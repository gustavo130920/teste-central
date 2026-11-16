// Gera public/licencas.txt com as licenças das dependências de produção (npm run licencas).
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const pacotes = Object.entries(lock.packages)
  .filter(([k, v]) => k && !v.dev && !v.optional && k.startsWith('node_modules/'))
  .map(([k, v]) => ({ dir: k, nome: k.replace(/^.*node_modules\//, ''), versao: v.version, licenca: v.license ?? 'desconhecida' }))
  .sort((a, b) => a.nome.localeCompare(b.nome));

const textos = new Map(); // hash -> { texto, usos }
const semTexto = [];
for (const p of pacotes) {
  const arq = existsSync(p.dir) ? readdirSync(p.dir).find((f) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(f)) : null;
  if (!arq) { semTexto.push(p); continue; }
  const texto = readFileSync(`${p.dir}/${arq}`, 'utf8').replace(/\r\n/g, '\n').trim();
  const h = createHash('sha1').update(texto).digest('hex');
  if (!textos.has(h)) textos.set(h, { texto, usos: [] });
  textos.get(h).usos.push(`${p.nome}@${p.versao}`);
}

const out = [];
out.push('CENTRAL DO TÉCNICO: avisos de software de terceiros');
out.push('');
out.push('O jogo usa os pacotes abaixo, todos de código aberto. Fontes: Barlow Semi Condensed e Doto (SIL Open Font License 1.1, via @fontsource). Componentes de interface baseados em shadcn/ui e Spell UI (MIT), copiados para o projeto.');
out.push('');
out.push('== LISTA ==');
for (const p of pacotes) out.push(`${p.nome}@${p.versao}  ${p.licenca}`);
out.push('');
out.push('== TEXTOS DAS LICENÇAS ==');
for (const { texto, usos } of textos.values()) {
  out.push('', '-'.repeat(72), `Vale para: ${usos.join(', ')}`, '-'.repeat(72), texto);
}
if (semTexto.length) {
  out.push('', '-'.repeat(72), 'Pacotes sem arquivo de licença próprio (licença indicada no package.json):', ...semTexto.map((p) => `${p.nome}@${p.versao}  ${p.licenca}`));
}
writeFileSync('public/licencas.txt', out.join('\n') + '\n');
console.log(`${pacotes.length} pacotes, ${textos.size} textos distintos, ${semTexto.length} sem texto`);
