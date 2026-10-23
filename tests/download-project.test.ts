import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import downloadProject from '../src/lib/download-project.ts';

test('reads a local project', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'scratch-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, 'project.sb3');
  const contents = Buffer.from([0x50, 0x4b, 0, 255, 128]);
  await writeFile(path, contents);

  assert.deepEqual(await downloadProject(path), contents);
  await assert.rejects(
    downloadProject(join(directory, 'missing.sb3')),
    {
      code: 'ENOENT'
    }
  );
});

for (const input of [
  '463553665',
  'https://scratch.mit.edu/projects/463553665/',
  'https://scratch.mit.edu/projects/463553665?view=editor',
  'https://scratch.mit.edu/projects/463553665#editor'
]) {
  test(`loads Scratch project: ${input}`, async (t) => {
    const urls: string[] = [];
    const progress: string[] = [];
    t.mock.method(globalThis, 'fetch', async (url: string) => {
      urls.push(url);
      if (url === 'https://api.scratch.mit.edu/projects/463553665') {
        return Response.json({ project_token: 'test-token' });
      }
      assert.equal(
        url,
        'https://projects.scratch.mit.edu/463553665?token=test-token'
      );
      return Response.json({ targets: [] });
    });

    const result = await downloadProject(input, (phase) => {
      progress.push(phase);
    });

    assert.ok(Buffer.isBuffer(result));
    assert.equal(result.subarray(0, 2).toString(), 'PK');
    assert.equal(urls.length, 2);
    assert.ok(progress.includes('metadata'));
    assert.ok(progress.includes('project'));
  });
}

test('downloads direct URLs without treating them as IDs', async (t) => {
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(url);
    return Response.json({ targets: [] });
  });

  for (const input of [
    'https://example.com/project.sb3',
    'https://scratch.mit.edu.example.com/projects/463553665'
  ]) {
    const result = await downloadProject(input);
    assert.ok(Buffer.isBuffer(result));
    assert.equal(urls.at(-1), input);
  }
  assert.equal(urls.length, 2);
});

test('propagates download failures to the caller', async (t) => {
  const failure = new Error('Connection lost');
  t.mock.method(globalThis, 'fetch', async () => {
    throw failure;
  });
  await assert.rejects(
    downloadProject('https://example.com/project.sb3'),
    (error) => error === failure
  );
});
