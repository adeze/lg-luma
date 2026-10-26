import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const shaderRoot = path.resolve(import.meta.dirname, '../src/shaders');

/** @param {string} directory */
export async function checkShaders(directory = shaderRoot) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'luma-shaders-'));
  try {
    let programs = 0;
    for (const [variant, prefix, precision] of [
      ['desktop150', 'desktop', ''],
      ['gles100-highp', 'gles', 'highp'],
      ['gles100-mediump', 'gles', 'mediump'],
    ]) {
      for (const name of ['paint', 'vector', 'text']) {
        const files = [];
        for (const stage of ['vert', 'frag']) {
          const source = name === 'text' && stage === 'frag' ? 'vector' : name;
          const [header, body] = await Promise.all([
            fs.readFile(path.join(directory, `${prefix}.${stage}.glsl`), 'utf8'),
            fs.readFile(path.join(directory, `${source}.${stage}`), 'utf8'),
          ]);
          const file = path.join(temporary, `${variant}-${name}.${stage}`);
          await fs.writeFile(file, header.replaceAll('LUMA_PRECISION', precision) + body);
          files.push(file);
        }
        try {
          // GLSL/ESSL front-end linking, without SPIR-V's incompatible minimum versions.
          execFileSync('glslangValidator', ['--quiet', '-l', ...files], {
            encoding: 'utf8',
            timeout: 15000,
            maxBuffer: 1024 * 1024,
          });
        } catch (cause) {
          throw new Error(
            `Shader validation failed: ${variant}/${name}. Install glslang (glslang-tools on Linux); see validator output.`,
            { cause },
          );
        }
        programs += 1;
      }
    }
    return programs;
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(
    `Validated ${await checkShaders()} shader programs: GLSL 150, ESSL 100 highp/mediump.`,
  );
}
