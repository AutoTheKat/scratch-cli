import './suppress-vm-logs.ts';
import './patches.ts';
import { parentPort, workerData } from 'node:worker_threads';
import downloadProject from './download-project.ts';
import { createCanvas, ImageData } from 'canvas';
import { Scaffolding } from '@turbowarp/scaffolding';
import type { HTMLCanvasElement } from '@onirenaud/node-webgl';
import { ProjectControl } from '../types.ts';

export type ProjectMessage =
  | { type: 'progress'; percent: number }
  | { type: 'ready' }
  | { type: 'unchanged' }
  | { type: 'frame'; buffer: Uint8Array };

if (!parentPort || typeof workerData !== 'string') {
  // This is to just get TypeScript to stop complaining,
  // Realistically this should never be called.
  throw new Error('This should never happen.');
}

const port = parentPort;
const scaffolding = new Scaffolding();
const captureCanvas = createCanvas(480, 360);
const captureContext = captureCanvas.getContext('2d');
let previousPixels: Buffer | undefined;
let running = false;

function reportState() {
  port.postMessage({
    type: 'state',
    running,
    turbo: scaffolding.vm.runtime.turboMode
  });
}

port.on('message', (message) => {
  if (message === 'stop') {
    process.exit(0);
  }
  if (message === 'frame') {
    renderFrame();
  }
  if (message?.type === 'control') {
    if (message.action === ProjectControl.GreenFlag) {
      scaffolding.greenFlag();
    } else if (message.action === ProjectControl.Stop) {
      scaffolding.stopAll();
    } else if (message.action === ProjectControl.Turbo) {
      scaffolding.vm.setTurboMode(!scaffolding.vm.runtime.turboMode);
      reportState();
    }
  }
  if (message?.type === 'keyboard') {
    scaffolding.vm.postIOData('keyboard', message.data);
  }
  if (message?.type === 'mouse') {
    const canvas = scaffolding.vm.runtime.renderer.canvas;
    const data = message.data;
    scaffolding.vm.postIOData('mouse', {
      ...data,
      x: (data.x * canvas.width) / data.canvasWidth,
      y: (data.y * canvas.height) / data.canvasHeight,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height
    });
  }
});

function renderFrame() {
  const canvas = scaffolding.vm.runtime.renderer
    .canvas as unknown as HTMLCanvasElement;
  const pixels = canvas.getImageData();
  const rgba = Buffer.from(
    pixels.data.buffer,
    pixels.data.byteOffset,
    pixels.data.byteLength
  );

  if (
    captureCanvas.width === pixels.width &&
    captureCanvas.height === pixels.height &&
    previousPixels?.equals(rgba)
  ) {
    port.postMessage({ type: 'unchanged' });
    return;
  }

  if (
    captureCanvas.width !== pixels.width ||
    captureCanvas.height !== pixels.height
  ) {
    captureCanvas.width = pixels.width;
    captureCanvas.height = pixels.height;
  }
  captureContext.putImageData(
    new ImageData(pixels.data, pixels.width, pixels.height),
    0,
    0
  );
  previousPixels = rgba;
  // Use our own encoder to avoid the WebGL backend's JavaScript PNG filtering loop.
  const buffer = captureCanvas.toBuffer('image/png');
  port.postMessage(
    {
      type: 'frame',
      buffer
    },
    [buffer.buffer as ArrayBuffer]
  );
}

async function loadProject() {
  let percent = 0;
  const reportProgress = (value: number) => {
    percent = Math.max(percent, Math.round(value));
    port.postMessage({ type: 'progress', percent });
  };

  // Reserve half of the bar for downloading and half for VM loading.
  const buffer = await downloadProject(
    workerData,
    (type, finished, total) => {
      const phase = [
        'metadata',
        'project',
        'assets',
        'compress'
      ].indexOf(type);
      const progress = total > 0 ? finished / total : 0;
      reportProgress(((phase + progress) / 4) * 50);
    }
  );
  reportProgress(50);
  scaffolding.setup();

  scaffolding.vm.on('PROJECT_RUN_START', () => {
    running = true;
    reportState();
  });
  scaffolding.vm.on('PROJECT_RUN_STOP', () => {
    running = false;
    reportState();
  });

  const onProgress = (finished: number, total: number) => {
    const progress = total > 0 ? finished / total : 0;
    reportProgress(50 + progress * 50);
  };

  scaffolding.vm.on('ASSET_PROGRESS', onProgress);
  try {
    await scaffolding.loadProject(buffer);
  } finally {
    scaffolding.vm.off('ASSET_PROGRESS', onProgress);
  }

  reportProgress(100);
  scaffolding.start();
  port.postMessage({ type: 'ready' });
}

loadProject();
