import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'dist/server',
  target: 'node18',
  external: [
    'express',
    'ws',
    'chokidar',
    'open',
    'yaml',
    '@famgia/omnify-core',
    '@famgia/omnify-laravel',
    '@famgia/omnify-sql',
  ],
  banner: {
    js: '#!/usr/bin/env node',
  },
});
