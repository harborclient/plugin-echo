import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const bundlePath = join(root, '..', 'dist/renderer.js');
const code = readFileSync(bundlePath, 'utf8');

const stripped = code.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

// react and react-dom are intentionally external (provided by the host), but
// react/jsx-runtime is NOT exposed by the host, so it must never remain bare.
const bareJsxRuntime = /from\s+['"]react\/jsx-runtime['"]/.test(stripped);
const bareJsxDevRuntime = /from\s+['"]react\/jsx-dev-runtime['"]/.test(stripped);

if (bareJsxRuntime || bareJsxDevRuntime) {
  console.error('dist/renderer.js contains an unresolved react jsx-runtime import:');
  if (bareJsxRuntime) console.error('  - from "react/jsx-runtime"');
  if (bareJsxDevRuntime) console.error('  - from "react/jsx-dev-runtime"');
  process.exit(1);
}

// The bundle must include exactly one SDK reactHost singleton.
const hostReactMatches = stripped.match(/\b(?:var|let)\s+hostReact\b/g) ?? [];
if (hostReactMatches.length !== 1) {
  console.error(
    `Expected exactly one hostReact declaration in dist/renderer.js, found ${hostReactMatches.length}`
  );
  process.exit(1);
}

console.log('Renderer bundle validation passed.');
