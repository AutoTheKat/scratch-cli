import {
  createCanvas,
  Image,
  type Canvas,
  type CanvasRenderingContext2D
} from 'canvas';
import { image2sixel } from 'sixel';
import type { ImageProtocol, TerminalFrame } from '../types.ts';

export default class FrameEncoder {
  private canvas: Canvas | undefined;
  private context: CanvasRenderingContext2D | undefined;
  private image: Image | undefined;
  private imageBuffer: Buffer | undefined;

  constructor(private protocol: ImageProtocol) {}

  encodeFrame(frame: TerminalFrame, imageId: number) {
    const { buffer, columns, rows, cellWidth, cellHeight } = frame;
    const scale = Math.min(
      (columns * cellWidth) / frame.width,
      (rows * cellHeight) / frame.height
    );
    const width = Math.max(1, Math.floor(frame.width * scale));
    const height = Math.max(1, Math.floor(frame.height * scale));

    if (this.protocol === 'sixel') {
      this.canvas ||= createCanvas(width, height);
      this.context ||= this.canvas.getContext('2d');
      this.image ||= new Image();
      if (
        this.canvas.width !== width ||
        this.canvas.height !== height
      ) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
      if (this.imageBuffer !== buffer) {
        this.image.src = buffer;
        if (
          !this.image.complete ||
          this.image.width < 1 ||
          this.image.height < 1
        ) {
          throw new Error('Invalid project frame.');
        }
        this.imageBuffer = buffer;
      }
      const scale = Math.min(
        width / this.image.width,
        height / this.image.height
      );
      const imageWidth = this.image.width * scale;
      const imageHeight = this.image.height * scale;
      this.context.fillStyle = 'black';
      this.context.fillRect(0, 0, width, height);
      this.context.drawImage(
        this.image,
        (width - imageWidth) / 2,
        (height - imageHeight) / 2,
        imageWidth,
        imageHeight
      );
      return image2sixel(
        this.context.getImageData(0, 0, width, height).data,
        width,
        height
      );
    }

    const data = buffer.toString('base64');
    if (this.protocol === 'iterm2') {
      return `\x1b]1337;File=size=${buffer.length};width=${width}px;height=${height}px;preserveAspectRatio=1;inline=1:${data}\x07`;
    }

    const chunks: string[] = [];
    for (let offset = 0; offset < data.length; offset += 4096) {
      const more = Number(offset + 4096 < data.length);
      const control =
        offset === 0 ? `a=t,f=100,t=d,i=${imageId},q=2,` : '';
      chunks.push(
        `\x1b_G${control}m=${more};${data.slice(offset, offset + 4096)}\x1b\\`
      );
    }
    // Let the terminal derive the height from our source image.
    chunks.push(
      `\x1b_Ga=p,i=${imageId},p=1,c=${columns},C=1,q=2\x1b\\`
    );
    return chunks.join('');
  }
}
