import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { verifyWebosReports } from '../tools/verify-webos.mjs';

const root = path.resolve(import.meta.dirname, '..');
const header =
  'Class: ELF32\nData: little endian\nMachine: ARM\nFlags: Version5 EABI, soft-float ABI\n';
const segments = '[Requesting program interpreter: /lib/ld-linux.so.3]';
const versions = 'Name: GLIBC_2.4\nName: GLIBC_2.28\n';

test('the C1 ABI gate accepts compatible reports and rejects incompatible or missing evidence', () => {
  assert.doesNotThrow(() => verifyWebosReports(header, segments, versions));
  for (const reports of [
    [header.replace('ELF32', 'ELF64'), segments, versions],
    [header.replace('little endian', 'big endian'), segments, versions],
    [header.replace('ARM', 'AArch64'), segments, versions],
    [header.replace('soft-float', 'hard-float'), segments, versions],
    [header, segments.replace('ld-linux.so.3', 'ld-linux-armhf.so.3'), versions],
    [header, segments, 'Name: GLIBC_2.29'],
    [header, segments, 'Name: GLIBC_2.28.1'],
    [header, segments, 'No version information'],
  ])
    assert.throws(() => verifyWebosReports(...reports));
});

test('deploy refuses missing, malformed and extra device options before invoking ares', () => {
  for (const args of [
    [],
    ['--device'],
    ['--device', 'bad;device'],
    ['tv'],
    ['--device', 'tv', '--force'],
  ]) {
    const result = spawnSync(process.execPath, [path.join(root, 'tools/deploy.mjs'), ...args], {
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Pass an ares device profile/);
  }
});

test('cross-build selects rustup cargo and rustc even when another cargo shadows them', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'luma-build-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const sdk = path.join(directory, 'sdk');
  const bin = path.join(directory, 'bin');
  const record = path.join(directory, 'compiler');
  for (const name of ['tools', 'tv', 'sdk/bin', 'sdk/sysroot/usr/include', 'bin'])
    await fs.mkdir(path.join(directory, name), { recursive: true });
  for (const file of [
    'tools/build-webos.sh',
    'tools/verify-webos.mjs',
    'tv/install-directories.txt',
  ])
    await fs.copyFile(path.join(root, file), path.join(directory, file));
  await fs.writeFile(path.join(directory, 'tools/webos-runtime.mjs'), '');
  await fs.writeFile(path.join(sdk, 'sysroot/usr/include/stdint.h'), '');
  const executable = async (file, script) =>
    fs.writeFile(file, `#!/bin/sh\n${script}\n`, { mode: 0o755 });
  await executable(
    path.join(sdk, 'bin/arm-webos-linux-gnueabi-gcc'),
    'printf "%s\\n" "$WEBOS_NDK/sysroot"',
  );
  await executable(path.join(bin, 'cargo'), 'exit 91');
  await executable(path.join(bin, 'rustup'), 'printf "%s\\n" "$LUMA_TEST_BIN/pinned-$2"');
  await executable(path.join(bin, 'pinned-cargo'), 'printf "%s" "$RUSTC" > "$LUMA_TEST_COMPILER"');
  await executable(
    path.join(sdk, 'bin/arm-webos-linux-gnueabi-readelf'),
    `case "$1" in\n-h) cat <<'REPORT'\n${header}REPORT\n;;\n-l) printf '%s\\n' '${segments}' ;;\n--version-info) printf '%s\\n' 'GLIBC_2.28' ;;\nesac`,
  );
  const result = spawnSync('sh', [path.join(directory, 'tools/build-webos.sh')], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 15000,
    env: {
      ...process.env,
      WEBOS_NDK: sdk,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      LUMA_TEST_BIN: bin,
      LUMA_TEST_COMPILER: record,
    },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(await fs.readFile(record, 'utf8'), path.join(bin, 'pinned-rustc'));
  assert.match(result.stdout, /Verified TV executable/);
});
