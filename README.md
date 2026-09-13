# 《一個人也能管好多專案》電子講義

Windows 操作為主的純靜態教學網站：6 章、13 節、約 100 分鐘；基礎篇 40 分鐘、進階篇 60 分鐘。

## 正式資料流

- 會議：Google Meet → Tactiq → Google Drive → ChatGPT
- LINE：LINE 群組 → Flask Webhook → Vercel → Google Sheets → Gmail SMTP → ChatGPT
- LINE Bot 技術棧：Python、Flask、Vercel、gspread、Gmail SMTP、LINE Messaging API
- ChatGPT 是唯一負責摘要、決策、待辦、變更與衝突判斷的 AI；Bot 不呼叫 ChatGPT API。

## 學生下載

- 正式部署 ZIP：downloads/LINE訊息整理Bot_課程正式版.zip
- 可閱讀原始檔：downloads/line-bot-starter/
- ZIP 根目錄直接包含 14 個正式檔案，不多包一層資料夾。
- ZIP 與 starter 不含真實 .env、Service Account JSON、Token、密碼或 Gmail 憑證。

學生從 https://vercel.com/drop 直接上傳 ZIP 或 folder，不需要先解壓縮。第一次 Drop 建立 Project 後，在原 Project 設定六個變數並 Redeploy；不要重新 Drop ZIP。一般學生不需要 Git、GitHub、Vercel CLI、Python、venv、pip、ngrok或本機啟動 Flask。

正式環境變數只有六個：

~~~text
LINE_CHANNEL_SECRET
LINE_CHANNEL_ACCESS_TOKEN
GMAIL_ADDRESS
GMAIL_APP_PASSWORD
GOOGLE_SHEET_ID
GOOGLE_SERVICE_ACCOUNT_BASE64
~~~

Google Sheets 固定使用：

~~~text
groups
group_id	group_name	receiver_email

messages
webhook_event_id	message_id	group_id	user_id	display_name	message	created_at	sent
~~~

Webhook 使用 /callback；群組控制指令為 #設定信箱、#查看信箱、#寄出紀錄。群組新文字寫入 messages；join／memberJoined 只回覆歡迎訊息；私訊、room 與非文字不在正式流程。新訊息 sent 是 FALSE，Email 成功後才改為 TRUE。

## 本機開啟講義

最簡單：直接雙擊 index.html。若瀏覽器限制剪貼簿功能，可在此資料夾開啟 PowerShell：

~~~powershell
python -m http.server 8000
~~~

再開啟 http://localhost:8000/。

## 發布到 GitHub Pages

這一節只描述電子講義網站的發布，與學生部署 LINE Bot 的 Vercel Drop 流程不同。

1. 在 GitHub 建立新的 Repository。
2. 上傳本資料夾內全部網站檔案，index.html 必須位於 Repository 根目錄。
3. Repository → Settings → Pages。
4. Build and deployment 的 Source 選 Deploy from a branch。
5. Branch 選 main、資料夾選 /(root)，按 Save。
6. 等待 GitHub 顯示公開網址後，從首頁逐一檢查章節、快捷按鈕與 ZIP 下載。

## 維護者測試

~~~powershell
node --test tests/content.spec.js tests/static-site.spec.js
node --test tests/site.spec.js
.\.venv\Scripts\python.exe -m pytest downloads\line-bot-starter\tests -q -p no:cacheprovider
.\.venv\Scripts\python.exe -m pip check
~~~

Playwright 可用時，site.spec.js 會驗證桌面版、390px 手機版與 Copy 按鈕。
