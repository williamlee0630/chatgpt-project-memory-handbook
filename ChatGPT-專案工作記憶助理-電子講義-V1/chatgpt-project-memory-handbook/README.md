# 《一個人也能管好多專案》電子講義

Windows 操作為主的純靜態教學網站，符合 `李唯礽MT_課程文案(1).docx`：6 章、13 節、約 100 分鐘；基礎篇 40 分鐘、進階篇 60 分鐘。

## 本機開啟

最簡單：直接雙擊 `index.html`。若瀏覽器對剪貼簿功能有限制，可在此資料夾開啟 PowerShell：

```powershell
python -m http.server 8000
```

再開啟 `http://localhost:8000/`。

## 發布到 GitHub Pages

1. 在 GitHub 建立新的 Repository。
2. 上傳本資料夾內全部檔案，`index.html` 必須位於 Repository 根目錄。
3. Repository → **Settings** → **Pages**。
4. **Build and deployment** 的 Source 選 **Deploy from a branch**。
5. Branch 選 `main`、資料夾選 `/(root)`，按 **Save**。
6. 等待 GitHub 顯示公開網址後，從首頁逐一點擊章節與複製按鈕。

## 測試

```powershell
node --test tests/content.spec.js tests/static-site.spec.js
node --test downloads/line-bot-starter/tests/core.test.js
```

## 主要資料流

- 會議：Google Meet → Tactiq → Google Drive → ChatGPT
- LINE：LINE 群組 → LINE Bot → Google Sheets → Gmail → ChatGPT
- ChatGPT 是唯一負責摘要、決策、待辦、變更與衝突判斷的 AI。

