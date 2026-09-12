# 《一個人也能管好多專案》電子講義規格

## 依據與優先順序

1. 提供的正式 Python 執行程式實際行為
2. 正式學生版 README 流程
3. 現有電子講義內容

講義必須跟隨正式程式，不得把學生版改回 Node Bot 架構。

## 不可變更的課程核心

把「會議當下版本」與「LINE 會後更新」交給 ChatGPT，建立可追蹤的工作記憶。ChatGPT 是唯一負責理解、摘要、決策辨識、待辦、變更與衝突判斷的 AI；整理結果仍須人工確認。

## 正式資料流

- 會議：Google Meet → Tactiq 完整繁中逐字稿 → Automatic Workflow → Google Drive
- LINE：LINE 群組 → Flask Webhook → Vercel → Google Sheets → Gmail SMTP
- 整理：Google Drive + Gmail → ChatGPT → 工作記憶
- Bot 不呼叫 ChatGPT API，也不需要 ChatGPT API Key。

## 課程文案對照

網站主目錄維持 6 章、13 節與約 100 分鐘：

1. 取得會議原始資料（1-1、1-2，15 分鐘）
2. 建立 ChatGPT 整理環境（2-1、2-2，10 分鐘）
3. 建立跨來源工作記憶（3-1、3-2，15 分鐘）
4. 準備 LINE Bot 自動化環境（4-1、4-2、4-3，20 分鐘）
5. 部署 LINE Bot 至 Vercel（5-1、5-2，20 分鐘）
6. 多聊天室分流與完整測試（6-1、6-2，20 分鐘）

第 1–3 章為基礎篇，不要求寫程式；第 4–6 章為進階篇，提供可直接使用的 Python 正式學生版。

## LINE Bot 技術合約

正式學生版使用 Python、Flask、Vercel、gspread、Gmail SMTP 與 LINE Messaging API。

Webhook 是 POST /callback。工作表名稱與表頭固定為：

~~~text
groups
group_id	group_name	receiver_email

messages
webhook_event_id	message_id	group_id	user_id	display_name	message	created_at	sent
~~~

只建立表頭，不手動填群組資料或假資料。Bot 會自動取得群組 ID、群組、收件信箱與一般文字訊息。三個群組控制指令是：

~~~text
#設定信箱 example@gmail.com
#查看信箱
#寄出紀錄
~~~

控制指令不寫入 messages。新訊息 sent 為 FALSE；Email 成功後才改為 TRUE，失敗維持 FALSE。多群組只依 group_id 隔離，成功寄送後只標記該次快照的 message_id。

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

## 學生部署合約

學生以 Vercel Drop 上傳 downloads/LINE訊息整理Bot_課程正式版.zip 或解壓後的專案資料夾。第一次因缺少環境變數而失敗是預期狀況；Project 建立後填六個變數，再到 Deployments 執行 Redeploy。

一般學生不需要 Git、GitHub、Vercel CLI、Python、venv、pip、ngrok或本機 Flask。GitHub 只可出現在講師長期維護或電子講義 GitHub Pages 發布說明。

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
- 免費方案、額度與平台畫面可能變更，以當下官方頁面為準。
- 不加入 Zoom AI、n8n、Make、Zapier、額外 API 或 ChatGPT API Key。
