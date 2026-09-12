# LINE 訊息整理 Bot

這是老師 Demo 與學生正式實作共同使用的唯一課程版本。老師與學生使用完全相同的程式、相同 ZIP、相同 Google Sheets schema，以及相同 Vercel Drop 部署流程；彼此只會填入不同帳號與憑證。

Bot 的工作很單純：保存加入 LINE 群組後收到的新文字訊息，並在群組輸入指令後，將尚未寄送的紀錄放在 Email 正文寄出。

```text
LINE 群組
↓
Flask Webhook
↓
Vercel
↓
Google Sheets
↓
Gmail SMTP
↓
Email
↓
使用者自行交給 ChatGPT 整理
```

ChatGPT 是後續由使用者從 Gmail 取得紀錄後自行使用；本 Bot 不會呼叫 ChatGPT API，也不需要相關 API Key。

## 學生最短流程

```text
建立 Google Sheet
↓
建立 Google Service Account
↓
Sheet 分享給 client_email
↓
Service Account JSON → Base64
↓
建立 Gmail App Password
↓
建立 LINE Messaging API Bot
↓
使用 Vercel Drop 上傳老師提供的 ZIP
↓
填六個 Environment Variables
↓
Redeploy
↓
LINE Developers 設定 /callback
↓
Bot 加入群組
↓
#設定信箱
↓
正常聊天
↓
#寄出紀錄
```

一般學生不需要 Git、GitHub、Vercel CLI、Python、venv、pip、在本機啟動 Flask或 ngrok。

## 一、建立 Google Sheet

建立一份 Google 試算表，並在同一份檔案中建立兩個工作表。工作表名稱、第一列表頭與欄位順序必須完全一致。

### groups

```text
group_id | group_name | receiver_email
```

### messages

```text
webhook_event_id | message_id | group_id | user_id | display_name | message | created_at | sent
```

只建立表頭，不需要先輸入資料。

- `group_id`：隔離不同 LINE 群組，絕對不能用群組名稱代替。
- `webhook_event_id`：避免相同 LINE Webhook redelivery 被重複處理。
- `message_id`：保存 LINE 文字訊息的原始 ID；舊事件沒有 `webhookEventId` 時也作為去重後備。
- `user_id`：LINE 沒有提供時存成空字串。
- `display_name`：無法取得時存成「LINE 使用者」。
- `created_at`：使用 LINE event timestamp，轉成 Asia/Taipei 時間。
- `sent`：新訊息是 `FALSE`；Email 成功寄出後才改成 `TRUE`。

Google Sheet 網址通常如下：

```text
https://docs.google.com/spreadsheets/d/這一段就是_GOOGLE_SHEET_ID/edit
```

## 二、建立 Google Service Account

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)。
2. 建立或選擇一個 Google Cloud Project。
3. 啟用 Google Sheets API。
4. 建立 Service Account。
5. 為 Service Account 建立並下載 JSON Key。
6. 用記事本打開 JSON，找到 `client_email`。
7. 回到 Google Sheet，按「共用」。
8. 將 JSON 裡的 `client_email` 加入，權限設成「編輯者」。

Service Account JSON 是敏感憑證：

- 不得放進提供學生或上傳 Vercel 的 ZIP。
- 不得放進 GitHub。
- 不得貼進 README 或程式碼。
- 不要傳給其他學生。
- 只把 JSON 轉成 Base64，放入自己 Vercel Project 的 `GOOGLE_SERVICE_ACCOUNT_BASE64`。

