const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const htmlFiles = [
  'index.html',
  ...fs.readdirSync(path.join(root, 'chapters')).filter(x => x.endsWith('.html')).map(x => `chapters/${x}`),
  ...fs.readdirSync(path.join(root, 'appendices')).filter(x => x.endsWith('.html')).map(x => `appendices/${x}`)
];

test('每個 HTML 頁都有響應式 viewport、共用樣式與共用互動程式', () => {
  for (const relative of htmlFiles) {
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    assert.match(text, /name="viewport"/i, relative);
    assert.match(text, /assets\/styles\.css/, relative);
    assert.match(text, /assets\/app\.js/, relative);
  }
});

test('所有本地 href 都指向存在的檔案', () => {
  for (const relative of htmlFiles) {
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    const hrefs = [...text.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
    for (const href of hrefs) {
      if (/^(https?:|#|mailto:)/.test(href)) continue;
      const clean = href.split('#')[0].split('?')[0];
      if (!clean) continue;
      const target = path.resolve(path.dirname(path.join(root, relative)), clean);
      assert.ok(fs.existsSync(target), `${relative} -> ${href} missing`);
    }
  }
});

test('每個複製按鈕都有同頁唯一目標', () => {
  for (const relative of htmlFiles) {
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    const targets = [...text.matchAll(/data-copy-target="([^"]+)"/g)].map(match => match[1]);
    for (const id of targets) {
      assert.equal((text.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${relative}: ${id}`);
    }
  }
});

test('13 節都有唯一 progress id 且互動程式語法正確', () => {
  const ids = [];
  for (const relative of htmlFiles.filter(file => file.startsWith('chapters/'))) {
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    const matches = [...text.matchAll(/data-progress-id="([^"]+)"/g)];
    assert.equal(matches.length, 1, relative);
    ids.push(matches[0][1]);
  }
  assert.equal(new Set(ids).size, 13);
  new vm.Script(fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8'));
});

test('CSS 包含桌面側欄與手機抽屜斷點且括號平衡', () => {
  const css = fs.readFileSync(path.join(root, 'assets/styles.css'), 'utf8');
  assert.match(css, /\.sidebar\{/);
  assert.match(css, /@media\(max-width:980px\)/);
  assert.match(css, /\.mobile-drawer/);
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
});
