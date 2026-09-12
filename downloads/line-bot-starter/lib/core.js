'use strict';

function normalizeTextEvent(event) {
  if (event?.type !== 'message' || event?.message?.type !== 'text') return null;
  if (event?.source?.type !== 'group' || !event.source.groupId) return null;
  return {
    timestamp: event.timestamp,
    groupId: event.source.groupId,
    userId: event.source.userId || '',
    messageId: event.message.id,
    text: event.message.text
  };
}

function selectUnsentForGroup(rows, groupId) {
  return rows.filter(row => row.groupId === groupId && !String(row.sentAt || '').trim());
}

function buildSubject(groupName, date) {
  return `[LINE紀錄][${groupName}] ${date}`;
}

module.exports = { normalizeTextEvent, selectUnsentForGroup, buildSubject };
