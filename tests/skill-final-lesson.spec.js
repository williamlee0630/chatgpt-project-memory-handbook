const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('6-2 follows the four-stage finale and keeps the existing prompt and schedule', () => {
  const html = read('chapters/06-02.html');
  const headings = [
    '第一階段：Google Drive + Gmail 跨來源完整驗收',
    '第二階段：使用 Skill，把工作紀錄轉換成專案管理成果',
    '第三階段：設定跨來源週期排程',
    '第四階段：最終成果驗收與課程總結'
  ];
  let previous = -1;
  for (const heading of headings) {
    const at = html.indexOf(heading);
    assert.ok(at > previous, `${heading} is missing or out of order`);
    previous = at;
  }
  assert.match(html, /data-prompt-id="3"/);
  assert.match(html, /prompts\.html#prompt-2/);
  assert.match(html, /每天 <strong>15:00<\/strong>/);
  assert.match(html, /Asia\/Taipei/);
  assert.match(html, /project-memory-skill\.html#skill-one-click-install/);
});

test('installation and verification prompts keep every requested step and copy target', () => {
  const html = read('appendices/project-memory-skill.html');
  for (const id of ['skill-install-prompt', 'skill-verify-prompt', 'codex-file-practice-prompt']) {
    assert.match(html, new RegExp(`data-copy-target="${id}"`));
    assert.match(html, new RegExp(`<pre id="${id}"><code>[\\s\\S]*?<\\/code><\\/pre>`));
  }
  assert.match(html, /id="skill-one-click-install"/);
  assert.match(html, /複製 Skill 一鍵安裝提示詞/);
  assert.match(html, /複製 Skill 驗收提示詞/);
  for (const name of ['meeting-action-items', 'cross-source-decision-update', 'project-memory-updater', 'weekly-project-report']) {
    assert.match(html, new RegExp(name));
    assert.ok(fs.existsSync(path.join(root, 'downloads/project-skill-kit/skills', name, 'SKILL.md')));
  }
  for (const phrase of ['第一步：檢查來源', '第二步：確認安裝環境', '第三步：安裝 Skill', '第四步：檢查安裝結果', '第五步：說明使用方式', '若檔案存在但尚未確認可被 Codex 載入']) assert.match(html, new RegExp(phrase));
});

test('practice files and lesson distinguish event dates, deadlines, and tentative plans', () => {
  const meeting = read('downloads/lesson-06-02/01_meeting.txt');
  const line = read('downloads/lesson-06-02/02_line_email.txt');
  const html = read('chapters/06-02.html');
  assert.match(meeting, /2026-04-16/);
  assert.match(meeting, /2026-04-18/);
  assert.match(line, /2026-04-17/);
  assert.match(line, /2026-04-21/);
  assert.match(line, /2026-04-25/);
  assert.match(line, /候選/);
  for (const name of ['01_meeting.txt', '02_line_email.txt']) assert.match(html, new RegExp(name));
  for (const id of ['skill-cross-source-demo', 'skill-weekly-demo']) assert.match(html, new RegExp(`data-copy-target="${id}"`));
  assert.match(html, /2026-04-13 ～ 2026-04-19/);
  assert.match(html, /尚未確認/);
});
