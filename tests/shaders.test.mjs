import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkShaders } from '../tools/check-shaders.mjs';

test('actual shader variants link and the validator rejects syntax and varying mismatches', async (t) => {
  assert.equal(await checkShaders(), 9);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'luma-shader-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.cp(new URL('../src/shaders/', import.meta.url), directory, { recursive: true });
  const fragment = path.join(directory, 'paint.frag');
  const original = await fs.readFile(fragment, 'utf8');
  await fs.writeFile(fragment, `${original}\nthis is not GLSL;\n`);
  await assert.rejects(checkShaders(directory), /Shader validation failed: desktop150\/paint/);
  await fs.writeFile(
    fragment,
    original.replace('vec2 v_uv', 'vec3 v_uv').replaceAll('u_texture, v_uv', 'u_texture, v_uv.xy'),
  );
  await assert.rejects(checkShaders(directory), /Shader validation failed: desktop150\/paint/);
});
