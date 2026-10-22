import './suppress-vm-logs.ts';
import './patches.ts';
import { parentPort, workerData } from 'node:worker_threads';
import downloadProject from './download-project.ts';
import { createCanvas, ImageData } from 'canvas';
import loadRuntime from './load-runtime.ts';
import type { HTMLCanvasElement } from '@onirenaud/node-webgl';
import { ProjectControl } from '../types.ts';

// todo: clean all of this up

export type ProjectMessage =
  | { type: 'progress'; percent: number }
  | { type: 'ready' }
  | { type: 'unchanged' }
  | { type: 'frame'; buffer: Uint8Array };

if (!parentPort || typeof workerData?.input !== 'string') {
  // This is to just get TypeScript to stop complaining,
  // Realistically this should never be called.
  throw new Error('This should never happen.');
}

const port = parentPort;
const project = await loadRuntime(workerData.flags);
const vm = project.vm;
const captureCanvas = createCanvas(480, 360);
const captureContext = captureCanvas.getContext('2d');
let previousPixels: Buffer | undefined;
let running = false;

function reportState() {
  port.postMessage({
    type: 'state',
    running,
    turbo: vm.runtime.turboMode
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
      vm.start();
      vm.greenFlag();
    } else if (message.action === ProjectControl.Stop) {
      vm.stopAll();
    } else if (message.action === ProjectControl.Turbo) {
      vm.setTurboMode(!vm.runtime.turboMode);
      reportState();
    }
  }
  if (message?.type === 'keyboard') {
    vm.postIOData('keyboard', message.data);
  }
  if (message?.type === 'mouse') {
    const canvas = vm.runtime.renderer.canvas;
    const data = message.data;
    vm.postIOData('mouse', {
      ...data,
      x: (data.x * canvas.width) / data.canvasWidth,
      y: (data.y * canvas.height) / data.canvasHeight,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height
    });
  }
});

function renderFrame() {
  const canvas = vm.runtime.renderer
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
    workerData.input,
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

  vm.on('PROJECT_RUN_START', () => {
    running = true;
    reportState();
  });
  vm.on('PROJECT_RUN_STOP', () => {
    running = false;
    reportState();
  });

  const onProgress = (finished: number, total: number) => {
    const progress = total > 0 ? finished / total : 0;
    reportProgress(50 + progress * 50);
  };

  vm.on('ASSET_PROGRESS', onProgress);
  try {
    await project.loadProject(buffer);
  } finally {
    vm.off('ASSET_PROGRESS', onProgress);
  }

  reportProgress(100);
  vm.start();
  vm.greenFlag();
  port.postMessage({ type: 'ready' });
}

await loadProject();
