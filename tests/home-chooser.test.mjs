import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('Luma is selectable as a full-screen Home without requiring Home Chooser to be installed', async () => {
  const manifest = JSON.parse(
    await fs.readFile(new URL('../appinfo.json', import.meta.url), 'utf8'),
  );
  // Home Chooser discovers launchers from appCategory, including native apps.
  assert.equal(manifest.id, 'com.ecklf.luma');
  assert.equal(manifest.type, 'native');
  assert.ok(manifest.appCategory.includes('home'));
  assert.notEqual(manifest.defaultWindowType, 'overlay');
  assert.ok(
    !manifest.requiredPermissions?.includes('org.webosbrew.homechooser.applications'),
    'The optional service permission would prevent installation before Home Chooser setup',
  );
  assert.ok(manifest.requiredACG.includes('application.query'));
  assert.ok(manifest.requiredACG.includes('application.launcher'));
});
