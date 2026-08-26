const { app, BrowserWindow, protocol, net, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Silence the "Insecure Content-Security-Policy" warning in development DevTools
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Register the custom protocol as privileged so it behaves like a standard web origin (e.g. for CORS and Service Workers)
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true } }
]);

// Fix for Linux Wayland rendering issues (white screen)
app.commandLine.appendSwitch('disable-vulkan');

let win;

function createWindow () {
  const iconFileName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  const appIconPath = app.isPackaged
    ? path.join(process.resourcesPath, iconFileName)
    : path.join(__dirname, '..', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,              // Remove the native title bar
    autoHideMenuBar: true,
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the web app via our custom protocol
  win.loadURL('app://-/').catch((err) => {
    console.error('Failed to load URL:', err);
  });

  // Toggle fullscreen with F11
  globalShortcut.register('F11', () => {
    if (win) win.setFullScreen(!win.isFullScreen());
  });

  // Notify renderer when maximize state changes
  win.on('maximize', () => win.webContents.send('maximize-change', true));
  win.on('unmaximize', () => win.webContents.send('maximize-change', false));
}

// IPC handlers for custom title bar window controls
ipcMain.on('window-minimize', () => { if (win) win.minimize(); });
ipcMain.on('window-maximize', () => {
  if (win) {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
});
ipcMain.on('window-close', () => { if (win) win.close(); });
ipcMain.handle('window-is-maximized', () => { return win ? win.isMaximized() : false; });

app.whenReady().then(() => {
  // Determine where the web build assets live
  const isPackaged = app.isPackaged;
  const webPath = isPackaged
    ? path.join(process.resourcesPath, 'web-dist') // When packaged by electron-builder
    : path.join(__dirname, '..', 'web', 'dist');   // In local development

  // Handle the 'app://' protocol by reading local files from the web build directory
  protocol.handle('app', (request) => {
    // Safely extract the path from the URL
    const parsedUrl = new URL(request.url);
    let urlPath = parsedUrl.pathname;
    if (urlPath.startsWith('/')) {
      urlPath = urlPath.slice(1); // Remove leading slash
    }
    if (urlPath === '') urlPath = 'index.html';
    
    let filePath = path.join(webPath, urlPath);
    
    // Fallback to index.html for Single Page Application (SPA) routing
    if (!fs.existsSync(filePath)) {
      filePath = path.join(webPath, 'index.html');
    }
    
    return net.fetch('file://' + filePath);
  });

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
