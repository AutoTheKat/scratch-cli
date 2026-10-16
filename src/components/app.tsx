import React, { useState, useEffect } from 'react';
import { Box, useWindowSize } from 'ink';
import Player from './player.tsx';
import Loading from './loading.tsx';
import type { ProjectMessage } from '../lib/project-worker.ts';

import { Worker } from 'node:worker_threads';
import { resolve } from 'node:path';

const workerPath = import.meta.url.endsWith('.tsx')
  ? '../lib/project-worker.ts'
  : '../lib/project-worker.js';

export default function App() {
  const [imageBuffer, setImageBuffer] = useState<Buffer | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [percent, setPercent] = useState(0);
  const { columns, rows } = useWindowSize();

  useEffect(() => {
    const projectWorker = new Worker(new URL(workerPath, import.meta.url), {
      workerData: resolve(process.argv[2]),
    });

    projectWorker.on('message', (message: ProjectMessage) => {
      if (message.type === 'progress') {
        setPercent(message.percent);
      } else {
        setImageBuffer(Buffer.from(message.buffer));
      }
    });
    projectWorker.on('error', setError);
    projectWorker.on('exit', code => {
      setError(previous => previous || new Error(`Project worker exited unexpectedly (code ${code}).`));
    });

    return () => {
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
    <Box
      width={columns}
      height={Math.max(1, rows - 1)}
    >
      {imageBuffer ? (
        <Player imageBuffer={imageBuffer} />
      ) : (
        <Loading percent={percent} />
      )}
    </Box>
  );
}
