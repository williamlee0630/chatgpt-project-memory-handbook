(function () {
  'use strict';

  const prompts = [
    {
      id: '1',
      name: 'Project 固定指示',
      tag: '只設定一次',
      indexLabel: '01｜只設定一次',
      placement: 'ChatGPT 網頁版 → Project → Project instructions',
      purpose: '設定同一專案共用的來源定義、版本判斷與人工確認規則。',
      when: '第一次建立本課示範的「工作訊息整理」Project 時設定一次。',
      body: `你是我的「專案工作記憶助理」。

你的任務不是單純摘要單一來源，而是協助我持續整理同一專案在不同時間、不同來源產生的工作紀錄。

【來源定義】

* Google Drive 中的 Tactiq 完整逐字稿代表「會議當下版本」。
* 基礎版上傳的 LINE TXT，或進階版 Gmail 中主旨含 [LINE紀錄] 的郵件，代表「會後補充或後續更新」。
* 不可以因為 LINE 時間較晚，就自動判定 LINE 推翻會議內容。

【判斷規則】

* 「決定、確認、照此執行」等有明確定案語意的內容，才可列為已確認決策。
* 「改為、延期至、取消、改由」等明確修改原決定的內容，列為決策變更。
* 決策變更應盡量表示為「原決定 → 新決定」。
* 「候選、暫定、考慮、建議、可能、預計」不得視為正式決策。
* 如果兩個來源資訊不同，但無法確認哪一個才是目前有效版本，列入「衝突提醒」，不可自行選擇。
* 不可自行補不存在的人名、負責人、期限、日期、金額、進度或決策。
* 缺少的資訊標示「待確認」。
* 整理結果必須保留來源依據，並提醒重要資訊仍需人工確認。

【工作記憶】

每次取得新的工作紀錄時，不要只做單次摘要。

應判斷新資料與目前專案既有資訊的關係，辨識：

1. 新增資訊
2. 延續中的事項
3. 已完成事項
4. 新決策
5. 決策變更
6. 新待辦
7. 未決事項
8. 衝突或需要人工確認的資訊

重要日期、負責人、金額、客戶承諾、正式發布時程仍需人工確認。`
    },
    {
      id: '2',
      name: '專案主對話｜建立／更新跨來源工作記憶',
      tag: '日常主要使用',
      indexLabel: '02｜日常主要使用',
      placement: 'ChatGPT 網頁版 → Project → 專案主對話',
      purpose: '第一次建立完整跨來源工作記憶，之後沿用同一對話持續更新。',
      when: '第一次整合會議與 LINE 資料，或需要完整重跑指定日期範圍時。',
      notice: '第一次貼完整版；後續留在同一個專案主對話，使用卡片下方的簡短版即可。',
      followup: Object.freeze({
        name: '後續更新｜留在同一個主對話使用，不另開新對話',
        purpose: '第一次完整整理完成後，用這段短訊息更新下一個日期範圍。它不是新的編號 Prompt。',
        body: `請更新「＿＿＿＿專案」的工作記憶。

本次只處理 YYYY-MM-DD 至 YYYY-MM-DD 新增的工作紀錄。

沿用目前已確認的專案脈絡，重新取得這段期間的會議與 LINE 資料，辨識新增、完成、決策變更、待辦變更、未決與衝突，並依原本固定格式更新。`
      }),
      body: `請建立或更新「＿＿＿＿專案」的工作記憶。

本次整理日期範圍：
YYYY-MM-DD 至 YYYY-MM-DD

請沿用本對話目前已確認的專案脈絡，再處理本次新增資料；不要把每次更新當成完全獨立的新專案。

【第一步：取得資料】

如果使用進階資料來源：

1. 搜尋 Google Drive 指定日期範圍內的 Tactiq 會議紀錄。
2. 實際打開 Google Docs 並讀取完整逐字稿，不可只看檔名、摘要或搜尋片段。
3. 搜尋 Gmail 中日期範圍內、主旨包含 [LINE紀錄]，且與本專案相關的郵件。
4. 實際打開並讀取 Email 正文，不可只根據主旨判斷。

如果目前使用的是基礎版：

1. 讀取我提供的會議逐字稿。
2. 讀取我在本對話提供的 LINE TXT。
3. 確認檔案日期、群組與專案是否符合本次整理範圍。

開始分析前，先確認本次實際取得哪些來源。

「查無符合資料」與「無法存取來源」是兩件不同的事，必須分開說明。

【第二步：確認哪些資料屬於同一專案】

根據：

* 專案名稱
* 會議主題
* 群組名稱
* 參與者
* 具體工作事項
* 上下文

判斷資料是否屬於同一工作。

不可只因日期相同就把不同專案合併。

排除：

* 測試訊息
* Bot 測試
* 無關對話
* 日期範圍外資料
* 同一場會議的重複紀錄

【第三步：跨來源比較】

將會議資料視為「會議當下版本」。

將 LINE 資料視為「會後補充或後續更新」。

LINE 時間較晚不代表一定推翻會議決策。

只有語意明確表示修改時，才列為：

「原決定 → 新決定」

如果只是：

候選、暫定、考慮、建議、可能、預計

不得列為已確認決策。

如果來源互相矛盾，但無法確認哪個版本目前有效，列入「衝突提醒」。

【第四步：更新專案工作記憶】

請比較本次新資料與本對話目前已有的工作記憶。

辨識：

* 哪些是新資訊
* 哪些維持不變
* 哪些已完成
* 哪些決策被修改
* 哪些待辦新增或改期
* 哪些問題仍未解決

不要因為收到新資料，就把舊決策直接刪掉。

如果發生變更，保留變更關係。

【固定輸出】

## 30 秒摘要

## 已確認決策

列出決策與來源。

## 待辦事項

| 事項 | 負責人 | 期限 | 來源 | 目前進度 |
| -- | --- | -- | -- | ---- |

沒有資料的欄位寫「待確認」。

## 未決事項

## 決策變更

使用：

原決定 → 新決定

並標記來源。

## 衝突提醒

## 需要人工確認

## 本次實際讀取的資料

分成：

### Google Drive／會議來源

文件名稱、日期

### LINE／Gmail／TXT 來源

來源名稱、日期

## 本次排除的資料

列出資料與排除原因。

最後提醒：

「以上內容為 AI 根據目前可取得來源整理的工作記憶，重要日期、負責人、金額、客戶承諾與正式發布時程仍應人工確認。」`
    },
    {
      id: '3',
      name: '跨來源週期排程',
      tag: '進階篇完成後',
      indexLabel: '03｜進階篇完成後',
      placement: 'ChatGPT 網頁版 → Scheduled Task／排程',
      purpose: '定期檢查 Google Drive 會議逐字稿與 Gmail [LINE紀錄]，更新跨來源工作記憶。',
      when: '完整資料流與手動跨來源驗證都成功後，最後再建立。',
      notice: '先手動驗證成功，再自動化。每次執行都要依 Prompt 重新搜尋已連接的 Google Drive + Gmail；不能只因排程建立在 Project 裡，就假設一定能讀取 Project 檔案或 sources。',
      body: `檢查本次排程週期內新增的工作紀錄，並整理成可持續追蹤的跨來源工作記憶。

每次執行都要重新搜尋下列 Google Drive 與 Gmail 來源，實際開啟內容後再整理。不可沿用上次的搜尋結果，也不可只因這個排程建立在 Project 裡，就假設已取得 Project 上傳檔案或 Project sources。

【來源 1：Google Drive】

搜尋本次週期新增或屬於本次週期的 Tactiq／Google Meet 會議紀錄。

優先尋找你用來保存逐字稿的「會議原始紀錄」資料夾，以及明確屬於會議逐字稿的 Google Docs。

必須實際讀取完整逐字稿，不可只依文件名稱或搜尋摘要判斷。

Google Drive 的會議逐字稿視為：

「會議當下版本」。

【來源 2：Gmail】

搜尋本次週期內主旨包含：

[LINE紀錄]

的工作紀錄郵件。

必須實際讀取 Email 正文。

LINE 紀錄視為：

「會後補充或後續更新」。

【時間範圍】

如果系統可以辨識上一次成功執行時間：

使用「上一次成功執行後 → 本次執行時間」作為本次範圍。

如果無法可靠取得上一次成功執行時間：

請清楚寫出本次實際使用的搜尋日期／時間範圍，不可假裝已完成精準增量處理。

【來源狀態】

請明確區分：

1. 成功存取，但本週期查無符合資料。
2. 無法存取或沒有權限。

查無新資料不代表來源故障。

如果來源無法存取，必須明確說明，且不可宣稱已完成完整跨來源比對。

【專案分組】

先判斷每份會議與 LINE 紀錄屬於哪個：

* 專案
* 群組
* 工作主題

只有內容明確屬於同一工作時才能合併。

不要因為日期相同就把不同專案混在一起。

【版本判斷】

Google Drive 會議逐字稿 = 會議當下版本。

Gmail [LINE紀錄] = 會後補充或後續更新。

LINE 時間較晚，不代表一定修改會議決策。

只有「改為、延期至、取消、改由」等明確修改語意才列為決策變更。

格式：

原決定 → 新決定

「候選、暫定、考慮、建議、可能、預計」不得列為已確認決策。

來源衝突但無法判斷目前有效版本時，列為「衝突提醒」，不可猜測。

不可自行補不存在的人名、負責人、期限、日期、金額、進度或決策。

【每個專案輸出】

## 30 秒摘要

## 已確認決策

## 待辦事項

事項／負責人／期限／來源／目前進度

## 未決事項

## 決策變更

原決定 → 新決定／來源

## 衝突提醒

## 需要人工確認

## 本次實際讀取來源

### Google Drive

文件名稱／日期

### Gmail

郵件主旨／日期

## 排除資料

名稱／排除原因

如果本週期沒有任何新的有效工作紀錄，直接說明：

「本次週期沒有新的工作記憶需要更新。」

不要為了產生報告而重複整理舊資料。

重要資訊仍需人工確認，尤其是：

* 日期
* 負責人
* 金額
* 客戶承諾
* 正式發布時程`
    }
  ].map(prompt => Object.freeze(prompt));

  const tools = [
    {
      id: 'codex-vercel-rescue',
      name: 'Codex／Vercel 部署協助 Prompt',
      tag: '選用',
      placement: 'Codex',
      purpose: '正常 Vercel Drop 部署流程卡住時，協助檢查 README 與非敏感操作。',
      when: '只在第 5 章部署遇到問題時使用。',
      notice: '這是獨立的實作輔助工具，不是工作記憶主流程，也不是完成課程的必要步驟。',
      body: `我要部署課程提供的「LINE 訊息整理 Bot」專案。

請協助我依照課程 README 完成部署。

我的目標流程是：

Google Sheets
→ Google Service Account
→ Gmail App Password
→ LINE Messaging API
→ Vercel Drop
→ Environment Variables
→ Redeploy
→ LINE Webhook /callback
→ Verify
→ Bot 加入群組
→ 實際測試

請先閱讀專案中的 README.md，再開始操作。

重要規則：

1. 以 README.md 的課程流程為最高優先，不要自行改寫程式架構。

2. 一般課程部署不需要：
   - Git
   - GitHub
   - Vercel CLI
   - Python 本機環境
   - ngrok

3. 使用 Vercel Drop 部署課程提供的專案。

4. Vercel 需要設定的 Environment Variables 只有：
   LINE_CHANNEL_SECRET
   LINE_CHANNEL_ACCESS_TOKEN
   GMAIL_ADDRESS
   GMAIL_APP_PASSWORD
   GOOGLE_SHEET_ID
   GOOGLE_SERVICE_ACCOUNT_BASE64

5. 不要要求我把任何 Secret、Token、App Password 或 Service Account JSON 貼進聊天訊息。

6. 遇到需要輸入敏感資料的畫面時，請停下來告訴我應該填哪一個欄位，由我本人輸入。

7. 不要修改、刪除或重新產生我的 Secret、Token、Google 憑證或 Gmail App Password，除非我明確要求。

8. 每完成一個階段先檢查結果，再進入下一個階段。

9. 如果畫面與 README 不一致，先告訴我差異，不要自行猜測或進行破壞性操作。

如果目前環境支援 Computer Use，可以協助我操作瀏覽器完成非敏感步驟。

現在先檢查 README.md，告訴我第一個要完成的步驟，再開始。`
    }
  ].map(tool => Object.freeze(tool));

  window.COURSE_PROMPTS = Object.freeze(prompts);
  window.COURSE_PROMPT_TOOLS = Object.freeze(tools);

  if (typeof document === 'undefined') return;

  const byId = new Map(prompts.map(prompt => [prompt.id, prompt]));
  const toolById = new Map(tools.map(tool => [tool.id, tool]));

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function copyBlock(body, targetId, labelText, buttonText) {
    const copyCard = element('div', 'copy-card prompt-copy-card');
    const label = element('div', 'copy-label', labelText);
    const button = element('button', 'copy-button', buttonText);
    button.type = 'button';
    button.dataset.copyTarget = targetId;
    button.dataset.copySuccess = '已複製 ✓';
    const pre = element('pre');
    pre.id = targetId;
    pre.append(element('code', null, body));
    copyCard.append(label, button, pre);
    return copyCard;
  }

  function followupCard(prompt, context) {
    const followup = prompt.followup;
    const card = element('section', 'prompt-followup');
    card.id = `prompt-${prompt.id}-followup`;
    card.dataset.promptFollowupCard = prompt.id;
    card.append(
      element('p', 'prompt-kicker', '日常簡短用法｜不另編號'),
      element('h4', null, followup.name),
      element('p', null, followup.purpose),
      copyBlock(followup.body, `prompt-${context}-followup-${prompt.id}`, '後續更新簡短版', '複製簡短版')
    );
    return card;
  }

  function metaBlock(item) {
    const meta = element('dl', 'prompt-meta');
    for (const [label, value] of [
      ['用途', item.purpose],
      ['放置位置', item.placement],
      ['使用時機', item.when]
    ]) {
      const entry = element('div');
      entry.append(element('dt', null, label), element('dd', null, value));
      meta.append(entry);
    }
    return meta;
  }

  function promptCard(prompt, context) {
    const card = element('section', 'prompt-card');
    card.id = `prompt-${prompt.id}`;
    card.dataset.promptCard = prompt.id;

    const header = element('div', 'prompt-card-header');
    const titleWrap = element('div');
    titleWrap.append(element('p', 'prompt-kicker', `0${prompt.id}｜${prompt.tag}`));
    titleWrap.append(element('h3', null, prompt.name));
    header.append(titleWrap, element('span', 'badge prompt-badge', prompt.tag));
    card.append(header, metaBlock(prompt));

    if (prompt.notice) {
      const notice = element('p', 'prompt-notice');
      notice.append(element('strong', null, '重要：'), document.createTextNode(prompt.notice));
      card.append(notice);
    }

    card.append(copyBlock(prompt.body, `prompt-${context}-body-${prompt.id}`, '正式 Prompt 本文', '複製 Prompt'));
    if (prompt.followup) card.append(followupCard(prompt, context));
    return card;
  }

  function toolCard(tool, context) {
    const card = element('section', 'prompt-card prompt-tool-card');
    card.id = `tool-${tool.id}`;
    card.dataset.promptToolCard = tool.id;
    const header = element('div', 'prompt-card-header');
    const titleWrap = element('div');
    titleWrap.append(element('p', 'prompt-kicker', '實作輔助工具｜不屬於主流程'));
    titleWrap.append(element('h3', null, tool.name));
    header.append(titleWrap, element('span', 'badge prompt-badge', tool.tag));
    card.append(header, metaBlock(tool));
    const notice = element('p', 'prompt-notice');
    notice.append(element('strong', null, '重要：'), document.createTextNode(tool.notice));
    card.append(notice, copyBlock(tool.body, `prompt-${context}-tool-${tool.id}`, '選用工具 Prompt', '複製工具 Prompt'));
    return card;
  }

  document.querySelectorAll('[data-prompt-id]').forEach(container => {
    const prompt = byId.get(container.dataset.promptId);
    if (prompt) container.replaceChildren(promptCard(prompt, `chapter-${document.body.dataset.page || 'page'}`));
  });

  document.querySelectorAll('[data-prompt-followup]').forEach(container => {
    const prompt = byId.get(container.dataset.promptFollowup);
    if (prompt?.followup) container.replaceChildren(followupCard(prompt, `chapter-${document.body.dataset.page || 'page'}`));
  });

  document.querySelectorAll('[data-prompt-tool]').forEach(container => {
    const tool = toolById.get(container.dataset.promptTool);
    if (tool) container.replaceChildren(toolCard(tool, `chapter-${document.body.dataset.page || 'page'}`));
  });

  document.querySelectorAll('[data-prompt-index]').forEach(container => {
    const nav = element('nav', 'prompt-index');
    nav.setAttribute('aria-label', 'Prompt 快速索引');
    for (const prompt of prompts) {
      const link = element('a', 'prompt-index-link');
      link.href = `#prompt-${prompt.id}`;
      link.append(
        element('span', 'prompt-index-category', prompt.indexLabel),
        element('strong', null, prompt.name)
      );
      nav.append(link);
    }
    container.replaceChildren(nav);
  });

  document.querySelectorAll('[data-prompt-catalog]').forEach(container => {
    const fragment = document.createDocumentFragment();
    const main = element('section', 'prompt-group');
    main.append(element('h2', null, '三步主流程'));
    for (const prompt of prompts) main.append(promptCard(prompt, 'catalog'));
    fragment.append(main);

    const helper = element('section', 'prompt-group prompt-tool-group');
    helper.append(
      element('h2', null, '實作輔助工具'),
      element('p', null, '只有部署卡住時才使用；這一區不參與工作記憶的 01 → 02 → 03 主流程。')
    );
    for (const tool of tools) helper.append(toolCard(tool, 'catalog'));
    fragment.append(helper);
    container.replaceChildren(fragment);
  });
})();
