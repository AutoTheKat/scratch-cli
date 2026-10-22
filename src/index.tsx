#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { InkPictureProvider } from 'ink-picture';
import meow from 'meow';
import App from './components/app.tsx';

// meow
const cli = meow(
  `
  Usage:
    scratch-cli project.sb3
    scratch-cli 463553665
    scratch-cli https://scratch.mit.edu/projects/463553665
    scratch-cli https://example.com/project.sb3

  Options:
    --vm=<module>        Custom VM module path
    --renderer=<module>  Custom Renderer module path
    --storage=<module>   Custom Storage module path
`,
  {
    importMeta: import.meta,
    flags: {
      vm: { type: 'string' },
      renderer: { type: 'string' },
      storage: { type: 'string' }
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
