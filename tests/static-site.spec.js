const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
const htmlFiles = [
  'index.html',
  ...fs.readdirSync(path.join(root, 'chapters')).filter(x => x.endsWith('.html')).map(x => `chapters/${x}`),
  ...fs.readdirSync(path.join(root, 'appendices')).filter(x => x.endsWith('.html')).map(x => `appendices/${x}`)
];

const formalStudentHashes = {
  '.env.example': '8b1f32f6e3bb62466879a8ef83e75fc81cdd26f2166a944240d99a80185f51f6',
  '.gitignore': 'b93b6598c404c03a40eb612a176eec8a00b688042869fa6ccf50950ebc96a8ed',
  'app.py': 'b771e06575f7e22eeee976398291952c3de474421b9dd89840af29ccc48a5364',
  'config.py': 'c18a3dd038c6c92331ea568014337190155d3f36d7394590567e257429c23843',
  'email_service.py': 'c7016886a1bb1b62a2efa0c039a79df7e59aed03ac425c95b17a6c38d74fd490',
  'index.py': 'd4fd34b5aa8277c1efced3b358aa42f72e1febfa965f7768bd61e6f8d4d99cc8',
  'line_client.py': 'c731c19970160a7b366583bed3a929d0384d5383930edebdea680c9d4f8b941d',
  'line_utils.py': 'eaec38d7a5eee7a026278e8779428cd20b446ab5f3150649c800b45b89286792',
  'main.py': 'dd410ae68333493a62c5d37ccea9288f873af5ad8e5ed25a4e7ecbf255234951',
  'message_service.py': '94659087b765cf7ab30b1e9aade1e9a573ed2b7712f1a3c94d19b8d70c2ccc27',
  'README.md': 'ed8dd7e7ffcebe0762a1373baa0f3c87ec32166a3c471790f4742550dc036fee',
  'requirements.txt': '0df175d04ffbc50eae9ff09f9514cb81c2620f1c00801b1052d544633399cabf',
  'sheets_store.py': '8827b41ee958db3c109fcad903833ed3e632726c8dd5cf7073e2590c2caee8ab',
  'vercel.json': '99cc91956fd2ac8a511a32dee2dfff44705defc5e441793562ccdd68b359d4f6'
};
const formalZipHash = '9b0f59814127394e4c7f472b3b8ed1e3625304834ab5ae0c097fd1b3943547e9';

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^()|[\]\\{}$]/g, '\\$&');
}

