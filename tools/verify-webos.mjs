import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** @param {string} header @param {string} segments @param {string} versions */
export function verifyWebosReports(header, segments, versions) {
  if (
    !/Class:\s+ELF32\b/.test(header) ||
    !/Data:.*little endian/.test(header) ||
    !/Machine:\s+ARM\s*$/m.test(header) ||
    !/Flags:.*Version5 EABI, soft-float ABI/.test(header)
  ) {
    throw new Error('TV executable must use ELF32 little-endian ARM EABI5 soft-float.');
  }
  if (!segments.includes('[Requesting program interpreter: /lib/ld-linux.so.3]'))
    throw new Error('TV executable must use /lib/ld-linux.so.3.');
  const imports = [...versions.matchAll(/\bGLIBC_(\d+)\.(\d+)(?:\.(\d+))?\b/g)];
  if (!imports.length) throw new Error('TV executable has no readable glibc version requirements.');
  if (
    imports.some(
      ([, major, minor, patch]) =>
        Number(major) > 2 ||
        (Number(major) === 2 &&
          (Number(minor) > 28 || (Number(minor) === 28 && Number(patch ?? 0) > 0))),
    )
  ) {
    throw new Error('TV executable requires glibc newer than the C1 ceiling of 2.28.');
  }
}

/** @param {string} binary @param {string} readelf */
export function verifyWebosExecutable(binary, readelf) {
  /** @param {string} flag */
  const inspect = (flag) =>
    execFileSync(readelf, [flag, binary], {
      encoding: 'utf8',
      timeout: 15000,
      maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env, LC_ALL: 'C' },
    });
  verifyWebosReports(inspect('-h'), inspect('-l'), inspect('--version-info'));
  console.log('Verified TV executable: ARM EABI5 soft-float, /lib/ld-linux.so.3, glibc <= 2.28.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [, , binary, readelf] = process.argv;
  if (!binary || !readelf) throw new Error('Usage: verify-webos.mjs <binary> <readelf>');
  verifyWebosExecutable(binary, readelf);
}
