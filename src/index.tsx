#!/usr/bin/env node
import './lib/suppress-vm-logs.ts';
import './lib/patches.ts';
import React from 'react';
import { render } from 'ink';
import { InkPictureProvider } from 'ink-picture';
import App from './components/app.tsx';

render(
  <InkPictureProvider>
    <App />
  </InkPictureProvider>
);
