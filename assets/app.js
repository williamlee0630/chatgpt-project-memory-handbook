(function () {
  'use strict';

  const lessons = [
    ['01-01', '1-1 成果展示與資料流', 'chapters/01-01.html', '基礎篇', 'Google Meet Tactiq Drive LINE Gmail ChatGPT 資料流'],
    ['01-02', '1-2 Tactiq 轉錄與儲存至 Google Drive', 'chapters/01-02.html', '基礎篇', 'Tactiq Transcript Automatic Workflow Liquid'],
    ['02-01', '2-1 ChatGPT 專案與來源設定', 'chapters/02-01.html', '基礎篇', 'ChatGPT 專案 Plugins Apps Google Drive Gmail 日期範圍'],
    ['02-02', '2-2 LINE 手動匯出', 'chapters/02-02.html', '基礎篇', 'LINE TXT 匯出 個資'],
    ['03-01', '3-1 第一次執行專案主對話', 'chapters/03-01.html', '基礎篇', '跨來源 專案主對話 第一次 會議當下版本 會後補充'],
    ['03-02', '3-2 驗收並持續更新工作記憶', 'chapters/03-02.html', '基礎篇', '人工驗收 後續更新 決策 待辦 未決 變更 衝突 進度'],
    ['04-01', '4-1 Bot 資料流與部署架構', 'chapters/04-01.html', '進階篇', 'Python Flask Webhook Vercel gspread Sheets Gmail SMTP'],
    ['04-02', '4-2 LINE Official Account 設定', 'chapters/04-02.html', '進階篇', 'Messaging API Channel Secret Access Token Webhook'],
    ['04-03', '4-3 Google Sheets 與 Gmail 設定', 'chapters/04-03.html', '進階篇', 'groups messages group_id receiver_email Service Account Gmail App Password'],
    ['05-01', '5-1 設定環境變數', 'chapters/05-01.html', '進階篇', 'Python ZIP Vercel Drop Base64 六個 Environment Variables'],
    ['05-02', '5-2 部署、Webhook 與驗證', 'chapters/05-02.html', '進階篇', 'Vercel Production Domain Ready callback Verify 設定信箱 查看信箱'],
    ['06-01', '6-1 多群組與收件信箱分流', 'chapters/06-01.html', '進階篇', '多聊天室 group_id receiver_email 寄出紀錄 sent'],
    ['06-02', '6-2 完整測試與跨來源週期排程', 'chapters/06-02.html', '進階篇', '完整測試 跨來源週期排程 Scheduled Task group_id message sent ChatGPT Drive Gmail']
  ];

  const root = document.body.dataset.root || './';
  const current = document.body.dataset.page || 'home';
  const progressKey = 'project-memory-handbook-progress-v1';

  function readProgress() {
    try { return JSON.parse(localStorage.getItem(progressKey) || '{}'); }
    catch (_) { return {}; }
  }
  function writeProgress(progress) { localStorage.setItem(progressKey, JSON.stringify(progress)); }

  function navMarkup(id) {
    let html = '';
    let lastPart = '';
    for (const [lessonId, title, href, group] of lessons) {
      if (group !== lastPart) {
        html += `<p class="nav-group">${group === '基礎篇' ? '基礎篇｜40 分鐘' : '進階篇｜60 分鐘'}</p>`;
        lastPart = group;
      }
      html += `<a class="nav-link${lessonId === current ? ' active' : ''}" href="${root}${href}" data-search-item data-search-text="${title} ${group}">${title}</a>`;
    }
    html += `<p class="nav-group">工具箱</p>
      <a class="nav-link" href="${root}appendices/prompts.html" data-search-item data-search-text="Prompt 提示詞 總整理 Project 固定指示 專案主對話 跨來源週期排程 Codex Vercel">📋 課程提示詞總整理</a>
      <a class="nav-link" href="${root}appendices/troubleshooting.html" data-search-item data-search-text="Tactiq LINE Vercel troubleshooting 排錯">排錯中心</a>`;
    const target = document.getElementById(id);
    if (target) target.innerHTML = html;
  }
  navMarkup('desktop-nav');
  navMarkup('mobile-nav-links');

  const menuToggle = document.getElementById('menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  function closeMenu() {
    if (!mobileNav) return;
    mobileNav.setAttribute('aria-hidden', 'true');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }
  menuToggle?.addEventListener('click', () => {
    const open = mobileNav.getAttribute('aria-hidden') === 'false';
    mobileNav.setAttribute('aria-hidden', String(open));
    menuToggle.setAttribute('aria-expanded', String(!open));
  });
  document.querySelector('[data-close-menu]')?.addEventListener('click', closeMenu);

  document.querySelectorAll('[data-copy-target]').forEach(button => {
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      if (!target) return;
      await navigator.clipboard.writeText(target.innerText || target.textContent || '');
      const old = button.textContent;
      button.textContent = button.dataset.copySuccess || '已複製';
      button.classList.add('copied');
      setTimeout(() => { button.textContent = old; button.classList.remove('copied'); }, 1800);
    });
  });

  const progress = readProgress();
  document.querySelectorAll('[data-progress-id]').forEach(checkbox => {
    checkbox.checked = Boolean(progress[checkbox.dataset.progressId]);
    checkbox.addEventListener('change', () => {
      progress[checkbox.dataset.progressId] = checkbox.checked;
      writeProgress(progress);
      updateProgressDisplay();
    });
  });
  function updateProgressDisplay() {
    const done = lessons.filter(([id]) => progress[id]).length;
    const pct = Math.round(done / lessons.length * 100);
    document.querySelectorAll('[data-progress-text]').forEach(el => { el.textContent = `${done}/${lessons.length} 節｜${pct}%`; });
    document.querySelectorAll('[data-progress-bar]').forEach(el => { el.style.width = `${pct}%`; });
  }
  updateProgressDisplay();

  const search = document.getElementById('course-search');
  search?.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    document.querySelectorAll('[data-search-item]').forEach(item => {
      item.hidden = Boolean(query) && !(item.dataset.searchText || item.textContent).toLowerCase().includes(query);
    });
  });
})();
