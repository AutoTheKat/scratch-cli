#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { InkPictureProvider } from 'ink-picture';
import meow from 'meow';
import App from './components/app.tsx';

// meow
const cli = meow(`
  Usage:
    scratch-cli project.sb3
`, {
  flags: {},
  importMeta: import.meta
});

if (cli.input.length === 0) {
  cli.showHelp();
  process.exit(0);
}

render(
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
