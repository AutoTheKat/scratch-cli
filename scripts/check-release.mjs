import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const tag = process.env.GITHUB_REF_NAME;

assert.match(
  tag,
  /^v\d+\.\d+\.\d+$/,
  'Use a stable version tag, such as v0.1.0'
);
assert.equal(
  tag,
  `v${version}`,
  'Tag must match package.json version'
);
