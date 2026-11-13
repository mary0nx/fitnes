// node scripts/shot.mjs out.png id:phase:az:el [id:phase:az:el ...]  — контактный лист поз
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { writeFileSync } from 'node:fs';
const [out, ...specs] = process.argv.slice(2);
const port = process.env.PORT || 5173;
const size = Number(process.env.SIZE || 300);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
await page.goto(`http://localhost:${port}/render.html`);
await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const urls = [];
for (const s of specs) {
  const [id, phase = '0', az, el] = s.split(':');
  const o = { w: size, h: size };
  if (az) o.az = Number(az);
  if (el) o.el = Number(el);
  urls.push({ s, url: await page.evaluate(([id, p, o]) => window.__render(id, p, o), [id, Number(phase), o]) });
}
const cols = Math.min(urls.length, Number(process.env.COLS || 5));
await page.setContent(`<body style="margin:0;background:#efe3f3;display:grid;grid-template-columns:repeat(${cols},${size}px);font:11px sans-serif">${urls.map((u) => `<div style="position:relative"><img src="${u.url}" width="${size}" height="${size}"><span style="position:absolute;left:4px;top:2px">${u.s}</span></div>`).join('')}</body>`);
await page.setViewportSize({ width: cols * size, height: Math.ceil(urls.length / cols) * size });
writeFileSync(out, await page.screenshot());
await browser.close();
