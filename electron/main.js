const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// 禁用安全警告
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow;
let server;

// MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

const DIST_DIR = path.join(__dirname, '..', 'dist');

// 启动本地 HTTP 服务器
function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      let filePath = decodeURIComponent(req.url).replace(/^\//, '') || 'index.html';
      const fullPath = path.join(DIST_DIR, filePath);

      // 如果文件不存在，返回 index.html（SPA fallback）
      let servePath = fullPath;
      if (!fs.existsSync(servePath)) {
        servePath = path.join(DIST_DIR, 'index.html');
      }

      // 获取 MIME 类型
      const ext = path.extname(servePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(servePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });

    // 监听随机端口
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve(port);
    });
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    show: false,
    titleBarStyle: 'default',
    title: 'Valorant Tactics',
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // 移除默认菜单栏
  Menu.setApplicationMenu(null);
  
  const port = await startServer();
  console.log(`Local server running at http://127.0.0.1:${port}`);
  createWindow(port);
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const port = await startServer();
    createWindow(port);
  }
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
