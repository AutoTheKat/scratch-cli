import { readFile } from 'node:fs/promises';
import {
  downloadProjectFromID,
  downloadProjectFromURL,
  type Options
} from '@turbowarp/sbdl';

const scratchLinkRegex =
  /^https?:\/\/scratch\.mit\.edu\/projects\/(\d+)(?:\/|[?#]|$)/i;

export default async function downloadProject(
  input: string,
  onProgress?: Options['onProgress']
) {
  const numericInput = Number(input);
  const id = Number.isInteger(numericInput)
    ? String(numericInput)
    : input.match(scratchLinkRegex)?.[1];

  if (id || /^https?:\/\//i.test(input)) {
    const project = id
      ? await downloadProjectFromID(id, { onProgress })
      : await downloadProjectFromURL(input, { onProgress });
    return Buffer.from(project.arrayBuffer);
  }

  return readFile(input);
}
