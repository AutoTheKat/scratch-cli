import { useMemo } from 'react';
import { Box, useWindowSize } from 'ink';
import Image, { useTerminalInfo } from 'ink-picture';
import Renderer from './renderer.tsx';
import calculateStageSize from '../lib/stage-size.ts';
import type { ImageProtocol } from '../lib/frame-encoder.ts';

interface PlayerProps {
  imageBuffer: Buffer
}

export default function Player(props: PlayerProps) {
  const terminal = useTerminalInfo();
  const { columns, rows } = useWindowSize();
  const stage = useMemo(
    () => calculateStageSize(columns, rows, terminal.cellWidth, terminal.cellHeight),
    [columns, rows, terminal.cellWidth, terminal.cellHeight]
  );

  let protocol: ImageProtocol | undefined;
  const preferITerm = ['iTerm.app', 'WarpTerminal', 'WezTerm'].includes(process.env.TERM_PROGRAM || '');
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
    <Box width='100%' height='100%' alignItems='center' justifyContent='center'>
      <Box width={stage.width} height={stage.height}>
        {protocol ? (
          <Renderer
            imageBuffer={props.imageBuffer}
            protocol={protocol}
          />
        ) : (
            <Image
              src={props.imageBuffer}
              width='100%'
              height='100%'
              objectFit='contain'
            />
        )}
      </Box>
    </Box>
  )
}
