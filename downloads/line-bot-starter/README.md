# LINE 專案工作記憶 Bot 範本

功能：取得 Bot 加入後的 LINE 群組新文字訊息，依 `groupId` 寫入 Google Sheets；在群組輸入 `!寄送紀錄` 時，只寄出該群組尚未寄送的紀錄，主旨格式為 `[LINE紀錄][群組名稱] YYYY-MM-DD`。

請依電子講義第 4–6 章設定。所有密鑰只放 Vercel Environment Variables，不可提交 `.env` 或服務帳號 JSON。

工作表：

- `messages`：`receivedAt, groupId, groupName, userId, displayName, messageId, text, sentAt`
- `rooms`：`groupId, groupName, recipientEmail`

本機測試：`npm install` 後執行 `npm test`。
