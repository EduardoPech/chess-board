// Bundle size guard. Run after `bun run build`.
// Fails the run if dist/index.js gzip exceeds the budget, so bundle weight
// regressions get caught in CI instead of discovered after publish.
import { gzipSync } from 'node:zlib';

const GZIP_BUDGET_BYTES = 15 * 1024; // 15 KB — see docs/adr/0001-default-pieces-bundled.md

const file = new URL('../dist/index.js', import.meta.url);
const raw = await Bun.file(file).arrayBuffer();
const rawBytes = raw.byteLength;
const gzipBytes = gzipSync(Buffer.from(raw)).byteLength;

const fmt = (n: number) => `${(n / 1024).toFixed(2)} KB`;

console.log(`dist/index.js: ${fmt(rawBytes)} raw, ${fmt(gzipBytes)} gzip`);

if (gzipBytes > GZIP_BUDGET_BYTES) {
  console.error(
    `Size budget exceeded: ${fmt(gzipBytes)} > ${fmt(GZIP_BUDGET_BYTES)} (gzip budget)`,
  );
  process.exit(1);
}
