const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const chapterDir = path.join(root, 'chapters');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function loadCoursePrompts() {
  const sandbox = { window: {} };
  vm.runInNewContext(read('assets/prompts.js'), sandbox, { filename: 'assets/prompts.js' });
  return JSON.parse(JSON.stringify(sandbox.window.COURSE_PROMPTS));
}

function loadCoursePromptTools() {
  const sandbox = { window: {} };
  vm.runInNewContext(read('assets/prompts.js'), sandbox, { filename: 'assets/prompts.js' });
  return JSON.parse(JSON.stringify(sandbox.window.COURSE_PROMPT_TOOLS));
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
    'Drive 出現兩份相同文件', 'Email 無法取得完整 Tactiq Transcript',
    '首次設定要求選擇會議平台', 'Google Meet', 'Enable', 'Fix Tactiq',
    '檔名包含可區分會議的日期／時間或會議名稱'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)));
});

test('專案主對話固定揭露實際來源並保留人工確認', () => {
  const text = loadCoursePrompts().find(prompt => prompt.id === '2').body;
  for (const phrase of [
    '30 秒摘要', '已確認決策', '待辦事項', '未決事項', '決策變更',
    '衝突提醒', '需要人工確認', '本次實際讀取的資料', 'Google Drive／會議來源',
    'LINE／Gmail／TXT 來源', '本次排除的資料', '重要日期', '客戶承諾'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)));
});

test('三張主流程 Prompt 都以專案相關性閘門隔離其他專案', () => {
  for (const prompt of loadCoursePrompts()) {
    const text = prompt.body;
    assert.match(text, /專案相關性/, `Prompt ${prompt.id}: relevance gate`);
    assert.match(text, /相同人物不代表同一專案/, `Prompt ${prompt.id}: people are not a project boundary`);
    assert.match(text, /人物姓名拿掉/, `Prompt ${prompt.id}: final relevance check`);
    assert.match(text, /明確相關/, `Prompt ${prompt.id}: include state`);
    assert.match(text, /無法確認/, `Prompt ${prompt.id}: review state`);
    assert.match(text, /明確無關/, `Prompt ${prompt.id}: exclude state`);
    assert.match(text, /無法確認[\s\S]{0,180}需要人工確認/, `Prompt ${prompt.id}: uncertain items need review`);
  }
});

test('三張主流程 Prompt 限制新事實的來源並禁止既有記憶跨專案補入', () => {
  for (const prompt of loadCoursePrompts()) {
    const text = prompt.body;
    assert.match(text, /本次指定來源/, `Prompt ${prompt.id}: requested sources`);
    assert.match(text, /本次指定日期範圍/, `Prompt ${prompt.id}: requested date range`);
    assert.match(text, /通過專案相關性/, `Prompt ${prompt.id}: passed relevance gate`);
    assert.match(text, /過去對話|模型記憶|其他聊天/, `Prompt ${prompt.id}: no remembered facts`);
    assert.match(text, /其他專案/, `Prompt ${prompt.id}: no cross-project facts`);
  }
});

test('三張主流程 Prompt 以執行日切開已發生與未來期間', () => {
  for (const prompt of loadCoursePrompts()) {
    const text = prompt.body;
    assert.match(text, /執行當下的實際系統日期/, `Prompt ${prompt.id}: actual system date`);
    assert.match(text, /尚未發生/, `Prompt ${prompt.id}: future period`);
    assert.match(text, /未來期間[\s\S]{0,100}不得[\s\S]{0,60}查無資料/, `Prompt ${prompt.id}: future is not no-data`);
    assert.doesNotMatch(text, /2026-09-18/, `Prompt ${prompt.id}: no hard-coded acceptance date`);
  }
});

test('Prompt 2 與 Prompt 3 區分四種來源與日期狀態', () => {
  for (const id of ['2', '3']) {
    const text = loadCoursePrompts().find(prompt => prompt.id === id).body;
    for (const phrase of [
      '已讀取且找到相關資料',
      '指定已發生期間內未找到相關資料',
      '目前無法存取此來源',
      '該期間尚未發生'
    ]) assert.match(text, new RegExp(escapeRegExp(phrase)), `Prompt ${id}: ${phrase}`);
  }
});

