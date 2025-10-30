import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import json from '@rollup/plugin-json';
import { fileURLToPath } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const stub = (p) => resolvePath(__dirname, p);

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/browser/swap.esm.js',
    format: 'esm',
    sourcemap: true,
    inlineDynamicImports: true,
  },
  plugins: [
    alias({
      entries: [
        { find: 'ws', replacement: stub('./stubs/ws-empty.js') },
        { find: 'http', replacement: stub('./stubs/empty.js') },
        { find: 'https', replacement: stub('./stubs/empty.js') },
        { find: 'fs', replacement: stub('./stubs/empty.js') },
      ],
    }),
    resolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    json(),
    replace({
      preventAssignment: true,
      values: {
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
    }),
  ],
};
