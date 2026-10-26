import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const device = args[1];
if (args.length !== 2 || args[0] !== '--device' || !device || !/^[a-zA-Z0-9_-]+$/.test(device))
  throw new Error('Pass an ares device profile: bun run deploy --device tv');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'appinfo.json'), 'utf8'));
/** @type {[string, string[]][]} */
const commands = [
  [
    'ares-install',
    ['--device', device, path.join(root, 'dist', `${manifest.id}_${manifest.version}_arm.ipk`)],
  ],
  ['ares-launch', ['--device', device, manifest.id]],
];
for (const [tool, args] of commands) {
  const cli = path.join(root, 'node_modules/@webos-tools/cli/bin', `${tool}.js`);
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    stdio: 'inherit',
    timeout: 120000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
