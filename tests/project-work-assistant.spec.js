const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skillsRoot = path.join(root, 'downloads/project-skill-kit/skills');
const assistant = path.join(skillsRoot, 'project-work-assistant');
const read = relative => fs.readFileSync(path.join(assistant, relative), 'utf8');

test('official kit contains one routable Codex Skill with four service references', () => {
  assert.deepEqual(fs.readdirSync(skillsRoot), ['project-work-assistant']);
  assert.equal(fs.readdirSync(assistant, { recursive: true }).filter(name => path.basename(name) === 'SKILL.md').length, 1);
  const skill = read('SKILL.md');
  assert.match(skill, /^---\s+name: project-work-assistant\s+description: /);
  for (const ref of ['meeting.md', 'decision-update.md', 'memory-update.md', 'weekly-report.md', 'source-rules.md', 'settings.md']) {
    assert.ok(fs.existsSync(path.join(assistant, 'references', ref)), ref);
    assert.match(skill, new RegExp(`references/${ref.replace('.', '\\.')}`));
  }
  assert.match(skill, /只載入.*選定服務/);
  assert.match(skill, /無法實際讀取.*暫停該服務.*不可自行簡化規則或輸出格式/);
  assert.match(read('agents/openai.yaml'), /display_name: "專案工作助理"/);
  assert.match(read('agents/openai.yaml'), /default_prompt: "\$project-work-assistant"/);
});

test('launch menu routes clear requests directly and asks for missing inputs', () => {
  const skill = read('SKILL.md');
  for (const phrase of ['歡迎使用專案工作助理', '1. 整理會議決議與待辦', '2. 確認專案決策變更', '3. 更新最新專案工作記憶', '4. 產生專案進度週報', '直接輸入數字就可以開始', '幫我產生本週週報', '這次要整理哪個專案？', '你想整理哪個期間？', '這次要使用哪些資料？']) assert.match(skill, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(skill, /已明確指定.*直接進入/);
  assert.match(skill, /先檢查.*已確認/);
  assert.match(skill, /本週.*上週.*上次成功更新/s);
  assert.match(skill, /來源.*實際紀錄日期/);
  assert.doesNotMatch(skill, /2026-04-(?:13|16|17|19)/);
});

test('shared and mode rules retain source checks, version logic, and output contracts', () => {
  const common = read('references/source-rules.md');
  for (const phrase of ['只處理本次允許來源', '既有工作記憶只能用於同一專案內的前後比較', 'Google Drive', 'Gmail', '[LINE紀錄]', '該期間尚未發生', '目前無法存取此來源', '舊版本 → 新版本', '存在資訊衝突，需要人工確認', '候選']) assert.match(common, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const formats = [
    ['meeting.md', ['# 會議整理', '## 30 秒摘要', '## 已確認決議', '## 待辦事項', '## 未決事項', '## 需要人工確認', '## 本次實際讀取的來源']],
    ['decision-update.md', ['# 跨來源決策更新', '## 最新有效決策', '## 決策變更紀錄', '## 新增／修改待辦', '## 已取消或失效事項', '## 資訊衝突', '## 需要人工確認', '## 本次實際讀取的來源']],
    ['memory-update.md', ['# 30 秒摘要', '# 最新已確認決策', '# 待辦事項', '# 決策變更', '# 未決事項', '# 衝突提醒', '# 需要人工確認', '# 本次資料範圍與來源狀態', '# 本次實際讀取的資料', '# 本次排除的資料']],
    ['weekly-report.md', ['# 專案進度週報', '## 本週已完成', '## 下週重點', '## 本次實際讀取的來源']]
  ];
  for (const [file, headings] of formats) {
    const text = read(`references/${file}`);
    for (const heading of headings) assert.ok(text.includes(heading), `${file}: ${heading}`);
  }
  const settings = read('references/settings.md');
  for (const phrase of ['使用者同意', '非敏感', '不同專案', 'last_successful_through', '更新失敗', '寫入權限']) assert.match(settings, new RegExp(phrase));
});
