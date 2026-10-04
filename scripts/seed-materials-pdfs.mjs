// School Buddy: generates real NCERT-aligned chapter PDFs (3 per subject per
// class — Mathematics, Science, English, History, Computer Science — for
// both Class 9 and Class 10, 30 total) and uploads them straight to the
// `materials` Storage bucket plus matching `materials`/`material_files` rows,
// using the service-role key from web/.env.local. Chapter content in
// scripts/seed-materials-pdfs.chapters.mjs is original writing based on real
// NCERT chapter names/structure (verified via web search), not reproduced
// textbook or story/poem text.
//
// Unlike the scripts/seed-*.sql files (which you paste into Supabase
// Dashboard -> SQL Editor yourself), this one writes to your live Supabase
// project directly when you run it — review scripts/seed-materials-pdfs.chapters.mjs
// first if you want to see exactly what it will create.
//
// Requires scripts/seed-full-dataset.sql to have been run first (looks up
// the 5 test teachers + 10 class offerings it creates, by email/id) and
// supabase/migrations/0027_material_video_links.sql to be applied.
// Adds materials alongside the existing seeded ones — does not touch them.
//
// Usage: npm install (installs pdfkit, declared in the root package.json),
// then: node scripts/seed-materials-pdfs.mjs
// Safe to re-run — deletes any of its own previously-created materials
// (matched by title + class) before recreating them.

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import PDFDocument from 'pdfkit';
import { CLASSES, CHAPTERS } from './seed-materials-pdfs.chapters.mjs';

function loadEnvLocal(path) {
  const env = {};
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return env;
  }
  for (const line of text.split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

const env = { ...loadEnvLocal(new URL('../web/.env.local', import.meta.url)), ...process.env };
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — check web/.env.local.');
}

const headers = (extra = {}) => ({ apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, ...extra });

function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function buildPdf({ title, chapter, content }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).font('Helvetica-Bold').text(title);
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica-Oblique').fillColor('#555555').text(chapter);
    doc.fillColor('#000000');
    doc.moveDown(1);
    doc.fontSize(11).font('Helvetica');
    for (const paragraph of content) {
      doc.text(paragraph, { align: 'justify', lineGap: 4 });
      doc.moveDown(0.8);
    }
    doc.end();
  });
}

async function getTeacherIds() {
  const emails = [...new Set(Object.values(CLASSES).map((c) => c.teacherEmail))];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,email&email=in.(${emails.join(',')})`, { headers: headers() });
  if (!res.ok) throw new Error(`Failed to fetch teacher ids: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  const byEmail = new Map(rows.map((r) => [r.email, r.id]));
  for (const email of emails) {
    if (!byEmail.has(email)) throw new Error(`Teacher not found: ${email} — run scripts/seed-full-dataset.sql first.`);
  }
  return byEmail;
}

async function getClassIds(teacherIdByEmail) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/classes?select=id,teacher_id,subjects(name),class_groups(name)`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`Failed to fetch classes: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  const byKey = new Map(rows.map((r) => [`${r.teacher_id}|${r.subjects?.name}|${r.class_groups?.name}`, r.id]));

  const resolved = new Map();
  for (const [classKey, cls] of Object.entries(CLASSES)) {
    const teacherId = teacherIdByEmail.get(cls.teacherEmail);
    const classId = byKey.get(`${teacherId}|${cls.subjectName}|${cls.classGroupName}`);
    if (!classId) throw new Error(`Class not found for ${classKey} (${cls.subjectName}, ${cls.classGroupName}) — run scripts/seed-full-dataset.sql first.`);
    resolved.set(classKey, classId);
  }
  return resolved;
}

async function deleteExisting(classId, title) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/materials?select=id&class_id=eq.${classId}&title=eq.${encodeURIComponent(title)}`,
    { headers: headers() }
  );
  if (!res.ok) return;
  const rows = await res.json();
  for (const row of rows) {
    const filesRes = await fetch(`${SUPABASE_URL}/rest/v1/material_files?select=file_path&material_id=eq.${row.id}`, { headers: headers() });
    const files = filesRes.ok ? await filesRes.json() : [];
    for (const file of files) {
      await fetch(`${SUPABASE_URL}/storage/v1/object/materials/${file.file_path}`, { method: 'DELETE', headers: headers() });
    }
    await fetch(`${SUPABASE_URL}/rest/v1/materials?id=eq.${row.id}`, { method: 'DELETE', headers: headers() });
  }
}

async function main() {
  const teacherIdByEmail = await getTeacherIds();
  const classIdByKey = await getClassIds(teacherIdByEmail);
  let ok = 0;
  let failed = 0;

  for (const entry of CHAPTERS) {
    const cls = CLASSES[entry.classKey];
    const teacherId = teacherIdByEmail.get(cls.teacherEmail);
    const classId = classIdByKey.get(entry.classKey);
    const materialId = randomUUID();
    const filePath = `${classId}/${materialId}/0-${slug(entry.title)}.pdf`;
    const extractedText = entry.content.join('\n\n');

    try {
      await deleteExisting(classId, entry.title);
      const pdfBuffer = await buildPdf(entry);

      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/materials/${filePath}`, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/pdf', 'x-upsert': 'true' }),
        body: pdfBuffer,
      });
      if (!uploadRes.ok) throw new Error(`Storage upload failed: ${uploadRes.status} ${await uploadRes.text()}`);

      const materialRes = await fetch(`${SUPABASE_URL}/rest/v1/materials`, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({
          id: materialId,
          class_id: classId,
          teacher_id: teacherId,
          title: entry.title,
          chapter: entry.chapter,
          status: 'extracted',
          extracted_text: extractedText,
          summary: entry.summary,
        }),
      });
      if (!materialRes.ok) throw new Error(`materials insert failed: ${materialRes.status} ${await materialRes.text()}`);

      const fileRes = await fetch(`${SUPABASE_URL}/rest/v1/material_files`, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ material_id: materialId, file_path: filePath, mime_type: 'application/pdf', position: 0 }),
      });
      if (!fileRes.ok) throw new Error(`material_files insert failed: ${fileRes.status} ${await fileRes.text()}`);

      console.log(`OK  ${entry.classKey.padEnd(10)} ${entry.title}`);
      ok += 1;
    } catch (error) {
      console.error(`FAIL ${entry.classKey.padEnd(10)} ${entry.title} —`, error.message);
      failed += 1;
    }
  }

  console.log(`\nDone: ${ok} uploaded, ${failed} failed, out of ${CHAPTERS.length}.`);
  if (failed > 0) process.exitCode = 1;
}

main();
