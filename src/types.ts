export interface CLIFlags {
  vm?: string;
  renderer?: string;
  storage?: string;
  text?: boolean;
}

export type WorkerMessage =
  | { type: 'progress'; percent: number }
  | { type: 'ready' }
  | { type: 'unchanged' }
  | { type: 'state'; running: boolean; turbo: boolean }
  | { type: 'question'; question: string | null }
  | {
      type: 'frame';
      buffer: Uint8Array;
      width: number;
      height: number;
    };

export enum ProjectControl {
  GreenFlag,
  Stop,
  Turbo
}

// Rendering-related

export type ImageProtocol = 'kitty' | 'iterm2' | 'sixel';

export interface ProjectFrame {
  buffer: Buffer;
  width: number;
  height: number;
}

export interface TerminalFrame extends ProjectFrame {
  row: number;
  column: number;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
}
