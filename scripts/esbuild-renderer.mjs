import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const watch = process.argv.includes('--watch');

const shared = {
  entryPoints: [join(root, 'src/renderer.tsx')],
  bundle: true,
  outfile: join(root, 'dist/renderer.js'),
  format: 'esm',
  jsx: 'automatic',
  jsxImportSource: '@harborclient/sdk',
  // react and react-dom are provided by the HarborClient host at runtime.
  external: ['react', 'react-dom'],
  // The host does not expose react/jsx-runtime; route bundled deps (e.g.
  // @uiw/react-codemirror) through the SDK runtime, which forwards to hc.react.
  alias: {
    'react/jsx-runtime': '@harborclient/sdk/jsx-runtime',
    'react/jsx-dev-runtime': '@harborclient/sdk/jsx-dev-runtime'
  }
};

if (watch) {
  const ctx = await esbuild.context(shared);
  await ctx.watch();
  console.log('Watching renderer…');
} else {
  await esbuild.build(shared);
}
