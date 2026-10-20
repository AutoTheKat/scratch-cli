#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { InkPictureProvider } from 'ink-picture';
import App from './components/app.tsx';

render(
  <InkPictureProvider>
    <App />
  </InkPictureProvider>,
  {
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
