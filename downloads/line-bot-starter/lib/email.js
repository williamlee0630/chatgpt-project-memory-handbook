'use strict';

function formatDigest(messages) {
  const lines = messages.map(item => `${item.receivedAt}｜${item.displayName || item.userId || '未知成員'}：${item.text}`);
  return `以下為 LINE 群組工作紀錄。請保留原意，交由 ChatGPT 與會議逐字稿合併判斷。\n\n${lines.join('\n')}`;
}

async function sendDigest({ to, subject, messages }) {
  const nodemailer = require('nodemailer');
  const user = process.env.GMAIL_USER;
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
  if (!user || !pass) throw new Error('缺少 GMAIL_USER 或 GMAIL_APP_PASSWORD');
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  await transporter.sendMail({ from: user, to, subject, text: formatDigest(messages) });
}

module.exports = { formatDigest, sendDigest };

