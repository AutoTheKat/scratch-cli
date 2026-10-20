import { useEffect, useRef } from 'react';
import { useInput } from 'ink';

export default function useKeyboard(
  onKeyboard: (data: VM.KeyboardData) => void
) {
  const releases = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  useInput((input, key) => {
    if (key.ctrl || key.meta || key.super || key.hyper) {
      return;
    }

    let value = input.toLowerCase();
    if (key.upArrow) {
      value = 'ArrowUp';
    } else if (key.downArrow) {
      value = 'ArrowDown';
    } else if (key.leftArrow) {
      value = 'ArrowLeft';
    } else if (key.rightArrow) {
      value = 'ArrowRight';
    } else if (key.return) {
      value = 'Enter';
    } else if (
      input.length !== 1 ||
      input < ' ' ||
      input === '\x7f'
    ) {
      return;
    }

    clearTimeout(releases.current[value]);
    delete releases.current[value];
    onKeyboard({ key: value, isDown: key.eventType !== 'release' });

    if (!key.eventType) {
      // shortcut: standard terminals lack keyup, use real releases when available.
      releases.current[value] = setTimeout(() => {
        delete releases.current[value];
        onKeyboard({ key: value, isDown: false });
      }, 150);
    }
  });

  useEffect(
    () => () => {
      for (const [key, timer] of Object.entries(releases.current)) {
        clearTimeout(timer);
        onKeyboard({ key, isDown: false });
      }
    },
    [onKeyboard]
  );
}
