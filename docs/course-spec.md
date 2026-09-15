# 《一個人也能管好多專案》電子講義規格

## 依據與優先順序

1. 提供的正式 Python 執行程式實際行為
2. 課程正式版 README 流程
3. 現有電子講義內容

講義必須跟隨正式程式，不得把課程版改回 Node Bot 架構。

## 不可變更的課程核心

把「會議當下版本」與「LINE 會後更新」交給 ChatGPT，建立可追蹤的工作記憶。ChatGPT 是唯一負責理解、摘要、決策辨識、待辦、變更與衝突判斷的 AI；整理結果仍須人工確認。

## 正式資料流

- 會議：Google Meet → Tactiq 完整繁中逐字稿 → Automatic Workflow → Google Drive
- LINE：LINE 群組 → Flask Webhook → Vercel → Google Sheets → Gmail SMTP
- 整理：Google Drive + Gmail → ChatGPT → 工作記憶
- Bot 不呼叫 ChatGPT API，也不需要 ChatGPT API Key。

## Prompt 與對話合約

- Prompt 1「Project 固定指示」只在 Project instructions 設定一次。
- Prompt 2「專案主對話｜建立／更新跨來源工作記憶」第一次完整執行；後續更新留在同一對話，使用其下方不另編號的簡短版。
- Prompt 3「跨來源週期排程」只在進階篇手動驗證 Google Drive + Gmail 成功後建立。
- 舊的 LINE、Tactiq、合併、決策、待辦與 LINE-only 排程不保留獨立 Prompt 或隱藏別名。
- Codex／Vercel 部署協助屬於獨立實作輔助工具，不列入 Prompt 1、2、3。
- 排程不依賴 Project 中上傳或保存的檔案，也不承諾自動把結果寫回 Project；來源 App 不可用時回到專案主對話手動執行。

## 課程文案對照

網站主目錄維持 6 章、13 節與約 100 分鐘：

1. 取得會議原始資料（1-1、1-2，15 分鐘）
2. 建立 ChatGPT 整理環境（2-1、2-2，10 分鐘）
3. 建立跨來源工作記憶（3-1、3-2，15 分鐘）
4. 準備 LINE Bot 自動化環境（4-1、4-2、4-3，20 分鐘）
5. 部署 LINE Bot 至 Vercel（5-1、5-2，20 分鐘）
6. 多聊天室分流與完整測試（6-1、6-2，20 分鐘）

第 1–3 章為基礎篇，不要求寫程式；第 4–6 章為進階篇，提供可直接使用的 Python 課程正式版。

## LINE Bot 技術合約

課程正式版使用 Python、Flask、Vercel、gspread、Gmail SMTP 與 LINE Messaging API。

Webhook 是 POST /callback。工作表名稱與表頭固定為：

~~~text
groups
group_id	group_name	receiver_email

messages
webhook_event_id	message_id	group_id	user_id	display_name	message	created_at	sent
~~~

只建立表頭，不手動填群組資料或假資料。一般群組文字訊息寫入 messages；新的一般群組文字與相關群組控制指令都可能建立／更新 groups；receiver_email 必須由使用者透過 #設定信箱 設定。三個群組控制指令是：

~~~text
#設定信箱 <你的實際 Email>
#查看信箱
#寄出紀錄
~~~

控制指令不寫入 messages。新訊息 sent 為 FALSE；Email 成功後才改為 TRUE，失敗維持 FALSE。多群組只依 group_id 隔離，成功寄送後只標記該次快照的 message_id。

LINE 事件範圍依正式程式：群組文字訊息會寫入 messages；join / memberJoined 會觸發歡迎訊息，但事件本身不寫入 messages；私訊、room 與非文字訊息不在正式教材處理範圍。三個控制指令同樣不寫入 messages。

正式六個環境變數：

~~~text
LINE_CHANNEL_SECRET
LINE_CHANNEL_ACCESS_TOKEN
GMAIL_ADDRESS
GMAIL_APP_PASSWORD
GOOGLE_SHEET_ID
GOOGLE_SERVICE_ACCOUNT_BASE64
~~~

GMAIL_APP_PASSWORD 不是一般登入密碼，貼入前必須移除顯示用空格。GOOGLE_SHEET_ID 只填試算表網址 /d/ 與 /edit 之間的字串。Service Account JSON 不得上傳 GitHub、ZIP 或公開畫面。

## 課程部署合約

讀者以 https://vercel.com/drop 上傳 downloads/LINE訊息整理Bot_課程正式版.zip 或專案資料夾。ZIP 可以直接上傳，不必先解壓縮。第一次因缺少環境變數而失敗是預期狀況；Project 建立後填六個變數，再到 Deployments 對原 Project 執行 Redeploy，不重新 Drop ZIP。

一般課程操作不需要 Git、GitHub、Vercel CLI、Python、venv、pip、ngrok或本機 Flask。GitHub 只可出現在長期維護或電子講義 GitHub Pages 發布說明。

正式驗收證據是 Deployment Ready、LINE Verify Success、群組指令正確回覆、Sheets 正確資料與 Gmail 郵件。

## 教材行為

- Windows 為唯一主操作環境，不放 Mac 切換頁。
- 固定頂端列、桌面側邊目錄、手機抽屜目錄。
- 清楚標記必要、進階、已實測與注意。
- 每個實作包含目標、逐步操作、成功驗證、常見錯誤與完成勾選。
- 頁首保留快捷入口；切換網站的實際步驟旁再放一次相同按鈕。
- 外部按鈕使用既有 button-link 樣式、target="_blank" 與 rel="noopener"。
- 進度保存在瀏覽器；可搜尋章節與關鍵字。
- GitHub Pages 使用純 HTML、CSS、JavaScript，不依賴建置流程。

## 已實測與限制

- Tactiq Automatic → Meeting Processed → Google Drive 已實測可自動建立含完整 Transcript 的 Google Docs。
- 處理可能延遲，不承諾固定 10–15 分鐘。
- 手動 Run 是備援；自動仍等待時手動 Run 可能造成重複文件。
- LINE Bot 只接收加入後的新文字訊息，不補抓歷史。
- 不處理圖片、貼圖、影片、音訊、檔案、unsend 或 LINE 私訊。
- 若 SMTP 已成功送出、但 Sheets 的 sent 標記失敗，紀錄可能保持 FALSE，重試前必須先檢查收件匣與 Sheets，避免重複寄送。
- 免費方案、額度與平台畫面可能變更，以當下官方頁面為準。
- 不加入 Zoom AI、n8n、Make、Zapier、額外 API 或 ChatGPT API Key。
