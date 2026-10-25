import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  getScreenshotsDir,
  ensureScreenshotsDir,
  saveScreenshotFile,
  deleteScreenshotFile,
  clearScreenshotsDir,
  listScreenshots
} = require('../electron/screenshotStorage.cjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDir = path.join(__dirname, 'test_screenshots_tmp');

describe('Screenshot Storage Module (using Node.js fs)', () => {
  before(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  after(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('resolves project screenshots directory by default', () => {
    const dir = getScreenshotsDir();
    assert.ok(dir.endsWith('screenshots'));
    assert.ok(path.isAbsolute(dir));
  });

  it('ensures target screenshots directory exists on filesystem using fs', () => {
    assert.equal(fs.existsSync(testDir), false);
    const created = ensureScreenshotsDir(testDir);
    assert.equal(created, testDir);
    assert.equal(fs.existsSync(testDir), true);
  });

  it('saves screenshot file from Uint8Array to disk using fs', async () => {
    const fakeData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]); // JPEG magic header bytes
    const filename = 'test_capture_1.jpg';

    const result = await saveScreenshotFile({
      data: fakeData,
      filename,
      dir: testDir
    });

    assert.equal(result.success, true);
    assert.equal(result.filename, filename);
    assert.ok(fs.existsSync(result.filePath));

    const savedBytes = fs.readFileSync(result.filePath);
    assert.equal(savedBytes.length, fakeData.length);
    assert.deepEqual(Array.from(savedBytes), Array.from(fakeData));
  });

  it('saves screenshot file from base64 string to disk using fs', async () => {
    const rawContent = 'Athena proctoring test screenshot content';
    const base64Data = `data:image/jpeg;base64,${Buffer.from(rawContent).toString('base64')}`;
    const filename = 'test_capture_2.jpg';

    const result = await saveScreenshotFile({
      data: base64Data,
      filename,
      dir: testDir
    });

    assert.equal(result.success, true);
    assert.equal(result.filename, filename);
    assert.ok(fs.existsSync(result.filePath));

    const content = fs.readFileSync(result.filePath, 'utf-8');
    assert.equal(content, rawContent);
  });

  it('saves screenshot file from Blob object to disk using fs', async () => {
    const rawContent = 'Athena blob test screenshot content';
    const blob = new Blob([rawContent], { type: 'text/plain' });
    const filename = 'test_capture_blob.jpg';

    const result = await saveScreenshotFile({
      data: blob,
      filename,
      dir: testDir
    });

    assert.equal(result.success, true);
    assert.equal(result.filename, filename);
    assert.ok(fs.existsSync(result.filePath));

    const content = fs.readFileSync(result.filePath, 'utf-8');
    assert.equal(content, rawContent);

    // Clean up
    await deleteScreenshotFile(filename, testDir);
  });

  it('lists saved screenshot files using fs', async () => {
    const files = await listScreenshots(testDir);
    assert.ok(files.includes('test_capture_1.jpg'));
    assert.ok(files.includes('test_capture_2.jpg'));
    assert.equal(files.length, 2);
  });

  it('deletes a single screenshot file using fs', async () => {
    const targetFile = 'test_capture_1.jpg';
    const result = await deleteScreenshotFile(targetFile, testDir);

    assert.equal(result.success, true);
    assert.equal(fs.existsSync(path.join(testDir, targetFile)), false);
    assert.equal(fs.existsSync(path.join(testDir, 'test_capture_2.jpg')), true);
  });

  it('clears all screenshots from directory using fs', async () => {
    const result = await clearScreenshotsDir(testDir);
    assert.equal(result.success, true);
    assert.equal(result.deletedCount, 1);

    const remaining = await listScreenshots(testDir);
    assert.equal(remaining.length, 0);
  });

  it('handles missing or invalid data gracefully without crashing', async () => {
    const result = await saveScreenshotFile({ data: null, dir: testDir });
    assert.equal(result.success, false);
    assert.match(result.error, /required/i);
  });
});
