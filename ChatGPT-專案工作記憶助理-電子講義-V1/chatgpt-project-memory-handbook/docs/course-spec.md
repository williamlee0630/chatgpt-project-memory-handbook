# 《一個人也能管好多專案》電子講義規格

## 依據

- 最新課程文案：`李唯礽MT_課程文案(1).docx`
- 已確認的 V2 技術架構與實測結果
- 參考介面：`kuan35.github.io/n8n-tutorial`

## 不可變更的課程核心

把「會議當下版本」與「LINE 會後更新」交給 ChatGPT，建立可追蹤的工作記憶。ChatGPT 是唯一負責理解、摘要、決策辨識、待辦、變更與衝突判斷的 AI；整理結果仍須人工確認。

## 正式資料流

- 會議：Google Meet → Tactiq 完整繁中逐字稿 → Automatic Workflow → Google Drive
- LINE：LINE 群組 → LINE Bot → Google Sheets → Gmail `[LINE紀錄][群組名稱] YYYY-MM-DD`
- 整理：Google Drive + Gmail → ChatGPT → 工作記憶

## 課程文案對照

網站主目錄維持文案的 6 章 13 節與約 100 分鐘：

1. 取得會議原始資料（1-1、1-2，15 分鐘）
2. 建立 ChatGPT 整理環境（2-1、2-2，10 分鐘）
3. 建立跨來源工作記憶（3-1、3-2，15 分鐘）
4. 準備 LINE Bot 自動化環境（4-1、4-2、4-3，20 分鐘）
5. 部署 LINE Bot 至 Vercel（5-1、5-2，20 分鐘）
6. 多聊天室分流與完整測試（6-1、6-2，20 分鐘）

第 1–3 章為基礎篇，不要求寫程式；第 4–6 章為進階篇，提供可直接使用的程式碼範本。

## 教材行為

- Windows 為唯一主操作環境，不放 Mac 切換頁。
- 固定頂端列、桌面側邊目錄、手機抽屜目錄。
- 清楚標記必要／進階／已實測／注意。
- 每個實作包含：目標、開始前、逐步操作、成功驗證、常見錯誤、完成勾選。
- 所有網站切換提供直接連結；所有 Liquid、Prompt、指令與設定值提供複製按鈕。
- 進度保存在瀏覽器；可搜尋章節與關鍵字。
- GitHub Pages 使用純 HTML/CSS/JavaScript，不依賴建置流程。

## 已實測與限制

- Tactiq Automatic → Meeting Processed → Google Drive 已實測可自動建立含完整 `{{ meeting.transcript }}` 的 Google Docs。
- 處理可能延遲，不承諾固定 10–15 分鐘。
- 手動 Run 是備援；自動仍等待時手動 Run 可能造成重複文件。
- 不教 Tactiq → Email 完整逐字稿，不教 Compose/step output 除錯流程。
- LINE Bot 可接收加入後的新文字訊息；不同群組可依 groupId 分流。
- 免費方案、額度與平台畫面可能變更，以當下官方頁面為準，不承諾永久免費。
- 不加入 Zoom AI、n8n、Make、Zapier 或不必要的 Drive API。
