# Python LINE Bot Handbook Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將電子講義、學生下載範例、測試與 ZIP 一次同步到指定的 Python LINE Bot 正式學生版。

**Architecture:** GitHub Pages 電子講義繼續使用純 HTML、CSS 與原生 JavaScript；LINE Bot 下載範例完整改為 Flask、Vercel、gspread、Gmail SMTP 與 LINE Messaging API。內容測試鎖定學生流程與禁止舊版名詞，Python 單元測試直接驗證附件程式的執行合約，ZIP 由已驗證的 starter 根目錄建立。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js 內建測試、Python、Flask、pytest、gspread、Gmail SMTP、LINE Messaging API、Vercel。

**Spec:** `docs/course-spec.md` 與本次使用者提供的正式學生版 Python 檔案

## Global Constraints

- 保留 6 章、13 節、約 100 分鐘、首頁結構、視覺風格與上一節／下一節導覽。
- 第 1～3 章 Meet、Tactiq、Drive、Gmail、ChatGPT 主線不任意改寫。
- 正式學生版只有六個環境變數：`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`、`GMAIL_ADDRESS`、`GMAIL_APP_PASSWORD`、`GOOGLE_SHEET_ID`、`GOOGLE_SERVICE_ACCOUNT_BASE64`。
- Google Sheets 工作表只能是 `groups` 與 `messages`，表頭和順序必須完全符合 Python 的 `GROUP_HEADERS` 與 `MESSAGE_HEADERS`。
- Webhook 固定為 POST `/callback`；三個控制指令固定為 `#設定信箱`、`#查看信箱`、`#寄出紀錄`，且不寫入 `messages`。
- `sent` 新訊息為 `FALSE`，Email 成功後才為 `TRUE`，失敗時維持 `FALSE`。
- 學生主線使用 Vercel Drop，不要求 Git、GitHub、Vercel CLI、Python、venv、pip、ngrok 或本機 Flask。
- `downloads/line-bot-starter/` 的正式 Python 執行邏輯直接取自提供附件，不做功能擴充。
- ZIP 根目錄直接包含 14 個正式檔案，不包含 `.env`、憑證、Service Account JSON、`.venv`、`__pycache__`、`.git` 或暫存檔。
- GitHub Pages 電子講義本身的發布說明保留；只有學生部署 Bot 的 GitHub 必要流程要移除。

---

### Task 1: Lock the Python student contract with failing tests

**Files:**
- Modify: `tests/content.spec.js`
- Modify: `tests/static-site.spec.js`
- Create: `downloads/line-bot-starter/tests/test_config.py`
- Create: `downloads/line-bot-starter/tests/test_webhook.py`
- Create: `downloads/line-bot-starter/tests/test_message_service.py`
- Create: `downloads/line-bot-starter/tests/test_sheets_store.py`

**Interfaces:**
- Consumes: 使用者提供的學生技術合約與現有網站結構。
- Produces: 能阻擋舊 Node.js 流程、錯誤 schema、錯誤下載連結與 Python 行為退化的可執行合約。

- [x] **Step 1: Add content-contract assertions**

  在 `tests/content.spec.js` 檢查第 4～6 章、排錯中心、starter 與同步文件不得把 `rooms`、`/api/webhook`、舊指令、舊環境變數、Node Bot 檔案與 Nodemailer 當成正式流程；同時要求兩張 snake_case 表頭、`/callback`、三個正式指令、六個變數、Vercel Drop、`FALSE → TRUE`、步驟內快捷按鈕與 ZIP 下載連結。

- [x] **Step 2: Add ZIP/local-link assertions**

  在 `tests/static-site.spec.js` 要求 `downloads/LINE訊息整理Bot_課程正式版.zip` 存在，並繼續驗證所有本地連結與 copy target。

- [x] **Step 3: Add Python behavior tests**

  測試 `REQUIRED_VARIABLES`、LINE HMAC signature、三個控制指令、控制指令不寫入 messages、`webhookEventId` 去重、`group_id` 隔離、Email 成敗的 sent 狀態、成功只標記快照內的 `message_id`、`[LINE紀錄][群組名稱] YYYY-MM-DD` 主旨，以及兩組 schema 常數。

- [x] **Step 4: Run tests and verify RED**

  Run: `node --test tests/content.spec.js tests/static-site.spec.js`

  Expected: FAIL，原因是網站仍含舊 Node.js 學生流程且 ZIP 尚不存在。

  Run: `python -m pytest downloads/line-bot-starter/tests -q -p no:cacheprovider`

  Expected: FAIL，原因是正式 Python 模組尚未放入 starter。

### Task 2: Replace the starter and build the ZIP

**Files:**
- Delete: `downloads/line-bot-starter/api/webhook.js`
- Delete: `downloads/line-bot-starter/lib/*.js`
- Delete: `downloads/line-bot-starter/package.json`
- Delete: `downloads/line-bot-starter/package-lock.json`
- Delete: `downloads/line-bot-starter/tests/core.test.js`
- Create: `downloads/line-bot-starter/{app.py,config.py,email_service.py,index.py,line_client.py,line_utils.py,main.py,message_service.py,sheets_store.py,requirements.txt,vercel.json,.env.example,.gitignore,README.md}`
- Create: `downloads/LINE訊息整理Bot_課程正式版.zip`

