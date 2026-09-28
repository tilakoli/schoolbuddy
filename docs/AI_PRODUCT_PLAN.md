# School Buddy AI product plan

Updated: 26 September 2026.

School Buddy AI should be presented as three connected modes inside one assistant experience. They share conversations, permissions, school retrieval, citations and safety rules, while each mode has a different interface and cost profile.

## 1. Grounded chat — current priority

### Current implementation

- Role-aware text chat exists on web and native.
- The server plans read-only retrieval from an allowlist of school topics.
- Responses can cite server-verified school records and uploaded-material excerpts.
- Evidence snapshots, retrieval time and limitations are saved with chat history.
- Browser/native text-to-speech can read an answer aloud.
- The assistant deliberately does not write school records or expose grades, submissions, answer keys or credentials.

### Required before release

1. Keep migrations `0020`, `0021` and `0022` deployed with the matching application release. They were applied to the configured project on 26 September 2026.
2. Run the database regression suite against a disposable database before each production rollout.
3. Complete browser-level chat checks as admin, teacher and student. Live teacher/student authentication and role-scoped context retrieval have passed.
4. Conversation feedback (helpful/not helpful plus a structured reason) is implemented in migration `0023`; deploy it and use the results to measure quality. Source presence is evidence, not an accuracy percentage.
5. Add operational metrics: answer latency, retrieval success, insufficient-evidence rate, provider errors and user feedback. Do not display an invented accuracy rate.
6. Grade-release confidentiality is implemented in migration `0024`; keep grade-related AI retrieval disabled unless a future design uses the same release boundary.

## 2. Live voice with visible transcript — next phase

The first useful voice version should keep the trusted text-chat pipeline:

1. A microphone button beside Send starts recording.
2. Partial speech-to-text appears in the composer in real time.
3. The user can edit the transcript before sending, or enable an explicit auto-send setting later.
4. The final transcript is sent through the same grounded chat endpoint and permission checks.
5. The answer appears as text with its sources while speech playback begins.
6. Stop, mute, replay and interrupt controls remain visible.

This delivers the requested live transcript without duplicating retrieval or authorization logic. A later full-duplex mode can allow natural interruption and simultaneous listening/speaking, but it needs a realtime session service, short-lived client credentials, reconnect handling, usage limits and stronger audio privacy controls.

### Voice requirements

- Clear recording indicator and elapsed time.
- Permission-denied and unsupported-browser fallbacks.
- Language selection aligned with English, Hindi and Telugu.
- Transcript correction before a school-data question is executed.
- Audio is not retained by default; any retention requires explicit policy and consent.
- Accessible keyboard controls and a text-only equivalent.
- Rate and cost limits by user and school.

## 3. Avatar/lip-sync video — future phase

The avatar should be an optional presentation layer over an already completed answer. It should not have separate knowledge or permissions.

Recommended pipeline:

`grounded answer → approved text → speech audio → avatar/lip-sync render → streamed or generated video`

Start with short, asynchronous clips for lesson explanations. Realtime avatars are much more expensive and add latency, moderation, consent and device-performance concerns. Schools should choose approved avatars; cloning a real teacher or student must require explicit consent and governance. Cache only reusable, non-personal lesson clips, and always keep the transcript and sources visible beside the video.

## Shared experience

Use one AI page with three mode tabs:

- **Chat** — active.
- **Voice** — next, marked beta until device and language testing passes.
- **Avatar** — visible only when there is a real prototype; avoid a dead navigation item meanwhile.

All modes should use the same session history. A conversation started by voice can continue in text, and an avatar clip should remain attached to the answer that produced it. Sources remain visible in every mode.

## Delivery order

1. Deploy and verify grounded chat.
2. Add feedback and observability.
3. Build push-to-talk with live partial transcript and existing answer speech.
4. Test web microphone support and native permissions in all three languages.
5. Evaluate full-duplex realtime voice only after push-to-talk usage is understood.
6. Prototype asynchronous avatar clips with one approved avatar and measured cost/latency.
