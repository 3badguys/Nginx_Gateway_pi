import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = join(ROOT, '.env');
const TEMPLATE_FILE = join(ROOT, 'frpc.toml.template');
const OUTPUT_FILE = join(ROOT, 'frpc.toml');

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

// ----- 3. Substitute template -----
const template = readFileSync(TEMPLATE_FILE, 'utf-8');
const result = template.replace(/\$\{(\w+)\}/g, (_, key) =>
  Object.hasOwn(env, key) ? env[key] : `\${${key}}`
);

// ----- 4. Write frpc.toml -----
writeFileSync(OUTPUT_FILE, result);
console.log('frpc.toml generated successfully.');
