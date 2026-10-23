import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Writable } from 'node:stream';
import { setImmediate } from 'node:timers/promises';
import { test } from 'node:test';
import FrameWriter from '../src/lib/frame-writer.ts';
import type { TerminalFrame } from '../src/types.ts';

class TerminalOutput extends Writable {
  writes: string[] = [];
  callbacks: Array<(error?: Error | null) => void> = [];

  override _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ) {
    this.writes.push(chunk.toString());
    this.callbacks.push(callback);
    this.emit('frame');
  }

  completeWrite(error?: Error) {
    const callback = this.callbacks.shift();
    assert.ok(callback, 'Expected an outstanding terminal write');
    callback(error);
  }
}

function createFrame(contents: string): TerminalFrame {
  return {
    buffer: Buffer.from(contents),
    width: 480,
    height: 360,
    row: 3,
    column: 4,
    columns: 10,
    rows: 2,
    cellWidth: 8,
    cellHeight: 16
  };
}

test(
  'slow output waits for the current write and drops superseded frames',
  { timeout: 2000 },
  async (t) => {
    const stdout = new TerminalOutput();
    const writer = new FrameWriter('iterm2', stdout, assert.fail);
    t.after(() => writer.stop());
    const firstWrite = once(stdout, 'frame');
    writer.submit(createFrame('first'));
    await firstWrite;

    writer.submit(createFrame('stale'));
    writer.submit(createFrame('latest'));
    await setImmediate();
    assert.equal(stdout.writes.length, 1);

    const nextWrite = once(stdout, 'frame');
    stdout.completeWrite();
    await nextWrite;
    assert.equal(stdout.writes.length, 2);
    assert.ok(stdout.writes[0].startsWith('\x1b7\x1b[3;4H'));
    assert.ok(
      stdout.writes[1].includes(
        Buffer.from('latest').toString('base64')
      )
    );
    assert.ok(stdout.writes[1].endsWith('\x1b8'));

    stdout.completeWrite();
    await setImmediate();
    assert.equal(stdout.writes.length, 2);
  }
);

test('stopping prevents an in-flight encode and future submissions from being displayed', async () => {
  const stdout = new TerminalOutput();
  const writer = new FrameWriter('iterm2', stdout, assert.fail);
  writer.submit(createFrame('in flight'));
  writer.stop();
  writer.submit(createFrame('after stop'));
  await setImmediate();
  assert.deepEqual(stdout.writes, []);
});

test(
  'stopping clears the displayed region, discards queued frames, and removes its error listener',
  { timeout: 2000 },
  async () => {
    const stdout = new TerminalOutput();
    const writer = new FrameWriter('iterm2', stdout, assert.fail);
    const firstWrite = once(stdout, 'frame');
    writer.submit(createFrame('first'));
    await firstWrite;
    writer.submit(createFrame('pending'));
    writer.stop();
    writer.stop();
    stdout.completeWrite();
    await setImmediate();

    assert.deepEqual(stdout.writes.slice(1), [
      '\x1b7\x1b[3;4H          \x1b[4;4H          \x1b8'
    ]);
    assert.equal(stdout.listenerCount('error'), 0);
  }
);

test(
  'Kitty replaces the previous image and deletes the displayed image on stop',
  { timeout: 2000 },
  async () => {
    const stdout = new TerminalOutput();
    const writer = new FrameWriter('kitty', stdout, assert.fail);
    const firstWrite = once(stdout, 'frame');
    writer.submit(createFrame('first'));
    await firstWrite;
    const firstId = stdout.writes[0].match(
      /a=t,f=100,t=d,i=(\d+)/
    )?.[1];
    assert.ok(firstId);
    stdout.completeWrite();
    await setImmediate();

    const nextWrite = once(stdout, 'frame');
    writer.submit(createFrame('second'));
    await nextWrite;
    const secondId = stdout.writes[1].match(
      /a=t,f=100,t=d,i=(\d+)/
    )?.[1];
    assert.ok(secondId);
    assert.notEqual(firstId, secondId);
    assert.ok(
      stdout.writes[1].includes(
        `\x1b_Ga=d,d=I,i=${firstId},q=2\x1b\\`
      )
    );
    stdout.completeWrite();
    await setImmediate();

    writer.stop();
    stdout.completeWrite();
    assert.ok(
      stdout.writes
        .slice(2)
        .includes(`\x1b_Ga=d,d=I,i=${secondId},q=2\x1b\\`)
    );
  }
);

test(
  'terminal write failures reach the error handler',
  { timeout: 2000 },
  async () => {
    const stdout = new TerminalOutput();
    const errors: Error[] = [];
    const writer = new FrameWriter('iterm2', stdout, (error) => {
      errors.push(error);
    });
    const firstWrite = once(stdout, 'frame');
    writer.submit(createFrame('first'));
    await firstWrite;
    const failure = new Error('Terminal disconnected');
    stdout.completeWrite(failure);
    await setImmediate();
    assert.ok(errors.includes(failure));
    writer.stop();
  }
);
