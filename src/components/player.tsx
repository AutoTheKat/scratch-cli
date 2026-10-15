import React, { useState, useEffect } from 'react';
import Image from 'ink-picture';
import type { Scaffolding } from '@turbowarp/scaffolding';
import type { HTMLCanvasElement } from '@onirenaud/node-webgl';

interface PlayerProps {
  scaffolding: Scaffolding
}

export function Player(props: PlayerProps) {
  const [imageBuffer, setImageBuffer] = useState<Buffer | null>(null);

  const canvas = props.scaffolding.vm.runtime.renderer.canvas as unknown as HTMLCanvasElement;
  useEffect(() => {
    let run = true;
    const render = () => {
      if (!run) {
        return;
      }
      const buffer = canvas.toBuffer('image/png');
      setImageBuffer(buffer);
      setImmediate(render);
    };

    render();
    return () => {
      run = false;
    }
  }, []);

  if (!imageBuffer) {
    return <></>;
  }

  return (
    <Image
      src={imageBuffer}
      width='100%'
      height='100%'
      objectFit='contain'
    />
  )
}
