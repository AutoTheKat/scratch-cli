import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';

const source = 'prebuilds';
const platforms = readdirSync(source);
const packages = {
  canvas: 'node_modules/canvas',
  webgl: 'node_modules/@onirenaud/node-webgl'
};

assert(
  platforms.length > 0,
  'Collect prebuilt binaries before packing.'
);
for (const [name, root] of Object.entries(packages)) {
  rmSync(join(root, 'prebuilds'), { recursive: true, force: true });
  for (const platform of platforms) {
    const binary =
      name === 'canvas' ? 'canvas.node' : 'node.napi.node';
    const directory = join(source, platform, name);
    assert(
      existsSync(join(directory, binary)),
      `Missing ${platform}/${name}`
    );
    cpSync(directory, join(root, 'prebuilds', platform), {
      recursive: true
    });
  }

  // Published dependencies must never fall back to compiling on install.
  const manifestPath = join(root, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  delete manifest.scripts.install;
  manifest.gypfile = false;
  if (!manifest.files.includes('prebuilds')) {
    manifest.files.push('prebuilds');
  }
  writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2) + '\n'
  );
  rmSync(join(root, 'build'), { recursive: true, force: true });
}

const bindingsPath = join(packages.canvas, 'lib/bindings.js');
const bindings = readFileSync(bindingsPath, 'utf8');
assert(
  bindings.includes("require('../build/Release/canvas.node')"),
  'Canvas binding loader changed; update binary packaging.'
);
writeFileSync(
  bindingsPath,
  bindings.replace(
    "require('../build/Release/canvas.node')",
    'require(`../prebuilds/${process.platform}-${process.arch}/canvas.node`)'
  )
);
