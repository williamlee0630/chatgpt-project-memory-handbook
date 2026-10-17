# 專案整理 Skill Kit

本教材以一個互動式 Codex Skill `project-work-assistant` 提供四種服務。啟動時輸入 `$project-work-assistant`，選擇服務，再回答當下缺少的專案、期間和來源問題。單一下載檔是 `../project-work-assistant-skill.zip`；ZIP 解壓後只有 `project-work-assistant/` 一個頂層資料夾。

## 服務與 Prompt 相容版

| 服務 | Skill 規則 | 不使用 Skill 時 |
| --- | --- | --- |
| 會議決議與待辦 | `skills/project-work-assistant/references/meeting.md` | `prompts/01-會議決議與待辦整理.md` |
| 跨來源決策變更 | `skills/project-work-assistant/references/decision-update.md` | `prompts/02-跨來源決策更新.md` |
| 最新專案工作記憶 | `skills/project-work-assistant/references/memory-update.md` | `prompts/03-專案工作記憶更新.md` |
| 指定期間週報 | `skills/project-work-assistant/references/weekly-report.md` | `prompts/04-專案進度週報.md` |

四份 Prompt 保留完整來源驗證、決策版本、衝突處理與輸出規則。沒有 Skill 功能的學生可在 ChatGPT Project 使用已授權的來源和對應 Prompt。

## 來源與安全

Skill 共用 `references/source-rules.md`，只讀取本次指定專案和允許來源的正文，確認事件日期與專案歸屬；缺少資訊就詢問。較晚意見不自動成為有效決策，候選不算定案，既有工作記憶只用於同專案前後比較。Codex Skill 不會自動取得 ChatGPT Project、Google Drive 或 Gmail 權限。無法讀取時應請使用者提供檔案，不能假裝已讀。

可選的 `references/settings.md` 僅在使用者同意且目前專案資料夾可寫入時保存非敏感設定。每次仍須重新讀取本次來源；更新失敗或未驗收，不推進上次成功截止日。Skill 不等於排程。

講義入口為 `../../appendices/project-memory-skill.html`，課程練習見 `../../chapters/06-02.html`。
