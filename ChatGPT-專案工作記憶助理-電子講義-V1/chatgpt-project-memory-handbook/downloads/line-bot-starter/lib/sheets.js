'use strict';

const MESSAGE_HEADERS = ['receivedAt','groupId','groupName','userId','displayName','messageId','text','sentAt'];

function rowsToObjects(values) {
  if (!Array.isArray(values) || values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map((row, index) => {
    const item = { rowNumber: index + 2 };
    headers.forEach((header, column) => { item[header] = row[column] ?? ''; });
    return item;
  });
}

function valuesToMessages(values) { return rowsToObjects(values); }
function valuesToRooms(values) {
  const map = new Map();
  for (const room of rowsToObjects(values)) {
    if (room.groupId) map.set(room.groupId, { groupName: room.groupName || room.groupId, recipientEmail: room.recipientEmail || '' });
  }
  return map;
}

async function getSheets() {
  const { google } = require('googleapis');
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!encoded) throw new Error('缺少 GOOGLE_SERVICE_ACCOUNT_JSON_BASE64');
  const credentials = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  return google.sheets({ version: 'v4', auth });
}

function sheetId() {
  if (!process.env.GOOGLE_SHEET_ID) throw new Error('缺少 GOOGLE_SHEET_ID');
  return process.env.GOOGLE_SHEET_ID;
}

async function ensureHeaders() {
  const sheets = await getSheets();
  const id = sheetId();
  await sheets.spreadsheets.values.update({ spreadsheetId: id, range: 'messages!A1:H1', valueInputOption: 'RAW', requestBody: { values: [MESSAGE_HEADERS] } });
  await sheets.spreadsheets.values.update({ spreadsheetId: id, range: 'rooms!A1:C1', valueInputOption: 'RAW', requestBody: { values: [['groupId','groupName','recipientEmail']] } });
}

async function appendMessageIfNew(message) {
  const sheets = await getSheets();
  const id = sheetId();
  const ids = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'messages!F2:F' });
  if ((ids.data.values || []).flat().includes(message.messageId)) return false;
  const row = MESSAGE_HEADERS.map(key => message[key] || '');
  await sheets.spreadsheets.values.append({ spreadsheetId: id, range: 'messages!A:H', valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: [row] } });
  return true;
}

async function loadMessages() {
  const sheets = await getSheets();
  const result = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId(), range: 'messages!A:H' });
  return valuesToMessages(result.data.values || []);
}

async function loadRooms() {
  const sheets = await getSheets();
  const result = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId(), range: 'rooms!A:C' });
  return valuesToRooms(result.data.values || []);
}

async function markRowsSent(rows, sentAt) {
  if (!rows.length) return;
  const sheets = await getSheets();
  await sheets.spreadsheets.values.batchUpdate({ spreadsheetId: sheetId(), requestBody: { valueInputOption: 'RAW', data: rows.map(row => ({ range: `messages!H${row.rowNumber}`, values: [[sentAt]] })) } });
}

module.exports = { valuesToMessages, valuesToRooms, ensureHeaders, appendMessageIfNew, loadMessages, loadRooms, markRowsSent };

