/**
 * Captura visual + auditoría a11y (F6/F7-gate):
 * - viewports 360x800, 768x1024, 1440x900;
 * - estados login/validación/error/transición/loading/loaded/empty/confirm/success;
 * - 7 roles (natural con UI-login real; resto con sesión inyectada + backend live);
 * - checks: labels, nombres accesibles, foco/teclado, drawer móvil, tablas,
 *   contraste de tokens, reduced-motion, Escape en modales.
 * Salida: test/screenshots/<WxH>/*.png + report.json
 *
 * Uso: `npm run shots` (levanta `vite dev` en 5173 si está libre).
 * Requiere backend live + empleados seed (ver test/live/smoke.test.ts).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const FRONT = 'http://localhost:5173';
const BASE = process.env.LIVE_BASE_URL ?? 'http://localhost:8080';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = new URL('.', import.meta.url).pathname.replace(/^\//, '');
const S = `shot${Date.now().toString(36)}`;
const PASSWORD = 'Secret123!';
const VIEWPORTS = [
  { w: 360, h: 800 },
  { w: 768, h: 1024 },
  { w: 1440, h: 900 },
];
const report = { generatedAt: new Date().toISOString(), suffix: S, viewports: [], shots: [], a11y: {}, errors: [] };
const shot = (vp, file) => `${OUT}${vp.w}x${vp.h}/${file}`;

async function api(name, method, path, { token, body, expect } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (res.status !== expect) throw new Error(`[setup] ${name}: HTTP ${res.status} != ${expect}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function ensureDevServer() {
  try {
    const r = await fetch(FRONT);
    if (r.ok) return null;
  } catch { /* libre: levantar */ }
  const root = new URL('../..', import.meta.url).pathname.replace(/^\//, '');
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'dev', '--port', '5173', '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const r = await fetch(FRONT);
      if (r.ok) return child;
    } catch { /* esperando */ }
  }
  child.kill();
  throw new Error('vite dev no respondió en 5173');
}

async function setupData() {
  const nat = `shot-nat-${S}`;
  const biz = `shot-biz-${S}`;
  await api('reg nat', 'POST', '/api/v1/auth/register/natural-customer', {
    body: { identification: nat, name: 'Shot Nat', email: `shotn.${S}@bank.com`, phoneNumber: '3000000002', address: 'Shot 2', birthDate: '1992-02-02' }, expect: 201,
  });
  await api('reg biz', 'POST', '/api/v1/auth/register/business-customer', {
    body: { identification: biz, name: 'Shot Corp', email: `shotc.${S}@bank.com`, phoneNumber: '6040000000', address: 'Shot Corp', legalRepresentativeIdentification: nat }, expect: 201,
  });
  const userNat = `shotnat${S}`;
  const userBiz = `shotbiz${S}`;
  await api('reg user nat', 'POST', '/api/v1/auth/register/user', {
    body: { customerIdentification: nat, username: userNat, password: PASSWORD, role: 'NATURAL_CUSTOMER' }, expect: 201,
  });
  await api('reg user biz', 'POST', '/api/v1/auth/register/user', {
    body: { customerIdentification: biz, username: userBiz, password: PASSWORD, role: 'BUSINESS_CUSTOMER' }, expect: 201,
  });
  const login = async (u) => (await api(`login ${u}`, 'POST', '/api/v1/auth/login', { body: { username: u, password: PASSWORD }, expect: 200 }));
  const teller = await login('seed-teller');
  const accA1 = `SHOT-A1-${S}`;
  const accA2 = `SHOT-A2-${S}`;
  const accC1 = `SHOT-C1-${S}`;
  for (const [n, owner] of [[accA1, nat], [accA2, nat], [accC1, biz]]) {
    await api(`open ${n}`, 'POST', '/api/v1/teller/accounts', {
      token: teller.token, body: { accountNumber: n, accountType: 'SAVINGS', currency: 'COP', ownerIdentification: owner }, expect: 200,
    });
  }
  await api('fund A1', 'POST', `/api/v1/teller/accounts/${accA1}/deposits`, { token: teller.token, body: { amount: 50000 }, expect: 200 });
  await api('fund C1', 'POST', `/api/v1/teller/accounts/${accC1}/deposits`, { token: teller.token, body: { amount: 20000000 }, expect: 200 });
  const bizLogin = await login(userBiz);
  const opUser = `shotop${S}`;
  await api('reg operator', 'POST', '/api/v1/business-customer/users', {
    token: bizLogin.token,
    body: { username: opUser, password: PASSWORD, role: 'BUSINESS_OPERATOR', email: `shotop.${S}@bank.com`, identification: `shot-op-${S}`, name: 'Shot Op' }, expect: 201,
  });
  const opLogin = await login(opUser);
  // Una transferencia pendiente para la cola del supervisor.
  await api('pending transfer', 'POST', '/api/v1/business-operator/transfers', {
    token: opLogin.token,
    body: { sourceAccountNumber: accC1, destinationAccountNumber: accA1, amount: 12000000, description: `shot ${S}` }, expect: 202,
  });
  return {
    nat: { id: nat, username: userNat, accA1, accA2, session: await login(userNat) },
    biz: { id: biz, username: userBiz, session: await login(userBiz) },
    sessions: {
      teller: await login('seed-teller'),
      operator: opLogin,
      supervisor: await login('seed-supervisor'),
      commercial: await login('seed-commercial'),
      analyst: await login('seed-analyst'),
    },
  };
}