function readZipEntries(zipPath) {
  const zip = fs.readFileSync(zipPath);
  let eocd = -1;
  for (let offset = zip.length - 22; offset >= Math.max(0, zip.length - 65557); offset -= 1) {
    if (zip.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  assert.notEqual(eocd, -1, 'ZIP end-of-central-directory record missing');

  const entryCount = zip.readUInt16LE(eocd + 10);
  let offset = zip.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(zip.readUInt32LE(offset), 0x02014b50, `ZIP central-directory entry ${index} invalid`);
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const uncompressedSize = zip.readUInt32LE(offset + 24);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const name = zip.subarray(offset + 46, offset + 46 + nameLength).toString('utf8').replaceAll('\\', '/');

    assert.equal(zip.readUInt32LE(localOffset), 0x04034b50, `${name}: local header invalid`);
    const localNameLength = zip.readUInt16LE(localOffset + 26);
    const localExtraLength = zip.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = zip.subarray(dataOffset, dataOffset + compressedSize);
    const data = method === 0 ? compressed : method === 8 ? zlib.inflateRawSync(compressed) : null;
    assert.ok(data, `${name}: unsupported ZIP compression method ${method}`);
    assert.equal(data.length, uncompressedSize, `${name}: uncompressed size mismatch`);
    assert.ok(!entries.has(name), `${name}: duplicate ZIP entry`);
    entries.set(name, data);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

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

test('正式學生 ZIP 是 14 個正式原檔的平鋪、安全且逐位元相同封裝', () => {
  const zipPath = path.join(root, 'downloads', 'LINE訊息整理Bot_課程正式版.zip');
  assert.ok(fs.existsSync(zipPath), 'downloads/LINE訊息整理Bot_課程正式版.zip missing');
  assert.equal(sha256(fs.readFileSync(zipPath)), formalZipHash, 'download ZIP differs from the supplied archive');
  const entries = readZipEntries(zipPath);
  const expectedNames = Object.keys(formalStudentHashes).sort();
  assert.deepEqual([...entries.keys()].sort(), expectedNames, 'ZIP manifest must contain only the 14 root files');

  for (const name of expectedNames) {
    assert.equal(name.includes('/'), false, `${name}: ZIP must not contain a wrapper directory`);
    assert.equal(sha256(entries.get(name)), formalStudentHashes[name], `${name}: ZIP differs from supplied archive`);
    const starter = fs.readFileSync(path.join(root, 'downloads', 'line-bot-starter', name));
    assert.equal(sha256(starter), formalStudentHashes[name], `${name}: starter differs from supplied archive`);
    assert.deepEqual(entries.get(name), starter, `${name}: ZIP and starter differ`);
  }

  const forbidden = /(^|\/)(\.env|\.git|\.venv|__pycache__|tests)(\/|$)|service[^/]*account[^/]*\.json$|\.(tmp|temp|pyc)$/i;
  assert.equal([...entries.keys()].filter(name => forbidden.test(name)).length, 0, 'ZIP contains excluded files');
});

test('學生下載包 README 與網站版本一致且不含講師製作語氣', () => {
  const starter = fs.readFileSync(path.join(root, 'downloads', 'line-bot-starter', 'README.md'), 'utf8');
  const entries = readZipEntries(path.join(root, 'downloads', 'LINE訊息整理Bot_課程正式版.zip'));
  const archived = entries.get('README.md').toString('utf8');
  assert.equal(archived, starter);
  for (const phrase of [
    '老師 Demo', '老師提供', '老師與學生', '講師驗收',
    '由講師將專案', '講師本機除錯', '課程 Demo'
  ]) {
    assert.doesNotMatch(starter, new RegExp(phrase), phrase);
    assert.doesNotMatch(archived, new RegExp(phrase), phrase);
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
  new vm.Script(fs.readFileSync(path.join(root, 'assets/prompts.js'), 'utf8'));
});

test('使用 Prompt 的頁面先載入 prompts.js 再載入 app.js', () => {
  for (const relative of [
    'chapters/02-01.html', 'chapters/03-01.html', 'chapters/03-02.html',
    'chapters/05-01.html', 'chapters/06-02.html',
    'appendices/prompts.html'
  ]) {
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    const promptsIndex = text.indexOf('assets/prompts.js');
    const appIndex = text.indexOf('assets/app.js');
    assert.ok(promptsIndex >= 0, `${relative}: prompts.js missing`);
    assert.ok(promptsIndex < appIndex, `${relative}: prompts.js must load before app.js`);
  }
});

test('CSS 包含桌面側欄與手機抽屜斷點且括號平衡', () => {
  const css = fs.readFileSync(path.join(root, 'assets/styles.css'), 'utf8');
  assert.match(css, /\.sidebar\{/);
  assert.match(css, /@media\(max-width:980px\)/);
  assert.match(css, /\.mobile-drawer/);
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
});

test('Prompt 2 之後提供選用 Skill 導流且未改變課程主線', () => {
  const chapter = fs.readFileSync(path.join(root, 'chapters', '03-01.html'), 'utf8');
  const promptPosition = chapter.indexOf('<div data-prompt-id="2"></div>');
  const skillCardPosition = chapter.indexOf('data-skill-cta');
  assert.ok(promptPosition >= 0, 'Prompt 2 placement missing');
  assert.ok(skillCardPosition > promptPosition, 'Skill CTA must appear after Prompt 2');
  const card = chapter.match(/<div[^>]*data-skill-cta[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(card, 'Skill CTA card missing');
  assert.match(card[0], /進階：把這套流程封裝成 Skill/);
  assert.match(card[0], /選用|支援 Skills/);
  assert.match(card[0], /href="\.\.\/appendices\/project-memory-skill\.html"/);
  assert.match(card[0], /href="\.\.\/downloads\/project-memory-updater-skill\.zip"/);
  assert.doesNotMatch(chapter, /data-progress-id="project-memory-skill"/);
});

test('Skill 附錄頁保守說明能力並提供指定教材內容', () => {
  const relative = path.join('appendices', 'project-memory-skill.html');
  assert.ok(fs.existsSync(path.join(root, relative)), `${relative} missing`);
  const text = fs.readFileSync(path.join(root, relative), 'utf8');
  for (const phrase of [
    '進階工具｜專案工作記憶更新 Skill',
    '本課程仍以 Prompt 為主要教學方式',
    '適用於支援 Skills 的 ChatGPT／Codex 使用環境，實際可用能力依帳號與環境而異。',
    'Skill 是什麼？', 'Skill 解決什麼問題？', 'Skill 固定執行規則',
    'Skill 需要哪些輸入？', '固定輸出格式', '使用範例',
    'Prompt、Skill、排程差異', '重要提醒',
    '最新完成日：10/23', '最新剪輯負責人：羅力辰',
    '小王 → 羅力辰', '10/20 → 10/23',
    '需要人工確認', '本次資料範圍與來源狀態',
    '本次實際讀取的資料', '本次排除的資料',
    'project-memory-updater-skill.zip'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
  for (const forbidden of [
    '所有 ChatGPT 帳號都可以直接安裝',
    'Skill 取代 Prompt',
    '安裝 Skill 後就一定能直接讀取 Google Drive / Gmail',
    'Skill 本身等於排程功能'
  ]) assert.doesNotMatch(text, new RegExp(escapeRegExp(forbidden)), forbidden);
});

test('專案工作記憶更新 Skill ZIP 可解壓且包含完整 instruction-first Skill', () => {
  const zipPath = path.join(root, 'downloads', 'project-memory-updater-skill.zip');
  assert.ok(fs.existsSync(zipPath), 'project-memory-updater-skill.zip missing');
  const entries = readZipEntries(zipPath);
  const files = [...entries.keys()].filter(name => !name.endsWith('/')).sort();
  assert.deepEqual(files, [
    'project-memory-updater/SKILL.md',
    'project-memory-updater/examples/demo-project.md',
    'project-memory-updater/references/output-format.md',
    'project-memory-updater/references/source-rules.md'
  ]);

  const skill = entries.get('project-memory-updater/SKILL.md').toString('utf8');
  assert.match(skill, /^---\s+name: project-memory-updater\s+description: Use when /);
  for (const phrase of [
    '專案名稱', '日期範圍', '允許來源', '只處理目前指定的專案',
    '實際讀取', 'Google Drive', 'Tactiq', 'Google Meet', 'Gmail', '[LINE紀錄]',
    '不得假裝', '較晚且明確', '需要人工確認', '不自行猜測',
    '30 秒摘要', '最新已確認決策', '待辦事項', '決策變更',
    '未決事項', '衝突提醒', '完成前檢查',
    '只處理本次允許來源', '過去對話', '模型記憶', '其他聊天', '常識推測',
    '既有工作記憶只能用於同一專案內的前後比較',
    '本次資料範圍與來源狀態', '本次實際讀取的資料', '本次排除的資料',
    'references/source-rules.md', 'references/output-format.md'
  ]) assert.match(skill, new RegExp(escapeRegExp(phrase)), `SKILL.md: ${phrase}`);

  const sourceRules = entries.get('project-memory-updater/references/source-rules.md').toString('utf8');
  for (const phrase of [
    'Google Drive', 'Google Meet', 'Tactiq', 'Gmail', 'LINE 紀錄',
    '日期範圍', '專案範圍', '來源優先順序', '版本更新規則', '來源衝突規則',
    '「較晚」不代表一定正確', '只處理本次允許來源',
    '既有工作記憶只能用於同一專案內的前後比較',
    '跨更新期間', '舊版本 → 新版本',
    '修改', '改成', '延後', '取消', '改由', '改為'
  ]) assert.match(sourceRules, new RegExp(escapeRegExp(phrase)), `source-rules.md: ${phrase}`);

  const output = entries.get('project-memory-updater/references/output-format.md').toString('utf8');
  for (const heading of [
    '# 30 秒摘要', '# 最新已確認決策', '# 待辦事項', '# 決策變更',
    '# 未決事項', '# 衝突提醒', '# 需要人工確認',
    '# 本次資料範圍與來源狀態', '# 本次實際讀取的資料', '# 本次排除的資料'
  ]) assert.match(output, new RegExp(escapeRegExp(heading)), `output-format.md: ${heading}`);
  assert.match(output, /\| 事項 \| 負責人 \| 期限 \| 狀態 \|/);

  const demo = entries.get('project-memory-updater/examples/demo-project.md').toString('utf8');
  for (const phrase of ['10/20', '小王', '10/23', '羅力辰', '10/20 → 10/23', '小王 → 羅力辰']) {
    assert.match(demo, new RegExp(escapeRegExp(phrase)), `demo-project.md: ${phrase}`);
  }

  const allSkillText = [...entries.values()].map(value => value.toString('utf8')).join('\n');
  assert.doesNotMatch(allSkillText, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/);
  assert.doesNotMatch(allSkillText, /\b(?:sk|ghp|glpat)-[A-Za-z0-9_-]{20,}\b/);
  assert.doesNotMatch(allSkillText, /AIza[0-9A-Za-z_-]{35}/);
});
