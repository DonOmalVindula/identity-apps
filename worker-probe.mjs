// Start each bundled Monaco worker directly from a Console page and report the first message or error.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'https://localhost:14043';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ ignoreHTTPSErrors: true });
const errs = []; page.on('console', (m) => errs.push(`${m.type()}: ${m.text().slice(0, 300)}`)); page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
await page.goto(`${BASE}/console/robots.txt`, { waitUntil: 'domcontentloaded' });
import fs from 'node:fs';
const WEBAPP = process.env.WEBAPP || './console';
const files = [
  ...fs.readdirSync(`${WEBAPP}/monaco-workers`).filter((f) => f.endsWith('.js')).map((f) => `monaco-workers/${f}`),
  ...fs.readdirSync(WEBAPP).filter((f) => f.endsWith('.worker.js'))
];
for (const f of files) {
  const res = await page.evaluate(async (file) => {
    return await new Promise((resolve) => {
      const t = setTimeout(() => resolve({ file, result: 'no message within 4s (worker alive, idle)' }), 4000);
      try {
        const w = new Worker(`/console/${file}`);
        w.onerror = (e) => { clearTimeout(t); resolve({ file, result: `onerror: ${e.message} @${e.filename}:${e.lineno}:${e.colno}` }); };
        w.onmessage = (e) => { clearTimeout(t); resolve({ file, result: `onmessage: ${JSON.stringify(e.data).slice(0, 80)}` }); };
        w.postMessage({ ping: true });
      } catch (err) { clearTimeout(t); resolve({ file, result: `throw: ${err.message}` }); }
    });
  }, f);
  console.log(JSON.stringify(res));
}
console.log('page console:', JSON.stringify(errs.slice(0, 10)));
await browser.close();
