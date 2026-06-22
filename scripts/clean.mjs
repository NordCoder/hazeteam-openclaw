import * as fs from 'node:fs/promises';

const outputDirectories = [
  'packages/openclaw-adapter/dist',
  'packages/openclaw-testkit/dist',
];

for (const outputDirectory of outputDirectories) {
  await fs.rm(outputDirectory, { recursive: true, force: true });
}
