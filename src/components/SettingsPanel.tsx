'use client';

import React from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useTacticsStore } from '@/store/tacticsStore';
import { useLanguage } from './I18nProvider';
import { X, RotateCcw, Info, Keyboard, Grid3X3, Palette, Layers, Globe, Bug } from 'lucide-react';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { t } = useLanguage();
  const {
    shortcutDuplicate,
    shortcutDelete,
    shortcutUndo,
    shortcutRedo,
    showGrid,
    snapToGrid,
    gridSize,
    drawColor,
    drawStrokeWidth,
    showDebugPanel,
    language,
    defaultLayers,
    setShowGrid,
    setSnapToGrid,
    setGridSize,
    setDrawColor,
    setDrawStrokeWidth,
    setShowDebugPanel,
    setLanguage,
    setDefaultLayers,
    resetToDefaults,
  } = useSettingsStore();

  // Sync with tacticsStore
  const mapHue = useTacticsStore((s) => s.mapHue);
  const mapBrightness = useTacticsStore((s) => s.mapBrightness);
  const tacticsStore = useTacticsStore();

  // Wrapper functions to sync both stores
  const handleSetShowGrid = (value: boolean) => {
    setShowGrid(value);
    tacticsStore.setShowGrid(value);
  };

  const handleSetSnapToGrid = (value: boolean) => {
    setSnapToGrid(value);
    tacticsStore.setSnapToGrid(value);
  };

  const handleSetDrawColor = (value: string) => {
    setDrawColor(value);
    tacticsStore.setDrawColor(value);
  };

  const handleSetDrawStrokeWidth = (value: number) => {
    setDrawStrokeWidth(value);
    tacticsStore.setDrawStrokeWidth(value);
  };

  const handleSetGridSize = (value: number) => {
    setGridSize(value);
    tacticsStore.setGridSize(value);
  };

  const handleSetDefaultLayers = (layers: Partial<typeof defaultLayers>) => {
    setDefaultLayers(layers);
    // Sync with tacticsStore
    if (layers.spawnBarrier !== undefined) {
      tacticsStore.setShowSpawnBarrier(layers.spawnBarrier);
    }
    if (layers.regionNames !== undefined) {
      tacticsStore.setShowRegionNames(layers.regionNames);
    }
    if (layers.ultOrbs !== undefined) {
      tacticsStore.setShowUltOrbs(layers.ultOrbs);
    }
  };

  const handleResetToDefaults = () => {
    resetToDefaults();
    // Also reset tacticsStore
    tacticsStore.setShowGrid(false);
    tacticsStore.setSnapToGrid(false);
    tacticsStore.setDrawColor('#ffffff');
    tacticsStore.setDrawStrokeWidth(3);
    tacticsStore.setShowSpawnBarrier(true);
    tacticsStore.setShowRegionNames(false);
    tacticsStore.setShowUltOrbs(true);
    tacticsStore.setGridSize(50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-overlay-in">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <h2 className="text-lg font-bold text-white">{t('settings.title')}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleResetToDefaults} 
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors" 
              title={t('settings.resetToDefault')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-5">
          {/* Shortcuts Section */}
          <SettingSection 
            icon={<Keyboard className="w-4 h-4" />} 
            title={t('settings.shortcuts')}
          >
            <div className="grid grid-cols-2 gap-3">
              <ShortcutKey label={t('settings.duplicateElement')} value={shortcutDuplicate} />
              <ShortcutKey label={t('settings.deleteElement')} value={shortcutDelete} />
              <ShortcutKey label={t('settings.undo')} value={shortcutUndo} />
              <ShortcutKey label={t('settings.redo')} value={shortcutRedo} />
            </div>
            <p className="text-xs text-zinc-500 mt-3 flex items-center gap-1.5 bg-zinc-800/50 p-2 rounded-lg">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              快捷键为系统预设，暂不支持自定义
            </p>
          </SettingSection>

          {/* Grid Section */}
          <SettingSection 
            icon={<Grid3X3 className="w-4 h-4" />} 
            title={t('settings.grid')}
          >
            <div className="space-y-3">
              <SettingRow label={t('settings.showGrid')}>
                <ToggleSwitch checked={showGrid} onChange={handleSetShowGrid} />
              </SettingRow>
              <SettingRow label={t('settings.snapToGrid')}>
                <ToggleSwitch checked={snapToGrid} onChange={handleSetSnapToGrid} />
              </SettingRow>
              <SettingRow label={t('settings.gridSize')}>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    value={gridSize} 
                    onChange={(e) => handleSetGridSize(Number(e.target.value))} 
                    min={10} 
                    max={100} 
                    step={10}
                    className="w-24 accent-blue-500" 
                  />
                  <span className="text-sm text-zinc-400 font-mono w-12">{gridSize}px</span>
                </div>
              </SettingRow>
            </div>
          </SettingSection>

          {/* 地图滤镜 */}
          <SettingSection title="地图滤镜">
            <div className="space-y-3">
              {/* 色调 */}
              <div>
                <div className="text-xs text-zinc-500 mb-1.5">色调</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '默认', value: '' },
                    { label: '黄', value: 'hue-rotate(-15deg)', color: '#eab308' },
                    { label: '绿', value: 'hue-rotate(90deg)', color: '#22c55e' },
                    { label: '青', value: 'hue-rotate(150deg)', color: '#06b6d4' },
                    { label: '蓝', value: 'hue-rotate(200deg)', color: '#3b82f6' },
                    { label: '紫', value: 'hue-rotate(260deg)', color: '#a855f7' },
                    { label: '粉', value: 'hue-rotate(310deg)', color: '#ec4899' },
                    { label: '黑白', value: 'saturate(0) brightness(1.2)', color: '#a1a1aa' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => tacticsStore.setMapHue(preset.value)}
                      className={`px-2 py-1.5 text-xs rounded-md border transition-all flex items-center justify-center gap-1 ${
                        mapHue === preset.value
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-500'
                      }`}
                    >
                      {preset.color && (
                        <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: preset.color }} />
                      )}
                      {preset.label}
                    </button>
                  ))}
                </div>
                {/* 自定义色调滑块 */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-zinc-500 shrink-0">色相</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={(() => {
                      const m = mapHue?.match(/hue-rotate\((.+?)deg\)/);
                      return m ? parseFloat(m[1]) : 0;
                    })()}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val === 0) {
                        tacticsStore.setMapHue('');
                      } else {
                        tacticsStore.setMapHue(`hue-rotate(${val}deg)`);
                      }
                    }}
                    className="flex-1 accent-blue-500"
                  />
                  <span className="text-xs text-zinc-500 font-mono w-8 text-right">
                    {(() => {
                      const m = mapHue?.match(/hue-rotate\((.+?)deg\)/);
                      return m ? `${Math.round(parseFloat(m[1]))}°` : '-';
                    })()}
                  </span>
                </div>
              </div>

              {/* 亮度 / 对比度 */}
              <div>
                <div className="text-xs text-zinc-500 mb-1.5">亮度 / 对比度</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '默认', value: 'brightness(1.1) contrast(1.15) saturate(1.1)' },
                    { label: '暗色', value: 'brightness(0.6) contrast(1.3) saturate(0.8)' },
                    { label: '高对比', value: 'brightness(1.2) contrast(1.6) saturate(1.4)' },
                    { label: '夜视', value: 'invert(1) hue-rotate(180deg) brightness(0.7) contrast(1.2)' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => tacticsStore.setMapBrightness(preset.value)}
                      className={`px-2 py-1.5 text-xs rounded-md border transition-all ${
                        mapBrightness === preset.value
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-500'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SettingSection>

          {/* Drawing Section */}
          <SettingSection 
            icon={<Palette className="w-4 h-4" />} 
            title={t('settings.drawing')}
          >
            <div className="space-y-3">
              <SettingRow label={t('settings.defaultColor')}>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={drawColor} 
                    onChange={(e) => handleSetDrawColor(e.target.value)} 
                    className="w-8 h-8 rounded-lg cursor-pointer border-2 border-zinc-700" 
                  />
                  <span className="text-xs text-zinc-500 font-mono">{drawColor}</span>
                </div>
              </SettingRow>
              <SettingRow label={t('settings.defaultStrokeWidth')}>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    value={drawStrokeWidth} 
                    onChange={(e) => handleSetDrawStrokeWidth(Number(e.target.value))} 
                    min={1} 
                    max={20} 
                    className="w-24 accent-blue-500" 
                  />
                  <span className="text-sm text-zinc-400 font-mono w-8">{drawStrokeWidth}</span>
                </div>
              </SettingRow>
            </div>
          </SettingSection>

          {/* Map Layers Section */}
          <SettingSection 
            icon={<Layers className="w-4 h-4" />} 
            title={t('settings.mapLayers')}
          >
            <div className="space-y-2">
              <SettingRow label={t('map.layers.spawnBarrier')}>
                <ToggleSwitch checked={defaultLayers.spawnBarrier} onChange={(v) => handleSetDefaultLayers({ spawnBarrier: v })} />
              </SettingRow>
              <SettingRow label={t('map.layers.regionNames')}>
                <ToggleSwitch checked={defaultLayers.regionNames} onChange={(v) => handleSetDefaultLayers({ regionNames: v })} />
              </SettingRow>
              <SettingRow label={t('map.layers.ultimateOrb')}>
                <ToggleSwitch checked={defaultLayers.ultOrbs} onChange={(v) => handleSetDefaultLayers({ ultOrbs: v })} />
              </SettingRow>
            </div>
          </SettingSection>

          {/* Other Section */}
          <SettingSection 
            icon={<Globe className="w-4 h-4" />} 
            title={t('settings.other')}
          >
            <div className="space-y-3">
              <SettingRow label={t('settings.language')}>
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value as 'zh' | 'en')} 
                  className="input-field text-sm py-1.5"
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                </select>
              </SettingRow>
              <SettingRow label={t('settings.showDebugPanel')}>
                <ToggleSwitch checked={showDebugPanel} onChange={setShowDebugPanel} />
              </SettingRow>
            </div>
          </SettingSection>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 shrink-0 bg-zinc-900/50">
          <p className="text-xs text-zinc-500 text-center">{t('settings.autoSaveHint')}</p>
        </div>
      </div>
    </div>
  );
}

// Helper components
function SettingSection({ 
  icon, 
  title, 
  children 
}: { 
  icon: React.ReactNode; 
  title: string; 
  children: React.ReactNode;
}) {
  return (
    <section className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-800/50">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-blue-400">{icon}</span>
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-zinc-400">{label}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

function ShortcutKey({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2">
      <span className="text-xs text-zinc-400">{label}</span>
      <kbd className="px-2 py-1 bg-zinc-700 rounded-md text-xs text-zinc-300 font-mono border border-zinc-600">
        {value}
      </kbd>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
        checked ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-zinc-700'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  );
}
