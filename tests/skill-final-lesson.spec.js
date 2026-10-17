const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const copiedPrompt = (html, id) => {
  const match = html.match(new RegExp(`<pre id="${id}"><code>([\\s\\S]*?)<\\/code><\\/pre>`));
  assert.ok(match, `${id} copy target missing`);
  assert.match(html, new RegExp(`data-copy-target="${id}"`));
  return match[1];
};

test('6-2 keeps all four stages, source checks, and schedule while teaching one assistant', () => {
  const html = read('chapters/06-02.html');
  const headings = [
    '第一階段：Google Drive + Gmail 跨來源完整驗收',
    '第二階段：使用互動式專案工作助理，完成最新工作記憶與週報',
    '第三階段：設定跨來源週期排程',
    '第四階段：最終成果驗收與課程總結'
  ];
  let previous = -1;
  for (const heading of headings) {
    const at = html.indexOf(heading);
    assert.ok(at > previous, `${heading} is missing or out of order`);
    previous = at;
  }
  for (const phrase of ['data-prompt-id="3"', 'prompts.html#prompt-2', '每天 <strong>15:00</strong>', 'Asia/Taipei', 'project-memory-skill.html#skill-one-click-install', 'Google Drive', 'Gmail', '[LINE紀錄]']) assert.ok(html.includes(phrase), phrase);
  assert.equal(copiedPrompt(html, 'skill-launch-command'), '$project-work-assistant');
  assert.match(html, /href="\.\.\/downloads\/project-work-assistant-skill\.zip"/);
  assert.doesNotMatch(html, /\$(?:meeting-action-items|cross-source-decision-update|project-memory-updater|weekly-project-report)/);
});

test('appendix has one installation, verification, and launch prompt with separate checks', () => {
  const html = read('appendices/project-memory-skill.html');
  const install = copiedPrompt(html, 'skill-install-prompt');
  const verify = copiedPrompt(html, 'skill-verify-prompt');
  assert.equal(copiedPrompt(html, 'skill-launch-command'), '$project-work-assistant');
  for (const phrase of ['project-work-assistant', 'downloads/project-work-assistant-skill.zip', 'SKILL.md', 'references', 'assets', 'agents', '不要直接覆蓋']) assert.match(install, new RegExp(phrase.replaceAll('.', '\\.')));
  for (const phrase of ['檔案存在', 'Codex 已辨識', '實際啟動測試', '四種服務選項']) assert.ok(verify.includes(phrase), phrase);
  assert.match(html, /id="skill-one-click-install"/);
  assert.match(html, /id="skill-daily-use"/);
  assert.match(html, /id="kit-prompts"/);
});