Windows 可開啟 PowerShell，將 JSON 轉成單行 Base64 並複製到剪貼簿：

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\你的路徑\service-account.json")) | Set-Clipboard
```

請勿使用不明網站轉換憑證。

## 三、建立 Gmail App Password

課前提醒：

- 建議使用個人 Google／Gmail 帳號。
- 必須先開啟 Google 兩步驟驗證，才能建立 App Password。
- 部分學校或公司管理帳號可能因管理政策無法建立 App Password。

完成兩步驟驗證後，到 Google 帳戶安全性設定建立 App Password：

- `GMAIL_ADDRESS` 填完整寄件 Gmail 地址。
- `GMAIL_APP_PASSWORD` 填 Google 產生的 App Password。
- 不得填 Gmail 一般登入密碼。

程式使用 Python 內建 `smtplib`、`smtp.gmail.com`、`SMTP_SSL` 與 Port 465。Email 內容直接放在正文，不使用附件、Gmail API 或第三方寄信平台。

## 四、準備 LINE Messaging API Bot

在 LINE Developers 建立或選擇 Messaging API Channel，準備：

```text
LINE_CHANNEL_SECRET
LINE_CHANNEL_ACCESS_TOKEN
```

先不要填 Webhook URL；等 Vercel 部署並取得公開網址後再設定。

## 五、使用 Vercel Drop 部署

老師 Demo 與學生都使用同一份：

```text
LINE訊息整理Bot_課程正式版.zip
```

部署方式：

1. 登入 Vercel。
2. 進入 Vercel Drop。
3. 將老師提供的 ZIP 或解壓後的專案 folder 拖入上傳區。
4. 等待 Vercel 建立 Project。

Vercel Drop 不需要 Git、GitHub 或 Vercel CLI，可直接上傳 ZIP 或 folder。

第一次 Drop 尚未設定環境變數，第一次 Deployment 可能失敗；Project 建立後繼續完成下一節並 Redeploy 即可。

> Vercel Drop 每次重新 Drop 會建立新的 Project，不適合持續更新同一個 Project。未來若需要長期修改與自動部署，再使用 GitHub；一般學生課程 Demo 不需要。

## 六、填入六個 Environment Variables

進入剛建立的 Vercel Project：

```text
Project
→ Settings
→ Environment Variables
```

只加入以下六個變數：

```text
LINE_CHANNEL_SECRET
LINE_CHANNEL_ACCESS_TOKEN
GMAIL_ADDRESS
GMAIL_APP_PASSWORD
GOOGLE_SHEET_ID
GOOGLE_SERVICE_ACCOUNT_BASE64
```

| 變數 | 內容 |
| --- | --- |
| `LINE_CHANNEL_SECRET` | LINE Developers 的 Channel Secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers 的 Channel Access Token |
| `GMAIL_ADDRESS` | 寄件 Gmail |
| `GMAIL_APP_PASSWORD` | Gmail App Password，不是一般密碼 |
| `GOOGLE_SHEET_ID` | Google Sheet 網址中的試算表 ID |
| `GOOGLE_SERVICE_ACCOUNT_BASE64` | 自己的 Service Account JSON 轉成的單行 Base64 |

不要把真實值貼在 README、聊天訊息、程式碼或課堂截圖中。

## 七、設定完成後必須 Redeploy

新增六個 Environment Variables 後，必須重新部署，新 Function 才會取得設定：

```text
Project
→ Deployments
→ 選擇最新一筆 Deployment
→ Redeploy
```

部署完成後會取得類似網址：

```text
https://你的-project.vercel.app
```

正式 Vercel runtime 不需要執行 `python main.py`、不需要 ngrok，也不使用 SQLite、JSON 或本機文字檔保存紀錄。

## 八、設定 LINE Developers Webhook

回到 LINE Messaging API Channel：

1. Webhook URL 填入：

```text
https://你的-project.vercel.app/callback
```

2. 按 **Verify**。
3. 將 **Use webhook** 設為 ON。
4. 將 **Allow bot to join group chats** 設為 ON。
5. 若 LINE 內建 Auto-reply 會干擾測試，請將它關閉。

## 九、群組指令

正式版只有三個控制指令。

設定目前群組的收件信箱：

```text
#設定信箱 example@gmail.com
```

查看目前群組的設定：

```text
#查看信箱
```

寄出目前群組尚未寄送的紀錄：

```text
#寄出紀錄
```

三個控制指令都不會寫入 `messages`。

Email 正文範例：

```text
LINE 對話紀錄

聊天室：專題討論群
日期：2026-09-10

