import { Box, Text, useWindowSize } from 'ink';
import { ProgressBar, Spinner } from '@inkjs/ui';
import { useTerminalInfo } from 'ink-picture';

interface LoadingProps {
  percent: number
}

export default function Loading(props: LoadingProps) {
  const { columns, rows } = useWindowSize();
  const { cellWidth, cellHeight } = useTerminalInfo();
  const height = Math.max(1, rows - 1);
  const scale = Math.min(columns * cellWidth / 480, height * cellHeight / 360);

  return (
    <Box
      width='100%'
      height='100%'
      alignItems='center'
      justifyContent='center'
    >
      <Box
        width={Math.max(1, Math.floor(480 * scale / cellWidth))}
        height={Math.max(1, Math.floor(360 * scale / cellHeight))}
        borderStyle='round'
        borderColor='gray'
        flexDirection='column'
        justifyContent='center'
        alignItems='center'
      >
        <Text bold>Loading project</Text>
        <Spinner />
        <Box width='60%' marginY={1}>
          <ProgressBar value={props.percent} />
        </Box>
        <Text>
          <Text color='magenta' bold>{props.percent}%</Text>
          <Text dimColor> · assets loaded</Text>
        </Text>
      </Box>
    </Box>
  );
}