function sessionPayload(loginBody) {
  return JSON.stringify({
    token: loginBody.token, tokenType: 'Bearer', expiresIn: 3600,
    expiresAt: Date.now() + 3600_000, user: loginBody.user,
  });
}

async function settled(page, sel = '.skeleton', timeout = 15000) {
  try {
    await page.waitForFunction((s) => !document.querySelector(s), sel, { timeout });
  } catch { /* sigue: captura lo visible */ }
  await page.waitForTimeout(400);
}

async function dismissSwal(page) {
  const btn = page.locator('.swal2-confirm');
  if (await btn.count()) await btn.first().click();
  await page.waitForTimeout(300);
}

async function captureRole(browser, vp, data, role, path, { interact, delayUrls = [], emptyUrls = [], failUrls = [] } = {}) {
  const dir = `${OUT}${vp.w}x${vp.h}`;
  const results = [];
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.addInitScript((payload) => {
    window.sessionStorage.setItem('aurora.session.v1', payload);
  }, sessionPayload(data.sessions[role] ?? data[role].session));
  const page = await ctx.newPage();
  if (delayUrls.length) {
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (delayUrls.some((u) => url.includes(u))) await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
  }
  await page.goto(`${FRONT}${path}`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${dir}/${role}-loading.png` });
  results.push(`${role}-loading.png`);
  await ctx.unrouteAll({ behavior: 'wait' });
  if (interact) await interact(page);
  await settled(page);
  await page.screenshot({ path: `${dir}/${role}-loaded.png` });
  results.push(`${role}-loaded.png`);
  await ctx.close();

  if (emptyUrls.length || failUrls.length) {
    const ctx2 = await browser.newContext({ viewport: vp });
    await ctx2.addInitScript((payload) => {
      window.sessionStorage.setItem('aurora.session.v1', payload);
    }, sessionPayload(data.sessions[role] ?? data[role].session));
    const p2 = await ctx2.newPage();
    await p2.route('**/api/**', async (route) => {
      const req = route.request();
      const url = req.url();
      if (req.method() === 'GET' && emptyUrls.some((u) => url.includes(u))) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      } else if (failUrls.some((u) => url.includes(u))) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ status: 503, code: 'DEPENDENCY_UNAVAILABLE', message: 'Servicio no disponible (simulado)', path: '/api/sim', requestId: 'req-shot' }) });
      } else await route.continue();
    });
    await p2.goto(`${FRONT}${path}`);
    if (interact) await interact(p2);
    await settled(p2);
    await p2.waitForTimeout(600);
    const kind = emptyUrls.length ? 'empty' : 'error';
    await p2.screenshot({ path: `${dir}/${role}-${kind}.png` });
    results.push(`${role}-${kind}.png`);
    await ctx2.close();
  }
  return results;
}

function luminance(hex) {
  const c = hex.replace('#', '');
  const f = (i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4);
}
function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

async function main() {
  const devChild = await ensureDevServer();
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  try {
    const data = await setupData();
    for (const vp of VIEWPORTS) {
      const dir = `${OUT}${vp.w}x${vp.h}`;
      mkdirSync(dir, { recursive: true });
      report.viewports.push(`${vp.w}x${vp.h}`);
      const files = [];

      // ---- Público: login real ----
      const ctx0 = await browser.newContext({ viewport: vp });
      const login = await ctx0.newPage();
      await login.goto(`${FRONT}/login`);
      await login.waitForTimeout(500);
      await login.screenshot({ path: `${dir}/login.png` });
      files.push('login.png');
      await login.click('button[type="submit"]');
      await login.waitForTimeout(300);
      await login.screenshot({ path: `${dir}/login-validation.png` });
      files.push('login-validation.png');
      await login.getByLabel('Usuario').fill('nadie_xyz');
      await login.getByLabel('Contraseña').fill('WrongPass123!');
      await login.click('button[type="submit"]');
      await login.waitForSelector('.swal2-popup', { timeout: 10000 });
      await login.screenshot({ path: `${dir}/login-error.png` });
      files.push('login-error.png');
      await dismissSwal(login);
      report.a11y.loginPreservesUsername = (await login.getByLabel('Usuario').inputValue()) === 'nadie_xyz';
      // Login válido con API demorada: transición + skeletons reales.
      await login.route('**/api/**', async (route) => {
        await new Promise((r) => setTimeout(r, 1500));
        await route.continue();
      });
      await login.getByLabel('Usuario').fill(data.nat.username);
      await login.getByLabel('Contraseña').fill(PASSWORD);
      await login.click('button[type="submit"]');
      await login.waitForTimeout(900);
      await login.screenshot({ path: `${dir}/login-transition.png` });
      files.push('login-transition.png');
      await login.waitForURL('**/customer', { timeout: 20000 });
      await login.waitForTimeout(500);
      await login.screenshot({ path: `${dir}/natural-loading.png` });
      files.push('natural-loading.png');
      await ctx0.unrouteAll({ behavior: 'wait' });
      await settled(login);
      await login.screenshot({ path: `${dir}/natural-loaded.png` });
      files.push('natural-loaded.png');

      // ---- Natural: empty / error / confirm / success ----
      await login.goto(`${FRONT}/customer/transfers`);
      await settled(login);
      await login.route('**/api/**', async (route) => {
        const req = route.request();
        if (req.method() === 'GET' && req.url().includes('/accounts')) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        } else await route.continue();
      });
      await login.reload();
      await settled(login);
      await login.screenshot({ path: `${dir}/natural-empty.png` });
      files.push('natural-empty.png');
      await ctx0.unrouteAll({ behavior: 'wait' });
      // Error backend real: monto mayor al saldo -> 409 INSUFFICIENT_BALANCE
      // en submit (alerta + formulario preservado), sin intercepción.
      await login.goto(`${FRONT}/customer/transfers`);
      await settled(login);
      await login.locator('#tr-source').selectOption({ index: 1 });
      await login.getByLabel('Cuenta destino').fill(data.nat.accA2);
      await login.getByLabel('Monto').fill('999999999');
      await login.click('button:has-text("Revisar y confirmar")');
      await login.waitForSelector('.swal2-popup', { timeout: 10000 });
      await login.locator('.swal2-confirm').click();
      await login.waitForFunction(
        () => [...document.querySelectorAll('.swal2-popup')].some((p) => (p.textContent ?? '').includes('INSUFFICIENT_BALANCE')),
        null,
        { timeout: 10000 },
      );
      await login.waitForTimeout(500);
      await login.screenshot({ path: `${dir}/natural-error.png` });
      files.push('natural-error.png');
      await dismissSwal(login);
      await ctx0.unrouteAll({ behavior: 'wait' });
      await login.goto(`${FRONT}/customer/transfers`);
      await settled(login);
      await login.locator('#tr-source').selectOption({ index: 1 });
      await login.getByLabel('Cuenta destino').fill(data.nat.accA2);
      await login.getByLabel('Monto').fill('1000');
      await login.click('button:has-text("Revisar y confirmar")');
      await login.waitForSelector('.swal2-popup', { timeout: 10000 });
      await login.screenshot({ path: `${dir}/natural-confirm.png` });
      files.push('natural-confirm.png');
      // Escape cancela (a11y modal) y reintento confirma de verdad.
      await login.keyboard.press('Escape');
      await login.waitForTimeout(400);
      const stillOpen = await login.locator('.swal2-popup').count();
      report.a11y.escapeDismissesConfirm = (report.a11y.escapeDismissesConfirm ?? true) && stillOpen === 0;
      await login.click('button:has-text("Revisar y confirmar")');
      await login.waitForSelector('.swal2-popup', { timeout: 10000 });
      await login.locator('.swal2-confirm').click();
      await login.waitForFunction(
        () => document.querySelector('.swal2-title')?.textContent?.includes('Operación exitosa'),
        null,
        { timeout: 10000 },
      );
      await login.waitForTimeout(400);
      await login.screenshot({ path: `${dir}/natural-success.png` });
      files.push('natural-success.png');
      await dismissSwal(login);
      // Logout vuelve a login (journey completa).
      await login.locator('button:has-text("Cerrar sesión")').click();
      await login.waitForURL('**/login', { timeout: 10000 });
      await login.screenshot({ path: `${dir}/natural-logout.png` });
      files.push('natural-logout.png');

      // ---- A11y: login + dashboard natural ----
      const a11y = await login.evaluate(() => {
        const badInputs = [...document.querySelectorAll('input,select,textarea')].filter(
          (el) => !(el.labels && el.labels.length) && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby'),
        ).length;
        const badButtons = [...document.querySelectorAll('button')].filter(
          (b) => !((b.textContent ?? '').trim() || b.getAttribute('aria-label')),
        ).length;
        const thWithoutScope = [...document.querySelectorAll('th')].filter((th) => !th.getAttribute('scope')).length;
        return { badInputs, badButtons, thWithoutScope };
      });
      Object.assign(report.a11y, { [`unlabeled-${vp.w}`]: a11y });
      await login.getByLabel('Usuario').click();
      await login.keyboard.press('Tab');
      const afterTab = await login.evaluate(() => document.activeElement?.getAttribute('name'));
      report.a11y.tabOrder = report.a11y.tabOrder ?? [];
      report.a11y.tabOrder.push({ vp: vp.w, afterUsernameTab: afterTab });
      await ctx0.close();

      // ---- Roles con sesión inyectada ----
      files.push(...await captureRole(browser, vp, data, 'nat', '/customer', { delayUrls: ['/accounts', '/operations', '/profile'] }));
      files.push(...await captureRole(browser, vp, data, 'biz', '/business', { delayUrls: ['/profile'] }));
      files.push(...await captureRole(browser, vp, data, 'operator', '/business/operator', { delayUrls: ['/accounts'] }));
      files.push(...await captureRole(browser, vp, data, 'supervisor', '/business/supervisor', {
        delayUrls: ['/pending'],
        emptyUrls: ['/transfers/pending'],
      }));
      files.push(...await captureRole(browser, vp, data, 'teller', '/teller', {
        delayUrls: ['/customers'],
        interact: async (p) => {
          await p.locator('#teller-search').fill(data.nat.id);
          await p.locator('button:has-text("Buscar")').click();
          await p.waitForTimeout(1200);
          await p.locator('#teller-acc-num').fill(data.nat.accA1);
          await p.locator('button:has-text("Consultar")').click();
          await p.waitForTimeout(1200);
        },
      }));
      files.push(...await captureRole(browser, vp, data, 'commercial', '/commercial', {
        delayUrls: [],
        interact: async (p) => {
          await p.locator('#comm-search').fill(data.nat.id);
          await p.locator('button:has-text("Continuar")').click();
          await p.waitForTimeout(600);
        },
      }));
      files.push(...await captureRole(browser, vp, data, 'analyst', '/analyst', {
        delayUrls: ['/audit-logs'],
        failUrls: ['/audit-logs'],
      }));

      // ---- Drawer móvil ----
      if (vp.w <= 480) {
        const ctxm = await browser.newContext({ viewport: vp });
        await ctxm.addInitScript((payload) => window.sessionStorage.setItem('aurora.session.v1', payload), sessionPayload(data.nat.session));
        const pm = await ctxm.newPage();
        await pm.goto(`${FRONT}/customer`);
        await settled(pm);
        await pm.locator('.nav-toggle').click();
        await pm.waitForTimeout(400);
        const navOpen = await pm.evaluate(() => ({
          expanded: document.querySelector('.nav-toggle')?.getAttribute('aria-expanded'),
          navVisible: document.querySelector('#app-nav.open') !== null,
        }));
        report.a11y.mobileDrawer = navOpen;
        await pm.screenshot({ path: `${dir}/natural-nav-open.png` });
        files.push('natural-nav-open.png');
        await ctxm.close();
      }

      // ---- Reduced motion ----
      const ctxr = await browser.newContext({ viewport: vp, reducedMotion: 'reduce' });
      const pr = await ctxr.newPage();
      await pr.goto(`${FRONT}/login`);
      await pr.waitForTimeout(400);
      report.a11y.reducedMotionMatch = await pr.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      await pr.screenshot({ path: `${dir}/login-reduced-motion.png` });
      files.push('login-reduced-motion.png');
      await ctxr.close();

      report.shots.push({ viewport: `${vp.w}x${vp.h}`, files });
    }

    // ---- Contraste de tokens (texto normal ≥ 4.5) ----
    const pairs = [
      ['texto/superficie', '#202124', '#ffffff'],
      ['texto-suave/superficie', '#5f6368', '#ffffff'],
      ['botón primario', '#202124', '#f2c94c'],
      ['botón hover/confirmar', '#ffffff', '#d9a900'],
      ['peligro/blanco', '#ffffff', '#b42318'],
      ['éxito/superficie', '#237a57', '#ffffff'],
      ['aviso/superficie', '#a76500', '#ffffff'],
      ['info/superficie', '#2457a6', '#ffffff'],
      ['error/superficie', '#b42318', '#ffffff'],
    ];
    report.a11y.contrast = pairs.map(([name, fg, bg]) => ({ name, ratio: Math.round(ratio(fg, bg) * 100) / 100, pass: ratio(fg, bg) >= 4.5 }));
    writeFileSync(`${OUT}report.json`, JSON.stringify(report, null, 2));
    console.log(`[shots] OK: ${report.shots.reduce((n, s) => n + s.files.length, 0)} capturas, 3 viewports`);
  } finally {
    await browser.close();
    if (devChild) devChild.kill();
  }
}

main().catch((e) => {
  report.errors.push(String(e));
  try { writeFileSync(`${OUT}report.json`, JSON.stringify(report, null, 2)); } catch { /* noop */ }
  console.error('[shots] ERROR:', e);
  process.exit(1);
});
