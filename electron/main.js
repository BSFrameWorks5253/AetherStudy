const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let mainWindow = null;

function checkUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve(res.statusCode < 400);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 400, // Mobile friendly testing in desktop
    minHeight: 650,
    title: 'AetherStudy',
    backgroundColor: '#030712',
    frame: true,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  if (isDev) {
    // Check if port 5173 or 5174 is running
    const port5173 = await checkUrl('http://localhost:5173');
    if (port5173) {
      mainWindow.loadURL('http://localhost:5173');
    } else {
      const port5174 = await checkUrl('http://localhost:5174');
      if (port5174) {
        mainWindow.loadURL('http://localhost:5174');
      } else {
        // Fallback to local dist if available or default
        const indexPath = path.join(__dirname, '../dist/index.html');
        mainWindow.loadFile(indexPath).catch(() => {
          mainWindow.loadURL('http://localhost:5173');
        });
      }
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
