import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, useWindowSize } from 'ink';
import Player from './player.tsx';
import Loading from './loading.tsx';
import type {
  ProjectControl,
  WorkerMessage
} from '../types.ts';

import { Worker } from 'node:worker_threads';

const workerPath = import.meta.url.endsWith('.tsx')
  ? '../lib/project-worker.ts'
  : '../lib/project-worker.js';

interface AppProps {
  input: string[];
  flags: Record<string, any>;
}

export default function App(props: AppProps) {
  const worker = useRef<Worker | null>(null);
  const [imageBuffer, setImageBuffer] = useState<Buffer | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [percent, setPercent] = useState(0);
  const [running, setRunning] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const { columns, rows } = useWindowSize();

  const onControl = useCallback((action: ProjectControl) => {
    worker.current?.postMessage({
      type: 'control',
      action
    });
  }, []);

  const onMouse = useCallback((data: VM.MouseData) => {
    worker.current?.postMessage({
      type: 'mouse',
      data
    });
  }, []);

  const onKeyboard = useCallback((data: VM.KeyboardData) => {
    worker.current?.postMessage({
      type: 'keyboard',
      data
    });
  }, []);

  useEffect(() => {
    const projectWorker = new Worker(
      new URL(workerPath, import.meta.url),
      {
        workerData: props.input[0],
        stdout: true,
        stderr: true
      }
    );
    worker.current = projectWorker;

    // Keep the workers logs from writing over Ink's output.
    projectWorker.stdout.resume();
    projectWorker.stderr.resume();

    let ready = false;
    let pending = false;
    const requestFrame = () => {
      if (ready && !pending) {
        pending = true;
        projectWorker.postMessage('frame');
      }
    };
    const frameTimer = setInterval(requestFrame, 1000 / 30);

    projectWorker.on('message', (message: WorkerMessage) => {
      switch (message.type) {
        case 'progress':
          setPercent(message.percent);
          break;
        case 'ready':
          ready = true;
          requestFrame();
          break;
        case 'state':
          setRunning(message.running);
          setTurbo(message.turbo);
          break;
        case 'frame':
          const buffer = Buffer.from(
            message.buffer.buffer,
            message.buffer.byteOffset,
            message.buffer.byteLength
          );
          setImageBuffer(buffer);
          // Fall-through
        default:
          pending = false;
      }
    });
    projectWorker.on('error', setError);
    projectWorker.on('exit', (code) => {
      setError(
        (previous) =>
          previous ||
          new Error(
            `Project worker exited unexpectedly (code ${code}).`
          )
      );
    });

    return () => {
      worker.current = null;
      clearInterval(frameTimer);
      projectWorker.removeAllListeners('message');
      projectWorker.removeAllListeners('exit');
      // Let the worker exit between tasks.
      projectWorker.postMessage('stop');
      projectWorker.unref();
    };
  }, []);

  if (error) {
    throw error;
  }

  return (
    <Box width={columns} height={Math.max(1, rows - 1)}>
      {imageBuffer ? (
        <Player
          imageBuffer={imageBuffer}
          onMouse={onMouse}
          onKeyboard={onKeyboard}
          onControl={onControl}
          running={running}
          turbo={turbo}
        />
      ) : (
        <Loading percent={percent} />
      )}
    </Box>
  );
}
