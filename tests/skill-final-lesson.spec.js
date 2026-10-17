const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const copiedPrompt = (html, id) => {
  const match = html.match(new RegExp(`<pre id="${id}"><code>([\\s\\S]*?)<\\/code><\\/pre>`));
  assert.ok(match, `${id} copy target missing`);
  assert.match(html, new RegExp(`data-copy-target="${id}"`));
  return match[1];
};

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

test('6-2 daily Skill prompts use verifiable current periods instead of fixed practice dates', () => {
  const html = read('chapters/06-02.html');
  const prompts = [
    ['skill-cross-source-demo', '$cross-source-decision-update'],
    ['skill-memory-update-demo', '$project-memory-updater'],
    ['skill-weekly-demo', '$weekly-project-report']
  ];
  for (const [id, skill] of prompts) {
    const prompt = copiedPrompt(html, id);
    assert.match(prompt, new RegExp(`^\\${skill}`));
    assert.doesNotMatch(prompt, /2026-04-(?:13|16|17|19)/);
    assert.ok(prompt.length < 320, `${id} is too long for daily use`);
  }
  assert.match(copiedPrompt(html, 'skill-cross-source-demo'), /如果日期範圍無法確認，請先詢問我/);
  assert.match(copiedPrompt(html, 'skill-memory-update-demo'), /重新讀取來源正文/);
  assert.match(copiedPrompt(html, 'skill-weekly-demo'), /本週一至今天/);
  for (const phrase of ['第一次設定完整，後面操作就能簡短', '會議及 LINE', '工作事項的截止期限', 'Skill 需要整理的資料期間', '週報涵蓋的週期', '自動化排程的執行時間', '【自訂原期限】', '【自訂新期限】', '【自訂候選日期】']) assert.match(html, new RegExp(phrase));
});

test('appendix retains full Prompt rules and offers daily Skill and Prompt followups', () => {
  const html = read('appendices/project-memory-skill.html');
  assert.match(html, /id="skill-daily-use"/);
  for (const id of ['kit-quick-cross-source', 'kit-quick-memory', 'kit-quick-weekly']) {
    const prompt = copiedPrompt(html, id);
    assert.match(prompt, /^\$/);
    assert.doesNotMatch(prompt, /2026-04-(?:13|16|17|19)/);
  }
  assert.match(copiedPrompt(html, 'kit-prompt-followup'), /重新讀取/);
  assert.match(html, /首次使用完整版/);
  assert.match(html, /同一對話後續更新簡短版/);
  for (const phrase of ['不能把前次 AI 回答當成新的原始來源', '若無法確認哪一版有效', '沒有完成證據不標完成']) assert.match(html, new RegExp(phrase));
});
