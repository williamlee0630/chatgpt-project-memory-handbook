const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeTextEvent, selectUnsentForGroup, buildSubject } = require('../lib/core');
const { verifyLineSignature } = require('../lib/line-signature');
const { valuesToMessages, valuesToRooms } = require('../lib/sheets');
const { formatDigest } = require('../lib/email');

test('只接受具有 groupId 的群組文字訊息', () => {
  const event = {
    type: 'message',
    timestamp: 1799737200000,
    source: { type: 'group', groupId: 'C_GROUP_A', userId: 'U_1' },
    message: { type: 'text', id: 'M_1', text: '第一版改為 10/23 完成' }
  };
  assert.deepEqual(normalizeTextEvent(event), {
    timestamp: 1799737200000,
    groupId: 'C_GROUP_A',
    userId: 'U_1',
    messageId: 'M_1',
    text: '第一版改為 10/23 完成'
  });
  assert.equal(normalizeTextEvent({ ...event, message: { type: 'image' } }), null);
  assert.equal(normalizeTextEvent({ ...event, source: { type: 'user', userId: 'U_1' } }), null);
});

test('寄送只挑目前 groupId 尚未寄出的訊息', () => {
  const rows = [
    { rowNumber: 2, groupId: 'C_GROUP_A', sentAt: '', text: 'A1' },
    { rowNumber: 3, groupId: 'C_GROUP_B', sentAt: '', text: 'B1' },
    { rowNumber: 4, groupId: 'C_GROUP_A', sentAt: '2026-09-12T10:00:00Z', text: 'A old' },
    { rowNumber: 5, groupId: 'C_GROUP_A', sentAt: '', text: 'A2' }
  ];
  assert.deepEqual(selectUnsentForGroup(rows, 'C_GROUP_A').map(row => row.rowNumber), [2, 5]);
});

test('Gmail 主旨包含群組名稱與日期', () => {
  assert.equal(buildSubject('設計組', '2026-09-12'), '[LINE紀錄][設計組] 2026-09-12');
});

test('LINE 簽章使用原始 body 驗證', () => {
  const body = Buffer.from('{"events":[]}');
  assert.equal(verifyLineSignature(body, 'pkK1lVPJPiJ+wPLziRD79xIxohl8AImYM8AEeM7IbzQ=', 'secret'), true);
  assert.equal(verifyLineSignature(body, 'wrong', 'secret'), false);
});

test('Sheets 列資料保留列號並建立群組設定', () => {
  const messages = valuesToMessages([
    ['receivedAt','groupId','groupName','userId','displayName','messageId','text','sentAt'],
    ['2026-09-12T01:00:00Z','C_A','設計組','U_1','小美','M_1','完成第一版','']
  ]);
  assert.equal(messages[0].rowNumber, 2);
  assert.equal(messages[0].text, '完成第一版');
  assert.deepEqual(valuesToRooms([
    ['groupId','groupName','recipientEmail'],
    ['C_A','設計組','teacher@example.com']
  ]).get('C_A'), { groupName: '設計組', recipientEmail: 'teacher@example.com' });
});

test('Email 正文包含發言時間、姓名與文字', () => {
  const body = formatDigest([{ receivedAt: '2026-09-12T01:00:00Z', displayName: '小美', text: '完成第一版' }]);
  assert.match(body, /小美：完成第一版/);
});