18:30 William：首頁星期五前完成
18:32 小王：資料集需要重新整理
18:40 David：模型測試由我負責
```

## 十、老師與學生共用 Demo 驗收

1. 群組 A 輸入 `#設定信箱 a@example.com`。
2. 群組 B 輸入 `#設定信箱 b@example.com`。
3. A、B 各傳兩則不同的一般文字。
4. 在 Google Sheets 確認 A、B 的 `group_id` 不同。
5. 兩個群組各輸入 `#查看信箱`，確認信箱沒有混用。
6. 群組 A 輸入 `#寄出紀錄`。
7. 確認 Email 只包含群組 A 的新訊息。
8. 確認 A 本次訊息的 `sent` 是 `TRUE`，B 仍是 `FALSE`。
9. A 再輸入一次 `#寄出紀錄`，應顯示目前沒有新紀錄。

## 十一、目前 Demo 限制

- 此版本只處理 Bot 加入群組後收到的新文字 Webhook。
- 無法取得加入 Bot 前的歷史訊息。
- 不處理 LINE 記事本、圖片、貼圖、影片、音訊或檔案。
- 目前不處理 LINE unsend；訊息被收回後，已保存的紀錄不會自動刪除。
- 目前不處理 LINE 私訊內容。
- 群組成員名稱取得失敗時使用「LINE 使用者」。
- 群組名稱取得失敗時使用「LINE群組」。
- Google Sheets 沒有資料庫式原子唯一約束；程式會以 `webhook_event_id` 檢查一般 redelivery，但極少數完全同時到達的相同事件仍可能競爭。

`#設定信箱`、`#查看信箱`、`#寄出紀錄` 是群組內的控制指令。此版本定位為課程 Demo。正式企業環境若需要限制誰可以變更 Email 或寄送紀錄，應另外加入管理員權限驗證。

## 十二、講師驗收／進階除錯

以下操作不是一般學生必做流程。

### Windows 本機測試

```powershell
cd "C:\專案路徑\LINEBOT提供學生用"
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pip install pytest
Copy-Item .env.example .env
.\.venv\Scripts\python.exe main.py
```

另一個 PowerShell 視窗：

```powershell
ngrok http 5000
```

執行測試：

```powershell
.\.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider
.\.venv\Scripts\python.exe -m pip check
```

### Gmail 失敗保留測試

暫時使用錯誤 App Password、Redeploy、傳一則新訊息後寄出。Bot 應回覆寄送失敗，該列 `sent` 仍是 `FALSE`。測試後立刻還原正確密碼並再次 Redeploy。

### Webhook redelivery 測試

將同一個簽章正確、具有相同 `webhookEventId` 的 Webhook event 重送兩次。Google Sheets 應只有一列，新紀錄流程只執行一次；`message_id` 仍會保存。

### 寄信快照 race-condition 測試

若 A、B 已進入本次 Email 快照，而寄信期間 C 才加入，成功後必須是：

```text
A = TRUE
B = TRUE
C = FALSE
```

### GitHub 長期維護

若未來需要持續更新同一個 Vercel Project，可由講師將專案放入 GitHub，再讓 Vercel 連接 repository 自動部署。請確保所有秘密檔案仍未 commit。

## 十三、程式檔案導讀

- `app.py`：LINE `/callback`、signature 驗證與文字事件過濾。
- `message_service.py`：群組訊息、三個控制指令與寄信快照。
- `sheets_store.py`：Google Sheets、`group_id` 分流與 Webhook 去重。
- `email_service.py`：Gmail SMTP。
- `line_client.py`：LINE reply、群組名稱與成員名稱查詢。
- `line_utils.py`：LINE signature 驗證。
- `config.py`：六個環境變數。
- `main.py`：建立 Flask app；只供組裝與講師本機除錯。
- `index.py`：Vercel Flask 入口。
- `vercel.json`：Vercel Function 設定。

老師 Demo 與學生都應使用同一個 `LINE訊息整理Bot_課程正式版.zip`。除了六個帳號與憑證值不同之外，程式、功能、schema 與部署方法完全相同。
