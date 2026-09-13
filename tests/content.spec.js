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
    '30 秒摘要','已確認決策（決策／來源／日期）','待辦事項','未決事項',
    '決策變更（原決定／新決定／原來源／新來源）','衝突提醒',
    '需要人工確認','本次實際讀取的 Google Drive 資料','本次實際讀取的 Gmail 資料','排除的資料',
    '不可以假裝已完成跨來源整理'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)));
});

test('2-1 使用 Plugins／Apps、實際讀取驗證並保留三來源人工 fallback', () => {
  const text = read('chapters/02-01.html');
  assert.doesNotMatch(text, /Settings／設定.{0,80}Connectors／連接器/s);
  assert.doesNotMatch(text, /若你的方案或帳號尚未顯示 Projects/);
  assert.doesNotMatch(text, /2026\/07 起主要整合入口/);
  for (const phrase of [
    'Plugins／Apps', 'Google Drive', 'Gmail app', 'plan', 'region', 'workspace', 'role',
    '管理員政策', '實際打開', '讀取內容', 'Tactiq 逐字稿', 'LINE TXT',
    '手動提供', '不得假裝已成功'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
});

test('2-2 明確揭露 LINE TXT 限制並要求零基礎檢查', () => {
  const text = read('chapters/02-02.html');
  for (const phrase of [
    '不是完整聊天室備份', '圖片', '貼圖', '影片', '附件', '回覆關係',
    '記事本', '不是空檔', '繁體中文沒有亂碼', '開始日期', '結束日期',
    '群組名稱', '敏感資料'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
});

test('3-2 只將人工確認後的結果加入專案來源', () => {
  const text = read('chapters/03-02.html');
  for (const phrase of [
    '人工確認', '訊息選單', '儲存到專案', '加入專案來源',
    '未人工確認的草稿', '新的日期範圍', '新的來源',
    '已確認的前次專案狀態', '不得因為時間較晚就自動覆蓋'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
});

test('4-1 與正式 LINE 事件範圍及 Demo 安全限制一致', () => {
  const text = read('chapters/04-01.html');
  for (const phrase of [
    'source.type = group', 'join', 'memberJoined', '歡迎訊息',
    '不會寫入 messages', '私訊', 'multi-person room', '非文字訊息',
    '課程 Demo 安全限制', '測試群組', '管理員權限驗證',
    '任何可使用控制指令的成員', '#設定信箱', '#寄出紀錄',
    '公司資料政策', '告知／授權'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
});

test('4-2 使用現行 LINE OA 建立流程並揭露群組與 Token 限制', () => {
  const text = read('chapters/04-02.html');
  for (const phrase of [
    'LINE Official Account', '啟用 Messaging API', 'LINE Developers Channel',
    '同一時間只能有一個 LINE Official Account', 'short-lived', 'v2.1',
    'stateless', '重新發行 long-lived token', '舊的 long-lived token 失效'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
});

function assertBase64ZeroBasics(relative) {
  const text = read(relative);
  for (const phrase of [
    '[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json")) | Set-Clipboard',
    '$b64 = Get-Clipboard',
    '([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64)) | ConvertFrom-Json).type',
    'service_account', '實際檔名', '剪貼簿', 'Base64 是編碼，不是加密',
    '線上 Base64 converter'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), `${relative}: ${phrase}`);
}

test('4-3 與 5-1 各自提供完整且不洩密的 Base64 教學', () => {
  assertBase64ZeroBasics('chapters/04-03.html');
  assertBase64ZeroBasics('chapters/05-01.html');
  const gmail = read('chapters/04-03.html');
  for (const phrase of [
    'Security Key', '組織管理帳號', 'Advanced Protection',
    '修改一般登入密碼', 'GMAIL_ADDRESS', '建立這組 App Password 的寄件 Google 帳號'
  ]) assert.match(gmail, new RegExp(escapeRegExp(phrase)), phrase);
});

test('4-3 Service Account 的第 8 步清楚說明 Base64 轉換驗證', () => {
  const text = read('chapters/04-03.html');
  const section = text.match(/<h2>建立 Service Account<\/h2>([\s\S]*?)<\/ol>/);
  assert.ok(section, '建立 Service Account section missing');
  const headings = [...section[1].matchAll(/<li><h3>(.*?)<\/h3>/g)].map(match => match[1]);
  assert.equal(headings[7], '驗證 Base64 是否轉換成功');
});

test('5-1 使用官方 Drop、原 Project Redeploy 與恰好六個 Value', () => {
  const text = read('chapters/05-01.html');
  assert.match(text, /href="https:\/\/vercel\.com\/drop"/);
  assert.doesNotMatch(text, /href="https:\/\/vercel\.com\/(?:new)?"/);
  for (const phrase of [
    'ZIP 或 folder', '不用先解壓縮', '不要重新 Drop ZIP',
    '每次重新 Drop 都會建立新的 Project', 'Redeploy 原本 Project',
    'Value 欄只貼真正的值', 'LINE_CHANNEL_SECRET=abc123',
    '不要加雙引號', '不要加單引號', '不要帶變數名稱', '不要多貼換行'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
  const envNames = [...text.matchAll(/<tr><td><code>([A-Z][A-Z0-9_]+)<\/code><\/td>/g)].map(match => match[1]);
  assert.deepEqual(envNames, [
    'LINE_CHANNEL_SECRET', 'LINE_CHANNEL_ACCESS_TOKEN', 'GMAIL_ADDRESS',
    'GMAIL_APP_PASSWORD', 'GOOGLE_SHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_BASE64'
  ]);
});

test('5-2 使用穩定 Production Domain 並正確解釋 Preview、404 與 Logs', () => {
  const text = read('chapters/05-02.html');
  for (const phrase of [
    '穩定 Production Domain', 'Preview', 'Deployment URL',
    '沒有 GET / health page', '看到 404', '不代表 Bot 部署失敗',
    'Deployment 顯示 Ready', 'Verify 顯示 Success',
    '群組新文字成功寫入', 'Logs', 'Deployment Logs'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
});

test('操作教材統一使用真實 Email placeholder，6-1 不使用 example.com', () => {
  for (const relative of [
    'chapters/05-02.html', 'chapters/06-01.html',
    'appendices/troubleshooting.html', 'downloads/line-bot-starter/README.md'
  ]) {
    assert.match(read(relative), /#設定信箱 (?:&lt;|<)[^\n<]+(?:&gt;|>)/, relative);
  }
  const multiGroup = read('chapters/06-01.html');
  assert.doesNotMatch(multiGroup, /[ab]@example\.com/i);
  for (const phrase of [
    '半形 #', '一般半形空格', '實際可收信', '同一個可收信地址',
    'Email 主旨中的群組名稱', '不是只寄今天'
  ]) assert.match(multiGroup, new RegExp(escapeRegExp(phrase)), phrase);
  assert.match(multiGroup, /目前.{0,80}group_id.{0,80}sent = FALSE.{0,80}全部尚未寄送/s);
  assert.match(
    read('downloads/line-bot-starter/README.md'),
    /`your@gmail\.com` 僅為 Bot 內建歡迎訊息的顯示範例，實際操作必須換成實際可收信的地址/
  );
});

test('排錯中心涵蓋 A～J 與 SMTP 成功但 Sheets 標記失敗的重寄風險', () => {
  const text = read('appendices/troubleshooting.html');
  for (const heading of [
    'A. GOOGLE_SERVICE_ACCOUNT_BASE64 無效',
    'B. Google Sheets 403 / permission denied',
    'C. Gmail SMTP 535 / authentication failed',
    'D. App Password 找不到',
    'E. Vercel Environment Variable 看起來有填但仍失敗',
    'F. Deployment Ready，但網址瀏覽器看到 404',
    'G. LINE Bot 無法加入群組',
    'H. Verify Success 但 Sheets 沒資料',
    'I. sent = TRUE 但收件匣沒看到',
    'J. ChatGPT 顯示 Drive / Gmail 已連接，但找不到資料'
  ]) assert.match(text, new RegExp(escapeRegExp(heading)), heading);
  for (const phrase of [
    'SMTP 成功送出', 'sent = TRUE 更新失敗', '維持 sent = FALSE',
    '可能造成重複 Email', '先檢查收件匣與 Sheets 狀態'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
});

test('首頁提供單一查驗日期與跨平台維護提醒', () => {
  const text = read('index.html');
  assert.equal((text.match(/介面／政策最後查驗：2026-09-13/g) || []).length, 1);
  for (const phrase of ['ChatGPT', 'LINE', 'Google', 'Vercel', 'Tactiq', '官方當下介面為準']) {
    assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
  }
});

test('教材不承諾 LINE 私訊或 OpenAI API，course spec 符合正式 groups 行為', () => {
  const publicText = [
    ...filesBelow('chapters', file => file.endsWith('.html')),
    ...filesBelow('appendices', file => file.endsWith('.html')),
    'README.md', 'docs/course-spec.md', 'downloads/line-bot-starter/README.md'
  ].map(read).join('\n');
  assert.doesNotMatch(publicText, /OPENAI_API_KEY|OPENAI_MODEL/);
  assert.doesNotMatch(publicText, /測試私訊、群組訊息與 Google Sheets/);
  const spec = read('docs/course-spec.md');
  for (const phrase of [
    '一般群組文字訊息寫入 messages',
    '新的一般群組文字與相關群組控制指令都可能建立／更新 groups',
    'receiver_email 必須由使用者透過 #設定信箱 設定',
    'join / memberJoined', '不寫入 messages'
  ]) assert.match(spec, new RegExp(escapeRegExp(phrase)), phrase);
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
    ['chapters/05-01.html', '開啟 Vercel Drop', 'https://vercel.com/drop'],
    ['chapters/05-02.html', 'Redeploy', 'https://vercel.com/']
  ]) assertStepContains(relative, heading, href);
});

test('5-1 的下載按鈕直接指向正式 ZIP，README 只作說明', () => {
  const html = read('chapters/05-01.html');
  assert.match(html, /href="\.\.\/downloads\/LINE訊息整理Bot_課程正式版\.zip"[^>]*download/);
  assert.match(html, /href="\.\.\/downloads\/line-bot-starter\/README\.md"/);
  assert.doesNotMatch(html, /href="\.\.\/downloads\/line-bot-starter\/README\.md"[^>]*download/);
});
