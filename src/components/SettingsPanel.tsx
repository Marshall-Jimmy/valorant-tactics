'use client';

import React from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useTacticsStore } from '@/store/tacticsStore';
import { useLanguage } from './I18nProvider';
import { X, RotateCcw, Info, Keyboard, Grid3X3, Palette, Layers, Globe, Bug, PanelLeft, PanelRight } from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { CustomSlider } from './CustomSlider';
import { ToggleSwitch } from './ToggleSwitch';

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
    sidebarPosition,
    overlayPanelPosition,
    defaultLayers,
    setShowDebugPanel,
    setLanguage,
    setSidebarPosition,
    setOverlayPanelPosition,
    resetToDefaults,
  } = useSettingsStore();

  // Sync with tacticsStore - getters for map filters
  const mapHue = useTacticsStore((s) => s.mapHue);
  const mapBrightness = useTacticsStore((s) => s.mapBrightness);
  // TacticsStore setters now auto-sync to settingsStore, so we use them directly
  const setShowGrid = useTacticsStore((s) => s.setShowGrid);
  const setSnapToGrid = useTacticsStore((s) => s.setSnapToGrid);
  const setGridSize = useTacticsStore((s) => s.setGridSize);
  const setDrawColor = useTacticsStore((s) => s.setDrawColor);
  const setDrawStrokeWidth = useTacticsStore((s) => s.setDrawStrokeWidth);
  const setShowSpawnBarrier = useTacticsStore((s) => s.setShowSpawnBarrier);
  const setShowRegionNames = useTacticsStore((s) => s.setShowRegionNames);
  const setShowUltOrbs = useTacticsStore((s) => s.setShowUltOrbs);
  const setMapHue = useTacticsStore((s) => s.setMapHue);
  const setMapBrightness = useTacticsStore((s) => s.setMapBrightness);

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
              onClick={resetToDefaults} 
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
                <ToggleSwitch checked={showGrid} onChange={setShowGrid} />
              </SettingRow>
              <SettingRow label={t('settings.snapToGrid')}>
                <ToggleSwitch checked={snapToGrid} onChange={setSnapToGrid} />
              </SettingRow>
              <SettingRow label={t('settings.gridSize')}>
                <CustomSlider
                  value={gridSize}
                  onValueChange={setGridSize}
                  min={10}
                  max={100}
                  step={10}
                  showValue
                  valueSuffix="px"
                  className="w-48"
                />
              </SettingRow>
            </div>
          </SettingSection>

          {/* 地图滤镜 */}
          <SettingSection title="地图滤镜">
            <div className="space-y-3">
              {/* 色调 */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Palette className="w-3 h-3 text-zinc-500" />
                  <span className="text-xs text-zinc-400 font-medium">色调</span>
                </div>
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
                      onClick={() => setMapHue(preset.value)}
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
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs text-zinc-400 shrink-0 w-8">色相</span>
                  <CustomSlider
                    value={(() => {
                      const m = mapHue?.match(/hue-rotate\((.+?)deg\)/);
                      return m ? parseFloat(m[1]) : 0;
                    })()}
                    onValueChange={(val) => {
                      if (val === 0) setMapHue('');
                      else setMapHue(`hue-rotate(${val}deg)`);
                    }}
                    min={0}
                    max={360}
                    step={5}
                    showValue
                    valueSuffix="°"
                  />
                </div>
              </div>

              {/* 亮度 / 对比度 */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Layers className="w-3 h-3 text-zinc-500" />
                  <span className="text-xs text-zinc-400 font-medium">亮度 / 对比度</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '默认', value: 'brightness(1.1) contrast(1.15) saturate(1.1)' },
                    { label: '暗色', value: 'brightness(0.6) contrast(1.3) saturate(0.8)' },
                    { label: '高对比', value: 'brightness(1.2) contrast(1.6) saturate(1.4)' },
                    { label: '夜视', value: 'invert(1) hue-rotate(180deg) brightness(0.7) contrast(1.2)' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setMapBrightness(preset.value)}
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
                <div className="flex items-center gap-2.5">
                  <input 
                    type="color" 
                    value={drawColor} 
                    onChange={(e) => setDrawColor(e.target.value)} 
                    className="w-9 h-9 rounded-lg cursor-pointer ring-2 ring-zinc-700 hover:ring-zinc-500 transition-all" 
                  />
                  <span className="text-xs text-zinc-400 font-mono bg-zinc-800/60 px-2 py-0.5 rounded-md border border-zinc-700/50">{drawColor}</span>
                </div>
              </SettingRow>
              <SettingRow label={t('settings.defaultStrokeWidth')}>
                <CustomSlider
                  value={drawStrokeWidth}
                  onValueChange={setDrawStrokeWidth}
                  min={1}
                  max={20}
                  showValue
                  className="w-48"
                />
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
                <ToggleSwitch checked={defaultLayers.spawnBarrier} onChange={(v) => setShowSpawnBarrier(v)} />
              </SettingRow>
              <SettingRow label={t('map.layers.regionNames')}>
                <ToggleSwitch checked={defaultLayers.regionNames} onChange={(v) => setShowRegionNames(v)} />
              </SettingRow>
              <SettingRow label={t('map.layers.ultimateOrb')}>
                <ToggleSwitch checked={defaultLayers.ultOrbs} onChange={(v) => setShowUltOrbs(v)} />
              </SettingRow>
            </div>
          </SettingSection>

          {/* Other Section */}
          <SettingSection 
            icon={<Globe className="w-4 h-4" />} 
            title={t('settings.other')}
          >
            <div className="space-y-3">
              <SettingRow label={t('settings.sidebarPosition')}>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSidebarPosition('left')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      sidebarPosition === 'left'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white'
                    }`}
                  >
                    <PanelLeft className="w-3.5 h-3.5" />
                    {t('settings.sidebarPositionLeft')}
                  </button>
                  <button
                    onClick={() => setSidebarPosition('right')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      sidebarPosition === 'right'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white'
                    }`}
                  >
                    <PanelRight className="w-3.5 h-3.5" />
                    {t('settings.sidebarPositionRight')}
                  </button>
                </div>
              </SettingRow>
              <SettingRow label={t('settings.overlayPanelPosition')}>
                <div className="flex gap-1">
                  <button
                    onClick={() => setOverlayPanelPosition('left')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      overlayPanelPosition === 'left'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white'
                    }`}
                  >
                    <PanelLeft className="w-3.5 h-3.5" />
                    {t('settings.sidebarPositionLeft')}
                  </button>
                  <button
                    onClick={() => setOverlayPanelPosition('right')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      overlayPanelPosition === 'right'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white'
                    }`}
                  >
                    <PanelRight className="w-3.5 h-3.5" />
                    {t('settings.sidebarPositionRight')}
                  </button>
                </div>
              </SettingRow>
              <SettingRow label={t('settings.language')}>
                <CustomSelect
                  value={language}
                  onValueChange={setLanguage}
                  options={[
                    { value: 'zh', label: '中文' },
                    { value: 'en', label: 'English' },
                  ]}
                  className="min-w-[100px]"
                />
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


