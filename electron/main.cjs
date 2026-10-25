const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const {
  getScreenshotsDir,
  ensureScreenshotsDir,
  saveScreenshotFile,
  deleteScreenshotFile,
  clearScreenshotsDir,
  listScreenshots
} = require('./screenshotStorage.cjs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Notify renderer whenever fullscreen state changes (e.g. user presses Esc or F11)
  mainWindow.on('enter-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fullscreen:changed', true);
    }
  });

  mainWindow.on('leave-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fullscreen:changed', false);
    }
  });

  // Also handle when user uses system controls (e.g. green button on macOS)
  mainWindow.on('enter-html-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fullscreen:changed', true);
    }
  });

  mainWindow.on('leave-html-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fullscreen:changed', false);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for fullscreen
ipcMain.handle('fullscreen:enter', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setFullScreen(true);
    return true;
  }
  return false;
});

ipcMain.handle('fullscreen:exit', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setFullScreen(false);
    return true;
  }
  return false;
});

ipcMain.handle('fullscreen:status', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow.isFullScreen();
  }
  return false;
});

// IPC Handlers for Screenshots (using fs module)
ipcMain.handle('screenshot:save', async (_event, payload) => {
  return await saveScreenshotFile(payload);
});

ipcMain.handle('screenshot:getDir', async () => {
  return getScreenshotsDir();
});

ipcMain.handle('screenshot:delete', async (_event, filename) => {
  return await deleteScreenshotFile(filename);
});

ipcMain.handle('screenshot:clear', async () => {
  return await clearScreenshotsDir();
});

ipcMain.handle('screenshot:list', async () => {
  return await listScreenshots();
});

app.whenReady().then(() => {
  // Ensure screenshot folder exists in project structure
  ensureScreenshotsDir();
  // Allow webcam permission requests inside Electron environment
  if (session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      if (permission === 'media') {
        return callback(true);
      }
      callback(false);
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
      if (permission === 'media') {
        return true;
      }
      return false;
    });
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
