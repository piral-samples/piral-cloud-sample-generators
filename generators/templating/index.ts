/// <reference path="./module.d.ts" />

import { pack } from 'tar-stream';
import { constants, createGzip } from 'zlib';
import { render } from 'ejs';

import indexTsxTemplate from './index.tsx.ejs';
import packageJsonTemplate from './package.json.ejs';
import piletJsonTemplate from './pilet.json.ejs';
import tsconfigJsonTemplate from './tsconfig.json.ejs';

export const name = 'templating-generator';
export const version = '0.1.0';
export const extension = '.tgz';
export const author = 'Manu Temporo';
export const link = 'https://github.com/piral-samples/piral-cloud-sample-generators';
export const icon = 'https://www.piral.cloud/piral-logo.8ae74175.png';
export const description = 'A generator showing how to use EJS for templating.';
export const steps = [
  {
    name: 'name',
    description: 'The name of the pilet.',
    value: {
      type: 'string',
      default: 'sample-pilet',
      example: '@org/foo',
    },
  },
  {
    name: 'version',
    description: 'The version of the pilet.',
    value: {
      type: 'string',
      default: '1.0.0',
      example: '1.2.3',
    },
  },
  {
    name: 'appShell',
    description: 'The name of the (primary / main) app shell.',
    value: {
      type: 'string',
      default: 'sample-piral',
      example: '@org/app',
    },
  },
];

interface Data {
  name: string;
  version: string;
  appShell: string;
}

async function createPackage(files: Record<string, Buffer>) {
  const tar = pack();
  const gzipStream = createGzip({ level: constants.Z_BEST_COMPRESSION });
  const buffers: Array<Buffer> = [];

  Object.entries(files).forEach(([name, content]) => {
    tar.entry({ name }, content);
  });

  tar.finalize();

  for await (const data of tar.pipe(gzipStream)) {
    buffers.push(data);
  }

  return Buffer.concat(buffers);
}

function createFile(template: string, input: Data): Buffer {
  const source = render(template, input);
  return Buffer.from(source, 'utf8');
}

export async function validate(input: Data) {
  const { appShell, name, version } = input;

  if (typeof name === 'string' && typeof version === 'string' && typeof appShell === 'string') {
    return true;
  }

  return false;
}

export async function generate(input: Data) {
  const files: Record<string, Buffer> = {};

  files['package.json'] = createFile(packageJsonTemplate, input);
  files['pilet.json'] = createFile(piletJsonTemplate, input);
  files['tsconfig.json'] = createFile(tsconfigJsonTemplate, input);
  files['src/index.tsx'] = createFile(indexTsxTemplate, input);

  return await createPackage(files);
}
