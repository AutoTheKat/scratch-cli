export default function calculateStageSize(
  columns: number,
  rows: number,
  cellWidth: number,
  cellHeight: number
) {
  const height = Math.max(1, rows - 1);
  const width = Math.max(
    1,
    Math.min(
      columns,
      Math.floor((height * cellHeight * 4) / (cellWidth * 3))
    )
  );

  return {
    width,
    height: Math.max(
      1,
      Math.min(
        height,
        Math.ceil((width * cellWidth * 3) / (cellHeight * 4))
      )
    )
  };
}
