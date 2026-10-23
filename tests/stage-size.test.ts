import assert from 'node:assert/strict';
import { test } from 'node:test';
import calculateStageSize from '../src/lib/stage-size.ts';

test('fits a stage in a wide terminal and reserves the last row', () => {
  assert.deepEqual(calculateStageSize(100, 25, 8, 16, 480, 360), {
    width: 64,
    height: 24
  });
});

test('fits a stage in a narrow terminal using pixel aspect ratio', () => {
  assert.deepEqual(calculateStageSize(40, 30, 8, 16, 480, 360), {
    width: 40,
    height: 15
  });
});

test('supports portrait stages and nonstandard terminal cells', () => {
  assert.deepEqual(calculateStageSize(80, 25, 10, 20, 360, 480), {
    width: 36,
    height: 24
  });
});

test('keeps a drawable area when the terminal is minimized', () => {
  assert.deepEqual(calculateStageSize(0, 0, 8, 16, 480, 360), {
    width: 1,
    height: 1
  });
});
