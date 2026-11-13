// Пререндер медиа из 3D-сцены: миниатюры упражнений, карты мышц, обложки, иконки.
// Запуск: `npm run dev` в одном терминале, затем `npm run render:media`.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const port = process.env.PORT || 5173;
const out = new URL('../public/', import.meta.url).pathname;
for (const d of ['media/thumbs', 'media/muscles', 'icons']) mkdirSync(out + d, { recursive: true });
const save = (path, dataUrl) => writeFileSync(out + path, Buffer.from(dataUrl.split(',')[1], 'base64'));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(`http://localhost:${port}/render.html`);
await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const R = (id, phase, o) => page.evaluate(([id, p, o]) => window.__render(id, p, o), [id, phase, o]);
const webp = { type: 'image/webp' };

const list = await page.evaluate(() => window.__list);
for (const e of list) {
  save(`media/thumbs/${e.id}.webp`, await R(e.anim, e.thumb, { w: 480, h: 480, ...webp }));
  save(`media/muscles/${e.id}.webp`, await R('stand', 0, {
    w: 300, h: 420, az: e.back ? 158 : 22, el: 6, zoom: 1.12, hi: e.primary.length ? e.primary : ['none'], hi2: e.secondary, ...webp,
  }));
  process.stdout.write('.');
}
save('media/hero.webp', await R('hero', 0.25, { w: 900, h: 1350, az: 22, el: 3, zoom: 1.05, ...webp }));
save('media/stand.webp', await R('stand', 0, { w: 360, h: 800, az: 0, el: 3, zoom: 1.02, ...webp }));
const iconModel = await R('hero', 0.25, { w: 512, h: 512, az: 22, el: 3, zoom: 1.9, type: 'image/png' });

// иконки приложения
const icon = async (size, name, pad) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0"><div style="width:${size}px;height:${size}px;display:grid;place-items:center;overflow:hidden;
    background:radial-gradient(120% 120% at 15% 10%,#FBC4DD 0%,#F27DB3 42%,#B98BE0 100%)">
    <svg width="${size * pad}" height="${size * pad}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>
    </svg></div></body>`);
  writeFileSync(out + `icons/${name}.png`, await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } }));
};
void iconModel;
await icon(192, 'icon-192', 0.6);
await icon(512, 'icon-512', 0.6);
await icon(512, 'icon-maskable-512', 0.46);
await icon(180, 'apple-touch-icon', 0.58);
await browser.close();
console.log('\nmedia: ok');
