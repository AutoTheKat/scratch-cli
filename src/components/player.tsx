import { useEffect, useMemo, useRef } from 'react';
import {
  Box,
  useStdin,
  useStdout,
  useWindowSize,
  type DOMElement
} from 'ink';
import Image, { usePosition, useTerminalInfo } from 'ink-picture';
import { Mouse, type MouseEvent } from 'xterm-mouse';
import Renderer from './renderer.tsx';
import Controls from './controls.tsx';
import calculateStageSize from '../lib/stage-size.ts';
import useKeyboard from '../lib/use-keyboard.ts';
import type { ProjectControl, ImageProtocol } from '../types.ts';

interface PlayerProps {
  imageBuffer: Buffer;
  onMouse: (data: VM.MouseData) => void;
  onKeyboard: (data: VM.KeyboardData) => void;
  onControl: (control: ProjectControl) => void;
  running: boolean;
  turbo: boolean;
}

export default function Player(props: PlayerProps) {
  const container = useRef<DOMElement>(null);
  const position = usePosition(container);
  const { stdin: input, setRawMode } = useStdin();
  const { stdout: output } = useStdout();
  const terminal = useTerminalInfo();
  const { columns, rows } = useWindowSize();
  const stage = useMemo(
    () =>
      calculateStageSize(
        columns,
        rows - 2,
        terminal.cellWidth,
        terminal.cellHeight
      ),
    [columns, rows, terminal.cellWidth, terminal.cellHeight]
  );
  useKeyboard(props.onKeyboard);

  const stdin = input as typeof process.stdin;
  const stdout = output as typeof process.stdout;

  useEffect(() => {
    if (!position || !Mouse.isSupported(stdin, stdout)) {
      return;
    }
    const mouse = new Mouse({
      inputStream: stdin,
      outputStream: stdout,
      setRawMode
    });

    const onMouse = (event: MouseEvent) => {
      const x = event.x - 0.5 - position.col;
      const y =
        event.y + 0.5 - (rows - position.appHeight + position.row);
      const data: VM.MouseData = {
        x,
        y,
        canvasWidth: position.width,
        canvasHeight: position.height
      };
      if (
        event.action === 'press' &&
        (x < 0 ||
          y < 0 ||
          x >= position.width ||
          y >= position.height)
      ) {
        return;
      }
      if (event.action === 'press' || event.action === 'release') {
        data.isDown = event.action === 'press';
      }
      props.onMouse(data);
    };
    mouse.on('move', onMouse);
    mouse.on('drag', onMouse);
    mouse.on('press', onMouse);
    mouse.on('release', onMouse);
    mouse.enable();
    return () => mouse.destroy();
  }, [position, rows, stdin, stdout, setRawMode, props.onMouse]);

  let protocol: ImageProtocol | undefined;
  const preferITerm = [
    'iTerm.app',
    'WarpTerminal',
    'WezTerm'
  ].includes(process.env.TERM_PROGRAM || '');
  if (preferITerm && terminal.supportsITerm2Graphics) {
    protocol = 'iterm2';
  } else if (terminal.supportsKittyGraphics) {
    protocol = 'kitty';
  } else if (terminal.supportsITerm2Graphics) {
    protocol = 'iterm2';
  } else if (terminal.supportsSixelGraphics) {
    protocol = 'sixel';
  }

  return (
    <Box
      width="100%"
      height="100%"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Box
        flexGrow={1}
        width="100%"
        alignItems="center"
        justifyContent="center"
      >
        <Box
          ref={container}
          width={stage.width}
          height={stage.height}
          flexShrink={0}
        >
          {protocol ? (
            <Renderer
              imageBuffer={props.imageBuffer}
              protocol={protocol}
            />
          ) : (
            <Image
              src={props.imageBuffer}
              width="100%"
              height="100%"
              objectFit="contain"
            />
          )}
        </Box>
      </Box>
      <Controls
        running={props.running}
        turbo={props.turbo}
        onControl={props.onControl}
      />
    </Box>
  );
}
