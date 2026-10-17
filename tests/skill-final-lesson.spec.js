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

test('6-2 keeps all four stages, source checks, and schedule while teaching one assistant', () => {
  const html = read('chapters/06-02.html');
  const headings = [
    '第一階段：Google Drive + Gmail 跨來源完整驗收',
    '第二階段：使用互動式專案工作助理，完成最新工作記憶與週報',
    '第三階段：設定跨來源週期排程',
    '第四階段：最終成果驗收與課程總結'
  ];
  let previous = -1;
  for (const heading of headings) {
    const at = html.indexOf(heading);
    assert.ok(at > previous, `${heading} is missing or out of order`);
    previous = at;
  }
  for (const phrase of ['data-prompt-id="3"', 'prompts.html#prompt-2', '每天 <strong>15:00</strong>', 'Asia/Taipei', 'project-memory-skill.html#skill-one-click-install', 'Google Drive', 'Gmail', '[LINE紀錄]']) assert.ok(html.includes(phrase), phrase);
  assert.equal(copiedPrompt(html, 'skill-launch-command'), '$project-work-assistant');
  assert.match(html, /href="\.\.\/downloads\/project-work-assistant-skill\.zip"/);
  assert.doesNotMatch(html, /\$(?:meeting-action-items|cross-source-decision-update|project-memory-updater|weekly-project-report)/);
});

test('appendix has one installation, verification, and launch prompt with separate checks', () => {
  const html = read('appendices/project-memory-skill.html');
  const install = copiedPrompt(html, 'skill-install-prompt');
  const verify = copiedPrompt(html, 'skill-verify-prompt');
  assert.equal(copiedPrompt(html, 'skill-launch-command'), '$project-work-assistant');
  for (const phrase of ['project-work-assistant', 'downloads/project-work-assistant-skill.zip', 'SKILL.md', 'references', 'assets', 'agents', '不要直接覆蓋']) assert.match(install, new RegExp(phrase.replaceAll('.', '\\.')));
  for (const phrase of ['檔案存在', 'Codex 已辨識', '實際啟動測試', '四種服務選項']) assert.ok(verify.includes(phrase), phrase);
  assert.match(html, /id="skill-one-click-install"/);
  assert.match(html, /id="skill-daily-use"/);
  assert.match(html, /id="kit-prompts"/);
});

test('fixed practice dates remain limited to downloadable case and real dates are explained', () => {
  const meeting = read('downloads/lesson-06-02/01_meeting.txt');
  const line = read('downloads/lesson-06-02/02_line_email.txt');
  const html = read('chapters/06-02.html');
  for (const phrase of ['2026-04-16', '2026-04-18']) assert.ok(meeting.includes(phrase));
  for (const phrase of ['2026-04-17', '2026-04-21', '2026-04-25', '候選']) assert.ok(line.includes(phrase));
  for (const phrase of ['01_meeting.txt', '02_line_email.txt', '實際發生日期', '工作期限', 'Skill 資料期間', '週報期間', '排程執行時間']) assert.ok(html.includes(phrase), phrase);
  assert.doesNotMatch(copiedPrompt(html, 'skill-launch-command'), /2026-04-/);
});

test('Prompt route keeps four full copies and a short followup that rereads evidence', () => {
  const html = read('appendices/project-memory-skill.html');
  for (let index = 1; index <= 4; index += 1) assert.ok(copiedPrompt(html, `kit-prompt-text-${index}`).length > 400);
  const followup = copiedPrompt(html, 'kit-prompt-followup');
  for (const phrase of ['重新讀取', '前次 AI 回答不能當成新事實來源', '不要自行搜尋其他專案或來源']) assert.ok(followup.includes(phrase), phrase);
  assert.match(html, /同一對話後續更新簡短版/);
  assert.match(html, /沒有完成證據不標完成/);
});
