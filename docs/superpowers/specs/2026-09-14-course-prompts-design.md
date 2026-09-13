# 課程 Prompt 單一資料來源設計規格

日期：2026-09-14

## 目標

把正式課程使用的 8 份 Prompt 集中到 `assets/prompts.js`，由章節頁與「課程提示詞總整理」共同渲染，確保名稱、說明與 Prompt 本文不會在兩處分叉。這次只調整 Prompt 教材與相關互動，不修改 Python LINE Bot、ZIP、Google Sheets schema、環境變數、Vercel Drop 流程、6 章 13 節架構或主要 UI/CSS。

## 內容合約

正式 Prompt 固定為 0～7 共 8 份：

0. Project 固定指示
1. LINE 紀錄整理
2. Tactiq 會議整理
3. 跨來源工作記憶
4. 最新有效決策辨識
5. 待辦與專案進度整理
6. 每日工作記憶自動整理
7. Codex Vercel 部署救援

Prompt 0 與 3 必須逐字沿用目前教材本文；Prompt 1、2、4、5、6、7 必須逐字採用使用者核准附件。每筆資料至少包含 id、名稱、分類、教材位置、用途、使用時機與完整本文；Prompt 3 顯示「核心 Prompt」，Prompt 7 顯示「加贈工具 Prompt」。Prompt 6 額外顯示「ChatGPT Scheduled Task／排程」，並明確說明它不是 Project Instructions，也不是每天手動貼上。

## 架構

- `assets/prompts.js` 是正式 Prompt 本文與 metadata 的唯一產品資料來源，公開為 `window.COURSE_PROMPTS`。
- 相同檔案負責把 `data-prompt-id` placeholder 渲染成單張 Prompt 卡片，以及把 `data-prompt-index`、`data-prompt-catalog` 渲染成總索引與 8 張完整卡片。
- 產生 DOM 時使用 `textContent` 放入 Prompt 本文，避免 HTML 插值造成跳脫或換行差異。
- 每張卡片的複製按鈕只指向 Prompt 本文 `<pre>`，不複製名稱、用途或使用時機。
- `assets/app.js` 保留通用複製行為，支援 Prompt 按鈕的 `已複製 ✓` 回饋，約 1.8 秒後復原。
- 各章節先載入 `prompts.js` 再載入 `app.js`，讓通用複製事件在動態卡片建立後綁定。

## 教材位置

- 2-1：Prompt 0、Prompt 2
- 2-2：Prompt 1
- 3-1：Prompt 3
- 3-2：Prompt 4、Prompt 5
- 5-1：Prompt 7，放在正常 Vercel Drop 流程後，標示為選用救援
- 6-2：Prompt 6，放在完整流程驗收後，標示為 ChatGPT 排程
- `appendices/prompts.html`：快速索引與全部 8 份 Prompt

## 視覺與互動

沿用既有卡片、按鈕、顏色與排版語言，只新增最少量的 Prompt 卡片、metadata、索引與狀態徽章樣式。總整理頁的索引必須能跳到每份 Prompt；桌面與 390px 手機不得出現水平捲動。

## 驗證

- Node 內容測試載入 `assets/prompts.js`，確認 8 筆資料、必填 metadata、章節 placement、標籤與禁止用語。
- 以 SHA-256 固定 8 份 Prompt 本文；0、3 的指紋來自修改前教材，其他 6 份來自核准附件。
- Browser 測試比較章節卡片與總整理卡片的本文完全一致，實測錨點、複製內容、`已複製 ✓` 與 1.8 秒復原。
- Desktop 與 390px mobile 巡檢所有受影響頁面，確認無水平溢位。
- 最後執行 Node tests、連結檢查、Copy 行為、git diff 與舊用語搜尋；Python 與 ZIP 不屬於這次變更，但仍不得被修改。