test('Prompt 2 短版與 Prompt 3 都固定更新單一指定專案', () => {
  const prompts = loadCoursePrompts();
  const prompt2 = prompts.find(prompt => prompt.id === '2');
  const prompt3 = prompts.find(prompt => prompt.id === '3');
  for (const [label, text] of [['Prompt 2 短版', prompt2.followup.body], ['Prompt 3', prompt3.body]]) {
    assert.match(text, /「＿＿＿＿專案」/, `${label}: project placeholder`);
    assert.match(text, /專案相關性/, `${label}: relevance gate`);
    assert.match(text, /尚未發生/, `${label}: future boundary`);
  }
  assert.match(
    prompt2.followup.body,
    /指定結束日[\s\S]{0,40}實際系統日期[\s\S]{0,40}較早日期/,
    'Prompt 2 短版: effective end is the earlier of requested end and system date'
  );
  for (const phrase of [
    '廣搜候選',
    '關鍵字不能作為唯一篩選條件',
    '如果把人物姓名拿掉',
    '已讀取且找到相關資料',
    '指定已發生期間內未找到相關資料',
    '目前無法存取此來源',
    '該期間尚未發生',
    '無法判斷原因與缺少的脈絡',
    '既有工作記憶只能用於同一專案內的前後比較，不能提供新增事實'
  ]) assert.match(prompt2.followup.body, new RegExp(escapeRegExp(phrase)), `Prompt 2 短版: ${phrase}`);
  assert.doesNotMatch(prompt3.body, /【每個專案輸出】/, 'Prompt 3 must not aggregate every project');
});

test('Prompt 3 明確建立每日重複排程且不寫死執行時間', () => {
  const text = loadCoursePrompts().find(prompt => prompt.id === '3').body;
  assert.ok(text.startsWith(
    '請建立一個重複排程，更新「＿＿＿＿專案」的跨來源工作記憶。\n\n' +
    '排程頻率：每天執行一次。\n\n' +
    '每次執行完成後，請在本次排程任務的執行結果中輸出完整整理結果。\n\n' +
    '若 ChatGPT 帳號已在「設定 → 通知 → 任務」開啟推播或電子郵件通知，\n' +
    '則由 ChatGPT 系統依目前通知設定發送提醒。\n\n' +
    '不可因為提示詞中寫有「通知」就假設推播或電子郵件一定會送達。\n' +
    '任務是否成功，應以排程任務本身的實際執行結果與執行紀錄為準。\n\n'
  ));
  assert.doesNotMatch(text, /每次執行完成後，將本次整理結果通知給(?:我|使用者)。/);
  assert.doesNotMatch(text, /每天(?:上午|下午|晚上|早上|中午|凌晨)?\s*\d{1,2}(?::\d{2}|：\d{2}|點)/);
  for (const section of [
    '【來源 1：Google Drive】', '【來源 2：Gmail】', '【時間範圍】', '【來源狀態】',
    '【專案相關性閘門】', '【既有工作記憶】', '【版本判斷】', '【固定輸出】'
  ]) assert.match(text, new RegExp(escapeRegExp(section)), section);
});

