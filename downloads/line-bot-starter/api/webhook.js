'use strict';
const { verifyLineSignature } = require('../lib/line-signature');
const { normalizeTextEvent, selectUnsentForGroup, buildSubject } = require('../lib/core');
const { appendMessageIfNew, loadMessages, loadRooms, markRowsSent } = require('../lib/sheets');
const { sendDigest } = require('../lib/email');

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function lineRequest(path, options = {}) {
  const response = await fetch(`https://api.line.me${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error(`LINE API ${response.status}: ${await response.text()}`);
  return response.status === 204 ? {} : response.json();
}

async function reply(replyToken, text) {
  if (!replyToken) return;
  await lineRequest('/v2/bot/message/reply', { method: 'POST', body: JSON.stringify({ replyToken, messages: [{ type: 'text', text: String(text).slice(0, 5000) }] }) });
}

async function groupName(groupId) {
  try { return (await lineRequest(`/v2/bot/group/${encodeURIComponent(groupId)}/summary`)).groupName || groupId; }
  catch (_) { return groupId; }
}

async function displayName(groupId, userId) {
  if (!userId) return '';
  try { return (await lineRequest(`/v2/bot/group/${encodeURIComponent(groupId)}/member/${encodeURIComponent(userId)}`)).displayName || userId; }
  catch (_) { return userId; }
}

function taipeiDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

async function handleEvent(event) {
  const message = normalizeTextEvent(event);
  if (!message) return;
  const command = message.text.trim();
  if (command === '!群組ID') {
    await reply(event.replyToken, `本群組 groupId：\n${message.groupId}`);
    return;
  }
  if (command === (process.env.SEND_COMMAND || '!寄送紀錄')) {
    const rooms = await loadRooms();
    const room = rooms.get(message.groupId);
    if (!room?.recipientEmail) {
      await reply(event.replyToken, '尚未設定本群組收件信箱。請把 groupId、groupName、recipientEmail 填入 rooms 工作表。');
      return;
    }
    const pending = selectUnsentForGroup(await loadMessages(), message.groupId);
    if (!pending.length) {
      await reply(event.replyToken, '本群組目前沒有尚未寄送的文字紀錄。');
      return;
    }
    await sendDigest({ to: room.recipientEmail, subject: buildSubject(room.groupName, taipeiDate()), messages: pending });
    await markRowsSent(pending, new Date().toISOString());
    await reply(event.replyToken, `已寄送 ${pending.length} 則本群組紀錄。`);
    return;
  }
  const name = await groupName(message.groupId);
  const person = await displayName(message.groupId, message.userId);
  await appendMessageIfNew({ receivedAt: new Date(message.timestamp).toISOString(), groupId: message.groupId, groupName: name, userId: message.userId, displayName: person, messageId: message.messageId, text: message.text, sentAt: '' });
}

module.exports = async function webhook(req, res) {
  if (req.method === 'GET') return res.status(200).send('LINE Bot is running');
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const raw = await readRawBody(req);
    if (!verifyLineSignature(raw, req.headers['x-line-signature'], process.env.LINE_CHANNEL_SECRET)) return res.status(401).send('Invalid signature');
    const body = JSON.parse(raw.toString('utf8'));
    for (const event of body.events || []) await handleEvent(event);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};

