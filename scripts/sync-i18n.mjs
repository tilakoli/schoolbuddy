// Keeps mobile's translation files (constants/i18n/*.json) in sync with
// web's (web/messages/*.json, the canonical source) — replaces the old
// "remember to run `cp`" step from before this migration, which is exactly
// how a key ended up missing from one language for a while undetected.
//
// Usage:
//   node scripts/sync-i18n.mjs          copies web/messages/*.json -> constants/i18n/*.json
//   node scripts/sync-i18n.mjs --check  reports drift/missing keys, exits 1 if any found, copies nothing
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LOCALES = ['en', 'hi', 'te'];
const webDir = path.join(root, 'web', 'messages');
const mobileDir = path.join(root, 'constants', 'i18n');
const check = process.argv.includes('--check');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function collectKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) keys.push(...collectKeys(value, fullKey));
    else keys.push(fullKey);
  }
  return keys;
}

function diffKeys(aLabel, a, bLabel, b) {
  const aKeys = new Set(collectKeys(a));
  const bKeys = new Set(collectKeys(b));
  const missingFromB = [...aKeys].filter((k) => !bKeys.has(k));
  const missingFromA = [...bKeys].filter((k) => !aKeys.has(k));
  const problems = [];
  if (missingFromB.length) problems.push(`  missing from ${bLabel} (present in ${aLabel}): ${missingFromB.join(', ')}`);
  if (missingFromA.length) problems.push(`  missing from ${aLabel} (present in ${bLabel}): ${missingFromA.join(', ')}`);
  return problems;
}

if (check) {
  let hadProblems = false;

  // Every language must have exactly the same key set as English, within each platform.
  for (const dir of [webDir, mobileDir]) {
    const en = readJson(path.join(dir, 'en.json'));
    for (const locale of LOCALES.filter((l) => l !== 'en')) {
      const other = readJson(path.join(dir, `${locale}.json`));
      const problems = diffKeys('en', en, locale, other);
      if (problems.length) {
        hadProblems = true;
        console.error(`\n${path.relative(root, dir)}: en.json vs ${locale}.json`);
        problems.forEach((p) => console.error(p));
      }
    }
  }

  // Web and mobile copies of each locale must be identical (byte-for-byte content, not just keys).
  for (const locale of LOCALES) {
    const webJson = readJson(path.join(webDir, `${locale}.json`));
    const mobileJson = readJson(path.join(mobileDir, `${locale}.json`));
    if (JSON.stringify(webJson) !== JSON.stringify(mobileJson)) {
      hadProblems = true;
      console.error(`\nweb/messages/${locale}.json and constants/i18n/${locale}.json have drifted.`);
      const problems = diffKeys(`web/${locale}`, webJson, `mobile/${locale}`, mobileJson);
      problems.forEach((p) => console.error(p));
      console.error(`  run \`node scripts/sync-i18n.mjs\` to fix.`);
    }
  }

  if (hadProblems) {
    console.error('\ni18n check failed.');
    process.exit(1);
  }
  console.log('i18n check passed — all locales in sync, no missing keys.');
} else {
  for (const locale of LOCALES) {
    const src = path.join(webDir, `${locale}.json`);
    const dest = path.join(mobileDir, `${locale}.json`);
    writeFileSync(dest, readFileSync(src));
    console.log(`synced ${path.relative(root, dest)}`);
  }
}
