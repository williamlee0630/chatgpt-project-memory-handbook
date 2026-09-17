const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const root = require('node:path').resolve(__dirname, '..');
const baseURL = process.env.HANDBOOK_BASE_URL || 'http://127.0.0.1:4173';
let server;
let browser;

const publicPages = [
  'index.html', '404.html',
  'chapters/01-01.html', 'chapters/01-02.html',
  'chapters/02-01.html', 'chapters/02-02.html',
  'chapters/03-01.html', 'chapters/03-02.html',
  'chapters/04-01.html', 'chapters/04-02.html', 'chapters/04-03.html',
  'chapters/05-01.html', 'chapters/05-02.html',
  'chapters/06-01.html', 'chapters/06-02.html',
  'appendices/prompts.html', 'appendices/troubleshooting.html'
];

before(async () => {
  if (!process.env.HANDBOOK_BASE_URL) {
    server = spawn('python', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], {
      cwd: root,
      stdio: 'ignore'
    });
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  try {
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {})
    });
  }
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
  const trackBadges = page.locator('[data-course-chapter] > .badge');
  await assert.equal(await trackBadges.filter({ hasText: '基礎篇｜40 分鐘' }).count(), 3);
  await assert.equal(await trackBadges.filter({ hasText: '進階篇｜60 分鐘' }).count(), 3);
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

test('本輪修訂頁在桌面與 390px 手機均無水平捲動', async t => {
  if (!browser) return t.skip('執行環境未提供 Chromium；由 static-site.spec.js 驗證響應式規則');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    for (const relative of [
      'index.html',
      'chapters/02-01.html', 'chapters/02-02.html', 'chapters/03-01.html', 'chapters/03-02.html',
      'chapters/04-01.html', 'chapters/04-02.html', 'chapters/04-03.html',
      'chapters/05-01.html', 'chapters/05-02.html',
      'chapters/06-01.html', 'chapters/06-02.html',
      'appendices/prompts.html', 'appendices/troubleshooting.html'
    ]) {
      await page.goto(baseURL + '/' + relative);
      const widths = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth
      }));
      assert.ok(
        widths.scroll <= widths.client + 1,
        relative + ' overflow at ' + viewport.width + 'px: ' + JSON.stringify(widths)
      );
    }
    await page.close();
  }
});

test('所有公開頁面載入時沒有 console error 或 pageerror', async t => {
  if (!browser) return t.skip('執行環境未提供 Chromium；由 static-site.spec.js 驗證語法');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  let currentPage = '';
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`${currentPage}: console: ${message.text()}`);
  });
  page.on('pageerror', error => errors.push(`${currentPage}: pageerror: ${error.message}`));
  for (const relative of publicPages) {
    currentPage = relative;
    await page.goto(baseURL + '/' + relative);
    await page.waitForLoadState('networkidle');
  }
  assert.deepEqual(errors, []);
  await page.close();
});

test('390px 的兩欄對照表改為可掃讀的上下區塊', async t => {
  if (!browser) return t.skip('執行環境未提供 Chromium；由實際手機版驗收補充');
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const relative of ['chapters/05-01.html', 'chapters/06-02.html']) {
    await page.goto(baseURL + '/' + relative);
    const firstRowCells = page.locator('table tbody tr').first().locator('td');
    assert.equal(await firstRowCells.count(), 2, relative + ': expected a two-column mapping table');
    const widths = await firstRowCells.evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().width));
    assert.ok(
      widths.every(width => width >= 300),
      relative + ': mobile mapping cells are too narrow: ' + JSON.stringify(widths)
    );
  }
  await page.close();
});

test('Prompt 總整理有 3 張主流程卡、1 張工具卡、3 個索引與章節同源本文', async t => {
  if (!browser) return t.skip('執行環境未提供 Chromium；由 content.spec.js 驗證資料合約');
  const page = await browser.newPage();
  await page.goto(baseURL + '/appendices/prompts.html');
  assert.equal(await page.locator('[data-prompt-card]').count(), 3);
  assert.equal(await page.locator('[data-prompt-tool-card]').count(), 1);
  assert.equal(await page.locator('[data-prompt-index] a').count(), 3);

  const catalogBodies = {};
  for (let id = 1; id <= 3; id += 1) {
    const link = page.locator(`[data-prompt-index] a[href="#prompt-${id}"]`);
    assert.equal(await link.count(), 1, `Prompt ${id} index`);
    await link.click();
    assert.equal(new URL(page.url()).hash, `#prompt-${id}`);
    assert.equal(await page.locator(`#prompt-${id}`).count(), 1);
    catalogBodies[id] = await page.locator(`[data-prompt-card="${id}"] > .prompt-copy-card pre`).textContent();
  }

  const placements = {
    1: 'chapters/02-01.html', 2: 'chapters/03-01.html', 3: 'chapters/06-02.html'
  };
  for (const [id, relative] of Object.entries(placements)) {
    await page.goto(baseURL + '/' + relative);
    assert.equal(
      await page.locator(`[data-prompt-card="${id}"] > .prompt-copy-card pre`).textContent(),
      catalogBodies[id],
      `Prompt ${id} differs between chapter and catalog`
    );
  }

  await page.goto(baseURL + '/appendices/prompts.html');
  assert.equal(await page.locator('[data-prompt-followup-card="2"]').count(), 1);
  assert.equal(await page.locator('[data-prompt-tool-card="codex-vercel-rescue"]').count(), 1);
  await page.close();
});

