const { app, BrowserWindow, Menu, globalShortcut, Tray, nativeImage, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// 禁用安全警告
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow;
let server;
let tray = null;
let lastPort = null;

// ============ Overlay 功能 ============
let overlayPanelWindow = null;
let overlayPreviewWindow = null;
let valorantProcessWatcher = null;

// 检查 Valorant 是否在运行
function isValorantRunning() {
  try {
    // 通过 PowerShell 检查 VALORANT-Win64-Shipping 进程
    const { execSync } = require('child_process');
    const result = execSync('tasklist /FI "IMAGENAME eq VALORANT-Win64-Shipping.exe" /NH', { encoding: 'utf-8' });
    return result.includes('VALORANT-Win64-Shipping');
  } catch {
    return false;
  }
}

// 创建/切换面板 Overlay 窗口
function toggleOverlay() {
  if (overlayPanelWindow && !overlayPanelWindow.isDestroyed()) {
    // 已存在 → 销毁面板 + 预览
    overlayPanelWindow.close();
    overlayPanelWindow = null;
    if (overlayPreviewWindow && !overlayPreviewWindow.isDestroyed()) {
      overlayPreviewWindow.close();
      overlayPreviewWindow = null;
    }
    console.log('[Overlay] 面板关闭');
  } else {
    // 不存在 → 创建面板窗口
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    const panelWidth = 260;
    const panelHeight = Math.min(600, Math.floor(screenHeight * 0.8));
    const x = screenWidth - panelWidth;
    const y = Math.floor((screenHeight - panelHeight) / 2);

    overlayPanelWindow = new BrowserWindow({
      width: panelWidth,
      height: panelHeight,
      x: x,
      y: y,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      resizable: false,
      focusable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        preload: path.join(__dirname, 'preload.js'),
      },
      show: false,
    });

    // 加载 overlay 页面（panel 模式）
    const port = server ? server.address().port : lastPort;
    if (port) {
      overlayPanelWindow.loadURL(`http://127.0.0.1:${port}/overlay.html?mode=panel`);
    } else {
      overlayPanelWindow.loadFile(path.join(DIST_DIR, 'overlay.html'), { query: { mode: 'panel' } });
    }

    overlayPanelWindow.once('ready-to-show', () => {
      overlayPanelWindow.show();
      // 强制置顶到最高级别（抢过游戏的 topmost 窗口）
      overlayPanelWindow.setAlwaysOnTop(true, 'pop-up-menu');
      overlayPanelWindow.moveTop();
      const ts = new Date().toLocaleTimeString();
      console.log(`[Overlay] 面板显示 @ ${ts} | alwaysOnTop=pop-up-menu | pos=(${x},${y}) | size=${panelWidth}x${panelHeight}`);
    });

    overlayPanelWindow.on('closed', () => {
      overlayPanelWindow = null;
      console.log('[Overlay] 面板销毁');
    });

    // 游戏退出时自动关闭所有 overlay
    startValorantWatcher();
  }
}

// 创建/显示预览窗口
function togglePreview(lineupData) {
  // 如果已存在，先关闭旧的
  if (overlayPreviewWindow && !overlayPreviewWindow.isDestroyed()) {
    overlayPreviewWindow.close();
    overlayPreviewWindow = null;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  overlayPreviewWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    focusable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  // 鼠标穿透
  overlayPreviewWindow.setIgnoreMouseEvents(true);

  // 通过 URL query string 传递数据
  let dataStr = '';
  try {
    dataStr = Buffer.from(JSON.stringify(lineupData)).toString('base64');
  } catch (e) {
    console.error('[Overlay] 序列化预览数据失败:', e);
  }

  const port = server ? server.address().port : lastPort;
  if (port) {
    overlayPreviewWindow.loadURL(
      `http://127.0.0.1:${port}/overlay.html?mode=preview&data=${encodeURIComponent(dataStr)}`
    );
  } else {
    overlayPreviewWindow.loadFile(path.join(DIST_DIR, 'overlay.html'), { query: { mode: 'preview' } });
  }

  overlayPreviewWindow.once('ready-to-show', () => {
    overlayPreviewWindow.show();
    overlayPreviewWindow.setAlwaysOnTop(true, 'pop-up-menu');
    overlayPreviewWindow.moveTop();
    console.log('[Overlay] 预览窗口显示');
  });

  overlayPreviewWindow.on('closed', () => {
    overlayPreviewWindow = null;
    console.log('[Overlay] 预览窗口销毁');
  });
}

// ============ Overlay IPC Handlers ============

// 从主窗口 localStorage 读取 overlay 数据
ipcMain.handle('get-overlay-data', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      const data = await mainWindow.webContents.executeJavaScript(`
        (function() {
          try {
            var raw = localStorage.getItem('vt-overlay-data');
            return raw ? JSON.parse(raw) : null;
          } catch(e) { return null; }
        })()
      `);
      return data;
    } catch (e) {
      console.error('[Overlay] 读取主窗口数据失败:', e);
      return null;
    }
  }
  return null;
});

