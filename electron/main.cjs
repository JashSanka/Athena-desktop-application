const { app, BrowserWindow, session, ipcMain, Menu, systemPreferences } = require('electron');
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

function setupAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 800,
    minHeight: 600,
    title: 'Athena - Online Examination Proctoring',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (!app.isPackaged && process.env.NODE_ENV === 'development') {
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

app.whenReady().then(async () => {
  setupAppMenu();

  // Ensure screenshot folder exists in target location (userData or project folder)
  ensureScreenshotsDir();

  // Request macOS system-level media permission proactively if supported
  if (process.platform === 'darwin' && systemPreferences && systemPreferences.askForMediaAccess) {
    try {
      const cameraStatus = systemPreferences.getMediaAccessStatus ? systemPreferences.getMediaAccessStatus('camera') : null;
      if (cameraStatus !== 'granted') {
        await systemPreferences.askForMediaAccess('camera');
      }
    } catch {
      // Ignore if running in unsupported or non-GUI test environment
    }
  }

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
