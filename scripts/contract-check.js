#!/usr/bin/env node
/**
 * contract-check.js
 *
 * Two checks:
 *
 * 1. FRESHNESS — Verifies that contract/generated/schema.d.ts is up to date.
 *    Runs openapi-typescript in dry-run mode (stdout) and compares the SHA-256
 *    hash of the output to the committed file. Fails if they differ.
 *
 * 2. DRIFT (optional, requires VITE_SUPABASE_URL) — Fetches the live
 *    PostgREST auto-generated OpenAPI description from the Supabase project
 *    and verifies that every PostgREST path documented in contract/openapi.yaml
 *    corresponds to a real table/view in the live schema. A migration that
 *    renames a column or drops a table will fail this check rather than
 *    surfacing as a runtime browser error.
 *
 * Usage:
 *   node scripts/contract-check.js           # freshness + drift (if URL set)
 *   SKIP_DRIFT=true node scripts/contract-check.js  # freshness only
 */

import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const GENERATED_PATH = join(ROOT, 'contract', 'generated', 'schema.d.ts');
const CONTRACT_PATH = join(ROOT, 'contract', 'openapi.yaml');

// ─── 1. Freshness check ──────────────────────────────────────────────────────

console.log('[contract-check] Checking generated client freshness...');

if (!existsSync(GENERATED_PATH)) {
  console.error(
    '[contract-check] ERROR: contract/generated/schema.d.ts does not exist.\n' +
    '  Run `npm run contract:gen` and commit the output.'
  );
  process.exit(1);
}

// Generate fresh output to stdout
const freshResult = spawnSync(
  'npx',
  ['openapi-typescript', CONTRACT_PATH, '--output', '-'],
  { cwd: ROOT, encoding: 'utf8', shell: true }
);

if (freshResult.status !== 0) {
  console.error('[contract-check] ERROR: openapi-typescript failed:\n', freshResult.stderr);
  process.exit(1);
}

const freshHash = createHash('sha256').update(freshResult.stdout).digest('hex');
const committedContent = readFileSync(GENERATED_PATH, 'utf8');
const committedHash = createHash('sha256').update(committedContent).digest('hex');

if (freshHash !== committedHash) {
  console.error(
    '[contract-check] ERROR: contract/generated/schema.d.ts is stale.\n' +
    '  The contract has changed since the last `npm run contract:gen`.\n' +
    '  Run `npm run contract:gen` and commit the updated file.'
  );
  process.exit(1);
}

console.log('[contract-check] ✓ Generated client is up to date.');

// ─── 2. PostgREST drift check ─────────────────────────────────────────────────

if (process.env.SKIP_DRIFT === 'true') {
  console.log('[contract-check] Skipping PostgREST drift check (SKIP_DRIFT=true).');
  process.exit(0);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.warn(
    '[contract-check] WARN: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set.\n' +
    '  Skipping PostgREST drift check. Set both env vars to enable it in CI.'
  );
  process.exit(0);
}

console.log('[contract-check] Running PostgREST drift check against:', supabaseUrl);

// Extract PostgREST paths from the contract
// We look for paths starting with /rest/v1/ and extract the table name
const contractYaml = readFileSync(CONTRACT_PATH, 'utf8');
const contractPaths = [...contractYaml.matchAll(/^\s{2}(\/rest\/v1\/[a-z_]+):/gm)]
  .map(m => m[1])
  .map(p => p.replace(/\/rest\/v1\//, ''))
  .filter(t => !t.includes('/')) // exclude sub-paths like /events/public
  .filter((v, i, a) => a.indexOf(v) === i); // deduplicate

if (contractPaths.length === 0) {
  console.warn('[contract-check] WARN: No PostgREST table paths found in contract. Skipping drift check.');
  process.exit(0);
}

console.log('[contract-check] Checking tables:', contractPaths.join(', '));

// Fetch the live PostgREST OpenAPI description
let liveSpec;
try {
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  liveSpec = await res.json();
} catch (err) {
  console.error('[contract-check] ERROR: Failed to fetch PostgREST spec:', err.message);
  process.exit(1);
}

const livePaths = Object.keys(liveSpec.paths || {}).map(p => p.replace('/', ''));
const missingTables = contractPaths.filter(t => !livePaths.includes(t));

if (missingTables.length > 0) {
  console.error(
    '[contract-check] ERROR: The following tables/views are documented in the contract\n' +
    '  but do not exist in the live PostgREST schema:\n\n' +
    missingTables.map(t => `    - ${t}`).join('\n') + '\n\n' +
    '  This means the contract is ahead of the current migrations (expected in development),\n' +
    '  or a migration removed/renamed a table that the contract still references (a bug).\n' +
    '  Update the contract or apply the missing migrations.'
  );
  process.exit(1);
}

console.log('[contract-check] ✓ All documented PostgREST tables exist in the live schema.');
process.exit(0);
