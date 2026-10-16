import React, { useState, useEffect } from 'react';
import { Box, useWindowSize } from 'ink';
import { Scaffolding } from '@turbowarp/scaffolding';
import Player from './player.tsx';
import Loading from './loading.tsx';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export default function App() {
  const [scaffolding] = useState(() => new Scaffolding());
  const [loaded, setLoaded] = useState(false);
  const [percent, setPercent] = useState(0);
  const { columns, rows } = useWindowSize();

  useEffect(() => {
    const loadProject = async () => {
      const cwd = process.cwd();
      const path = join(cwd, process.argv[2]);
      const buffer = await readFile(path);

      scaffolding.setup();
      const onProgress = (finished: number, total: number) => {
        setPercent(total > 0 ? Math.round(finished / total * 100) : 0);
      };

      scaffolding.vm.on('ASSET_PROGRESS', onProgress);
      try {
        await scaffolding.loadProject(buffer);
      } finally {
        scaffolding.vm.off('ASSET_PROGRESS', onProgress);
      }
      setPercent(100);
      scaffolding.start();

      setLoaded(true);
    };
    loadProject();
  }, [scaffolding]);

  return (
    <Box
      width={columns}
      height={Math.max(1, rows - 1)}
    >
      {loaded ? (
        <Player scaffolding={scaffolding} />
      ) : (
        <Loading percent={percent} />
      )}
    </Box>
  );
}
