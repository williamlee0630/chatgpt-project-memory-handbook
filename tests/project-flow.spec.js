const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('第三集以實際工作分開建立 Project，保留既有查找對話', () => {
  const setup = read('chapters/02-01.html');
  const line = read('chapters/02-02.html');
  assert.match(setup, /活動籌備.*Project/);
  assert.match(setup, /網站製作.*Project/);
  assert.match(setup, /研討會討論.*Project/);
  assert.match(setup, /查找會議原始紀錄/);
  assert.match(line, /「活動籌備」Project/);
  assert.doesNotMatch(setup + line, /「工作訊息整理」/);
});

test('3-1 在活動籌備 Project 新增專用對話，再執行 Prompt 2 與命名', () => {
  const page = read('chapters/03-01.html');
  for (const phrase of ['活動籌備', '查找會議原始紀錄', 'New chat／新增聊天',
    '活動籌備｜工作記憶', '會議逐字稿', 'LINE TXT', 'Google Drive', 'Gmail',
    '本次實際讀取的資料', 'data-prompt-id="2"']) {
    assert.ok(page.includes(phrase), phrase);
  }
  assert.ok(page.indexOf('New chat／新增聊天') < page.indexOf('data-prompt-id="2"'));
  assert.ok(page.indexOf('data-prompt-id="2"') < page.lastIndexOf('活動籌備｜工作記憶'));
  assert.doesNotMatch(page, /「工作訊息整理」|刪除「查找會議原始紀錄」|自動取得其他對話的完整內容/);
});

test('3-2 沿用同一 Project 與對話完成驗收、保存、後續更新', () => {
  const page = read('chapters/03-02.html');
  for (const phrase of ['「活動籌備」Project', '活動籌備｜工作記憶',
    'Save to project／Add to project sources', '後續更新簡短版',
    'data-prompt-followup="2"', '新增', '完成', '變更', '未決事項',
    '重新提供已確認的工作記憶']) {
    assert.ok(page.includes(phrase), phrase);
  }
  assert.doesNotMatch(page, /「工作訊息整理」|2-1 建立的目前專案主對話/);
});

test('直接指向第三章的使用說明不再導向共用 Project', () => {
  for (const relative of ['assets/prompts.js', 'appendices/troubleshooting.html',
    'chapters/06-02.html']) {
    assert.doesNotMatch(read(relative), /「工作訊息整理」/, relative);
  }
});
