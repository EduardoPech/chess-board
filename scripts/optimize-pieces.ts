// One-time transform: shrink the bundled piece SVGs with SVGO.
// Run with: bun scripts/optimize-pieces.ts
// Rewrites src/pieces-svg.ts in place. Visual output must stay identical —
// verify by eyeballing the docs site after running.
import { optimize } from 'svgo';
import { PIECE_SVGS } from '../src/pieces-svg.ts';

const optimized: Record<string, string> = {};

for (const [key, svg] of Object.entries(PIECE_SVGS)) {
  const result = optimize(svg, {
    multipass: true,
    plugins: [
      // preset-default does not touch viewBox unless width/height also
      // exist and match it — our source SVGs carry no width/height, so
      // viewBox survives untouched with the defaults below.
      'preset-default',
      { name: 'convertPathData', params: { floatPrecision: 0 } },
      { name: 'cleanupNumericValues', params: { floatPrecision: 0 } },
    ],
  });
  optimized[key] = result.data;
}

let before = 0;
let after = 0;
for (const key of Object.keys(PIECE_SVGS)) {
  before += PIECE_SVGS[key]!.length;
  after += optimized[key]!.length;
}
console.log(`pieces-svg.ts: ${before} -> ${after} chars (${((1 - after / before) * 100).toFixed(1)}% smaller)`);

const entries = Object.entries(optimized)
  .map(([key, svg]) => `  "${key}": ${JSON.stringify(svg)},`)
  .join('\n');

const output = `export const PIECE_SVGS: Record<string, string> = {\n${entries}\n};\n`;

await Bun.write(new URL('../src/pieces-svg.ts', import.meta.url), output);
console.log('src/pieces-svg.ts rewritten.');
