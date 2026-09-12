# Electronic Handbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立符合最新版課程文案、可直接部署 GitHub Pages 的 Windows 電子講義網站與 LINE Bot 範本。

**Architecture:** 純靜態多頁網站使用共用 CSS/JavaScript；每一頁對應課程文案的一節，首頁負責總覽，附錄集中 Prompt、排錯與檢查表。LINE Bot 範本獨立放在 `downloads/line-bot-starter/`，讓學生直接下載或複製。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Playwright、Node.js/Vercel Functions、LINE SDK、Google Sheets API、Nodemailer。

**Spec:** `docs/course-spec.md`

## Global Constraints

- 主目錄必須保留課程文案的 6 章 13 節與 100 分鐘配置。
- Windows 為主要操作環境；不製作 Mac 版本。
- Tactiq 只取得及傳送完整逐字稿；ChatGPT 是唯一判斷內容的 AI。
- Automatic Workflow 為已實測主線，手動 Run 為備援。
- 基礎篇不要求 LINE Bot、Vercel、Google API 部署。
- 不加入 Zoom AI 主線、Tactiq Email、n8n、Make、Zapier。

---

### Task 1: Lock navigation and content contracts

**Files:**
- Create: `tests/site.spec.js`
- Create: `tests/content.spec.js`

**Interfaces:**
- Consumes: `docs/course-spec.md`
- Produces: executable acceptance tests for every later task

- [ ] Write Playwright tests for desktop/mobile navigation, copy feedback, progress persistence and search.
- [ ] Write content tests that parse all pages and require the 6 chapters, 12 sections, workflow wording, Prompt output fields, Tactiq troubleshooting and forbidden-flow absence.
- [ ] Run `node --test tests/*.spec.js` and confirm failure because the site does not exist.

### Task 2: Build the shared site shell

**Files:**
- Create: `index.html`
- Create: `assets/styles.css`
- Create: `assets/app.js`
- Create: `chapters/*.html`

**Interfaces:**
- Consumes: test selectors defined in Task 1
- Produces: fixed header, chapter navigation, mobile menu, search, copy blocks, progress checkboxes and previous/next links

- [ ] Implement only the shell behavior required by the failing tests.
- [ ] Run the focused site tests until green.
- [ ] Refactor shared HTML/CSS/JS without changing behavior.

### Task 3: Author the 40-minute basic track

**Files:**
- Create: `chapters/01-01.html` through `chapters/03-02.html`
- Create: `appendices/prompts.html`

**Interfaces:**
- Consumes: navigation shell and content contract
- Produces: Meet/Tactiq/Drive, ChatGPT project, manual LINE export, cross-source merge and fixed outputs

- [ ] Author each click path with official links, verification and troubleshooting.
- [ ] Add the tested Liquid template and the reusable cross-source Prompt.
- [ ] Run content tests and fix every missing contract.

### Task 4: Author the 60-minute advanced track and starter

**Files:**
- Create: `chapters/04-01.html` through `chapters/06-02.html`
- Create: `downloads/line-bot-starter/*`
- Create: `appendices/troubleshooting.html`

**Interfaces:**
- Consumes: LINE/Google/Vercel configuration values described in the lessons
- Produces: runnable starter whose environment keys exactly match the handbook

- [ ] Write failing unit tests for event validation, groupId isolation and unsent-message filtering.
- [ ] Implement the smallest starter that passes them.
- [ ] Author deployment, verification, security and troubleshooting pages around that starter.
- [ ] Run starter tests and content tests until green.

### Task 5: Visual and release verification

**Files:**
- Create: `README.md`
- Create: `404.html`

**Interfaces:**
- Consumes: completed static site
- Produces: GitHub Pages-ready directory and verified desktop/mobile experience

- [ ] Run the full Node and Playwright suite.
- [ ] Serve locally and capture desktop and mobile screenshots.
- [ ] Inspect every page for overflow, broken navigation and unreadable code.
- [ ] Verify every local link and all required official external URLs.
- [ ] Save the final project as one persistent ZIP deliverable.
