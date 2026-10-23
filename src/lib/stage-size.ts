export default function calculateStageSize(
  columns: number,
  rows: number,
  cellWidth: number,
  cellHeight: number,
  stageWidth: number,
  stageHeight: number
) {
  const height = Math.max(1, rows - 1);
  const width = Math.max(
    1,
    Math.min(
      columns,
      Math.floor(
        (height * cellHeight * stageWidth) / (cellWidth * stageHeight)
      )
    )
  );

  return {
    width,
    height: Math.max(
      1,
      Math.min(
        height,
        Math.ceil(
          (width * cellWidth * stageHeight) /
            (cellHeight * stageWidth)
        )
      )
    )
  };
}
