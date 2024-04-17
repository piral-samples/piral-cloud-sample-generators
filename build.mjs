import { build } from 'esbuild';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const generators = resolve(process.cwd(), 'generators');

const names = await readdir(generators);

await Promise.all(
  names.map(async (name) => {
    const entry = resolve(generators, name, 'index.ts');
    await build({
      entryPoints: [entry],
      loader: {
        '.ejs': 'text',
      },
      bundle: true,
      format: 'cjs',
      platform: 'node',
      target: 'node20',
      outfile: resolve(process.cwd(), 'dist', `${name}.js`),
    });
  }),
);
