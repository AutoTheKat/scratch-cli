import './suppress-vm-logs.ts';
import './patches.ts';
import { parentPort, workerData } from 'node:worker_threads';
import { createCanvas, ImageData } from 'canvas';
import type { HTMLCanvasElement as WebGLCanvas } from '@onirenaud/node-webgl';
import { ProjectControl } from '../types.ts';
import downloadProject from './download-project.ts';
import loadRuntime from './load-runtime.ts';

if (!parentPort || typeof workerData?.input !== 'string') {
  throw new Error('Project worker requires a parent port and input.');
}

const port = parentPort;
const project = await loadRuntime(workerData.flags);
const { vm } = project;
const captureCanvas = createCanvas(480, 360);
const captureContext = captureCanvas.getContext('2d');
let previousPixels: Buffer | undefined;
let running = false;
let percent = 0;

function startProject() {
  vm.start();
  vm.greenFlag();
}

function reportState(active = running) {
  running = active;
  const turbo = vm.runtime.turboMode;
  port.postMessage({ type: 'state', running, turbo });
}

function reportProgress(value: number) {
  percent = Math.max(percent, Math.round(value));
  port.postMessage({ type: 'progress', percent });
}

function renderFrame() {
  const canvas = vm.runtime.renderer.canvas as unknown as WebGLCanvas;
  const { data, width, height } = canvas.getImageData();
  const { buffer, byteOffset, byteLength } = data;
  const rgba = Buffer.from(buffer, byteOffset, byteLength);
  const resized =
    captureCanvas.width !== width || captureCanvas.height !== height;

  if (!resized && previousPixels?.equals(rgba)) {
    port.postMessage({ type: 'unchanged' });
    return;
  }

  if (resized) {
    captureCanvas.width = width;
    captureCanvas.height = height;
  }
  const image = new ImageData(data, width, height);
  captureContext.putImageData(image, 0, 0);
  previousPixels = rgba;
  // Use our own encoder to avoid the WebGL backend's JavaScript PNG filtering loop.
  const png = captureCanvas.toBuffer('image/png');
  port.postMessage({ type: 'frame', buffer: png }, [
    png.buffer as ArrayBuffer
  ]);
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
      startProject();
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
    const { width, height } = vm.runtime.renderer.canvas;
    const { data } = message;
    vm.postIOData('mouse', {
      ...data,
      x: (data.x * width) / data.canvasWidth,
      y: (data.y * height) / data.canvasHeight,
      canvasWidth: width,
      canvasHeight: height
    });
  }
});

// Reserve half of the bar for downloading and half for VM loading.
const phases = ['metadata', 'project', 'assets', 'compress'];
const buffer = await downloadProject(
  workerData.input,
  (type, finished, total) => {
    const phase = phases.indexOf(type);
    const progress = total > 0 ? finished / total : 0;
    reportProgress(((phase + progress) / 4) * 50);
  }
);
reportProgress(50);

vm.on('PROJECT_RUN_START', () => reportState(true));
vm.on('PROJECT_RUN_STOP', () => reportState(false));
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
startProject();
port.postMessage({ type: 'ready' });
