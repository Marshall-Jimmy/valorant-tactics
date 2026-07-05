import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserSettings {
  /** 快捷键：复制元素 (默认 Ctrl+Shift+D) */
  shortcutDuplicate: string;
  /** 快捷键：删除元素 (默认 Delete) */
  shortcutDelete: string;
  /** 快捷键：撤销 (默认 Ctrl+Z) */
  shortcutUndo: string;
  /** 快捷键：重做 (默认 Ctrl+Shift+Z) */
  shortcutRedo: string;
  /** 是否显示网格线 */
  showGrid: boolean;
  /** 是否吸附网格 */
  snapToGrid: boolean;
  /** 网格大小 */
  gridSize: number;
  /** 默认绘制颜色 */
  drawColor: string;
  /** 默认绘制线宽 */
  drawStrokeWidth: number;
  /** 是否显示调试面板 */
  showDebugPanel: boolean;
  /** 语言偏好 */
  language: 'zh' | 'en';
  /** 侧边栏位置 */
  sidebarPosition: 'left' | 'right';
  /** Overlay 面板位置（局内点位板） */
  overlayPanelPosition: 'left' | 'right';
  /** 地图图层默认显示 */
  defaultLayers: {
    spawnBarrier: boolean;
    regionNames: boolean;
    ultOrbs: boolean;
  };
}

interface SettingsStore extends UserSettings {
  // Actions
  setShortcutDuplicate: (value: string) => void;
  setShortcutDelete: (value: string) => void;
  setShortcutUndo: (value: string) => void;
  setShortcutRedo: (value: string) => void;
  setShowGrid: (value: boolean) => void;
  setSnapToGrid: (value: boolean) => void;
  setGridSize: (value: number) => void;
  setDrawColor: (value: string) => void;
  setDrawStrokeWidth: (value: number) => void;
  setShowDebugPanel: (value: boolean) => void;
  setLanguage: (value: 'zh' | 'en') => void;
  setSidebarPosition: (value: 'left' | 'right') => void;
  setOverlayPanelPosition: (value: 'left' | 'right') => void;
  setDefaultLayers: (layers: Partial<UserSettings['defaultLayers']>) => void;
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  shortcutDuplicate: 'Ctrl+Shift+D',
  shortcutDelete: 'Delete',
  shortcutUndo: 'Ctrl+Z',
  shortcutRedo: 'Ctrl+Shift+Z',
  showGrid: false,
  snapToGrid: false,
  gridSize: 50,
  drawColor: '#ffffff',
  drawStrokeWidth: 3,
  showDebugPanel: false,
  language: 'zh',
  sidebarPosition: 'left',
  overlayPanelPosition: 'right',
  defaultLayers: {
    spawnBarrier: true,
    regionNames: false,
    ultOrbs: true,
  },
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setShortcutDuplicate: (value) => set({ shortcutDuplicate: value }),
      setShortcutDelete: (value) => set({ shortcutDelete: value }),
      setShortcutUndo: (value) => set({ shortcutUndo: value }),
      setShortcutRedo: (value) => set({ shortcutRedo: value }),
      setShowGrid: (value) => set({ showGrid: value }),
      setSnapToGrid: (value) => set({ snapToGrid: value }),
      setGridSize: (value) => set({ gridSize: value }),
      setDrawColor: (value) => set({ drawColor: value }),
      setDrawStrokeWidth: (value) => set({ drawStrokeWidth: value }),
      setShowDebugPanel: (value) => set({ showDebugPanel: value }),
      setLanguage: (value) => set({ language: value }),
      setSidebarPosition: (value) => set({ sidebarPosition: value }),
      setOverlayPanelPosition: (value) => set({ overlayPanelPosition: value }),
      setDefaultLayers: (layers) =>
        set((state) => ({
          defaultLayers: { ...state.defaultLayers, ...layers },
        })),
      resetToDefaults: () => {
        set(DEFAULT_SETTINGS);
        // Sync tacticsStore via dynamic import to avoid circular dependency
        import('./tacticsStore').then(({ useTacticsStore }) => {
          const ts = useTacticsStore.getState();
          ts.setDrawColor(DEFAULT_SETTINGS.drawColor);
          ts.setDrawStrokeWidth(DEFAULT_SETTINGS.drawStrokeWidth);
          ts.setShowGrid(DEFAULT_SETTINGS.showGrid);
          ts.setSnapToGrid(DEFAULT_SETTINGS.snapToGrid);
          ts.setGridSize(DEFAULT_SETTINGS.gridSize);
          ts.setShowSpawnBarrier(DEFAULT_SETTINGS.defaultLayers.spawnBarrier);
          ts.setShowRegionNames(DEFAULT_SETTINGS.defaultLayers.regionNames);
          ts.setShowUltOrbs(DEFAULT_SETTINGS.defaultLayers.ultOrbs);
        });
      },
    }),
    {
      name: 'valorant-tactics-settings',
      version: 1,
      migrate: (persistedState, version) => {
        const state = persistedState as Record<string, unknown>;
        // v0 → v1: 添加 overlayPanelPosition 字段
        if (version === 0 && !('overlayPanelPosition' in state)) {
          (state as Record<string, unknown>).overlayPanelPosition = 'right';
          console.log('[settingsStore] Migrated v0→v1: added overlayPanelPosition');
        }
        return state;
      },
    }
  )
);
