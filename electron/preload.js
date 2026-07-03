/**
 * @agent Native/Overlay 开发专家
 * @last-modified 2026-07-03
 * @description Preload script for overlay BrowserWindow.
 *   通过 contextBridge 暴露安全的 IPC API 给 overlay 渲染进程。
 *   - getOverlayData: 从主窗口 localStorage 读取 vt-overlay-data
 *   - closeOverlay: 通知 main 进程关闭 overlay 窗口
 *   - setIgnoreMouseEvents: 设置窗口鼠标穿透（panel 模式穿透，preview 模式不穿透）
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 从主窗口读取 overlay 速查数据
   * @returns {Promise<object|null>} { agent, abilities, map } 或 null
   */
  getOverlayData: () => ipcRenderer.invoke('get-overlay-data'),

  /**
   * 请求关闭 overlay 窗口（销毁，不是 hide）
   */
  closeOverlay: () => ipcRenderer.send('close-overlay'),

  /**
   * 设置窗口鼠标穿透
   * @param {boolean} ignore - true 时面板外区域穿透到游戏，false 时正常接收
   */
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse-events', ignore),
});
