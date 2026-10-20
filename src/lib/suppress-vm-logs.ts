import { stripVTControlCharacters } from 'node:util';

for (const method of [
  'debug',
  'info',
  'log',
  'warn',
  'error'
] as const) {
  const write = console[method].bind(console);

  console[method] = (...args: unknown[]) => {
    if (typeof args[0] === 'string') {
      const message = stripVTControlCharacters(args[0]);
      // todo: we should eventually store these somewhere to view later.
      if (
        /^(vm|scratch-render|scratch-audioengine|scratch-storage)(?: |$)/.test(
          message
        )
      ) {
        return;
      }
    }

    write(...args);
  };
}
