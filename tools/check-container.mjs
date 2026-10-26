import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const binary = path.join(root, 'target/armv7-unknown-linux-gnueabi/release/luma');
await fs.access(binary);
const image = 'lg-luma-checks:local';
/** @type {[string[], number][]} */
const commands = [
  [['build', '--file', 'docker/Dockerfile.checks', '--tag', image, '.'], 300000],
  [
    [
      'run',
      '--rm',
      '--network',
      'none',
      '--read-only',
      '--cap-drop',
      'ALL',
      '--security-opt',
      'no-new-privileges',
      '--mount',
      `type=bind,source=${binary},target=/artifacts/luma,readonly`,
      image,
    ],
    30000,
  ],
];
for (const [args, timeout] of commands) {
  const result = spawnSync('docker', args, { cwd: root, stdio: 'inherit', timeout });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
