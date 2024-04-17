import { pack } from 'tar-stream';
import { constants, createGzip } from 'zlib';

export const name = 'steps-generator';
export const version = '0.1.0';
export const author = 'Jose Stepo';
export const link = 'https://github.com/piral-samples/piral-cloud-sample-generators';
export const icon = 'https://www.piral.cloud/piral-logo.8ae74175.png';
export const description = 'A generator showing the different step values.';
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
  {
    name: 'count',
    description: 'A number input.',
    value: {
      type: 'number',
      default: 0,
      example: 2,
    },
  },
  {
    name: 'notify',
    description: 'A boolean input.',
    value: {
      type: 'boolean',
      default: false,
      example: true,
    },
  },
  {
    name: 'language',
    description: 'An enum input.',
    value: {
      type: 'enum',
      choices: ['en', 'de'],
      default: 'en',
      example: 'de',
    },
  },
  {
    name: 'fruits',
    description: 'A multi input.',
    value: {
      type: 'multi',
      schema: {
        type: 'string',
        default: '',
        example: 'banana',
      },
      default: [],
      example: ['orange', 'apple'],
      minimum: 0,
      maximum: 5,
    },
  },
];

interface Data {
  name: string;
  version: string;
  appShell: string;
  count: number;
  notify: boolean;
  language: 'en' | 'de';
  fruits: Array<string>;
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

function createTextFile(source: string): Buffer {
  return Buffer.from(source, 'utf8');
}

function createJsonFile(content: any): Buffer {
  return createTextFile(JSON.stringify(content, undefined, 2));
}

export async function validate(input: Data) {
  const { appShell, name, version, count, fruits, language, notify } = input;

  if (
    typeof name === 'string' &&
    typeof version === 'string' &&
    typeof appShell === 'string' &&
    typeof count === 'number' &&
    typeof language === 'string' &&
    typeof notify === 'boolean' &&
    name.trim().length > 0 &&
    version.trim().length > 0 &&
    appShell.trim().length > 0 &&
    Array.isArray(fruits) &&
    fruits.every((m) => typeof m === 'string')
  ) {
    return true;
  }

  return false;
}

export async function generate(input: Data) {
  const { appShell, name, version, count, fruits, language, notify } = input;
  const importCode: Array<string> = [];
  const files: Record<string, Buffer> = {};

  files['package.json'] = createJsonFile({
    name,
    version,
    description: '',
    keywords: ['pilet'],
    scripts: {
      start: 'pilet debug',
      build: 'pilet build',
      upgrade: 'pilet upgrade',
    },
    source: 'src/index.tsx',
    main: 'dist/index.js',
    files: ['dist'],
    dependencies: {},
    devDependencies: {
      '@types/node': 'latest',
      'piral-cli': 'latest',
      'piral-cli-esbuild': 'latest',
      tslib: 'latest',
      typescript: 'latest',
      [appShell]: 'latest',
    },
    importmap: {
      imports: {},
      inherit: [appShell],
    },
  });

  files['pilet.json'] = createJsonFile({
    schemaVersion: 'v2',
    $schema: 'https://docs.piral.io/schemas/pilet-v0.json',
    piralInstances: {
      [appShell]: {},
    },
  });

  files['tsconfig.json'] = createJsonFile({
    compilerOptions: {
      declaration: true,
      noImplicitAny: false,
      removeComments: false,
      noLib: false,
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
      target: 'es6',
      sourceMap: true,
      outDir: './dist',
      skipLibCheck: true,
      lib: ['dom', 'es2018'],
      moduleResolution: 'node',
      module: 'esnext',
      jsx: 'react',
      importHelpers: true,
    },
    include: ['src'],
    exclude: ['node_modules'],
  });

  files['src/index.tsx'] = createTextFile(`import { PiletApi } from ${JSON.stringify(appShell)};
${importCode.join('\n')}
  
export function setup(api: PiletApi) {
  console.log("The chosen count was", ${JSON.stringify(count)});
  console.log("Your fruits have been", ${JSON.stringify(fruits)});
  console.log("The selected language was", ${JSON.stringify(language)});
  console.log("You selected notify", ${JSON.stringify(notify)});
}
`);

  return await createPackage(files);
}
