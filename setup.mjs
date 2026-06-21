import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = join(ROOT, '.env');

// ----- 1. Check .env exists -----
if (!existsSync(ENV_FILE)) {
  console.error('Error: .env file not found.');
  console.error('Copy .env.example to .env and fill in your values:');
  console.error('  copy .env.example .env');
  process.exit(1);
}

// ----- 2. Parse .env -----
const envRaw = readFileSync(ENV_FILE, 'utf-8');
const env = {};
for (const line of envRaw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

// ----- 3. Find & process all .template files -----
const files = readdirSync(ROOT);
const templateFiles = files.filter(f => f.endsWith('.template'));

if (templateFiles.length === 0) {
  console.log('No .template files found.');
  process.exit(0);
}

for (const tpl of templateFiles) {
  const outputName = basename(tpl, '.template');            // "frpc.toml.template" → "frpc.toml"
  const template = readFileSync(join(ROOT, tpl), 'utf-8');
  const result = template.replace(/\$\{(\w+)\}/g, (_, key) =>
    Object.hasOwn(env, key) ? env[key] : `\${${key}}`
  );
  writeFileSync(join(ROOT, outputName), result);
  console.log(`${outputName} generated from ${tpl}.`);
}