test('6-2 提醒學生確認每日重複排程介面並自行選擇時間', () => {
  const text = read('chapters/06-02.html');
  for (const phrase of [
    'Prompt 必須明確描述排程意圖與執行頻率',
    '一般的一次性任務',
    '重複／每天／時間',
    '依自己的需求選擇執行時間並儲存'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
});

test('6-2 區分 Prompt、帳號通知與 Gmail Connector', () => {
  const schedule = read('chapters/06-02.html');
  const prompt = loadCoursePrompts().find(item => item.id === '3').body;
  for (const phrase of [
    'Prompt 負責定義任務要做什麼',
    'Email／Push 屬於 ChatGPT 帳號層級的通知設定',
    '兩者不是同一件事',
    'ChatGPT → 設定 → 通知 → 任務',
    'Gmail Connector',
    '讀取 <code>[LINE紀錄]</code> 等工作來源',
    'ChatGPT Task Email Notification',
    '通知某次排程任務已有更新／結果',
    '不是透過課程中的 Gmail Connector 主動寄信'
  ]) assert.match(schedule, new RegExp(escapeRegExp(phrase)), phrase);
  assert.doesNotMatch(schedule, /只要 Prompt 寫通知就會寄 Email/);
  assert.match(prompt, /【來源 2：Gmail】[\s\S]*\[LINE紀錄\][\s\S]*必須實際讀取 Email 正文。/);
  for (const forbidden of [
    /使用 Gmail 寄 Email 給我/,
    /寄到\s*\S+@gmail\.com/,
    /透過 Gmail Connector 寄信/,
    /Gmail API 再寄一封信/
  ]) assert.doesNotMatch(prompt, forbidden);
});

test('6-2 提供建立後驗證、三層判斷與下一週期複驗', () => {
  const text = read('chapters/06-02.html');
  for (const phrase of [
    '<h2>建立後驗證</h2>',
    '下一次執行時間',
    'Asia/Taipei',
    '第一次排程執行後，不要只看 Email',
    '任務是否真的有執行',
    '是否有新的執行結果',
    '下一個週期是否真的再次執行',
    '第一層：排程有沒有實際執行？',
    '第二層：任務執行內容有沒有成功？',
    '第三層：Email／Push 有沒有送達？',
    '第一次收到 Task Update，不代表重複排程之後每次都一定會正常執行。',
    '排程執行、任務內容與通知配送是三個不同層級'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
});

test('6-2 故障判斷表不把缺少 Email 直接判定為排程失敗', () => {
  const text = read('chapters/06-02.html');
  const table = text.match(/<table[^>]*data-schedule-troubleshooting[^>]*>([\s\S]*?)<\/table>/);
  assert.ok(table, 'missing schedule troubleshooting table');
  for (const [situation, priority] of [
    ['任務有執行、Email 有、Push 有', '正常'],
    ['任務有執行、Email 有、Push 沒有', '檢查手機 ChatGPT 通知權限'],
    ['任務有執行、Email／Push 都沒有', '檢查 ChatGPT「設定 → 通知 → 任務」'],
    ['任務沒有執行、Email／Push 都沒有', '優先檢查排程時間、時區與任務是否啟用'],
    ['任務有執行，但無法讀取 Drive／Gmail', '檢查 Connector 權限或來源存取']
  ]) {
    const row = new RegExp(`<tr><td>${escapeRegExp(situation)}<\\/td><td>${escapeRegExp(priority)}<\\/td><\\/tr>`);
    assert.match(table[0], row, situation);
  }
  assert.doesNotMatch(text, /沒有 Email[^<]{0,40}排程失敗/);
});

test('相關教材說明搜尋結果須先通過專案閘門並正確處理未來日期', () => {
  const projectSetup = read('chapters/02-01.html');
  const mainConversation = read('chapters/03-01.html');
  const review = read('chapters/03-02.html');
  const schedule = read('chapters/06-02.html');
  const catalog = read('appendices/prompts.html');
  assert.match(projectSetup, /Project-only memory[\s\S]{0,240}專案相關性/);
  assert.match(mainConversation, /搜尋到資料[^<]{0,80}不代表[^<]{0,80}目前專案/);
  assert.match(mainConversation, /人物與日期相同[^<]{0,120}研討會[^<]{0,120}課程影片[^<]{0,120}黑客松/);
  assert.match(review, /人物姓名拿掉/);
  assert.match(schedule, /把 <code>＿＿＿＿專案<\/code> 換成[^<]{0,80}實際專案名稱/);
  assert.match(schedule, /尚未發生[^<]{0,160}查無資料/);
  assert.match(catalog, /只有通過專案相關性判斷/);
});

test('prompts.js 只提供三張主流程 Prompt，部署救援另列實作工具', () => {
  const prompts = loadCoursePrompts();
  const expected = [
    ['1', 'Project 固定指示'],
    ['2', '專案主對話｜建立／更新跨來源工作記憶'],
    ['3', '跨來源週期排程']
  ];
  assert.deepEqual(prompts.map(prompt => [prompt.id, prompt.name]), expected);
  assert.equal(new Set(prompts.map(prompt => prompt.id)).size, 3);
  for (const prompt of prompts) {
    for (const field of ['name', 'tag', 'placement', 'purpose', 'when', 'body']) {
      assert.equal(typeof prompt[field], 'string', `${prompt.id}: ${field}`);
      assert.ok(prompt[field].trim(), `${prompt.id}: empty ${field}`);
    }
  }
  const byId = Object.fromEntries(prompts.map(prompt => [prompt.id, prompt]));
  assert.equal(byId['1'].tag, '只設定一次');
  assert.equal(byId['2'].tag, '日常主要使用');
  assert.equal(byId['3'].tag, '進階篇完成後');
  assert.equal(byId['3'].placement, 'ChatGPT 網頁版 → Scheduled Task／排程');
  assert.equal(byId['2'].followup.name, '後續更新｜留在同一個主對話使用，不另開新對話');
  assert.match(byId['2'].followup.body, /沿用目前已確認的專案脈絡/);

  const tools = loadCoursePromptTools();
  assert.deepEqual(tools.map(tool => [tool.id, tool.name]), [
    ['codex-vercel-rescue', 'Codex／Vercel 部署協助 Prompt']
  ]);
  assert.match(tools[0].notice, /不是工作記憶主流程/);
  assert.doesNotMatch(JSON.stringify(prompts), /LINE 紀錄整理|Tactiq 會議整理|最新有效決策辨識|待辦與專案進度整理|每日工作記憶自動整理/);
});

test('章節以 data-prompt-id 放置正式 Prompt，HTML 不再硬編碼 Prompt 本文', () => {
  const placements = {
    '1': 'chapters/02-01.html',
    '2': 'chapters/03-01.html',
    '3': 'chapters/06-02.html'
  };
  const chapterHtml = filesBelow('chapters', file => file.endsWith('.html')).map(read).join('\n');
  for (const [id, relative] of Object.entries(placements)) {
    assert.match(read(relative), new RegExp(`data-prompt-id="${id}"`), `${relative}: Prompt ${id}`);
    assert.equal((chapterHtml.match(new RegExp(`data-prompt-id="${id}"`, 'g')) || []).length, 1, `Prompt ${id}`);
  }
  const aggregate = read('appendices/prompts.html');
  assert.match(aggregate, /data-prompt-index/);
  assert.match(aggregate, /data-prompt-catalog/);
  assert.match(read('chapters/03-02.html'), /data-prompt-followup="2"/);
  assert.match(read('chapters/05-01.html'), /data-prompt-tool="codex-vercel-rescue"/);
  for (const opening of [
    '你是我的「專案工作記憶助理」。',
    '請建立或更新「＿＿＿＿專案」的工作記憶。',
    '檢查本次排程週期內新增的工作紀錄',
    '我要部署老師提供的「LINE 訊息整理 Bot」課程專案。'
  ]) {
    assert.doesNotMatch(chapterHtml + aggregate, new RegExp(escapeRegExp(opening)), opening);
  }
});

test('工具箱導覽統一使用課程提示詞總整理名稱', () => {
  assert.match(read('assets/app.js'), /📋 課程提示詞總整理/);
  assert.match(read('appendices/prompts.html'), /<h1>📋 課程提示詞總整理<\/h1>/);
  assert.match(read('appendices/troubleshooting.html'), /課程提示詞總整理/);
  assert.doesNotMatch(read('appendices/troubleshooting.html'), /可複製 Prompt/);
});

test('2-1 完成 Project、固定指示、來源連接與實際讀取驗證', () => {
  const text = read('chapters/02-01.html');
  for (const phrase of [
    '本課後續 ChatGPT 操作統一以網頁版示範', 'Chrome 或 Edge',
    '準備用於本課的 ChatGPT 帳號', '左側欄收起', 'chatgpt.com',
    '建立「工作訊息整理」專案並加入固定指示',
    '專案總覽頁面', '右上角', '新增', '建立專案', '專案名稱',
    '工作訊息整理', '只是本課程的示範名稱', '不是系統規定名稱',
    '行銷專案整理', '畢業專題', '產品開發紀錄',
    '僅限專案的記憶（Project-only memory）',
    '讓這個 Project 的工作脈絡集中在專案內',
    '避免其他聊天的內容影響整理結果',
    'ChatGPT Project 容器',
    '你現在是在 Project 裡，而不是一般 ChatGPT 對話',
    '進入專案後，點右上角', '⋯',
    '專案設定（Project settings）', '專案指示（Project instructions）',
    '不是一般聊天訊息', '聊天輸入框',
    'Plugins／Apps（依目前介面顯示名稱為準）', 'Settings／設定',
    'Google Drive', 'Gmail', 'Install', 'Connect', 'Allow',
    'plan', 'region', 'workspace', '管理員政策', '實際打開', '讀取內容',
    'Tactiq 逐字稿', '[LINE紀錄]', 'LINE TXT', '手動提供', '不得假裝已成功',
    '在這個 Project 裡建立新的 Chat', '不要從一般 ChatGPT 首頁建立普通聊天',
    '網站改版專案｜工作記憶', 'Rename／重新命名', '範例名稱',
    '你現在應該看到'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
  assert.doesNotMatch(text, /專案名稱旁的選單|Edit project|編輯專案/);
  assert.doesNotMatch(text, /維持[^。<]{0,20}預設記憶|Default memory/);
  assert.doesNotMatch(text, /Project-only memory[^。<]{0,40}(自動整理|永久資料庫|保證)/);
});

test('3-1 從網頁版開啟 2-1 已建立的主對話，不重教建立 Project', () => {
  const text = read('chapters/03-01.html');
  for (const phrase of [
    '開啟 ChatGPT 網頁版', 'Projects／專案', '工作訊息整理',
    '網站改版專案｜工作記憶', '目前實際專案的主對話', '輸入框旁的', '+／工具選單', 'Prompt 2'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
  assert.doesNotMatch(text, /課程宣傳專案｜工作記憶/);
  assert.doesNotMatch(text, /New project／新增專案/);
});

test('Project 範例名稱與設定入口在後續教材保持一致', () => {
  const projectText = [
    read('chapters/02-01.html'), read('chapters/03-01.html'),
    read('chapters/03-02.html'), read('chapters/06-02.html'),
    read('appendices/troubleshooting.html'), JSON.stringify(loadCoursePrompts())
  ].join('\n');
  assert.match(projectText, /工作訊息整理/);
  for (const obsolete of [
    '專案名稱旁的選單', 'Edit project', '編輯專案',
    '第一次建立「專案工作記憶」Project',
    'Projects／專案</strong> → <strong>專案工作記憶',
    '在「專案工作記憶」內', '目前的「專案工作記憶」',
    '「專案工作記憶」已建立'
  ]) assert.doesNotMatch(projectText, new RegExp(escapeRegExp(obsolete)), obsolete);
});

test('Prompt 1、2、3 本文維持核准版本', () => {
  const expected = {
    '1': '4749d92cf14c49574085ee54c00b845ba9f585064ec74010efc73677deeeeab1',
    '2': 'a74e80fde427e9a52ea818ae7ee56a5d329b949bf44d493422e4aba141522042',
    '3': '4f3ec3528af926d722aaa856fd7a8b4313468fcd7c7971d42a857d8963d25b3e'
  };
  for (const [id, hash] of Object.entries(expected)) {
    const prompt = loadCoursePrompts().find(item => item.id === id);
    const normalized = prompt.body.replace(/\r\n/g, '\n');
    assert.equal(crypto.createHash('sha256').update(normalized).digest('hex'), hash, `Prompt ${id}`);
  }
});

test('2-2 只取得並檢查 LINE TXT，再明確交給 3-1 做第一次跨來源整理', () => {
  const text = read('chapters/02-02.html');
  for (const phrase of [
    '不是完整聊天室備份', '圖片', '貼圖', '影片', '附件', '回覆關係',
    '記事本', '不是空檔', '繁體中文沒有亂碼', '開始日期', '結束日期',
    '群組名稱', '敏感資料', '想整理日期附近的訊息已載入',
    '第一筆是否涵蓋想整理的開始範圍', '最後一筆是否到達想整理的結束範圍',
    '先保留這份 LINE TXT。下一節 3-1 會把它和會議逐字稿一起加入「工作訊息整理」Project 的主對話，進行第一次跨來源整理。'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
  assert.doesNotMatch(text, /data-prompt-id=|貼下方 Prompt|送出 Prompt/);
});

test('3-1 才開始第一次正式跨來源整理，且提供完成確認', () => {
  const text = read('chapters/03-01.html');
  assert.match(text, /2-1 已建立 Project，本節直接進入「工作訊息整理」/);
  assert.match(text, /會議紀錄與 LINE TXT 都已提供/);
  assert.match(text, /摘要／決策／待辦／變更／未決事項/);
});

test('3-2 驗收結果並在同一個專案主對話持續更新', () => {
  const text = read('chapters/03-02.html');
  for (const phrase of [
    '人工確認', '抽查', '已確認決策', '待辦', '決策變更', '候選',
    '來源', '同一個專案主對話', '新的日期範圍', '後續更新',
    '不得因為時間較晚就自動覆蓋', 'ChatGPT 網頁版',
    'Save to project／Add to project sources', '只有人工確認過的結果',
    '不代表內容已自動成為正式專案狀態', '你現在應該看到'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
  assert.ok(text.indexOf('人工驗收第一版') < text.indexOf('Save to project／Add to project sources'));
  assert.doesNotMatch(text, /課程宣傳專案｜工作記憶|決策辨識 Prompt/);
});

test('4-1 與正式 LINE 事件範圍及練習環境安全限制一致', () => {
  const text = read('chapters/04-01.html');
  for (const phrase of [
    'source.type = group', 'join', 'memberJoined', '歡迎訊息',
    '不會寫入 messages', '私訊', 'multi-person room', '非文字訊息',
    '練習環境安全限制', '測試群組', '管理員權限驗證',
    '任何可使用控制指令的成員', '#設定信箱', '#寄出紀錄',
    '公司資料政策', '告知／授權'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
  assert.doesNotMatch(text, /課程 Demo|不偷偷擴充/);
});

test('4-2 使用現行 OA Manager 主流程並逐階段自我檢查', () => {
  const text = read('chapters/04-02.html');
  for (const phrase of [
    'LINE Official Account Manager', '建立新的官方帳號', 'Account name',
    'Settings', 'Messaging API', 'Use Messaging API', 'Provider',
    '系統建立', 'LINE Developers Console', 'Basic settings', 'Channel secret',
    'Channel access token (long-lived)', 'Issue', 'Allow bot to join group chats',
    'Enabled', 'Greeting', 'Auto-response', 'Webhook URL', '5-2',
    '一個 LINE 群組同一時間只能加入一個 LINE Official Account', 'short-lived', 'v2.1',
    '重新發行 long-lived token', '舊的 long-lived token 失效'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
  assert.ok((text.match(/你現在應該看到/g) || []).length >= 4);
  assert.doesNotMatch(text, /LINE Developers[^<]{0,100}Create Messaging API Channel/s);
});

function assertBase64SimpleTransfer(relative) {
  const text = read(relative);
  for (const phrase of [
    '[Convert]::ToBase64String([IO.File]::ReadAllBytes("完整JSON路徑")) | Set-Clipboard',
    '實際檔名與完整路徑', '沒有顯示大量文字是正常的', '直接複製到剪貼簿',
    '立即前往 Vercel', 'GOOGLE_SERVICE_ACCOUNT_BASE64', 'Value',
    '貼入 Vercel 前不要再複製其他文字', '剪貼簿內容會被覆蓋',
    '重新執行 PowerShell 指令', '顯示／遮蔽狀態', '一整串很長的 Base64 字串',
    '不代表 Base64 有效性的技術驗證',
    '最終是否設定正確，以部署與實際 Google Sheets 寫入測試為準',
    'Base64 是編碼，不是加密', '不可公開', '不可提交 GitHub',
    '不可貼到公開聊天', '線上 Base64 converter'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), `${relative}: ${phrase}`);
  for (const obsolete of [
    'FromBase64String', 'ConvertFrom-Json', '$b64 = Get-Clipboard',
    'service_account', '驗證 Base64 是否轉換成功', '安全驗證格式',
    '不洩密驗證', '產生並驗證 Base64'
  ]) assert.doesNotMatch(text, new RegExp(escapeRegExp(obsolete)), `${relative}: ${obsolete}`);
}

test('4-3 只準備並安全保存 JSON，5-1 才執行唯一正式 Base64 流程', () => {
  const google = read('chapters/04-03.html');
  for (const phrase of [
    '下載並安全保存 Service Account JSON',
    '5-1 再轉成 Base64',
    '若目前使用學校／公司管理的 Google 帳號，而且組織政策禁止建立 JSON key，建議改用自己可管理的個人 Google Cloud Project，或洽組織管理員確認權限。'
  ]) assert.match(google, new RegExp(escapeRegExp(phrase)), phrase);
  assert.doesNotMatch(google, /ToBase64String|直接進入下一節 5-1|回到 PowerShell/);
  assertBase64SimpleTransfer('chapters/05-01.html');
  for (const phrase of [
    'Security Key', '組織管理帳號', 'Advanced Protection',
    '修改一般登入密碼', 'GMAIL_ADDRESS', '建立這組 App Password 的寄件 Google 帳號'
  ]) assert.match(google, new RegExp(escapeRegExp(phrase)), phrase);
});

test('相關學生文件不再提供 Base64 解碼驗證，starter 使用同一簡化流程', () => {
  const related = [
    'chapters/04-03.html', 'chapters/05-01.html',
    'appendices/troubleshooting.html', 'downloads/line-bot-starter/README.md'
  ].map(read).join('\n');
  for (const obsolete of [
    'FromBase64String', 'ConvertFrom-Json', '$b64 = Get-Clipboard',
    '驗證 Base64 是否轉換成功', '安全驗證格式', '不洩密驗證'
  ]) assert.doesNotMatch(related, new RegExp(escapeRegExp(obsolete)), obsolete);
  const starter = read('downloads/line-bot-starter/README.md');
  const command = '[Convert]::ToBase64String([IO.File]::ReadAllBytes("完整JSON路徑")) | Set-Clipboard';
  assert.equal(starter.split(command).length - 1, 1);
  assert.match(starter, /最終是否設定正確，以部署與實際 Google Sheets 寫入測試為準/);
});

test('5-1 使用官方 Drop、原 Project Redeploy 與恰好六個 Value', () => {
  const text = read('chapters/05-01.html');
  assert.match(text, /href="https:\/\/vercel\.com\/drop"/);
  assert.doesNotMatch(text, /href="https:\/\/vercel\.com\/(?:new)?"/);
  for (const phrase of [
    'ZIP 或 folder', '不用先解壓縮', '登入', 'Team', '個人帳號', 'Project name',
    'Deploy', 'Project', 'Settings', 'Environment Variables', 'Add New',
    'Production', 'Save', '你現在應該看到', '不要重新 Drop ZIP',
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
    '/callback', 'LINE Developers', 'Messaging API', 'Webhook settings',
    'Edit', 'Save', 'Verify', 'Success', 'Use webhook', 'Enabled', '你現在應該看到',
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
    '可能造成重複 Email', '先檢查收件匣與 Sheets 狀態',
    'LINE TXT 缺少想整理的舊訊息', '找不到 Project instructions',
    'Service Account JSON key 無法建立', 'receiver email',
    'Scheduled Task', 'connected app'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
});

test('跨來源工作記憶概念名稱仍保留，完成確認補在需要的實作章節', () => {
  const publicText = [
    read('index.html'), ...filesBelow('chapters', file => file.endsWith('.html')).map(read),
    read('appendices/prompts.html'), JSON.stringify(loadCoursePrompts())
  ].join('\n');
  for (const phrase of ['跨來源工作記憶', '建立跨來源工作記憶', '更新專案工作記憶']) {
    assert.match(publicText, new RegExp(escapeRegExp(phrase)), phrase);
  }
  for (const relative of ['chapters/03-01.html', 'chapters/06-02.html']) {
    const text = read(relative);
    const match = text.match(/<h2>完成確認<\/h2><ul class="checklist">([\s\S]*?)<\/ul>/);
    assert.ok(match, `${relative}: 完成確認`);
    const count = (match[1].match(/<li>/g) || []).length;
    assert.ok(count >= 2 && count <= 5, `${relative}: ${count} completion items`);
  }
});

test('首頁提供三層 Prompt 流程與不帶內部查驗日期的介面提醒', () => {
  const text = read('index.html');
  assert.doesNotMatch(text, /介面／政策最後查驗：\d{4}-\d{2}-\d{2}/);
  for (const phrase of [
    'ChatGPT', 'LINE', 'Google', 'Vercel', 'Tactiq', '官方當下介面為準',
    'Project 固定指示', '專案主對話', '跨來源週期排程'
  ]) {
    assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
  }
});

test('排程只在手動跨來源驗證成功後建立，且不依賴 Project 檔案', () => {
  const text = read('chapters/06-02.html') + loadCoursePrompts().find(prompt => prompt.id === '3').body;
  for (const phrase of [
    '先手動驗證成功，再自動化', 'Google Drive', 'Gmail', '[LINE紀錄]',
    '完整逐字稿', '上一次成功執行', '指定已發生期間內未找到相關資料', '無法存取',
    '本次週期沒有新的工作記憶需要更新', '每次執行都要依 Prompt 重新搜尋',
    '不能只因排程建立在 Project 裡', 'ChatGPT 網頁版',
    'plan', 'workspace', 'Plugins／Apps', 'Settings／設定 → Notifications／通知 → Manage tasks／管理任務',
    '專案主對話手動執行 Prompt 2'
  ]) assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
  assert.doesNotMatch(text, /每天整理一次我的 LINE 工作記憶|只處理今天的紀錄/);
  assert.doesNotMatch(text, /任務不能存取該 Project 中上傳或保存的檔案/);
});

test('版本變更使用明確標示的虛構工作案例，不像課程製作紀錄', () => {
  const text = [
    read('chapters/01-02.html'), read('chapters/03-02.html'),
    read('chapters/05-02.html'), read('chapters/06-02.html')
  ].join('\n');
  for (const phrase of ['練習案例', '活動籌備專案', '4/18', '4/21', '4/25']) {
    assert.match(text, new RegExp(escapeRegExp(phrase)), phrase);
  }
  for (const phrase of ['小美', '10/20', '10/23', '10/30', '候選上架日']) {
    assert.doesNotMatch(text, new RegExp(escapeRegExp(phrase)), phrase);
  }
});

test('所有學員可見內容與 Prompt 不含講師製作流程痕跡', () => {
  const text = [
    read('index.html'), read('404.html'),
    ...filesBelow('chapters', file => file.endsWith('.html')).map(read),
    ...filesBelow('appendices', file => file.endsWith('.html')).map(read),
    JSON.stringify(loadCoursePrompts()), JSON.stringify(loadCoursePromptTools()),
    read('downloads/line-bot-starter/README.md')
  ].join('\n');
  for (const phrase of [
    '課程宣傳專案', '老師 Demo', '老師提供', '老師與學生', '講師驗收',
    '由講師將專案', '講師本機除錯', 'Demo 文案', '課程 Demo', '錄課驗收'
  ]) assert.doesNotMatch(text, new RegExp(escapeRegExp(phrase)), phrase);
});

test('實作頁提供起點、連續操作路徑與成功確認點', () => {
  const requirements = {
    'chapters/01-02.html': ['https://meet.google.com/', 'Automatic', 'Save', '你現在應該看到'],
    'chapters/02-01.html': ['https://chatgpt.com/', '新增專案', 'Project instructions', '你現在應該看到'],
    'chapters/02-02.html': ['匯出聊天記錄', 'LINE TXT', '你現在應該看到'],
    'chapters/03-01.html': ['專案主對話', '日期範圍', '實際讀取', '你現在應該看到'],
    'chapters/03-02.html': ['抽查', '後續更新', '你現在應該看到'],
    'chapters/04-02.html': ['https://manager.line.biz/', 'Use Messaging API', '你現在應該看到'],
    'chapters/04-03.html': ['console.cloud.google.com', 'Create', 'JSON', 'client_email', '你現在應該看到'],
    'chapters/05-01.html': ['https://vercel.com/drop', 'Environment Variables', 'Redeploy', '你現在應該看到'],
    'chapters/05-02.html': ['Production Domain', 'Verify', 'Success', '你現在應該看到'],
    'chapters/06-01.html': ['#設定信箱', '#寄出紀錄', '你現在應該看到'],
    'chapters/06-02.html': ['Google Drive', 'Gmail', 'Scheduled Task', '你現在應該看到']
  };
  for (const [relative, phrases] of Object.entries(requirements)) {
    const text = read(relative);
    for (const phrase of phrases) assert.match(text, new RegExp(escapeRegExp(phrase)), `${relative}: ${phrase}`);
  }
});

test('讀者操作文案不再使用講師視角指稱正在閱讀的人', () => {
  const text = [read('index.html'), ...filesBelow('chapters', file => file.endsWith('.html')).map(read), ...filesBelow('appendices', file => file.endsWith('.html')).map(read)].join('\n');
  for (const phrase of ['學生看到', '學生需要', '學生操作', '給學生', '老師提供', '開課方']) {
    assert.doesNotMatch(text, new RegExp(escapeRegExp(phrase)), phrase);
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
    ['chapters/02-01.html', '開啟 ChatGPT 網頁版', 'https://chatgpt.com/'],
    ['chapters/02-01.html', '連接 Google Drive 與 Gmail', 'https://drive.google.com/drive/my-drive'],
    ['chapters/02-01.html', '連接 Google Drive 與 Gmail', 'https://mail.google.com/'],
    ['chapters/04-02.html', '登入 LINE Developers', 'https://developers.line.biz/console/'],
    ['chapters/04-02.html', '調整回覆模式', 'https://manager.line.biz/'],
    ['chapters/04-03.html', '命名檔案', 'https://sheets.new/'],
    ['chapters/04-03.html', '建立／選擇 Cloud Project', 'https://console.cloud.google.com/'],
    ['chapters/04-03.html', '新增 App Password', 'https://myaccount.google.com/apppasswords'],
    ['chapters/05-01.html', '下載課程 ZIP', '../downloads/LINE訊息整理Bot_課程正式版.zip'],
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
