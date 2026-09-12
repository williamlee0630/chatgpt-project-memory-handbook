const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const chapterDir = path.join(root, 'chapters');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function filesBelow(relative, predicate = () => true) {
  const base = path.join(root, relative);
  const result = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...filesBelow(child, predicate));
    else if (predicate(child)) result.push(child);
  }
  return result;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^()|[\]\\{}$]/g, '\\$&');
}

function assertStepContains(relative, heading, href) {
  const html = read(relative);
  const pattern = '<li>(?:(?!<\\/li>).)*<h3>' + escapeRegExp(heading) + '<\\/h3>(?:(?!<\\/li>).)*<\\/li>';
  const item = html.match(new RegExp(pattern, 's'));
  assert.ok(item, relative + ': missing step ' + heading);
  const hrefPattern = 'class="button-link(?: secondary)?"[^>]*href="' + escapeRegExp(href) + '"|href="' + escapeRegExp(href) + '"[^>]*class="button-link(?: secondary)?"';
  assert.match(item[0], new RegExp(hrefPattern));
  if (href.startsWith('http')) {
    assert.match(item[0], /target="_blank"/);
    assert.match(item[0], /rel="noopener"/);
  }
}

test('13 個課程小節頁完整存在', () => {
  const expected = [
    '01-01','01-02','02-01','02-02','03-01','03-02',
    '04-01','04-02','04-03','05-01','05-02','06-01','06-02'
  ];
  for (const id of expected) {
    assert.ok(fs.existsSync(path.join(chapterDir, id + '.html')), id + '.html missing');
  }
});

test('Tactiq 主線包含已驗證 Automatic Workflow、Liquid 與四項排錯', () => {
  const text = read('chapters/01-02.html') + read('appendices/troubleshooting.html');
  for (const phrase of [
    'Automatic', 'Meeting Processed', 'Share to an Integration', 'Google Drive',
    '{{ meeting.transcript }}', '實測成功', '處理延遲', 'My Meetings', 'Run Workflow',
    'Drive 出現兩份相同文件', 'Email 無法取得完整 Tactiq Transcript'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)));
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
    assert.doesNotMatch(text, new RegExp(escapeRegExp(forbidden)));
  }
});

test('LINE 進階流程涵蓋 Bot、Sheets、Gmail、Vercel、多群組與限制', () => {
  const files = ['04-01','04-02','04-03','05-01','05-02','06-01','06-02'];
  const text = files.map(id => read('chapters/' + id + '.html')).join('\n');
  for (const phrase of [
    'LINE Official Account','Channel Secret','Channel Access Token','Webhook','Vercel',
    'Google Sheets','Gmail App Password','group_id','加入後的新文字訊息','[LINE紀錄]'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)));
});

test('第 4～6 章與學生範例不再教授 Node.js 舊流程', () => {
  const advanced = ['04-01','04-02','04-03','05-01','05-02','06-01','06-02']
    .map(id => read('chapters/' + id + '.html')).join('\n');
  const troubleshooting = read('appendices/troubleshooting.html');
  const starterFiles = filesBelow('downloads/line-bot-starter', file => !/[\\/]tests[\\/]/.test(file));
  const starter = starterFiles.map(read).join('\n');
  const officialFlow = [advanced, troubleshooting, starter, read('README.md'), read('docs/course-spec.md')].join('\n');
  for (const forbidden of [
    'rooms', '/api/webhook', '!群組ID', '!寄送紀錄',
    'GOOGLE_SERVICE_ACCOUNT_JSON_BASE64', 'GMAIL_USER', 'SEND_COMMAND',
    'api/webhook.js', 'package.json', 'Nodemailer', 'sentAt', 'recipientEmail'
  ]) {
    assert.doesNotMatch(officialFlow, new RegExp(escapeRegExp(forbidden), 'i'), forbidden);
  }
  assert.doesNotMatch(advanced, /學生.{0,20}(必須|需要).{0,20}(建立|使用).{0,20}GitHub Repository/s);
});

test('正式 Python schema、控制指令、Webhook 與 Vercel Drop 完整出現', () => {
  const advanced = ['04-01','04-02','04-03','05-01','05-02','06-01','06-02']
    .map(id => read('chapters/' + id + '.html')).join('\n');
  const groupsHeader = 'group_id\tgroup_name\treceiver_email';
  const messagesHeader = 'webhook_event_id\tmessage_id\tgroup_id\tuser_id\tdisplay_name\tmessage\tcreated_at\tsent';
  for (const required of [
    'Python', 'Flask', 'gspread', 'Gmail SMTP', 'LINE Messaging API',
    'groups', 'messages', groupsHeader, messagesHeader, '/callback',
    '#設定信箱', '#查看信箱', '#寄出紀錄', 'Vercel Drop', 'FALSE', 'TRUE'
  ]) assert.match(advanced, new RegExp(escapeRegExp(required)), required);
  const envPage = read('chapters/05-01.html');
  for (const name of [
    'LINE_CHANNEL_SECRET', 'LINE_CHANNEL_ACCESS_TOKEN', 'GMAIL_ADDRESS',
    'GMAIL_APP_PASSWORD', 'GOOGLE_SHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_BASE64'
  ]) assert.match(envPage, new RegExp(escapeRegExp(name)), name);
  assert.match(envPage, /6 個環境變數|六個環境變數/);
  assert.match(advanced, /FALSE\s*(?:→|／)\s*TRUE/);
});

test('實際操作步驟內提供對應快捷按鈕', () => {
  for (const [relative, heading, href] of [
    ['chapters/01-02.html', '安裝並登入', 'https://chromewebstore.google.com/detail/tactiq-ai-meeting-transcr/fggkaccpbmombhnjkjokndojfgagejfb'],
    ['chapters/01-02.html', '建立測試 Meet', 'https://meet.google.com/'],
    ['chapters/01-02.html', '結束並確認 Transcript', 'https://app.tactiq.io/'],
    ['chapters/01-02.html', '先建立資料夾', 'https://drive.google.com/drive/my-drive'],
    ['chapters/02-01.html', '新增 Project', 'https://chatgpt.com/'],
    ['chapters/02-01.html', '設定資料來源', 'https://drive.google.com/drive/my-drive'],
    ['chapters/02-01.html', '設定資料來源', 'https://mail.google.com/'],
    ['chapters/04-02.html', '登入 LINE Developers', 'https://developers.line.biz/console/'],
    ['chapters/04-02.html', '調整回覆模式', 'https://manager.line.biz/'],
    ['chapters/04-03.html', '命名檔案', 'https://sheets.new/'],
    ['chapters/04-03.html', '建立／選擇 Cloud Project', 'https://console.cloud.google.com/'],
    ['chapters/04-03.html', '新增 App Password', 'https://myaccount.google.com/apppasswords'],
    ['chapters/05-01.html', '下載正式學生 ZIP', '../downloads/LINE訊息整理Bot_課程正式版.zip'],
    ['chapters/05-01.html', '開啟 Vercel Drop', 'https://vercel.com/new'],
    ['chapters/05-02.html', 'Redeploy', 'https://vercel.com/']
  ]) assertStepContains(relative, heading, href);
});

test('5-1 的下載按鈕直接指向正式 ZIP，README 只作說明', () => {
  const html = read('chapters/05-01.html');
  assert.match(html, /href="\.\.\/downloads\/LINE訊息整理Bot_課程正式版\.zip"[^>]*download/);
  assert.match(html, /href="\.\.\/downloads\/line-bot-starter\/README\.md"/);
  assert.doesNotMatch(html, /href="\.\.\/downloads\/line-bot-starter\/README\.md"[^>]*download/);
});
