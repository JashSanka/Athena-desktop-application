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
  }
});
