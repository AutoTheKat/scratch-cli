#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { InkPictureProvider } from 'ink-picture';
import meow from 'meow';
import App from './components/app.tsx';

// meow
const cli = meow(
  `Usage:
 scratch-cli project.sb3
  -> load a project file named project.sb3

 scratch-cli 463553665
 scratch-cli https://scratch.mit.edu/projects/463553665
  -> load the project with id 463553665 from scratch.mit.edu

 scratch-cli https://example.com/project.sb3
  -> load the project hosted at example.com/project.sb3

Options:
 -V= --vm=<module>            Custom VM module path
 -R= --renderer=<module>      Custom Renderer module path
 -S= --storage=<module>       Custom Storage module path
 -T  --text                   Force text-only mode
 -v --version -> show version | -H --help -> show this Help

Example:
 scratch-cli -V="./scratch-vm/src/index.js" 
  -R="./scratch-render/dist/node/scratch-render.js" 
  -S="./scratch-storage/dist/node/scratch-storage.js"
  -T "A Very Cool Project I Made.sb3"
 scratch-cli --version  
 scratch-cli --help`,
  {
    importMeta: import.meta,
    flags: {
      vm: { type: 'string', shortFlag: 'V' },
      renderer: { type: 'string', shortFlag: 'R' },
      storage: { type: 'string', shortFlag: 'S' },
      text: { type: 'boolean', shortFlag: 'T' },
      version: { type: 'boolean', shortFlag: 'v' },
      help: { type: 'boolean', shortFlag: 'H' }
    }
  }
);

if (cli.input.length === 0) {
  cli.showHelp();
  process.exit(0);
}

const app = render(
  <InkPictureProvider>
    <App input={cli.input} flags={cli.flags} />
  </InkPictureProvider>,
  {
    alternateScreen: true,
    kittyKeyboard: {
      // Image detection buffers terminal replies, which races keyboard auto detection.
      mode: 'enabled',
      flags: [
        'disambiguateEscapeCodes',
        'reportEventTypes',
        'reportAllKeysAsEscapeCodes'
      ]
    }
  }
);

try {
  await app.waitUntilExit();
} catch (error) {
  const message =
    error instanceof Error ? error.message : String(error);

  process.stderr.write(`\u001b[31mError: ${message}\u001b[0m\n`);
  process.exitCode = 1;
}
