const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Fullscreen controls
  enterFullscreen: () => ipcRenderer.invoke('fullscreen:enter'),
  exitFullscreen: () => ipcRenderer.invoke('fullscreen:exit'),
  isFullscreen: () => ipcRenderer.invoke('fullscreen:status'),

  // Listen for fullscreen state changes pushed from main process
  onFullscreenChange: (callback) => {
    ipcRenderer.on('fullscreen:changed', (_event, isFullscreen) => callback(isFullscreen));
  },
  removeFullscreenListener: () => {
    ipcRenderer.removeAllListeners('fullscreen:changed');
  },

  // Screenshot storage APIs (using fs module in main process)
  saveScreenshot: (payload) => ipcRenderer.invoke('screenshot:save', payload),
  getScreenshotsDir: () => ipcRenderer.invoke('screenshot:getDir'),
  deleteScreenshot: (filename) => ipcRenderer.invoke('screenshot:delete', filename),
  clearScreenshots: () => ipcRenderer.invoke('screenshot:clear'),
  listScreenshots: () => ipcRenderer.invoke('screenshot:list')
});
