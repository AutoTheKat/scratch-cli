import { cpSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const platform = `${process.platform}-${process.arch}`;
const target = join('prebuilds', platform);
const webglRoot = 'node_modules/@onirenaud/node-webgl';
const webglRequire = createRequire(
  require.resolve('@onirenaud/node-webgl/package.json')
);
const webglBinary = webglRequire('node-gyp-build').path(webglRoot);

mkdirSync(join(target, 'webgl'), { recursive: true });
cpSync('node_modules/canvas/build/Release', join(target, 'canvas'), {
  recursive: true
});
cpSync(webglBinary, join(target, 'webgl/node.napi.node'));
