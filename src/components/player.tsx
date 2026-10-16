import React from 'react';
import Image from 'ink-picture';

interface PlayerProps {
  imageBuffer: Buffer
}

export default function Player(props: PlayerProps) {
  return (
    <Image
      src={props.imageBuffer}
      width='100%'
      height='100%'
      objectFit='contain'
    />
  )
}
