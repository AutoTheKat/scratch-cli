import { randomInt } from 'node:crypto';
import FrameEncoder, { type ImageProtocol, type TerminalFrame } from './frame-encoder.ts';

export default class FrameWriter {
  private encoder: FrameEncoder;
  private pending: TerminalFrame | undefined;
  private lastFrame: TerminalFrame | undefined;
  private running = false;
  private stopped = false;
  private imageId = randomInt(1, 0xfffffffd);
  private previousId = 0;

  constructor(
    private protocol: ImageProtocol,
    private stdout: NodeJS.WritableStream,
    private onError: (error: Error) => void,
  ) {
    this.encoder = new FrameEncoder(protocol);
    stdout.on('error', onError);
  }

  submit(frame: TerminalFrame) {
    if (this.stopped) {
      return;
    }
    this.pending = frame;
    if (!this.running) {
      this.running = true;
      this.flush().catch(this.onError);
    }
  }

  private async flush() {
    while (this.pending && !this.stopped) {
      const frame = this.pending;
      this.pending = undefined;
      const output = await this.encoder.encodeFrame(frame, this.imageId);
      if (this.stopped) {
        break;
      }

      let deletion = '';
      if (this.protocol === 'kitty' && this.previousId) {
        deletion = `\x1b_Ga=d,d=I,i=${this.previousId},q=2\x1b\\`;
      }
      const positioned = `\x1b7\x1b[${frame.row};${frame.column}H${output}${deletion}\x1b8`;
      this.lastFrame = frame;
      await new Promise<void>((resolve, reject) => {
        // Wait for the write callback so slow output cannot accumulate old frames.
        this.stdout.write(positioned, error => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      this.previousId = this.imageId;
      this.imageId = this.imageId % 0xffffffff + 1;
    }
    this.running = false;
  }

  stop() {
    if (this.stopped) {
      return;
    }
    this.stopped = true;
    this.pending = undefined;
    this.stdout.removeListener('error', this.onError);
    if (this.protocol === 'kitty') {
      this.stdout.write(`\x1b_Ga=d,d=I,i=${this.imageId},q=2\x1b\\`);
      if (this.previousId) {
        this.stdout.write(`\x1b_Ga=d,d=I,i=${this.previousId},q=2\x1b\\`);
      }
    } else if (this.lastFrame) {
      const frame = this.lastFrame;
      const lines: string[] = [];
      for (let row = frame.row; row < frame.row + frame.rows; row += 1) {
        lines.push(`\x1b[${row};${frame.column}H${' '.repeat(frame.columns)}`);
      }
      this.stdout.write(`\x1b7${lines.join('')}\x1b8`);
    }
  }
}
