import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCanvas } from 'canvas';
import FrameEncoder from '../src/lib/frame-encoder.ts';
import type { TerminalFrame } from '../src/types.ts';

function createFrame(): TerminalFrame {
  return {
    buffer: createCanvas(4, 3).toBuffer('image/png'),
    width: 4,
    height: 3,
    columns: 10,
    rows: 2,
    cellWidth: 8,
    cellHeight: 16,
    row: 1,
    column: 1
  };
}

test('iTerm2 frames preserve image bytes and fit the available pixels', () => {
  const frame = createFrame();
  const encoder = new FrameEncoder('iterm2');
  const output = encoder.encodeFrame(frame, 1);

  assert.equal(
    output,
    `\x1b]1337;File=size=${frame.buffer.length};width=42px;height=32px;preserveAspectRatio=1;inline=1:${frame.buffer.toString('base64')}\x07`
  );
});

test('Kitty chunks large images and places the reconstructed image', () => {
  const frame = createFrame();
  frame.buffer = Buffer.alloc(7000, 123);
  const output = new FrameEncoder('kitty').encodeFrame(frame, 42);
  const commands = output.split('\x1b\\').slice(0, -1);

  assert.equal(commands.length, 4);
  assert.ok(
    commands[0].startsWith('\x1b_Ga=t,f=100,t=d,i=42,q=2,m=1;')
  );
  assert.ok(commands[1].startsWith('\x1b_Gm=1;'));
  assert.ok(commands[2].startsWith('\x1b_Gm=0;'));
  const payloads = commands.slice(0, -1).map((command) => {
    const payload = command.slice(command.indexOf(';') + 1);
    assert.ok(payload.length <= 4096);
    return payload;
  });
  assert.deepEqual(
    Buffer.from(payloads.join(''), 'base64'),
    frame.buffer
  );
  assert.equal(commands[3], '\x1b_Ga=p,i=42,p=1,c=10,C=1,q=2');
});

test('Kitty marks a single image chunk as complete', () => {
  const output = new FrameEncoder('kitty').encodeFrame(
    createFrame(),
    7
  );
  assert.match(output, /^\x1b_Ga=t,f=100,t=d,i=7,q=2,m=0;/);
});

test('sixel encodes PNG frames and handles resizing', () => {
  const encoder = new FrameEncoder('sixel');
  const frame = createFrame();

  for (const columns of [10, 1]) {
    frame.columns = columns;
    const output = encoder.encodeFrame(frame, 1);
    assert.match(output, /^\x1bP/);
    assert.ok(output.endsWith('\x1b\\'));
  }
});

test('sixel rejects corrupt images instead of emitting a frame', () => {
  const frame = createFrame();
  frame.buffer = Buffer.from('invalid PNG');
  assert.throws(() =>
    new FrameEncoder('sixel').encodeFrame(frame, 1)
  );
});
