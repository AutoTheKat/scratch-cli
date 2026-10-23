import assert from 'node:assert/strict';
import { test } from 'node:test';
import queueAssetLoads from '../src/lib/queue-asset-loads.ts';

test('serializes asset loads', async () => {
  const started: string[] = [];
  let finishFirst!: (value: string) => void;
  const first = new Promise<string>((resolve) => {
    finishFirst = resolve;
  });
  const runtime = {
    wrapAssetRequest<T>(request: () => Promise<T>) {
      assert.equal(this, runtime);
      return request();
    }
  };
  queueAssetLoads(runtime as VM.Runtime);

  const firstLoad = runtime.wrapAssetRequest(() => {
    started.push('first');
    return first;
  });
  const secondLoad = runtime.wrapAssetRequest(async () => {
    started.push('second');
    return 'second asset';
  });

  await Promise.resolve();
  assert.deepEqual(started, ['first']);

  finishFirst('first asset');
  assert.deepEqual(await Promise.all([firstLoad, secondLoad]), [
    'first asset',
    'second asset'
  ]);
  assert.deepEqual(started, ['first', 'second']);
});

test('a rejected asset does not block later loads', async () => {
  const runtime = {
    wrapAssetRequest<T>(request: () => Promise<T>) {
      return request();
    }
  };
  queueAssetLoads(runtime as VM.Runtime);
  const error = new Error('Missing costume');

  const failed = runtime.wrapAssetRequest(async () => {
    throw error;
  });
  const next = runtime.wrapAssetRequest(async () => 'next costume');

  await assert.rejects(failed, (actual) => actual === error);
  assert.equal(await next, 'next costume');
});
