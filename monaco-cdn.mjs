// Dev test for product-is #28234: does the Console load Monaco without the CDN?
// Env: BASE (https://localhost:14043), APP_ID, ORG_ID (optional), BLOCK=cdn|nonorigin|none, OUT, PREFIX, IS_USER, IS_PASS
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'https://localhost:14043';
const APP_ID = process.env.APP_ID;
const ORG_ID = process.env.ORG_ID || '';
const BLOCK = process.env.BLOCK || 'cdn';
const OUT = process.env.OUT || './out';
const PREFIX = process.env.PREFIX || 'run';
const USER = process.env.IS_USER || 'admin';
const PASS = process.env.IS_PASS || 'admin';
const CDN = /cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/;
const ORIGIN = new URL(BASE).origin;
fs.mkdirSync(OUT, { recursive: true });

const r = { base: BASE, block: BLOCK, steps: [], requests: [], aborted: [], consoleMessages: [], editors: {}, firstRequests: [], error: null };
const visible = (loc, ms) => loc.waitFor({ state: 'visible', timeout: ms }).then(() => true).catch(() => false);
const log = (m) => { r.steps.push(m); console.error(`[${PREFIX}] ${m}`); };
const shot = (page, n) => page.screenshot({ path: path.join(OUT, `${PREFIX}-${n}.png`), fullPage: false }).catch(() => {});

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1000 } });
await context.route('**/*', (route) => {
  const u = route.request().url();
  const block = (BLOCK === 'cdn' && CDN.test(u)) || (BLOCK === 'nonorigin' && !u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('blob:'));
  if (block) { r.aborted.push(u); return route.abort(); }
  return route.continue();
});
const page = await context.newPage();
page.on('request', (q) => { if (r.firstRequests.length < 25) r.firstRequests.push(q.url()); });
page.on('response', (s) => r.requests.push({ url: s.url(), status: s.status() }));
page.on('requestfailed', (q) => r.requests.push({ url: q.url(), status: `FAILED ${q.failure()?.errorText || ''}` }));
page.on('console', (m) => { const t = m.text(); if (/worker|monaco|cdn|loader/i.test(t) || m.type() === 'error') r.consoleMessages.push(`${m.type()}: ${t.slice(0, 300)}`); });

const login = async () => {
  const userSel = 'input[name="usernameUserInput"], input#usernameUserInput, input[name="username"], input#username';
  if (await visible(page.locator(userSel).first(), 20000)) {
    await page.locator(userSel).first().fill(USER);
    const passLoc = page.locator('input[name="password"], input#password, input[type="password"]');
    if (!(await visible(passLoc.first(), 1500))) {
      await page.locator('button[type="submit"], input[type="submit"], #continue').first().click();
      await passLoc.first().waitFor({ state: 'visible', timeout: 20000 });
    }
    await passLoc.first().fill(PASS);
    await page.locator('button[type="submit"], input[type="submit"], #loginButton').first().click();
    log(`submitted credentials for ${USER}`);
  } else { log('no login form (existing session?)'); }
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  const consent = page.locator('#approve, button:has-text("Allow"), button:has-text("Continue")').first();
  if (await visible(consent, 3000)) { await consent.click(); log('consent approved'); await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {}); }
};

const waitConsole = async () => {
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForSelector('[data-componentid]:visible', { timeout: 90000 });
  const u = new URL(page.url());
  const base = u.pathname.replace(/(\/console)(\/.*)?$/, '$1');
  return `${u.origin}${base}`;
};

const checkEditor = async (name, selector) => {
  const t0 = Date.now();
  const ok = await visible(page.locator(`:is(${selector}) .monaco-editor .view-lines`).first(), 25000);
  const lines = ok ? await page.locator(`:is(${selector}) .monaco-editor .view-line`).count().catch(() => 0) : 0;
  r.editors[name] = { rendered: ok, viewLines: lines, ms: Date.now() - t0 };
  log(`${name}: monaco rendered=${ok} lines=${lines} (${Date.now() - t0} ms)`);
  await shot(page, name);
  return ok;
};

