import { pack } from 'tar-stream';
import { constants, createGzip } from 'zlib';

export const name = 'simple-generator';
export const version = '1.0.0';
export const author = 'Florian Rappl';
export const link = 'https://www.piral.cloud';
export const icon = 'https://www.piral.cloud/piral-logo.8ae74175.png';
export const description = 'A simple generator to get started.';
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
    name: 'pages',
    description: 'The number of sample pages to include in the pilet.',
    value: {
      type: 'number',
      default: 1,
      example: 15,
    },
  },
  {
    name: 'useReact',
    description: 'Indicates if React should be used. If not the pilet will fall back to HTML.',
    value: {
      type: 'boolean',
      default: true,
      example: false,
    },
  },
  {
    name: 'features',
    description: 'Indicates what features should be used.',
    value: {
      type: 'multi',
      schema: {
        type: 'enum',
        choices: ['menu', 'notification', 'dashboard'],
        default: 'menu',
        example: 'dashboard',
      },
      minimum: 0,
      maximum: 3,
    },
  },
];

interface Data {
  name: string;
  version: string;
  appShell: string;
  pages: number;
  useReact: boolean;
  features: Array<'menu' | 'notification' | 'dashboard'>;
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
  const { appShell, features, name, pages, useReact, version } = input;

  if (
    Array.isArray(features) &&
    typeof name === 'string' &&
    typeof version === 'string' &&
    typeof appShell === 'string' &&
    typeof useReact === 'boolean' &&
    typeof pages === 'number' &&
    name.trim().length > 0 &&
    version.trim().length > 0 &&
    appShell.trim().length > 0 &&
    features.every((m) => ['menu', 'notification', 'dashboard'].includes(m))
  ) {
    return true;
  }

  return false;
}

export async function generate(input: Data) {
  const { appShell, features, name, pages, useReact, version } = input;
  const importCode: Array<string> = [];
  const pagesCode: Array<string> = [];
  const files: Record<string, Buffer> = {};

  if (useReact) {
    importCode.push('import * as React from "react"');
  }

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
      ...(useReact
        ? {
            '@types/react': '^17',
            '@types/react-dom': '^17',
            '@types/react-router': '^5',
            '@types/react-router-dom': '^5',
            react: '^17',
            'react-dom': '^17',
            'react-router': '^5',
            'react-router-dom': '^5',
          }
        : {}),
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

  for (let i = 1; i <= pages; i++) {
    if (useReact) {
      files[`src/Page${i}.tsx`] = createTextFile(`import * as React from 'react';

export default function() {
  return (
    <>
      <h1>Page ${i} Title</h1>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
    </>
  );
}`);
      importCode.push(`const Page${i} = React.lazy(() => import("./Page${i}"))`);
      pagesCode.push(`api.registerPage('/page${i}', Page${i});`);
    } else {
      //TODO
    }
  }

  files['src/index.tsx'] = createTextFile(`import { PiletApi } from ${JSON.stringify(appShell)};
${importCode.join('\n')}
  
export function setup(api: PiletApi) {
  ${pagesCode.join('\n  ')}
}
`);

  return await createPackage(files);
}