test('recorded LINE examples preserve timestamps, decisions, provisional status, and project isolation', () => {
  const activity = read('downloads/lesson-06-02/activity-line-2026-10-06.txt');
  const seminar = read('downloads/lesson-06-02/seminar-line-2026-10-17.txt');
  for (const [source, project, date] of [[activity, '活動籌備專案', '2026-10-06'], [seminar, '研討會討論專案', '2026-10-17']]) {
    for (const phrase of ['依實際課程測試紀錄改寫之匿名化教材', '不是完整逐字稿', `專案名稱：${project}`, '來源類型：LINE Bot 寄送的 Gmail 郵件正文', `紀錄發生日期：${date}`, '預期判斷：']) assert.ok(source.includes(phrase), `${project}: ${phrase}`);
    assert.doesNotMatch(source, /[\w.+-]+@[\w.-]+|(?:group|user)[_-]?id\s*[:=]|(?:token|secret)\s*[:=]/i);
  }
  for (const line of [
    '16:14　場地負責人：剛剛場地方有回覆了，原本預計 10/18 完成場地確認，但他們希望我們提早回覆，所以改成 10/12 前確認場地。',
    '16:15　活動主持人：好，那場地確認的期限就改成 10/12，還是由原負責人跟場地方確認。',
    '16:53　報名頁負責人：報名頁我這邊預計 10/15 可以準備好，如果場地 10/12 確定，公開報名可以排 10/16 上午 10 點。',
    '16:53　活動主持人：可以，那就先確定 10/16 上午 10 點開放報名。',
    '16:54　場地負責人：收到，我 10/12 前確認場地，確認後會在群組回報。',
    '16:54　報名頁負責人：那我負責報名頁內容，10/15 前完成。',
    '16:56　活動主持人：好。另外活動主視覺還沒決定，這個我們下次再確認。'
  ]) assert.ok(activity.includes(line), line);
  for (const phrase of ['2026-10-18 改為 2026-10-12', '原負責人維持不變', '2026-10-15 前完成', '計畫安排', '前置條件', '主視覺尚未決定', '不標示為已完成', '4 月 18 日', '需要人工確認', '不得寫成會議的 4/18 直接改為 10/12']) assert.ok(activity.includes(phrase), phrase);
  for (const line of [
    '12:36　研討會成員甲：我們下次討論的時間是什麼時候',
    '12:36　研討會成員乙：10/31',
    '12:37　研討會成員乙：可以先準備一下各自的內容',
    '12:37　研討會成員甲：好 那就先暫定10/31',
    '12:38　研討會成員乙：OK'
  ]) assert.ok(seminar.includes(line), line);
  for (const phrase of ['暫定 2026-10-31', '不能列為正式確認', '具體時間', '沒有具體分派的個人工作與期限']) assert.ok(seminar.includes(phrase), phrase);
  assert.doesNotMatch(seminar, /場地負責人|報名頁負責人|2026-10-12|2026-10-15|2026-10-16/);
  assert.doesNotMatch(activity, /研討會成員|2026-10-31/);
});

test('lesson and appendix teach the two recorded examples without claiming email proves Drive integration', () => {
  const lesson = read('chapters/06-02.html');
  const appendix = read('appendices/project-memory-skill.html');
  for (const html of [lesson, appendix]) {
    for (const file of ['activity-line-2026-10-06.txt', 'seminar-line-2026-10-17.txt']) assert.ok(html.includes(`../downloads/lesson-06-02/${file}`), file);
    for (const phrase of ['活動籌備專案', '研討會討論專案', '2026-10-31', '暫定', 'Google Drive', 'Gmail', '人工確認']) assert.ok(html.includes(phrase), phrase);
    assert.doesNotMatch(html, /4\/18 → 4\/21|4\/25 候選/);
  }
  for (const phrase of ['Tactiq My Meetings', 'Automatic Workflow', '會議原始紀錄', 'group_id', 'sent = TRUE', '同一專案', 'Drive 來源待補', '10/18 → 10/12 只由 10/6 LINE 郵件本身支持', '場地與報名頁都不可標成已完成']) assert.ok(lesson.includes(phrase), phrase);
  assert.ok(lesson.includes('只有實際讀到<strong>同一專案</strong>的 Drive 會議文件和 Gmail LINE 郵件'));
  assert.ok(lesson.includes('安裝 Codex Skill 不會自動讓這個 ChatGPT 排程使用它'));
  assert.equal(copiedPrompt(lesson, 'skill-launch-command'), '$project-work-assistant');
  assert.equal(copiedPrompt(appendix, 'skill-launch-command'), '$project-work-assistant');
});

test('Prompt route keeps four full copies and a short followup that rereads evidence', () => {
  const html = read('appendices/project-memory-skill.html');
  for (let index = 1; index <= 4; index += 1) assert.ok(copiedPrompt(html, `kit-prompt-text-${index}`).length > 400);
  const followup = copiedPrompt(html, 'kit-prompt-followup');
  for (const phrase of ['重新讀取', '前次 AI 回答不能當成新事實來源', '不要自行搜尋其他專案或來源']) assert.ok(followup.includes(phrase), phrase);
  assert.match(html, /同一對話後續更新簡短版/);
  assert.match(html, /沒有完成證據不標完成/);
});