test('Prompt 複製按鈕只複製本文並在 1.8 秒後復原', async t => {
  if (!browser) return t.skip('執行環境未提供 Chromium；由 static-site.spec.js 驗證結構');
  const page = await browser.newPage({ permissions: ['clipboard-read', 'clipboard-write'] });
  await page.goto(baseURL + '/appendices/prompts.html');
  const card = page.locator('[data-prompt-card="2"]');
  const expected = await card.locator(':scope > .prompt-copy-card pre').textContent();
  const button = card.locator(':scope > .prompt-copy-card [data-copy-target]');
  assert.equal(await button.textContent(), '複製 Prompt');
  await button.click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(clipboard.replace(/\r\n/g, '\n'), expected.replace(/\r\n/g, '\n'));
  assert.equal(await button.textContent(), '已複製 ✓');
  await page.waitForTimeout(1900);
  assert.equal(await button.textContent(), '複製 Prompt');
  await page.close();
});

test('Prompt 2 後續更新短版可獨立複製且沒有新編號', async t => {
  if (!browser) return t.skip('執行環境未提供 Chromium；由 content.spec.js 驗證資料合約');
  const page = await browser.newPage({ permissions: ['clipboard-read', 'clipboard-write'] });
  await page.goto(baseURL + '/appendices/prompts.html');
  const followup = page.locator('[data-prompt-followup-card="2"]');
  assert.equal(await followup.count(), 1);
  assert.doesNotMatch(await followup.textContent(), /Prompt\s*[34]/);
  const expected = await followup.locator('pre').textContent();
  await followup.locator('[data-copy-target]').click();
  assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'), expected.replace(/\r\n/g, '\n'));
  await page.close();
});

test('4-3 的 groups 與 messages 複製按鈕輸出正式 Tab 表頭', async t => {
  if (!browser) return t.skip('執行環境未提供 Chromium；由 static-site.spec.js 驗證複製目標');
  const page = await browser.newPage({
    permissions: ['clipboard-read', 'clipboard-write']
  });
  await page.goto(baseURL + '/chapters/04-03.html');
  for (const [target, expected] of [
    ['groups-headers', 'group_id\tgroup_name\treceiver_email'],
    ['messages-headers', 'webhook_event_id\tmessage_id\tgroup_id\tuser_id\tdisplay_name\tmessage\tcreated_at\tsent']
  ]) {
    const button = page.locator('[data-copy-target="' + target + '"]');
    await button.click();
    assert.equal((await page.evaluate(() => navigator.clipboard.readText())).trim(), expected);
  }
  await page.close();
});

test('4-3 不提供 Base64 主流程，5-1 的 Copy 按鈕複製完整路徑轉換指令', async t => {
  if (!browser) return t.skip('執行環境未提供 Chromium；由 static-site.spec.js 驗證複製目標');
  const page = await browser.newPage({ permissions: ['clipboard-read', 'clipboard-write'] });
  await page.goto(baseURL + '/chapters/04-03.html');
  assert.equal(await page.locator('[data-copy-target="base64-command"]').count(), 0);
  await page.goto(baseURL + '/chapters/05-01.html');
  await page.locator('[data-copy-target="deploy-base64-command"]').click();
  assert.equal(
    (await page.evaluate(() => navigator.clipboard.readText())).trim(),
    '[Convert]::ToBase64String([IO.File]::ReadAllBytes("完整JSON路徑")) | Set-Clipboard'
  );
  assert.equal(await page.locator('[data-copy-target$="base64-check"]').count(), 0);
  await page.close();
});

test('複製按鈕複製完整內容並顯示成功回饋', async t => {
  if (!browser) return t.skip('執行環境未提供 Chromium；由 static-site.spec.js 驗證複製目標');
  const page = await browser.newPage({ permissions: ['clipboard-read', 'clipboard-write'] });
  await page.goto(`${baseURL}/chapters/01-02.html`);
  const button = page.locator('[data-copy-target]').first();
  await button.click();
  await page.waitForFunction(
    element => element.textContent === '已複製',
    await button.elementHandle()
  );
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
