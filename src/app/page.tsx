'use client';

import { useState } from 'react';
import { useTacticsStore } from '@/store/tacticsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { MapCanvas } from '@/components/MapCanvas';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Sidebar } from '@/components/Sidebar';
import { LineupPanel } from '@/components/LineupPanel';
import { StrategyPanel } from '@/components/StrategyPanel';
import { MapSelector } from '@/components/MapSelector';
import { TeamToggle } from '@/components/TeamToggle';
import { MapLayerToggles } from '@/components/MapLayerToggles';
import { ZoomControls } from '@/components/ZoomControls';
import { SettingsPanel } from '@/components/SettingsPanel';
import { useLanguage } from '@/components/I18nProvider';
import { Menu, X } from 'lucide-react';
import { ModeToggle } from '@/components/ModeToggle';

export default function Home() {
  const [showStrategyPanel, setShowStrategyPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const currentStrategy = useTacticsStore((state) => state.currentStrategy);
  const appMode = useTacticsStore((state) => state.appMode);
  const setAppMode = useTacticsStore((state) => state.setAppMode);
  const setAnyDialogOpen = useTacticsStore((state) => state.setAnyDialogOpen);
  const sidebarPosition = useSettingsStore((s) => s.sidebarPosition);
  const showDebugPanel = useSettingsStore((s) => s.showDebugPanel);
  const currentMap = useTacticsStore((s) => s.currentMap);
  const lineupAgentId = useTacticsStore((s) => s.lineupAgentId);
  const isAttack = useTacticsStore((s) => s.isAttack);
  const favoriteLineups = useTacticsStore((s) => s.favoriteLineups);
  const { t } = useLanguage();

  return (
    <div className={`flex h-screen w-screen bg-zinc-950 overflow-hidden ${sidebarPosition === 'right' ? 'flex-row-reverse' : ''}`}>
      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`
        fixed lg:relative z-50 lg:z-auto h-full transition-transform duration-300 ease-in-out
        ${sidebarPosition === 'right'
          ? showMobileSidebar ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          : showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }
      `}>
        {appMode === 'lineup' ? (
          <LineupPanel onClose={() => setShowMobileSidebar(false)} />
        ) : (
          <Sidebar onClose={() => setShowMobileSidebar(false)} />
        )}
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Top Bar */}
        <div className="h-14 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800/80 flex items-center justify-between px-3 sm:px-4 shrink-0 z-20">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              className="lg:hidden p-2 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white"
              title="菜单"
            >
              {showMobileSidebar ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/20">
                <span className="text-white font-bold text-xs">V</span>
              </div>
              <h1 className="text-sm sm:text-lg font-bold text-white tracking-tight whitespace-nowrap">
                <span className="text-zinc-400 font-medium">jima</span>VaroTacts
              </h1>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-zinc-700" />

            {/* Mode Toggle */}
            <ModeToggle />

            {/* Map & Team Controls */}
            <div className="hidden md:flex items-center gap-2">
              <MapSelector />
              <TeamToggle />
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden lg:block">
              <MapLayerToggles />
            </div>
            {appMode === 'strategy' && (
              <button
                onClick={() => { setShowStrategyPanel(!showStrategyPanel); setAnyDialogOpen(!showStrategyPanel); }}
                className="btn btn-secondary"
              >
                {t('lineup.strategy')}
              </button>
            )}
            <button
              onClick={() => { setShowSettingsPanel(true); setAnyDialogOpen(true); }}
              className="btn btn-icon btn-ghost"
              title="设置"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Map Selector & Team Toggle */}
        <div className="sm:hidden flex items-center gap-2 px-2 py-2 bg-zinc-900/50 border-b border-zinc-800">
          <MapSelector />
          <TeamToggle />
          <MapLayerToggles />
        </div>

        {/* Map Canvas */}
        <div className="flex-1 relative min-h-0">
          <ErrorBoundary>
            <MapCanvas />
          </ErrorBoundary>

          {/* Zoom Controls */}
          <div className="absolute bottom-4 left-4 z-20">
            <ZoomControls />
          </div>

          {/* Strategy Name Overlay */}
          {currentStrategy && appMode === 'strategy' && (
            <div className="absolute top-2 left-4 z-10 bg-zinc-900/80 backdrop-blur-sm px-3 py-1.5 rounded border border-zinc-800">
              <span className="text-xs font-medium text-zinc-400">策略: </span>
              <span className="text-xs font-bold text-white">{currentStrategy.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Strategy Panel Modal */}
      {showStrategyPanel && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-overlay-in">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl w-full max-w-[600px] max-h-[80vh] overflow-hidden animate-modal-in">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
              <div>
                <h2 className="text-lg font-semibold text-white">{t('strategy.title')}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{t('strategy.description')}</p>
              </div>
              <button onClick={() => { setShowStrategyPanel(false); setAnyDialogOpen(false); }} className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              <StrategyPanel />
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettingsPanel && (
        <SettingsPanel onClose={() => { setShowSettingsPanel(false); setAnyDialogOpen(false); }} />
      )}

      {/* Debug Info Panel */}
      {showDebugPanel && (
        <div className="absolute bottom-4 right-4 z-50 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded-lg p-3 text-xs text-zinc-400 font-mono max-w-[300px]">
          <div className="text-zinc-200 font-semibold mb-1">调试信息</div>
          <div>地图: {currentMap}</div>
          <div>特工: {lineupAgentId || 'none'}</div>
          <div>攻守: {isAttack ? '进攻' : '防守'}</div>
          <div>收藏数: {favoriteLineups.length}</div>
          <div>模式: {appMode}</div>
          <div>侧边栏: {sidebarPosition}</div>
        </div>
      )}
    </div>
  );
}