// 关闭面板 overlay 窗口
ipcMain.on('close-overlay', () => {
  if (overlayPanelWindow && !overlayPanelWindow.isDestroyed()) {
    overlayPanelWindow.close();
    overlayPanelWindow = null;
    console.log('[Overlay] 面板通过 IPC 关闭');
  }
});

// 打开预览窗口
ipcMain.on('open-preview', (event, lineupData) => {
  if (lineupData) {
    togglePreview(lineupData);
  } else {
    console.warn('[Overlay] open-preview 未收到 lineupData');
  }
});

// 关闭预览窗口
ipcMain.on('close-preview', () => {
  if (overlayPreviewWindow && !overlayPreviewWindow.isDestroyed()) {
    overlayPreviewWindow.close();
    overlayPreviewWindow = null;
    console.log('[Overlay] 预览窗口通过 IPC 关闭');
  }
});

// 关闭所有 overlay 窗口
function closeAllOverlays() {
  if (overlayPanelWindow && !overlayPanelWindow.isDestroyed()) {
    overlayPanelWindow.close();
    overlayPanelWindow = null;
  }
  if (overlayPreviewWindow && !overlayPreviewWindow.isDestroyed()) {
    overlayPreviewWindow.close();
    overlayPreviewWindow = null;
  }
}

// 监视 Valorant 进程，退出时自动关闭 overlay
function startValorantWatcher() {
  if (valorantProcessWatcher) clearInterval(valorantProcessWatcher);
  valorantProcessWatcher = setInterval(() => {
    if (!isValorantRunning()) {
      if ((overlayPanelWindow && !overlayPanelWindow.isDestroyed()) ||
          (overlayPreviewWindow && !overlayPreviewWindow.isDestroyed())) {
        console.log('[Overlay] 检测到 Valorant 退出，自动关闭 overlay');
        closeAllOverlays();
      }
      clearInterval(valorantProcessWatcher);
      valorantProcessWatcher = null;
    }
  }, 3000); // 每 3 秒检查一次
}

// ============ 系统托盘 ============

function createTray() {
  // 创建一个简单的 16x16 托盘图标（紫色圆点）
  const icon = nativeImage.createFromBuffer(
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwQAADsEBuJFr7QAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4xMkMEa+wAAABFSURBVDhPxZDRDYAgDERhQNoQElOwAHE3IKhvAVnSAFHZAB1YQelAExKAVzIBd4gV+wUULMzOmOxOzzMztjLnIJfv2GXR2/wI6muOHzUWswbAAAAAElFTkSuQmCC', 'base64')
  );

  tray = new Tray(icon);
  tray.setToolTip('Valorant Tactics');

  const contextMenu = Menu.buildFromTemplate([
    { label: '打开主窗口', click: () => { if (mainWindow) mainWindow.show(); else createWindow(lastPort); } },
    { label: '切换 Overlay (F4)', click: toggleOverlay },
    { type: 'separator' },
    { label: '退出', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) mainWindow.show();
  });
}

// 注册 F4 全局快捷键
function registerShortcuts() {
  const ret = globalShortcut.register('F4', () => {
    const ts = new Date().toLocaleTimeString();
    console.log(`[Overlay] F4 按下 @ ${ts}`);
    toggleOverlay();
  });

  if (!ret) {
    console.error('[Overlay] F4 快捷键注册失败，可能被其他程序占用');
  } else {
    console.log('[Overlay] F4 快捷键已注册，按 F4 切换 Overlay');
  }
}

// ============ 原有主窗口逻辑 ============

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

const DIST_DIR = path.join(__dirname, '..', 'out');

// 启动本地 HTTP 服务器
const PORT = process.env.VT_PORT ? parseInt(process.env.VT_PORT, 10) : 3777;

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      let filePath = decodeURIComponent(req.url).replace(/^\//, '').split('?')[0] || 'index.html';
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
    server.listen(PORT, '127.0.0.1', () => {
      const port = server.address().port;
      lastPort = port;
      console.log(`[Server] 运行在 http://127.0.0.1:${port}`);
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

  // 主窗口关闭时隐藏而不是退出
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

app.whenReady().then(async () => {
  // 移除默认菜单栏
  Menu.setApplicationMenu(null);
  
  const port = await startServer();
  console.log(`Local server running at http://127.0.0.1:${port}`);
  createWindow(port);
  registerShortcuts();
  createTray();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (tray) tray.destroy();
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const port = await startServer();
    createWindow(port);
  }
});

app.on('window-all-closed', () => {
  // 不退出 app，保持在后台运行（托盘 + F4）
  // 只在显式退出时才 quit
});
