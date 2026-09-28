import test from 'node:test';
import assert from 'node:assert/strict';
import { getEffectiveStatus } from '../shared/domain/assignments.ts';
import { getVideoEmbedUrl, isSafeVideoUrl } from '../shared/domain/learning.ts';
import { isSubmissionRequest, isChatRequest, isMaterialPath } from '../shared/domain/requests.ts';

const assignmentId = '00000000-0000-0000-0000-000000000001';
const now = Date.parse('2026-09-26T00:00:00Z');
test('assignment lifecycle preserves cancellation and explicit ending', () => {
  assert.equal(getEffectiveStatus({ status: 'cancelled', due_at: null }, now), 'cancelled');
  assert.equal(getEffectiveStatus({ status: 'ended', due_at: '2027-01-01' }, now), 'ended');
  assert.equal(getEffectiveStatus({ status: 'active', due_at: null }, now), 'active');
});
test('assignment deadline closes exactly at the due instant', () => {
  assert.equal(getEffectiveStatus({ status: 'active', due_at: new Date(now).toISOString() }, now), 'ended');
  assert.equal(getEffectiveStatus({ status: 'active', due_at: new Date(now + 1).toISOString() }, now), 'active');
});
test('submission contract rejects duplicate and malformed answers', () => {
  const valid = { assignmentId, answers: [{ id: 'q1', selected_index: 0 }] };
  assert.equal(isSubmissionRequest(valid), true);
  assert.equal(isSubmissionRequest({ ...valid, answers: [...valid.answers, ...valid.answers] }), false);
  for (const selected_index of [-1, 0.5, '0', null]) {
    assert.equal(isSubmissionRequest({ assignmentId, answers: [{ id: 'q1', selected_index }] }), false);
  }
  for (const value of [null, [], {}, { assignmentId, answers: [null] }, { assignmentId: 'bad', answers: { text: 'ok' } }]) {
    assert.equal(isSubmissionRequest(value), false);
  }
});
test('freeform rejects blank or oversized text', () => {
  assert.equal(isSubmissionRequest({ assignmentId, answers: { text: 'My answer' } }), true);
  assert.equal(isSubmissionRequest({ assignmentId, answers: { text: '  ' } }), false);
  assert.equal(isSubmissionRequest({ assignmentId, answers: { text: 'x'.repeat(20001) } }), false);
});
test('chat contract bounds input and requires a user turn', () => {
  assert.equal(isChatRequest({ messages: [{ role: 'user', text: 'Hello' }] }), true);
  // Both shipped clients use null to start a new conversation.
  assert.equal(isChatRequest({ messages: [{ role: 'user', text: 'Hello' }], sessionId: null }), true);
  for (const messages of [[], [null], [{ role: 'assistant', text: 'Hello' }], [{ role: 'user', text: 'x'.repeat(20001) }], Array(61).fill({ role: 'user', text: 'a' })]) {
    assert.equal(isChatRequest({ messages }), false);
  }
  assert.equal(isChatRequest({ messages: [{ role: 'user', text: 'Hello' }], sessionId: 'bad' }), false);
});
test('material paths must identify the actual class and material', () => {
  assert.equal(isMaterialPath('class/material/0-notes.pdf', 'class', 'material'), true);
  for (const path of ['other/material/0.pdf', 'class/other/0.pdf', 'class/material/../private', 'class/material/..', 'class/material/', 'class/material/a\\b']) {
    assert.equal(isMaterialPath(path, 'class', 'material'), false);
  }
});

test('learning video URLs are restricted to embeddable providers', () => {
  assert.equal(isSafeVideoUrl('https://www.youtube.com/watch?v=abc123'), true);
  assert.equal(getVideoEmbedUrl('https://www.youtube.com/watch?v=abc123'), 'https://www.youtube.com/embed/abc123');
  assert.equal(getVideoEmbedUrl('https://youtu.be/abc123'), 'https://www.youtube.com/embed/abc123');
  assert.equal(getVideoEmbedUrl('https://vimeo.com/123456'), 'https://player.vimeo.com/video/123456');
  for (const value of ['http://youtube.com/watch?v=x', 'https://evil.test/video', 'javascript:alert(1)', 'not a url']) {
    assert.equal(isSafeVideoUrl(value), false);
    assert.equal(getVideoEmbedUrl(value), null);
  }
});

test('submission client supports web cookies and native bearer transport', async () => {
  const { submitAssignment } = await import('../shared/api/submissions.ts');
  const payload = { assignmentId, answers: { text: 'Answer' } };
  const result = { id: 'saved' };
  let captured;
  const fetcher = async (url, init) => {
    captured = { url, init };
    return new Response(JSON.stringify(result));
  };
  assert.deepEqual(await submitAssignment(payload, { fetcher }), result);
  assert.equal(captured.url, '/api/submissions/submit');
  assert.equal(captured.init.headers.Authorization, undefined);
  await submitAssignment(payload, { fetcher, baseUrl: 'https://school.example/', accessToken: 'test-token' });
  assert.equal(captured.url, 'https://school.example/api/submissions/submit');
  assert.equal(captured.init.headers.Authorization, 'Bearer test-token');
  assert.deepEqual(JSON.parse(captured.init.body), payload);
  await assert.rejects(submitAssignment(payload, {
    fetcher: async () => new Response(JSON.stringify({ error: 'Assignment closed' }), { status: 400 }),
  }), /Assignment closed/);
});
