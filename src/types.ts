export interface CLIFlags {
  vm?: string;
  renderer?: string;
  storage?: string;
}

export type WorkerMessage =
  | { type: 'progress'; percent: number }
  | { type: 'ready' }
  | { type: 'unchanged' }
  | { type: 'state'; running: boolean; turbo: boolean }
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
