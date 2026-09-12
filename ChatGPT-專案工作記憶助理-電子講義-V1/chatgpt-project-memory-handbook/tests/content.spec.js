const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const chapterDir = path.join(root, 'chapters');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

test('13 個課程小節頁完整存在', () => {
  const expected = [
    '01-01','01-02','02-01','02-02','03-01','03-02',
    '04-01','04-02','04-03','05-01','05-02','06-01','06-02'
  ];
  // 文案共有 13 個節頁（第 4 章含三節），合計仍為 6 章 100 分鐘。
  for (const id of expected) {
    assert.ok(fs.existsSync(path.join(chapterDir, `${id}.html`)), `${id}.html missing`);
  }
});

test('Tactiq 主線包含已驗證 Automatic Workflow、Liquid 與四項排錯', () => {
  const text = read('chapters/01-02.html') + read('appendices/troubleshooting.html');
  for (const phrase of [
    'Automatic', 'Meeting Processed', 'Share to an Integration', 'Google Drive',
    '{{ meeting.transcript }}', '實測成功', '處理延遲', 'My Meetings', 'Run Workflow',
    'Drive 出現兩份相同文件', 'Email 無法取得完整 Tactiq Transcript'
  ]) assert.match(text, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('跨來源 Prompt 固定輸出 10 項並要求揭露實際資料來源', () => {
  const text = read('appendices/prompts.html');
  for (const phrase of [
    '30 秒摘要','已確認決策','待辦事項','未決事項','決策變更','衝突提醒',
    '需要人工確認','本次實際讀取的 Google Drive 資料','本次實際讀取的 Gmail 資料','排除的資料',
    '不可以假裝已完成跨來源整理'
  ]) assert.match(text, new RegExp(phrase));
});

test('主教材不包含已淘汰工具流程', () => {
  const files = fs.readdirSync(chapterDir).filter(name => name.endsWith('.html'));
  const text = files.map(name => fs.readFileSync(path.join(chapterDir, name), 'utf8')).join('\n');
  for (const forbidden of ['Zoom AI Companion', 'step1.output', 'step3.output', 'Zapier', 'n8n', 'Make.com']) {
    assert.doesNotMatch(text, new RegExp(forbidden.replace('.', '\\.')));
  }
});

test('LINE 進階流程涵蓋 Bot、Sheets、Gmail、Vercel、多群組與限制', () => {
  const files = ['04-01','04-02','04-03','05-01','05-02','06-01','06-02'];
  const text = files.map(id => read(`chapters/${id}.html`)).join('\n');
  for (const phrase of [
    'LINE Official Account','Channel Secret','Channel Access Token','Webhook','Vercel',
    'Google Sheets','Gmail App Password','groupId','加入後的新文字訊息','[LINE紀錄]'
  ]) assert.match(text, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