**Interfaces:**
- Consumes: 14 個已核對存在的正式附件檔案。
- Produces: 可由 Vercel Drop 上傳的 Python starter 與無多餘頂層資料夾的 ZIP。

- [x] **Step 1: Remove only the old Node Bot files**

  使用明確檔案路徑刪除 `api/webhook.js`、四個 `lib/*.js`、兩個 package 檔與 `tests/core.test.js`，保留 Task 1 新增的 Python tests。

- [x] **Step 2: Copy the formal Python files without rewriting runtime behavior**

  將附件的 14 個檔案逐一加入 starter；來源 `README.md` 對應目的 `README.md`，保留 `.env.example` 與 `.gitignore`。

- [x] **Step 3: Run Python tests and verify GREEN**

  Run: `python -m pytest downloads/line-bot-starter/tests -q -p no:cacheprovider`

  Expected: 全部通過，且 production Python 與附件逐檔雜湊一致。

- [x] **Step 4: Build and inspect the ZIP**

  由 starter 根目錄加入 14 個正式檔案，排除 `tests` 與所有秘密／快取／環境資料；列出 archive entries 並確認沒有額外頂層資料夾。

### Task 3: Align chapters, troubleshooting, shortcuts, and documentation

**Files:**
- Modify: `chapters/01-02.html`
- Modify: `chapters/02-01.html`
- Modify: `chapters/04-01.html`
- Modify: `chapters/04-02.html`
- Modify: `chapters/04-03.html`
- Modify: `chapters/05-01.html`
- Modify: `chapters/05-02.html`
- Modify: `chapters/06-01.html`
- Modify: `chapters/06-02.html`
- Modify: `appendices/troubleshooting.html`
- Modify: `README.md`
- Modify: `docs/course-spec.md`
- Modify: `assets/app.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: Task 1 content contract與 Task 2 正式 starter/ZIP。
- Produces: 所有學生頁面、排錯與專案文件使用同一份 Python 技術合約。

- [x] **Step 1: Align chapters 4 and 5**

  4-1 改為 Flask/Vercel/gspread/Gmail 流程；4-2 在實際登入與回覆設定步驟各放官方快捷按鈕；4-3 依 `groups` 再 `messages` 順序提供可複製 Tab 表頭與安全提醒；5-1 改為正式 ZIP、Vercel Drop、六個變數與 Redeploy；5-2 改為 `/callback` 與正式群組驗收。

- [x] **Step 2: Align chapter 6 and troubleshooting**

  6-1 以兩群分別 `#設定信箱`／`#查看信箱`／`#寄出紀錄` 驗證隔離；6-2 保留指定跨來源案例並改用 `group_id`、`message`、`sent = TRUE`；排錯中心補齊 LINE Verify、Sheets、Gmail 與多群組檢查。

- [x] **Step 3: Add step-local shortcuts without changing CSS or navigation**

  在 01-02 安裝 Tactiq、建立 Meet、開 Tactiq、建立 Drive 的對應 `<li>`；02-01 ChatGPT、Drive、Gmail 的對應 `<li>`；04-02、04-03、05-01、05-02 的對應操作 `<li>` 內加入既有 `button-link` 樣式、`target="_blank"` 與 `rel="noopener"`，每一入口最多頁首一次加步驟一次。

- [x] **Step 4: Synchronize README, course spec, plan, and search metadata**

  保留 GitHub Pages 發布說明；將 Bot 技術棧、schema、Vercel Drop、六個變數、控制指令與下載／測試命令寫入文件，將 `assets/app.js` 的第 4～6 章搜尋文字改為 snake_case 與正式指令。

- [x] **Step 5: Run focused Node tests and verify GREEN**

  Run: `node --test tests/content.spec.js tests/static-site.spec.js`

  Expected: 全部通過。

### Task 4: Verify, review, commit, push, and validate Pages

**Files:**
- Verify: all tracked files and `downloads/LINE訊息整理Bot_課程正式版.zip`

**Interfaces:**
- Consumes: 完成的網站、starter、ZIP 與測試。
- Produces: 可重現的驗證證據、指定 Git commit、`origin/main` 推送與公開 Pages 驗收。

- [x] **Step 1: Run the complete local verification matrix**

  執行 Node 指定測試、Playwright（可用時）、Python 語法檢查、完整 pytest、`pip check`、全站本地連結檢查、ZIP entry/雜湊檢查、敏感資料掃描、舊關鍵字人工分類與 `git diff --check`。

- [x] **Step 2: Render and inspect desktop/mobile pages**

  以 1440×900 與 390×844 檢查 4-3、5-1、5-2；實際點擊新的 copy buttons，並檢查所有頁面水平 overflow。

- [x] **Step 3: Request independent code review**

  比較基準 `3702d67` 到目前工作樹，修正 reviewer 指出的 Critical／Important 問題後重跑受影響驗證。

- [ ] **Step 4: Commit and push only scoped files**

  再核對 repo、remote、branch、status 與 staged diff；使用 commit message `fix: align handbook with tested Python LINE Bot`，推送至 `origin/main`，禁止 force push，記錄 commit SHA。

- [ ] **Step 5: Verify GitHub Pages and public ZIP**

  等待 Pages/Actions 成功或明確失敗；使用帶 commit SHA 的查詢參數檢查首頁、4-3、5-1、5-2、6-1、快捷按鈕、公開 ZIP HTTP 狀態與 390px 無水平捲動。
