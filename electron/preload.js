/**
 * @agent Native/Overlay 开发专家
 * @last-modified 2026-07-04
 * @description Preload script for overlay BrowserWindow.
 *   通过 contextBridge 暴露安全的 IPC API 给 overlay 渲染进程。
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 从主窗口读取 overlay 速查数据
   * @returns {Promise<object|null>} { agent, abilities, map } 或 null
   */
  getOverlayData: () => ipcRenderer.invoke('get-overlay-data'),

  /**
   * 请求关闭 overlay 窗口
   */
  closeOverlay: () => ipcRenderer.send('close-overlay'),

  /**
   * 扩展窗口到全屏（预览模式）
   */
  expandWindow: () => ipcRenderer.send('expand-window'),

  /**
   * 缩小窗口回面板大小
   */
  shrinkWindow: () => ipcRenderer.send('shrink-window'),

  /**
   * 设置面板位置（左/右）
   */
  setPanelPosition: (position) => ipcRenderer.send('set-overlay-panel-position', position),

  /**
   * 监听主进程推送的 overlay 数据更新（即时更新，无需等待轮询）
   * @param {function} callback - 接收数据的回调 (data) => void
   */
  onOverlayDataUpdate: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('overlay-data-push', handler);
    return handler;
  },

  /**
   * 取消监听 overlay 数据更新，防止重复注册导致内存泄漏
   * @param {function} handler - onOverlayDataUpdate 返回的 handler
   */
  offOverlayDataUpdate: (handler) => {
    ipcRenderer.removeListener('overlay-data-push', handler);
  },
});
