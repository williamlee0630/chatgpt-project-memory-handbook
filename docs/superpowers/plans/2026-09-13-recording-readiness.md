# 正式錄課前電子講義精準一致性修訂

日期：2026-09-13
狀態：已獲使用者核准

## 目標

讓沒有程式基礎、且沒有老師在旁協助的學生，只靠電子講義與正式下載 ZIP，就能完成基礎的 Meet／Tactiq／Drive／ChatGPT 流程，以及正式 Python LINE Bot 的 Vercel Drop 流程。

## 權威來源

1. `downloads/line-bot-starter/` 內正式 Python 程式與測試。
2. 正式學生 README。
3. 電子講義、附錄與維護文件。

教材與程式不同時修正教材，不為了教材改動正式 Python 核心行為。

## 修改邊界

- 保留 6 章、13 節、100 分鐘定位、既有導覽與主要 UI／CSS。
- 保留六個必要環境變數、兩張 Google Sheets schema、三個控制指令及 Vercel Drop 主線。
- 不新增 OpenAI API、LINE 私訊、room、附件處理、管理後台或其他自動化服務。
- 修正受影響章節、Prompt、排錯中心、首頁、同步文件、starter README 與內容測試。
- starter README 更新後重建扁平根目錄 ZIP；不修改 Python 檔案。

## 內容設計

- 2-1：以 Plugins／Apps 為現行入口，說明帳號與管理政策差異，保留 Drive／Gmail／LINE 的人工 fallback，並要求實際讀取內容驗證。
- 2-2：揭露 LINE TXT 不是完整聊天室備份，加入編碼、日期、群組與敏感資料檢查。
- 3-2／Prompt：人工確認後才加入專案來源；決策附來源與日期，變更保留原／新決定及原／新來源。
- 4-1～4-3：依正式程式說明群組文字、歡迎事件與排除範圍；揭露 Demo 權限限制；補正 LINE 建立流程、Token、Base64 與 Gmail App Password 教學。
- 5-1～5-2：正式導向 `https://vercel.com/drop`；同一 Project 設定六個值後 Redeploy；區分 Production／Preview；說明 GET 404 與 Logs。
- 6-1～6-2／排錯：使用真實 Email placeholder、說明 `group_id` + `sent=FALSE` 快照範圍、加入指定 A～J 情境及 SMTP 成功但 Sheets 標記失敗的重複寄送風險。
- 首頁：只在一處加入 2026-09-13 查驗與介面變動提醒。

## 驗證策略

1. 先新增會失敗的內容測試並確認因缺少上述教材內容而失敗。
2. 以最小修改使內容測試通過。
3. 重建 ZIP，驗證根目錄檔案、README 一致及敏感資料排除。
4. 執行 Node、Python、`pip check`、連結、Copy、390px、秘密掃描與 Git diff 檢查。
5. 所有檢查通過後才 commit／push，等待 GitHub Pages，再做指定線上 smoke test。

## 已知不修改的正式行為

- `join`／`memberJoined` 只回覆歡迎訊息，不寫入 `messages`。
- `#設定信箱` parser 比教材教法更寬鬆；教材統一教半形 `#` 與一般半形空格。
- SMTP 成功但 Sheets `sent=TRUE` 更新失敗可能造成重寄；本輪只揭露，不改寄送邏輯。
