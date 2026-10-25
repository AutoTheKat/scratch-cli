import { useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Text,
  useStdin,
  useStdout,
  useWindowSize,
  type DOMElement
} from 'ink';
import Image, { usePosition, useTerminalInfo } from 'ink-picture';
import { TextInput } from '@inkjs/ui';
import { Mouse, type MouseEvent } from 'xterm-mouse';
import Renderer from './renderer.tsx';
import Controls from './controls.tsx';
import calculateStageSize from '../lib/stage-size.ts';
import useKeyboard from '../lib/use-keyboard.ts';
import type {
  ProjectControl,
  ProjectFrame,
  ImageProtocol
} from '../types.ts';

interface PlayerProps {
  frame: ProjectFrame;
  onMouse: (data: VM.MouseData) => void;
  onKeyboard: (data: VM.KeyboardData) => void;
  onControl: (control: ProjectControl) => void;
  running: boolean;
  turbo: boolean;
  question: string | null;
  onAnswer: (answer: string) => void;
  textMode: boolean | undefined;
}

export default function Player(props: PlayerProps) {
  const container = useRef<DOMElement>(null);
  const position = usePosition(container);
  const { stdin: input, setRawMode } = useStdin();
  const { stdout: output } = useStdout();
  const terminal = useTerminalInfo();
  const { columns, rows } = useWindowSize();
  const asking = props.question !== null;
  let protocol: ImageProtocol | undefined;
  const preferITerm = [
    'iTerm.app',
    'WarpTerminal',
    'WezTerm'
  ].includes(process.env.TERM_PROGRAM || '');
  if (!props.textMode) {
    if (preferITerm && terminal.supportsITerm2Graphics) {
      protocol = 'iterm2';
    } else if (terminal.supportsKittyGraphics) {
      protocol = 'kitty';
    } else if (terminal.supportsITerm2Graphics) {
      protocol = 'iterm2';
    } else if (terminal.supportsSixelGraphics) {
      protocol = 'sixel';
    }
  }
  const stage = useMemo(
    () =>
      calculateStageSize(
        columns,
        rows - (protocol ? 2 : 3) - (asking ? 1 : 0),
        terminal.cellWidth,
        terminal.cellHeight,
        props.frame.width,
        props.frame.height
      ),
    [
      columns,
      rows,
      protocol,
      asking,
      terminal.cellWidth,
      terminal.cellHeight,
      props.frame.width,
      props.frame.height
    ]
  );
  useKeyboard(props.onKeyboard, !asking);

  const stdin = input as typeof process.stdin;
  const stdout = output as typeof process.stdout;

  useEffect(() => {
    if (!asking) {
      return;
    }
    // TextInput needs normal text input without Kitty key releases.
    stdout.write('\x1b[>0u');
    return () => {
      stdout.write('\x1b[<u');
    };
  }, [asking, stdout]);

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
        flexDirection="column"
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
            <Renderer frame={props.frame} protocol={protocol} />
          ) : (
            <Image
              src={props.frame.buffer}
              width="100%"
              height="100%"
              objectFit="contain"
            />
          )}
        </Box>  
        {asking && (
          <Box
            width={stage.width}
            justifyContent="center"
            flexShrink={0}
          >
            <TextInput
              key={props.question}
              placeholder={props.question || 'Answer...'}
              onSubmit={props.onAnswer}
            />
          </Box>
        )}
        {!protocol && !asking && (
          <Box width="100%" justifyContent="center" flexShrink={0}>
            <Text dimColor wrap="truncate-end">
              Use a terminal with image support for better quality.
            </Text>
          </Box>
        )}
      </Box>
      <Controls
        running={props.running}
        turbo={props.turbo}
        onControl={props.onControl}
      />
    </Box>
  );
}
