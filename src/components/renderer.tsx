import { useRef, useState, useEffect } from 'react';
import { useStdout, useWindowSize, Box, type DOMElement } from 'ink';
import { usePosition, useTerminalInfo } from 'ink-picture';
import FrameWriter from '../lib/frame-writer.ts';
import type { ImageProtocol } from '../lib/frame-encoder.ts';

interface RendererProps {
  protocol: ImageProtocol;
  imageBuffer: Buffer;
}

export default function Renderer(props: RendererProps) {
  const container = useRef<DOMElement>(null);
  const position = usePosition(container);
  const terminal = useTerminalInfo();
  const { stdout } = useStdout();
  const { columns, rows } = useWindowSize();
  const writer = useRef<FrameWriter | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const renderer = new FrameWriter(
      props.protocol,
      stdout,
      setError
    );
    writer.current = renderer;
    return () => {
      renderer.stop();
      writer.current = null;
    };
  }, [props.protocol, stdout]);

  useEffect(() => {
    if (!position || position.width < 1 || position.height < 1) {
      return;
    }
    const row = rows - position.appHeight + position.row;

    if (
      row < 1 ||
      row + position.height - 1 > rows ||
      position.col < 0 ||
      position.col + position.width > columns
    ) {
      return;
    }
    writer.current?.submit({
      buffer: props.imageBuffer,
      row,
      column: position.col + 1,
      columns: position.width,
      rows: position.height,
      cellWidth: terminal.cellWidth,
      cellHeight: terminal.cellHeight
    });
  }, [
    props.imageBuffer,
    position,
    props.protocol,
    rows,
    columns,
    terminal.cellWidth,
    terminal.cellHeight
  ]);

  if (error) {
    throw error;
  }

  return <Box ref={container} width="100%" height="100%" />;
}
