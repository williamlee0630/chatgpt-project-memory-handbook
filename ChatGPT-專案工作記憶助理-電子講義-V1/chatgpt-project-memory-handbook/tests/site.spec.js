const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const root = require('node:path').resolve(__dirname, '..');
const baseURL = 'http://127.0.0.1:4173';
let server;
let browser;

before(async () => {
  server = spawn('python', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], {
    cwd: root,
    stdio: 'ignore'
  });
  await new Promise(resolve => setTimeout(resolve, 400));
  try { browser = await chromium.launch({ headless: true }); }
  catch (_) { browser = null; }
});

after(async () => {
  await browser?.close();
  server?.kill();
});

test('桌面首頁提供 6 章、13 節與基礎進階導覽', async t => {
  if (!browser) return t.skip('執行環境未提供 Chromium；由 static-site.spec.js 驗證結構');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(baseURL);
  await assert.equal(await page.locator('[data-course-chapter]').count(), 6);
  await assert.equal(await page.locator('[data-course-section]').count(), 13);
  await assert.equal(await page.locator('text=基礎篇｜40 分鐘').count(), 1);
  await assert.equal(await page.locator('text=進階篇｜60 分鐘').count(), 1);
  await assert.equal(await page.locator('#desktop-nav').isVisible(), true);
  await page.close();
});

test('手機可打開目錄且內容不產生水平捲動', async t => {
  if (!browser) return t.skip('執行環境未提供 Chromium；由 static-site.spec.js 驗證響應式規則');
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseURL}/chapters/01-02.html`);
  await page.locator('#menu-toggle').click();
  await assert.equal(await page.locator('#mobile-nav').getAttribute('aria-hidden'), 'false');
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  assert.ok(widths.scroll <= widths.client + 1, `horizontal overflow: ${JSON.stringify(widths)}`);
  await page.close();
});

test('複製按鈕複製完整內容並顯示成功回饋', async t => {
  if (!browser) return t.skip('執行環境未提供 Chromium；由 static-site.spec.js 驗證複製目標');
  const page = await browser.newPage({ permissions: ['clipboard-read', 'clipboard-write'] });
  await page.goto(`${baseURL}/chapters/01-02.html`);
  const button = page.locator('[data-copy-target]').first();
  await button.click();
  assert.equal(await button.textContent(), '已複製');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(copied, /meeting\.transcript/);
  await page.close();
});

test('完成勾選會跨頁重新載入保存', async t => {
  if (!browser) return t.skip('執行環境未提供 Chromium；由 static-site.spec.js 驗證進度合約');
  const page = await browser.newPage();
  await page.goto(`${baseURL}/chapters/01-01.html`);
  const checkbox = page.locator('[data-progress-id="01-01"]');
  await checkbox.check();
  await page.reload();
  await assert.equal(await checkbox.isChecked(), true);
  await page.close();
});

test('搜尋可篩選到 Tactiq 相關小節', async t => {
  if (!browser) return t.skip('執行環境未提供 Chromium；由 static-site.spec.js 驗證搜尋合約');
  const page = await browser.newPage();
  await page.goto(baseURL);
  await page.locator('#course-search').fill('Tactiq');
  await assert.equal(await page.locator('[data-search-item]:visible').count() > 0, true);
  const visibleText = await page.locator('[data-search-item]:visible').allTextContents();
  assert.ok(visibleText.some(text => text.includes('Tactiq')));
  await page.close();
});
