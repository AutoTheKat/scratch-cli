import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const [pack] = JSON.parse(
  execFileSync('npm', ['pack', '--json'], { encoding: 'utf8' })
);

for (const platform of readdirSync('prebuilds')) {
  const binaries = [
    `canvas/prebuilds/${platform}/canvas.node`,
    `@onirenaud/node-webgl/prebuilds/${platform}/node.napi.node`
  ];

  for (const binary of binaries) {
    assert(
      pack.files.some(
        (file) => file.path === `node_modules/${binary}`
      ),
      `Missing packed binary: ${binary}`
    );
  }
}

process.stdout.write(`tarball=${pack.filename}\n`);
