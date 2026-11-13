// Сборка для встроенного предпросмотра (без service worker, роутер в памяти, модель — base64 в JSON).
// Результат: dist-preview/page.html + файлы рядом.
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const out = new URL('../dist-preview/', import.meta.url).pathname;
execSync(`npx vite build --mode preview --outDir "${out}" --emptyOutDir`, { stdio: 'inherit' });
const glb = readFileSync(out + 'models/athlete.glb');
writeFileSync(out + 'models/athlete.json', JSON.stringify({ glb: glb.toString('base64') }));
rmSync(out + 'models/athlete.glb');
rmSync(out + 'index.html');
const assets = readdirSync(out + 'assets');
const js = assets.find((f) => /^main-.*\.js$/.test(f)), css = assets.find((f) => /^main-.*\.css$/.test(f));
writeFileSync(out + 'page.html', `<title>Women’s Fitness</title>\n<link rel="stylesheet" href="./assets/${css}">\n<div id="root"></div>\n<script type="module" src="./assets/${js}"></script>\n`);
console.log('preview: ok →', out);
