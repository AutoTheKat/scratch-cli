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
  const { columns, rows } = useWindowSize();

  useEffect(() => {
    const loadProject = async () => {
      const cwd = process.cwd();
      const path = join(cwd, process.argv[2]);
      const buffer = await readFile(path);

      scaffolding.setup();
      await scaffolding.loadProject(buffer);
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
        <Loading />
      )}
    </Box>
  );
}
