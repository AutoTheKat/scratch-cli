import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, useWindowSize } from 'ink';
import Player from './player.tsx';
import Loading from './loading.tsx';
import type { ProjectMessage } from '../lib/project-worker.ts';

import { Worker } from 'node:worker_threads';
import { resolve } from 'node:path';

const workerPath = import.meta.url.endsWith('.tsx')
  ? '../lib/project-worker.ts'
  : '../lib/project-worker.js';

interface AppProps {
  input: string[],
  flags: Record<string, any>
}

export default function App(props: AppProps) {
  const worker = useRef<Worker | null>(null);
  const [imageBuffer, setImageBuffer] = useState<Buffer | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [percent, setPercent] = useState(0);
  const { columns, rows } = useWindowSize();

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
        workerData: resolve(props.input[0]),
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

    projectWorker.on('message', (message: ProjectMessage) => {
      if (message.type === 'progress') {
        setPercent(message.percent);
      } else if (message.type === 'ready') {
        ready = true;
        requestFrame();
      } else if (message.type === 'frame') {
        pending = false;
        const buffer = Buffer.from(
          message.buffer.buffer,
          message.buffer.byteOffset,
          message.buffer.byteLength
        );
        setImageBuffer(buffer);
      } else {
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
        />
      ) : (
        <Loading percent={percent} />
      )}
    </Box>
  );
}
