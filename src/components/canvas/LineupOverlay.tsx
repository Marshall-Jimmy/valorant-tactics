'use client';

import React from 'react';
import type { Lineup } from '@/data/lineups';
import type { TempLineupData, LineupEditorMode } from '@/store/tacticsStore';
import type { CoordinateTransform } from '@/hooks/useCoordinateTransform';
import { LineupMarkers, type MarkerVisibility } from '../LineupMarkers';

interface LineupOverlayProps {
  appMode: string;
  lineupsData: unknown | null;
  currentMapLineups: (Lineup & { abilityKey: string })[];
  selectedLineup: Lineup | null;
  currentMap: string;
  isAttack: boolean;
  zoom: number;
  markerVisibility: MarkerVisibility;
  mousePosition: { x: number; y: number } | null;
  tempLineupData: TempLineupData | null;
  transform: CoordinateTransform;
  t: (key: string) => string;
  onSelectLineup: (lineup: Lineup) => void;
  onSetMarkerVisibility: (v: MarkerVisibility) => void;
  coordinateOverrides?: Record<number, { start: [number, number]; end: [number, number] }>;
  lineupEditorMode?: LineupEditorMode;
  abilityVisibilityFilter?: string[];
  onToggleAbilityVisibility?: (key: string) => void;
  onClearAbilityVisibility?: () => void;
  viewportWidth?: number;
  viewportHeight?: number;
}

/** Renders lineup markers, loading indicator, visibility toggle, and debug info */
export const LineupOverlay = React.memo(function LineupOverlay({
  appMode,
  lineupsData,
  currentMapLineups,
  selectedLineup,
  isAttack,
  zoom,
  markerVisibility,
  mousePosition,
  tempLineupData,
  transform,
  t,
  onSelectLineup,
  onSetMarkerVisibility,
  coordinateOverrides = {},
  lineupEditorMode = 'idle',
  abilityVisibilityFilter = [],
  onToggleAbilityVisibility,
  onClearAbilityVisibility,
  viewportWidth = 0,
  viewportHeight = 0,
}: LineupOverlayProps) {
  if (appMode !== 'lineup') return null;

  const { worldToScreen, screenToWorld } = transform;

  return (
    <>
      {/* Lineup Markers */}
      {currentMapLineups.length > 0 && (
        <LineupMarkers
          lineups={currentMapLineups}
          selectedLineup={selectedLineup}
          onSelect={onSelectLineup}
          worldToScreen={worldToScreen}
          zoom={zoom}
          isFlipped={!isAttack}
          markerVisibility={markerVisibility}
          tempLineupData={tempLineupData}
          coordinateOverrides={coordinateOverrides}
          lineupEditorMode={lineupEditorMode}
          abilityVisibilityFilter={abilityVisibilityFilter}
          viewportWidth={viewportWidth}
          viewportHeight={viewportHeight}
        />
      )}

      {/* Lineup Loading Indicator */}
      {!lineupsData && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-zinc-900/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-zinc-700 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-300">{t('lineup.loading')}</span>
        </div>
      )}

      {/* 技能筛选 + Marker Visibility */}
      {currentMapLineups.length > 0 && onToggleAbilityVisibility && (
        <div className="absolute top-4 right-4 z-30 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded-lg">
          {/* 技能筛选 */}
          {(() => {
            const ALL_ABILITY_KEYS = ['C', 'Q', 'E', 'X'];
            const existingKeys = new Set(currentMapLineups.map(l => l.abilityKey));
            return (
              <div className="px-3 py-2 border-b border-zinc-700">
                <div className="text-xs text-zinc-400 mb-1.5">技能筛选</div>
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={onClearAbilityVisibility}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      abilityVisibilityFilter.length === 0
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white border border-transparent'
                    }`}
                  >
                    全部
                  </button>
                  {ALL_ABILITY_KEYS.map(key => {
                    const hasData = existingKeys.has(key);
                    const isActive = abilityVisibilityFilter.length > 0 && abilityVisibilityFilter.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          if (hasData) onToggleAbilityVisibility(key);
                        }}
                        className={`px-2 py-1 text-xs rounded transition-colors font-bold ${
                          isActive
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : hasData
                              ? 'bg-zinc-800 text-zinc-400 hover:text-white border border-transparent'
                              : 'bg-zinc-800/50 text-zinc-600 border border-transparent cursor-not-allowed'
                        }`}
                        title={hasData ? undefined : '当前地图无此技能数据'}
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          {/* Marker Visibility Toggle */}
          <div className="px-3 py-2">
            <div className="text-xs text-zinc-400 mb-1.5">{t('lineup.markerDisplay')}</div>
            <div className="flex gap-1">
              {([
                { value: 'all' as const, label: t('lineup.filter.all') },
                { value: 'stand' as const, label: t('lineup.standPosition') },
                { value: 'landing' as const, label: t('lineup.landingPosition') },
                { value: 'none' as const, label: t('lineup.hide') },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onSetMarkerVisibility(opt.value)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    markerVisibility === opt.value
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Debug Info Panel - 右下角横排 */}
      {mousePosition && (
        <div className="absolute bottom-4 right-4 z-30 bg-zinc-900/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-zinc-700 text-xs font-mono flex items-center gap-4">
          <div>
            <span className="text-zinc-500">屏幕 </span>
            <span className="text-white">{mousePosition.x.toFixed(1)}, {mousePosition.y.toFixed(1)}</span>
          </div>
          <div className="w-px h-4 bg-zinc-700" />
          <div>
            <span className="text-zinc-500">世界 </span>
            <span className="text-white">{(() => { const w = screenToWorld(mousePosition.x, mousePosition.y); return `${w.x.toFixed(1)}, ${w.y.toFixed(1)}`; })()}</span>
          </div>
          {selectedLineup && (
            <>
              <div className="w-px h-4 bg-zinc-700" />
              <div>
                <span className="text-zinc-500">{selectedLineup.title} </span>
                {selectedLineup.coordinates?.start?.normalized && (
                  <span className="text-blue-400">站({selectedLineup.coordinates.start.normalized[0]?.toFixed(3)},{selectedLineup.coordinates.start.normalized[1]?.toFixed(3)}) </span>
                )}
                {selectedLineup.coordinates?.end?.normalized && (
                  <span className="text-red-400">落({selectedLineup.coordinates.end.normalized[0]?.toFixed(3)},{selectedLineup.coordinates.end.normalized[1]?.toFixed(3)})</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
});
