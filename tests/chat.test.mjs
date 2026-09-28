import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChatPlan, resolveChatAnswer } from '../shared/domain/chat.ts';
import { isChatRequest } from '../shared/domain/requests.ts';
const source = { id: 'teachers', kind: 'records', label: 'Teacher accounts', href: '/admin/teachers', excerpt: '{}' };
const now = '2026-09-26T00:00:00Z';
const answer = { reply: 'There are three teachers.', sourceIds: ['teachers'], usesGeneralKnowledge: false, insufficientEvidence: false };

test('planner accepts only the read-only topic allowlist', () => {
  assert.deepEqual(parseChatPlan({ topics: ['teachers','teachers','subjects'], search: '' }), { topics: ['teachers','subjects'], search: '' });
  assert.throws(() => parseChatPlan({ topics: ['delete-users'], search: '' }));
  assert.throws(() => parseChatPlan({ topics: ['materials'], search: 'x'.repeat(201) }));
  assert.throws(() => parseChatPlan(null));
});
test('citations are server-provided objects, not model-provided URLs', () => {
  const result = resolveChatAnswer({ ...answer, sources: [{ href: 'https://attacker.invalid' }] }, [source], now, [], 'Insufficient evidence');
  assert.deepEqual(result.grounding.sources, [source]);
  assert.equal(result.grounding.basis, 'school');
  assert.equal(result.grounding.retrievedAt, now);
});
test('invented citations and unsupported school answers fail closed', () => {
  for (const value of [{ ...answer, sourceIds: ['invented'] }, { ...answer, sourceIds: [] }, { ...answer, sourceIds: ['teachers','invented'] }]) {
    const result = resolveChatAnswer(value, [source], now, [], 'Insufficient evidence');
    assert.equal(result.reply, 'Insufficient evidence');
    assert.equal(result.grounding.basis, 'insufficient');
    assert.deepEqual(result.grounding.sources, []);
  }
});
test('general, mixed and insufficient evidence are distinct and have no accuracy percentage', () => {
  for (const [patch, expected] of [
    [{ sourceIds: [], usesGeneralKnowledge: true }, 'general'],
    [{ usesGeneralKnowledge: true }, 'mixed'],
    [{ insufficientEvidence: true }, 'insufficient'],
  ]) {
    const result = resolveChatAnswer({ ...answer, ...patch }, [source], now, ['partialRecords'], 'fallback');
    assert.equal(result.grounding.basis, expected);
    assert.deepEqual(result.grounding.limitations, ['partialRecords']);
    assert.equal('accuracy' in result.grounding, false);
  }
});
test('malformed model output cannot become a chat answer', () => {
  for (const value of [null, 'text', {}, { ...answer, sourceIds: [1] }, { ...answer, reply: '' }, { ...answer, usesGeneralKnowledge: 'yes' }]) {
    assert.throws(() => resolveChatAnswer(value, [source], now, [], 'fallback'));
  }
});
test('chat attachments are bounded by type, count and encoded size', () => {
  const base = { messages: [{ role: 'user', text: 'Explain this file' }] };
  assert.equal(isChatRequest({ ...base, attachments: [{ name: 'notes.txt', mimeType: 'text/plain', data: 'SGVsbG8=' }] }), true);
  assert.equal(isChatRequest({ ...base, attachments: [{ name: 'script.exe', mimeType: 'application/octet-stream', data: 'SGVsbG8=' }] }), false);
  assert.equal(isChatRequest({ ...base, attachments: Array.from({ length: 4 }, (_, index) => ({ name: `${index}.txt`, mimeType: 'text/plain', data: 'QQ==' })) }), false);
  assert.equal(isChatRequest({ ...base, attachments: [{ name: 'bad.txt', mimeType: 'text/plain', data: 'not base64!' }] }), false);
});
