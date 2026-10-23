import { setImmediate } from 'node:timers/promises';

export default function queueAssetLoads(runtime: VM.Runtime) {
  if (!runtime.wrapAssetRequest) {
    return;
  }

  const wrapAssetRequest = runtime.wrapAssetRequest.bind(runtime);
  let pending = Promise.resolve();

  runtime.wrapAssetRequest = (request) =>
    wrapAssetRequest(() => {
      const result = pending.then(request);
      // Let our image loads finish before we queue another costume.
      pending = result.then(
        () => setImmediate(),
        () => setImmediate()
      );
      return result;
    });
}
