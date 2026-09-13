(function () {
  'use strict';

  const prompts = [
    {
      id: '0',
      name: 'Project 固定指示',
      category: '初始化設定',
      section: '初始化設定',
      indexLabel: '初始化設定',
      placement: 'ChatGPT Project → Project settings → Instructions',
      purpose: '建立專案共用的資料版本、決策判斷與人工確認規則。',
      when: '第一次建立 ChatGPT Project、設定 Project Instructions 時。',
      body: `你是我的專案工作記憶整理助理。
Google Drive 的 Tactiq 完整逐字稿代表「會議當下版本」；LINE 紀錄代表「會後補充或後續更新」。
只有語意明確表示修改時，才列為決策變更；時間較晚不等於一定推翻會議。
候選、暫定、考慮、建議、可能、預計不得視為正式決策。
不可自行補不存在的人名、期限、日期、金額或決策；缺少就列為待確認。
整理結果必須區分來源，並由使用者人工確認。`
    },
    {
      id: '1',
      name: 'LINE 紀錄整理',
      category: 'ChatGPT 工作 Prompt',
      section: 'ChatGPT 工作 Prompt',
      indexLabel: 'LINE 整理',
      placement: 'ChatGPT Project → 一般對話',
      purpose: '針對手動匯出的 LINE TXT，或 Gmail 中由 LINE Bot 寄送的 LINE 工作紀錄進行單一來源整理。',
      when: '只有 LINE 訊息需要先整理，尚未需要與 Tactiq 會議紀錄合併時。',
      body: `請整理這次的 LINE 工作紀錄。

只處理我本次提供或指定日期範圍內的 LINE 對話，不要混入其他日期或其他專案的內容。

如果我上傳的是 LINE TXT，請直接讀取檔案內容。

如果我指定從 Gmail 取得資料，請搜尋主旨包含 [LINE紀錄] 的相關郵件，並依照主旨中的聊天室名稱與日期辨識來源。

請整理成：

## 30 秒摘要

## 已確認決策

## 待辦事項
| 事項 | 負責人 | 期限 | 狀態 |

## 未決事項

## 決策變更

## 衝突提醒

## 需要人工確認

不要把討論中的候選方案當成正式決策。
沒有負責人或期限時請標示「未指定」，不要自行補上。`
    },
    {
      id: '2',
      name: 'Tactiq 會議整理',
      category: 'ChatGPT 工作 Prompt',
      section: 'ChatGPT 工作 Prompt',
      indexLabel: '會議整理',
      placement: 'ChatGPT Project → 一般對話',
      purpose: '讓 ChatGPT 從 Google Drive 讀取 Tactiq 完整會議 Transcript，整理會議當下的決策、待辦與未決事項。',
      when: 'Tactiq 已將會議逐字稿儲存至 Google Drive，要單獨整理這場會議時。',
      body: `請整理指定的 Tactiq 會議逐字稿。

請到 Google Drive 中尋找我本次指定日期與會議的 Tactiq Transcript。

優先使用指定的 Tactiq 會議紀錄資料夾。

找到文件後，請實際讀取完整逐字稿，不要只根據：
- 文件名稱
- Google Drive 搜尋結果摘要
- Tactiq 連結
來判斷內容。

本次只整理我指定日期與會議的資料，不要混入其他會議。

請輸出：

## 30 秒摘要

## 已確認決策

## 待辦事項
| 事項 | 負責人 | 期限 |

## 未決事項

## 需要人工確認

如果會議中只是提出候選日期、建議方案或尚未確認的做法，不要列為已確認決策。

如果逐字稿沒有明確提供負責人或期限，請標示「未指定」或「待確認」，不要自行推測。`
    },
    {
      id: '3',
      name: '跨來源工作記憶',
      category: 'ChatGPT 工作 Prompt',
      section: 'ChatGPT 工作 Prompt',
      indexLabel: '跨來源整合',
      placement: 'ChatGPT Project → 一般對話',
      purpose: '合併 Tactiq 會議紀錄與 LINE 後續討論，建立可追蹤且能回查來源的工作記憶。',
      when: '需要同時核對會議當下版本與會後更新時。',
      badge: '核心 Prompt',
      body: `請建立「＿＿＿＿專案」的跨來源工作記憶，日期範圍為 YYYY-MM-DD 至 YYYY-MM-DD。

【資料取得】
1. 搜尋 Google Drive 中日期範圍內、位於「會議原始紀錄」資料夾的 Tactiq 會議文件。
2. 必須實際打開 Google Docs 並讀取【完整逐字稿】內容，不可只看檔名、摘要或搜尋片段。
3. 搜尋 Gmail 中主旨含有 [LINE紀錄]、屬於本專案或相關群組、且在日期範圍內的郵件。
4. 必須實際打開並讀取 Email 正文，不可只看主旨或搜尋片段。
5. 先列出兩邊實際讀到的資料；如果 Google Drive 或 Gmail 任一來源無法存取，直接說明並停止跨來源結論，不可以假裝已完成跨來源整理。

【合併範圍】
- 從專案名稱、主題、參與者與具體事項判斷是否屬於同一工作；不可因日期相同就強行合併不同專案。
- 辨識同一場會議的重複文件，只保留一份，不要當成不同會議。
- 排除測試訊息、機器人測試、無關對話與不屬於日期範圍的資料。

【版本規則】
- Google Drive 的 Tactiq Transcript 是「會議當下版本」。
- Gmail 的 [LINE紀錄] 是「會後補充或後續更新」。
- LINE 時間較晚不代表一定推翻會議決策，必須從語意確認是否真的修改。
- 只有「改為、延期至、取消、改由」等明確修改才列為決策變更；逐項標明原決定、新決定、原來源與新來源。
- 若資訊衝突但無法確認哪個版本有效，列為衝突提醒，不可猜測。
- 候選、暫定、考慮、建議、可能、預計不得視為正式決策。
- 不可自行補人名、負責人、期限、日期、金額或決策；來源沒有就標示待確認。

【固定輸出】
1. 30 秒摘要
2. 已確認決策（決策／來源／日期）
3. 待辦事項（事項／負責人／期限／來源／目前進度）
4. 未決事項
5. 決策變更（原決定／新決定／原來源／新來源）
6. 衝突提醒
7. 需要人工確認
8. 本次實際讀取的 Google Drive 資料（文件名稱／日期）
9. 本次實際讀取的 Gmail 資料（郵件主旨／日期）
10. 排除的資料（名稱／排除原因）

完成後請提醒我：以上內容仍需人工確認，尤其是日期、負責人、金額與對外承諾。`
    },
    {
      id: '4',
      name: '最新有效決策辨識',
      category: 'ChatGPT 工作 Prompt',
      section: 'ChatGPT 工作 Prompt',
      indexLabel: '決策追蹤',
      placement: 'ChatGPT Project → 一般對話',
      purpose: '從專案紀錄中找出目前真正有效的決策，辨識哪些舊決策已被後續內容取代。',
      when: '同一事項經過多次討論或修改，需要確認「現在到底以哪個版本為準」時。',
      body: `請根據目前這個專案中指定範圍的資料，幫我檢查「現在仍然有效的決策」。

請特別檢查：

1. 原本決定了什麼。
2. 後續是否出現明確修改。
3. 哪些舊決定已被取代。
4. 哪些只是候選或建議。
5. 哪些目前仍無法確認。
6. 是否存在不同來源互相矛盾的資訊。

請輸出：

## 目前有效決策

| 項目 | 目前有效版本 | 來源 | 日期 |

## 已被取代的舊決策

| 項目 | 舊版本 | 新版本 | 變更依據 |

## 尚未定案

## 衝突提醒

請優先依據明確的後續確認內容判斷。

如果沒有足夠證據證明某個版本已成為正式決策，就標示「待確認」，不要自行選一個答案。`
    },
    {
      id: '5',
      name: '待辦與專案進度整理',
      category: 'ChatGPT 工作 Prompt',
      section: 'ChatGPT 工作 Prompt',
      indexLabel: '專案追蹤',
      placement: 'ChatGPT Project → 一般對話',
      purpose: '將目前專案內容轉成可以實際追蹤的待辦、期限、進度與卡關事項。',
      when: '需要查看目前有哪些事情還沒完成，以及下一步應追蹤什麼時。',
      body: `請根據目前指定的專案資料，整理最新的待辦事項與專案進度。

請區分：

- 尚未完成
- 已完成
- 已逾期
- 狀態不明
- 等待他人處理
- 需要確認

不要因為截止日期已經過了，就自行判斷任務一定逾期。
只有在資料能確認尚未完成時，才標示為逾期。

請輸出：

## 專案目前進度

## 尚未完成待辦

| 事項 | 負責人 | 期限 | 狀態 | 來源 |

## 已完成

## 已逾期

## 狀態不明

## 卡關事項

## 下一步建議確認事項

如果沒有足夠資料判斷負責人、期限或完成狀態，請直接標示「待確認」，不要自行推測。`
    },
    {
      id: '6',
      name: '每日工作記憶自動整理',
      category: 'ChatGPT 排程 Prompt',
      section: 'ChatGPT 工作 Prompt',
      indexLabel: '自動化',
      placement: 'ChatGPT Scheduled Task／排程',
      purpose: '每天自動檢查 Gmail 中新產生的 LINE 工作紀錄，整理當日決策、待辦、變更與明日需要追蹤的事項。',
      when: '完成 LINE Bot → Gmail 流程後，想讓 ChatGPT 每天自動整理工作紀錄時。',
      notice: '請建立成 ChatGPT 排程，不是放進 Project Instructions，也不是每天手動貼上。',
      body: `每天整理一次我的 LINE 工作記憶。

請檢查已連接 Gmail 中「今天新增」的 LINE 工作紀錄郵件。

主要資料來源：

主旨包含 [LINE紀錄] 的郵件。

常見主旨格式：
[LINE紀錄][聊天室名稱] YYYY-MM-DD

請優先利用主旨中的聊天室名稱辨識來源。

只處理今天的紀錄，不要混入其他日期的舊郵件。

如果今天有多封 [LINE紀錄] 郵件，先判斷它們分別屬於哪個聊天室或工作主題。

只有內容明確屬於同一工作主題時才合併。
不要因為出現相同人名，就自行判斷為同一專案。

對每個工作主題分別輸出：

## 今日摘要

## 今日新增決策

## 待辦事項
| 事項 | 負責人 | 期限 | 狀態 |

## 決策變更

## 未決事項

## 衝突提醒

## 明天需要追蹤

## 需要人工確認

整理規則：

- 不要自行補不存在的人名、期限或決策。
- 「討論、建議、考慮、預計、候選、暫定」不得直接視為正式決策。
- 如果今天的 LINE 紀錄明確修改先前決定，列入「決策變更」。
- 如果資訊不足，直接標示「待確認」。
- 如果今天沒有找到符合條件的新 LINE 紀錄，直接說明「今天沒有找到新的 LINE 工作紀錄」，不要拿舊郵件補充。`
    },
    {
      id: '7',
      name: 'Codex Vercel 部署救援 Prompt',
      category: '加贈工具 Prompt',
      section: '加贈工具 Prompt',
      indexLabel: '部署救援',
      placement: 'Codex',
      purpose: '學生按照課程影片與 README 部署 LINE 訊息整理 Bot 時，如果卡住，可以使用 Codex 協助檢查並完成非敏感操作。',
      when: '正常 Vercel Drop 部署流程遇到問題時才使用。',
      badge: '加贈工具 Prompt',
      notice: '這是選用的部署救援工具，不是完成課程的必要步驟。',
      body: `我要部署老師提供的「LINE 訊息整理 Bot」課程專案。

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

3. 使用 Vercel Drop 部署老師提供的專案。

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
  ].map(prompt => Object.freeze(prompt));

  window.COURSE_PROMPTS = Object.freeze(prompts);

  if (typeof document === 'undefined') return;

  const byId = new Map(prompts.map(prompt => [prompt.id, prompt]));

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function promptCard(prompt, context) {
    const card = element('section', 'prompt-card');
    card.id = `prompt-${prompt.id}`;
    card.dataset.promptCard = prompt.id;

    const header = element('div', 'prompt-card-header');
    const titleWrap = element('div');
    titleWrap.append(element('p', 'prompt-kicker', `Prompt ${prompt.id}｜${prompt.category}`));
    titleWrap.append(element('h3', null, prompt.name));
    header.append(titleWrap);
    if (prompt.badge) header.append(element('span', 'badge prompt-badge', prompt.badge));
    card.append(header);

    const meta = element('dl', 'prompt-meta');
    for (const [label, value] of [
      ['用途', prompt.purpose],
      ['放置位置', prompt.placement],
      ['使用時機', prompt.when]
    ]) {
      const item = element('div');
      item.append(element('dt', null, label), element('dd', null, value));
      meta.append(item);
    }
    card.append(meta);

    if (prompt.notice) {
      const notice = element('p', 'prompt-notice');
      notice.append(element('strong', null, '重要：'), document.createTextNode(prompt.notice));
      card.append(notice);
    }

    const copyCard = element('div', 'copy-card prompt-copy-card');
    const label = element('div', 'copy-label', '正式 Prompt 本文');
    const button = element('button', 'copy-button', '複製 Prompt');
    const targetId = `prompt-${context}-body-${prompt.id}`;
    button.type = 'button';
    button.dataset.copyTarget = targetId;
    button.dataset.copySuccess = '已複製 ✓';
    const pre = element('pre');
    pre.id = targetId;
    pre.append(element('code', null, prompt.body));
    copyCard.append(label, button, pre);
    card.append(copyCard);
    return card;
  }

  document.querySelectorAll('[data-prompt-id]').forEach(container => {
    const prompt = byId.get(container.dataset.promptId);
    if (prompt) container.replaceChildren(promptCard(prompt, `chapter-${document.body.dataset.page || 'page'}`));
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
    for (const sectionName of ['初始化設定', 'ChatGPT 工作 Prompt', '加贈工具 Prompt']) {
      const section = element('section', 'prompt-group');
      section.append(element('h2', null, sectionName));
      for (const prompt of prompts.filter(item => item.section === sectionName)) {
        section.append(promptCard(prompt, 'catalog'));
      }
      fragment.append(section);
    }
    container.replaceChildren(fragment);
  });
})();
