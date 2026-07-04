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
let overlayWindow = null;

// 创建/切换 Overlay 窗口（小窗口方案：窗口只覆盖面板区域，预览时扩展到全屏）
const BASE_PANEL_WIDTH = 210;
let currentPanelWidth = BASE_PANEL_WIDTH;
let overlayPanelPosition = 'right'; // 'left' 或 'right'，由设置控制

async function toggleOverlay() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    // 已存在 → 销毁
    overlayWindow.close();
    overlayWindow = null;
    console.log('[Overlay] 窗口关闭');
  } else {
    // 不存在 → 创建面板大小的小窗口
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // 从主窗口 localStorage 读取面板位置设置
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        const settingsRaw = await mainWindow.webContents.executeJavaScript(`localStorage.getItem('valorant-tactics-settings')`);
        if (settingsRaw) {
          const parsed = JSON.parse(settingsRaw);
          if (parsed.state?.overlayPanelPosition) {
            overlayPanelPosition = parsed.state.overlayPanelPosition;
          }
        }
      } catch (e) {
        // 读取失败，使用默认值
      }
    }

    const scaleFactor = primaryDisplay.scaleFactor || 1;
    const PANEL_WIDTH = Math.round(BASE_PANEL_WIDTH * scaleFactor);
    currentPanelWidth = PANEL_WIDTH;
    // 高度固定为屏幕高度的 2/3
    const panelHeight = Math.floor(screenHeight * 2 / 3);
    const panelY = Math.floor((screenHeight - panelHeight) / 2);
    const panelX = overlayPanelPosition === 'left' ? 0 : (screenWidth - PANEL_WIDTH);

    overlayWindow = new BrowserWindow({
      width: PANEL_WIDTH,
      height: panelHeight,
      x: panelX,
      y: panelY,
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

    // 加载 overlay 页面
    const port = server ? server.address().port : lastPort;
    if (port) {
      overlayWindow.loadURL(`http://127.0.0.1:${port}/overlay.html`);
    } else {
      overlayWindow.loadFile(path.join(DIST_DIR, 'overlay.html'));
    }

    overlayWindow.once('ready-to-show', () => {
      overlayWindow.showInactive();
      overlayWindow.setAlwaysOnTop(true, 'pop-up-menu');
      overlayWindow.moveTop();
      const ts = new Date().toLocaleTimeString();
      console.log(`[Overlay] 窗口显示 @ ${ts} | panel ${PANEL_WIDTH}x${panelHeight} @ (${screenWidth - PANEL_WIDTH}, ${panelY})`);
    });

    overlayWindow.on('closed', () => {
      overlayWindow = null;
      console.log('[Overlay] 窗口销毁');
    });

    // 不再自动监视 Valorant 进程，overlay 只通过 F4 手动关闭
  }
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

// 关闭 overlay 窗口
ipcMain.on('close-overlay', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
    overlayWindow = null;
    console.log('[Overlay] 窗口通过 IPC 关闭');
  }
});

// 扩展窗口到全屏（预览模式）
ipcMain.on('expand-window', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: w, height: h } = primaryDisplay.workAreaSize;
    overlayWindow.setBounds({ x: 0, y: 0, width: w, height: h });
    // 重新置顶确保在游戏上方
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.moveTop();
    console.log(`[Overlay] 窗口扩展到全屏 ${w}x${h} | alwaysOnTop=screen-saver`);
  }
});

// 设置 Overlay 面板位置（左/右）
ipcMain.on('set-overlay-panel-position', (event, position) => {
  if (position === 'left' || position === 'right') {
    overlayPanelPosition = position;
    console.log(`[Overlay] 面板位置设置为: ${position}`);
    // 如果窗口已存在，立即调整位置
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: sw, height: sh } = primaryDisplay.workAreaSize;
      const panelHeight = Math.floor(sh * 2 / 3);
      const panelY = Math.floor((sh - panelHeight) / 2);
      const panelX = position === 'left' ? 0 : (sw - currentPanelWidth);
      overlayWindow.setBounds({ x: panelX, y: panelY, width: currentPanelWidth, height: panelHeight });
    }
  }
});

// 缩小窗口回面板大小
ipcMain.on('shrink-window', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: sw, height: sh } = primaryDisplay.workAreaSize;
    const panelHeight = Math.floor(sh * 2 / 3);
    const panelY = Math.floor((sh - panelHeight) / 2);
    const panelX = overlayPanelPosition === 'left' ? 0 : (sw - currentPanelWidth);
    overlayWindow.setBounds({ x: panelX, y: panelY, width: currentPanelWidth, height: panelHeight });
    overlayWindow.setAlwaysOnTop(true, 'pop-up-menu');
    overlayWindow.moveTop();
    console.log(`[Overlay] 窗口缩回面板 ${currentPanelWidth}x${panelHeight} @ (${panelX}, ${panelY}) | alwaysOnTop=pop-up-menu`);
  }
});

// 关闭所有 overlay 窗口
function closeAllOverlays() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
    overlayWindow = null;
  }
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

// 注册全局快捷键
function registerShortcuts() {
  // F4
  const retF4 = globalShortcut.register('F4', () => {
    const ts = new Date().toLocaleTimeString();
    console.log(`[Overlay] F4 按下 @ ${ts}`);
    toggleOverlay();
  });
  if (!retF4) {
    console.error('[Overlay] F4 快捷键注册失败');
  } else {
    console.log('[Overlay] F4 已注册');
  }

  // 备用快捷键 Ctrl+Shift+O
  const retCSO = globalShortcut.register('Ctrl+Shift+O', () => {
    const ts = new Date().toLocaleTimeString();
    console.log(`[Overlay] Ctrl+Shift+O 按下 @ ${ts}`);
    toggleOverlay();
  });
  if (!retCSO) {
    console.error('[Overlay] Ctrl+Shift+O 快捷键注册失败');
  } else {
    console.log('[Overlay] Ctrl+Shift+O 已注册');
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
