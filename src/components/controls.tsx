import { Box, Text, useInput } from 'ink';
import { ProjectControl } from '../types.ts';;

interface ControlsProps {
  running: boolean;
  turbo: boolean;
  onControl: (control: ProjectControl) => void;
}

export default function Controls(props: ControlsProps) {
  useInput((input, key) => {
    if (
      !key.ctrl ||
      key.meta ||
      key.super ||
      key.hyper ||
      key.eventType === 'release' ||
      key.eventType === 'repeat'
    ) {
      return;
    }

    switch (input) {
      case 'g':
        props.onControl(ProjectControl.GreenFlag);
        break;
      case 'x':
        props.onControl(ProjectControl.Stop);
        break;
      case 't':
        props.onControl(ProjectControl.Turbo);
        break;
    }
  });

  return (
    <Box width="100%" flexDirection="column" flexShrink={0}>
      <Text wrap="truncate-end">
        <Text color={props.running ? 'green' : 'red'} bold>
          {props.running ? 'Running ⬤' : 'Stopped ⬣'}
        </Text>
        {props.turbo && (
          <Text color='magenta'>
            {' · Turbo'}
          </Text>
        )}
      </Text>
      <Text wrap="truncate-end">
        <Text color="green">^G Green Flag</Text>
        {'  '}
        <Text color="red">^X Stop</Text>
        {'  '}
        <Text color="magenta">^T Turbo</Text>
        {'  '}
        <Text dimColor>^C Quit</Text>
      </Text>
    </Box>
  );
}
