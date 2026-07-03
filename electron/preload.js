/**
 * @agent Native/Overlay 开发专家
 * @last-modified 2026-07-03
 * @description Preload script for overlay BrowserWindow.
 *   通过 contextBridge 暴露安全的 IPC API 给 overlay 渲染进程。
 *   - getOverlayData: 从主窗口 localStorage 读取 vt-overlay-data
 *   - closeOverlay: 通知 main 进程关闭面板 overlay 窗口
 *   - openPreview: 通知 main 进程打开预览窗口（传递点位数据）
 *   - closePreview: 通知 main 进程关闭预览窗口
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 从主窗口读取 overlay 速查数据
   * @returns {Promise<object|null>} { agent, abilities, map } 或 null
   */
  getOverlayData: () => ipcRenderer.invoke('get-overlay-data'),

  /**
   * 请求关闭面板 overlay 窗口（销毁，不是 hide）
   */
  closeOverlay: () => ipcRenderer.send('close-overlay'),

  /**
   * 请求打开预览窗口（传递点位数据）
   * @param {object} lineupData - 点位数据对象
   */
  openPreview: (lineupData) => ipcRenderer.send('open-preview', lineupData),

  /**
   * 请求关闭预览窗口（销毁）
   */
  closePreview: () => ipcRenderer.send('close-preview'),
});
