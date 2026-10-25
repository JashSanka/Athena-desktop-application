/**
 * Athena Proctoring — Screenshot Storage Module (using Node.js fs module)
 * Handles writing, deleting, and managing webcam screenshot files in the project folder.
 */

const fs = require('fs');
const path = require('path');

let electronApp = null;
try {
  const electron = require('electron');
  electronApp = electron.app;
} catch {
  electronApp = null;
}

/**
 * Resolves the screenshots directory path within the project folder structure.
 * Default location in dev: <projectRoot>/screenshots
 * Default location when packaged: <userData>/screenshots
 * @param {string} [customDir]
 * @returns {string} Absolute path to screenshots directory
 */
function getScreenshotsDir(customDir) {
  if (customDir) {
    return path.resolve(customDir);
  }
  if (process.env.ATHENA_SCREENSHOTS_DIR) {
    return path.resolve(process.env.ATHENA_SCREENSHOTS_DIR);
  }
  if (electronApp && typeof electronApp.isPackaged === 'boolean' && electronApp.isPackaged) {
    return path.join(electronApp.getPath('userData'), 'screenshots');
  }
  // __dirname is <projectRoot>/electron
  return path.resolve(__dirname, '..', 'screenshots');
}

/**
 * Ensures that the target screenshots folder exists using fs.mkdirSync.
 * @param {string} [dirPath]
 * @returns {string} Absolute directory path
 */
function ensureScreenshotsDir(dirPath) {
  const targetDir = dirPath ? path.resolve(dirPath) : getScreenshotsDir();
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
}

/**
 * Saves screenshot data to the screenshots folder in the project structure using the fs module.
 * Accepts Buffer, Uint8Array, ArrayBuffer, or base64 data URL string.
 *
 * @param {Object} options
 * @param {Buffer|Uint8Array|ArrayBuffer|string} options.data - Binary or base64 screenshot data
 * @param {string} [options.filename] - Destination filename (e.g. snap_12345.jpg)
 * @param {string} [options.dir] - Optional destination directory override
 * @returns {Promise<{ success: boolean, filePath?: string, filename?: string, bytes?: number, error?: string }>}
 */
async function saveScreenshotFile({ data, filename, dir } = {}) {
  try {
    if (!data) {
      throw new Error('Screenshot data is required.');
    }

    const targetDir = ensureScreenshotsDir(dir);
    const safeFilename = filename
      ? path.basename(filename)
      : `screenshot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const filePath = path.join(targetDir, safeFilename);

    let buffer;
    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else if (data instanceof Uint8Array || ArrayBuffer.isView(data)) {
      buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    } else if (data instanceof ArrayBuffer) {
      buffer = Buffer.from(data);
    } else if (typeof data === 'string') {
      const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else if (data && typeof data.arrayBuffer === 'function') {
      const ab = await data.arrayBuffer();
      buffer = Buffer.from(ab);
    } else {
      throw new Error('Unsupported screenshot data format. Expected Buffer, Uint8Array, ArrayBuffer, or base64 string.');
    }

    await fs.promises.writeFile(filePath, buffer);

    return {
      success: true,
      filePath,
      filename: safeFilename,
      bytes: buffer.length
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Deletes a single screenshot file from the screenshots folder using fs.unlink.
 * @param {string} filename
 * @param {string} [dir]
 * @returns {Promise<{ success: boolean, filePath?: string, notFound?: boolean, error?: string }>}
 */
async function deleteScreenshotFile(filename, dir) {
  try {
    if (!filename) return { success: false, error: 'Filename is required' };
    const targetDir = getScreenshotsDir(dir);
    const filePath = path.join(targetDir, path.basename(filename));

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return { success: true, filePath };
    }
    return { success: true, notFound: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Clears all captured image files in the screenshots folder (preserving .gitkeep).
 * @param {string} [dir]
 * @returns {Promise<{ success: boolean, deletedCount: number, error?: string }>}
 */
async function clearScreenshotsDir(dir) {
  try {
    const targetDir = getScreenshotsDir(dir);
    if (!fs.existsSync(targetDir)) {
      return { success: true, deletedCount: 0 };
    }

    const files = await fs.promises.readdir(targetDir);
    let deletedCount = 0;

    for (const file of files) {
      if (file === '.gitkeep') continue;
      const filePath = path.join(targetDir, file);
      const stat = await fs.promises.stat(filePath);
      if (stat.isFile()) {
        await fs.promises.unlink(filePath);
        deletedCount++;
      }
    }

    return { success: true, deletedCount };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Lists filenames of all image screenshots currently saved on disk.
 * @param {string} [dir]
 * @returns {Promise<string[]>}
 */
async function listScreenshots(dir) {
  try {
    const targetDir = getScreenshotsDir(dir);
    if (!fs.existsSync(targetDir)) return [];
    const files = await fs.promises.readdir(targetDir);
    return files.filter((f) => f !== '.gitkeep' && /\.(jpe?g|png|webp)$/i.test(f));
  } catch {
    return [];
  }
}

module.exports = {
  getScreenshotsDir,
  ensureScreenshotsDir,
  saveScreenshotFile,
  deleteScreenshotFile,
  clearScreenshotsDir,
  listScreenshots
};
