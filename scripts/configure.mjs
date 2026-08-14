import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

const values = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index]?.replace(/^--/, '');
  const value = process.argv[index + 1];
  if (key && value) values.set(key, value);
}

const name = values.get('name');
const slug = values.get('slug');
const scheme = values.get('scheme') ?? slug?.replace(/[^a-zA-Z0-9]/g, '');
const bundleId = values.get('bundle-id');

if (!name || !slug || !scheme) {
  console.error('Usage: npm run configure -- --name "My App" --slug my-app [--scheme myapp] [--bundle-id com.company.myapp]');
  process.exit(1);
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('Slug must contain lowercase letters, numbers, and single hyphens.');
  process.exit(1);
}

if (!/^[a-z][a-z0-9+.-]*$/i.test(scheme)) {
  console.error('Scheme must start with a letter and contain only letters, numbers, +, . or -.');
  process.exit(1);
}

if (bundleId && !/^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/.test(bundleId)) {
  console.error('Bundle ID must use reverse-domain notation, for example com.company.myapp.');
  process.exit(1);
}

const appJson = JSON.parse(await readFile('app.json', 'utf8'));
appJson.expo.name = name;
appJson.expo.slug = slug;
appJson.expo.scheme = scheme;
if (bundleId) {
  appJson.expo.ios.bundleIdentifier = bundleId;
  appJson.expo.android.package = bundleId;
}
await writeFile('app.json', `${JSON.stringify(appJson, null, 2)}\n`);

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
packageJson.name = slug;
await writeFile('package.json', `${JSON.stringify(packageJson, null, 2)}\n`);

try {
  const packageLock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  packageLock.name = slug;
  if (packageLock.packages?.['']) packageLock.packages[''].name = slug;
  await writeFile('package-lock.json', `${JSON.stringify(packageLock, null, 2)}\n`);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const configPath = 'constants/config.ts';
const config = await readFile(configPath, 'utf8');
const nextConfig = config.replace(/name: '[^']*'/, `name: '${name.replaceAll("'", "\\'")}'`);
await writeFile(configPath, nextConfig);

console.log(`Configured ${name} (${slug}) with URL scheme ${scheme}.`);
console.log('Next: replace assets, verify bundle identifiers, and create your .env file.');
