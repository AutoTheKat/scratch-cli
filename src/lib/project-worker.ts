import './suppress-vm-logs.ts';
import './patches.ts';
import { parentPort, workerData } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
import { Scaffolding } from '@turbowarp/scaffolding';
import type { HTMLCanvasElement } from '@onirenaud/node-webgl';

export type ProjectMessage =
  | { type: 'progress'; percent: number }
  | { type: 'frame'; buffer: Uint8Array };

if (!parentPort || typeof workerData !== 'string') {
  // This is to just get TypeScript to stop complaining,
  // Realistically this should never be called.
  throw new Error('This should never happen.');
}

const port = parentPort;
const scaffolding = new Scaffolding();

port.on('message', message => {
  if (message === 'stop') {
    process.exit(0);
  }
});

function renderFrame() {
  const canvas = scaffolding.vm.runtime.renderer.canvas as unknown as HTMLCanvasElement;
  port.postMessage({
    type: 'frame',
    buffer: canvas.toBuffer('image/png')
  });
  setImmediate(renderFrame);
}

async function loadProject() {
  const buffer = await readFile(workerData);
  scaffolding.setup();

  const onProgress = (finished: number, total: number) => {
    const percent = total > 0 ? Math.round(finished / total * 100) : 0;
    port.postMessage({
      type: 'progress',
      percent
    });
  };

  scaffolding.vm.on('ASSET_PROGRESS', onProgress);
  try {
    await scaffolding.loadProject(buffer);
  } finally {
    scaffolding.vm.off('ASSET_PROGRESS', onProgress);
  }

  scaffolding.start();
  renderFrame();
}

loadProject();
