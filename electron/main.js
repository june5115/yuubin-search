const { app, BrowserWindow } = require('electron');
const { fork } = require('child_process');
const path = require('path');

let serverProcess = null;
let mainWindow = null;
const PORT = 3000;

function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = fork(path.join(__dirname, '..', 'server.js'), {
      env: { ...process.env, PORT: String(PORT) },
      silent: true,
    });

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log('[server]', msg.trim());
      if (msg.includes('サーバー起動')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[server]', data.toString().trim());
    });

    serverProcess.on('error', reject);

    // フォールバック: 2秒後に強制resolve
    setTimeout(resolve, 2000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    title: '〒 郵便番号検索',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
