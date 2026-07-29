// Enforces docs/architecture/performance-budget.md against the just-built frontend/dist.
// Run after `vite build`. Exits non-zero (failing CI) if any budget is exceeded.
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ASSETS_DIR = join(process.cwd(), 'dist', 'assets');

// Budgets from docs/architecture/performance-budget.md. Keep these two in sync — this script
// exists specifically so a drift between them stops being possible to miss.
const BUDGET = {
  initialJsGzipBytes: 280 * 1024,
  singleChunkGzipBytes: 170 * 1024,
  cssGzipBytes: 25 * 1024,
};

// The entry chunk and the App shell (dynamically imported unconditionally by main.tsx on every
// route, so it's part of the initial payload in practice even though it's a separate chunk) —
// see the "Initial JS" comment in frontend/vite.config.ts / src/main.tsx for why App is split at
// all despite loading eagerly.
const INITIAL_CHUNK_PREFIXES = ['index-', 'App-'];

function gzipSize(path) {
  return gzipSync(readFileSync(path)).length;
}

function fmtKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

let files;
try {
  files = readdirSync(ASSETS_DIR);
} catch {
  console.error(`Bundle budget check: could not read ${ASSETS_DIR}. Run "npm run build" first.`);
  process.exit(1);
}

const jsFiles = files.filter((f) => f.endsWith('.js'));
const cssFiles = files.filter((f) => f.endsWith('.css'));

let failed = false;
const rows = [];

let initialJsGzip = 0;
for (const file of jsFiles) {
  const size = gzipSize(join(ASSETS_DIR, file));
  const isInitial = INITIAL_CHUNK_PREFIXES.some((p) => file.startsWith(p));
  if (isInitial) initialJsGzip += size;

  const overSingleBudget = size > BUDGET.singleChunkGzipBytes;
  if (overSingleBudget) failed = true;
  rows.push(
    `  ${overSingleBudget ? '✗' : '✓'} ${file}: ${fmtKb(size)} gzip${isInitial ? ' (initial)' : ''}`,
  );
}

let cssGzip = 0;
for (const file of cssFiles) {
  cssGzip += gzipSize(join(ASSETS_DIR, file));
}

console.log('Bundle budget check (docs/architecture/performance-budget.md):\n');
console.log(rows.join('\n'));
console.log('');

const initialOverBudget = initialJsGzip > BUDGET.initialJsGzipBytes;
const cssOverBudget = cssGzip > BUDGET.cssGzipBytes;
if (initialOverBudget) failed = true;
if (cssOverBudget) failed = true;

console.log(
  `  ${initialOverBudget ? '✗' : '✓'} Initial JS total: ${fmtKb(initialJsGzip)} / ${fmtKb(BUDGET.initialJsGzipBytes)} budget`,
);
console.log(
  `  ${cssOverBudget ? '✗' : '✓'} CSS total: ${fmtKb(cssGzip)} / ${fmtKb(BUDGET.cssGzipBytes)} budget`,
);

if (failed) {
  console.error('\nBundle budget exceeded — see docs/architecture/performance-budget.md.');
  process.exit(1);
}

console.log('\nAll bundle budgets met.');