try {
  await page.goto(`${BASE}/console`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  log(`opened ${BASE}/console -> ${page.url()}`);
  await login();
  const consoleBase = await waitConsole();
  r.consoleBase = consoleBase; log(`console base: ${consoleBase}`);
  await shot(page, 'console-home');

  // 1. Login flow script editor (visual editor, conditional authentication switch).
  if (APP_ID) {
    await page.goto(`${consoleBase}/applications/${APP_ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    const tab = page.locator('.ui.menu .item:has-text("Login Flow"), [role="tab"]:has-text("Login Flow"), a:has-text("Login Flow")').first();
    await tab.click({ timeout: 20000 }); log('opened Login Flow tab');
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const sw = page.locator('[data-componentid="script-based-flow-switch"] input[type="checkbox"]').first();
    if (await visible(sw, 20000)) {
      if (!(await sw.isChecked())) { await sw.click(); log('enabled Conditional Authentication'); }
      else log('Conditional Authentication already enabled');
    } else { log('conditional auth switch NOT found'); await shot(page, 'login-flow-no-switch'); }
    const ok = await checkEditor('script-editor', '[data-componentid="script-editor-panel"]');
    if (ok) {
      await page.locator('[data-componentid="script-editor-panel"] .monaco-editor .view-lines').first().click();
      await page.keyboard.press('Control+End'); await page.keyboard.press('End'); await page.keyboard.press('Enter');
      await page.keyboard.type('var x = Log.', { delay: 40 });
      await page.waitForTimeout(600); await page.keyboard.type('i', { delay: 60 }); await page.keyboard.press('Control+Space');
      const sugg = await visible(page.locator('.monaco-editor .suggest-widget.visible, .suggest-widget:visible').first(), 8000);
      r.editors['script-editor'].suggestWidget = sugg; log(`script-editor: suggest widget=${sugg}`);
      await shot(page, 'script-editor-suggest');
      await page.keyboard.press('Escape');
    }
  }

  // 2. Branding -> Text tab -> JSON view.
  await page.goto(`${consoleBase}/branding`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  const textTab = page.locator('.ui.menu .item:has-text("Text"), [role="tab"]:has-text("Text")').first();
  await textTab.click({ timeout: 20000 }); log('opened Branding > Text');
  await page.waitForTimeout(1000);
  const jsonTab = page.locator('[role="tab"]:has-text("JSON"), button:has-text("JSON")').first();
  if (await visible(jsonTab, 20000)) { await jsonTab.click(); log('switched to JSON view'); }
  else { log('JSON view tab NOT found'); await shot(page, 'branding-no-json-tab'); }
  const okJson = await checkEditor('branding-json', '[data-componentid="branding-preference-text-tab"], .text-tab, [data-componentid="custom-text"]');
  if (okJson) {
    await page.locator('.monaco-editor .view-lines').first().click();
    await page.keyboard.press('Control+Home'); await page.keyboard.type('{', { delay: 40 });
    await page.waitForTimeout(2500);
    const markers = await page.locator('.monaco-editor .squiggly-error, .monaco-editor .cdr.squiggly-error').count().catch(() => 0);
    r.editors['branding-json'].errorMarkers = markers; log(`branding-json: error markers after breaking JSON=${markers}`);
    await shot(page, 'branding-json-marker');
    await page.keyboard.press('Backspace');
  }

  // 2b. Logs page (best effort): open the first log entry's data viewer.
  try {
    await page.goto(`${consoleBase}/logs`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    const viewBtn = page.locator('[data-componentid$="-view-data-button"]').first();
    if (await visible(viewBtn, 15000)) { await viewBtn.click(); log('logs: opened a log entry'); await checkEditor('logs-viewer', 'body'); }
    else { log('logs: no log entries to open'); await shot(page, 'logs-page'); }
  } catch (e) { log(`logs step skipped: ${e.message.split('\n')[0]}`); }

  // 2c. Policy administration (best effort): open the first policy for editing.
  try {
    await page.goto(`${consoleBase}/policy-administration`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    const row = page.locator('a[href*="/policy-administration/edit-policy/"], [data-componentid*="policy"] [role="row"] a, .data-table-row').first();
    if (await visible(row, 15000)) { await row.click(); log('policy: opened a policy'); await checkEditor('policy-xml', 'body'); }
    else { log('policy: no policy row found'); await shot(page, 'policy-page'); }
  } catch (e) { log(`policy step skipped: ${e.message.split('\n')[0]}`); }

  // 3. Sub-organization console path.
  if (ORG_ID) {
    await page.goto(`${BASE}/t/carbon.super/o/${ORG_ID}/console`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await login();
    const orgBase = await waitConsole(); r.orgConsoleBase = orgBase; log(`org console base: ${orgBase}`);
    await page.goto(`${orgBase}/branding`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    await page.locator('.ui.menu .item:has-text("Text"), [role="tab"]:has-text("Text")').first().click({ timeout: 20000 }).catch(() => log('org: Text tab not found'));
    await page.waitForTimeout(1000);
    const jt = page.locator('[role="tab"]:has-text("JSON"), button:has-text("JSON")').first();
    if (await visible(jt, 20000)) await jt.click();
    await checkEditor('org-branding-json', 'body');
  }
} catch (e) { r.error = String(e); log(`ERROR ${e.message}`); await shot(page, 'error'); }

r.summary = {
  cdnRequests: r.requests.filter((q) => CDN.test(q.url)).length + r.aborted.filter((u) => CDN.test(u)).length,
  abortedCount: r.aborted.length,
  nonOriginRequests: r.requests.filter((q) => !q.url.startsWith(ORIGIN) && !q.url.startsWith('data:') && !q.url.startsWith('blob:')).map((q) => q.url).slice(0, 20),
  workerRequests: r.requests.filter((q) => /\.worker\.js/.test(q.url)).map((q) => `${q.status} ${q.url}`),
  monacoChunks: r.requests.filter((q) => /monaco/i.test(q.url)).map((q) => `${q.status} ${q.url}`),
  cdnInFirst25: r.firstRequests.filter((u) => CDN.test(u)),
  workerConsoleWarnings: r.consoleMessages.filter((m) => /worker/i.test(m))
};
fs.writeFileSync(path.join(OUT, `${PREFIX}.json`), JSON.stringify(r, null, 2));
console.log(JSON.stringify({ editors: r.editors, summary: r.summary, error: r.error }, null, 2));
await browser.close();
