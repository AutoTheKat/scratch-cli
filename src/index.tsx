import React from 'react';
import { render } from 'ink';
import { InkPictureProvider } from 'ink-picture';
import App from './components/app.tsx';
import './lib/patches.ts';

render(
  <InkPictureProvider>
    <App />
  </InkPictureProvider>
);
