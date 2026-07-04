'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { normalizedToWorld, ABILITY_COLORS, LineupWithAbility } from '@/data/lineups';
import type { Lineup } from '@/data/lineups';
import type { TempLineupData, LineupEditorMode } from '@/store/tacticsStore';

export type MarkerVisibility = 'all' | 'stand' | 'landing' | 'none';

interface LineupMarkersProps {
  lineups: LineupWithAbility[];
  selectedLineup: Lineup | null;
  onSelect: (lineup: Lineup) => void;
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
  zoom: number;
  isFlipped?: boolean;
  markerVisibility?: MarkerVisibility;
  tempLineupData?: TempLineupData | null;
  coordinateOverrides?: Record<number, { start: [number, number]; end: [number, number] }>;
  lineupEditorMode?: LineupEditorMode;
  abilityVisibilityFilter?: string[];
  // 视口尺寸，用于裁剪屏幕外标记
  viewportWidth?: number;
  viewportHeight?: number;
}

export const LineupMarkers = memo(function LineupMarkers({
  lineups,
  selectedLineup,
  onSelect,
  worldToScreen,
  zoom,
  isFlipped = false,
  markerVisibility = 'all',
  tempLineupData,
  coordinateOverrides = {},
  lineupEditorMode = 'idle',
  abilityVisibilityFilter = [],
  viewportWidth = 0,
  viewportHeight = 0,
}: LineupMarkersProps) {
  const [hoveredLineup, setHoveredLineup] = useState<{
    lineup: LineupWithAbility;
    x: number;
    y: number;
  } | null>(null);

  const showStand = markerVisibility === 'all' || markerVisibility === 'stand';
  const showLanding = markerVisibility === 'all' || markerVisibility === 'landing';

  // Cache marker calculations - 过滤掉没有坐标的数据 + 视口裁剪
  const markers = useMemo(() => {
    const baseSize = 6 * zoom;
    const selectedSize = baseSize * 1.5;
    const hasViewport = viewportWidth > 0 && viewportHeight > 0;
    // 视口裁剪边界（留 50px 缓冲区）
    const buffer = 50;
    const vxMin = hasViewport ? -buffer : -Infinity;
    const vyMin = hasViewport ? -buffer : -Infinity;
    const vxMax = hasViewport ? viewportWidth + buffer : Infinity;
    const vyMax = hasViewport ? viewportHeight + buffer : Infinity;

    return lineups
      .filter((lineup) => {
        // 技能可见性筛选
        if (abilityVisibilityFilter.length > 0 && !abilityVisibilityFilter.includes(lineup.abilityKey)) {
          return false;
        }
        // 优先使用覆盖坐标
        const override = coordinateOverrides[lineup.id];
        if (override) return true;
        // 过滤掉没有坐标的数据（isoox数据没有坐标）
        const hasStartCoords = lineup.coordinates?.start?.normalized &&
          Array.isArray(lineup.coordinates.start.normalized) &&
          lineup.coordinates.start.normalized.length >= 2;
        const hasEndCoords = lineup.coordinates?.end?.normalized &&
          Array.isArray(lineup.coordinates.end.normalized) &&
          lineup.coordinates.end.normalized.length >= 2;
        return hasStartCoords && hasEndCoords;
      })
      .map((lineup) => {
        // 优先使用覆盖坐标
        const override = coordinateOverrides[lineup.id];
        const startNorm = override ? override.start : lineup.coordinates.start.normalized;
        const endNorm = override ? override.end : lineup.coordinates.end.normalized;
        const startWorld = normalizedToWorld(
          startNorm[0],
          startNorm[1],
          isFlipped
        );
        const endWorld = normalizedToWorld(
          endNorm[0],
          endNorm[1],
          isFlipped
        );
        const startScreen = worldToScreen(startWorld.x, startWorld.y);
        const endScreen = worldToScreen(endWorld.x, endWorld.y);
        const isSelected = selectedLineup?.id === lineup.id;
        const colors = ABILITY_COLORS[lineup.abilityKey] || ABILITY_COLORS.C;

        return {
          lineup,
          startScreen,
          endScreen,
          isSelected,
          baseSize,
          selectedSize,
          colors,
        };
      })
      // 视口裁剪：只保留屏幕内（含缓冲区）的标记
      .filter((m) => {
        if (!hasViewport) return true;
        const inView =
          (m.startScreen.x >= vxMin && m.startScreen.x <= vxMax && m.startScreen.y >= vyMin && m.startScreen.y <= vyMax) ||
          (m.endScreen.x >= vxMin && m.endScreen.x <= vxMax && m.endScreen.y >= vyMin && m.endScreen.y <= vyMax) ||
          m.isSelected; // 选中的始终保留
        return inView;
      });
  }, [lineups, selectedLineup, worldToScreen, zoom, isFlipped, coordinateOverrides, abilityVisibilityFilter, viewportWidth, viewportHeight]);

  // Cache temp lineup preview calculations
  const tempPreview = useMemo(() => {
    if (!tempLineupData) return null;

    // 严格检查数组是否存在且长度至少为2
    const hasStandCoords = Array.isArray(tempLineupData.standNormalized) && tempLineupData.standNormalized.length >= 2;
    const hasLandingCoords = Array.isArray(tempLineupData.landingNormalized) && tempLineupData.landingNormalized.length >= 2;

    const standWorld = hasStandCoords && tempLineupData.standNormalized
      ? normalizedToWorld(tempLineupData.standNormalized[0]!, tempLineupData.standNormalized[1]!, isFlipped)
      : null;
    const landingWorld = hasLandingCoords && tempLineupData.landingNormalized
      ? normalizedToWorld(tempLineupData.landingNormalized[0]!, tempLineupData.landingNormalized[1]!, isFlipped)
      : null;

    const standScreen = standWorld ? worldToScreen(standWorld.x, standWorld.y) : null;
    const landingScreen = landingWorld ? worldToScreen(landingWorld.x, landingWorld.y) : null;

    return {
      standScreen,
      landingScreen,
      color: ABILITY_COLORS[tempLineupData.abilityKey]?.primary || '#3b82f6',
    };
  }, [tempLineupData, worldToScreen, isFlipped]);

  const handleMouseEnter = useCallback((lineup: LineupWithAbility, x: number, y: number) => {
    setHoveredLineup({ lineup, x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredLineup(null);
  }, []);

  if (markerVisibility === 'none') return null;

  return (
    <>
      {/* SVG lines layer */}
      {showStand && showLanding && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        >
          {markers.map(({ lineup, startScreen, endScreen, isSelected, colors }) => (
            <line
              key={`line-${lineup.id}`}
              x1={startScreen.x}
              y1={startScreen.y}
              x2={endScreen.x}
              y2={endScreen.y}
              stroke={isSelected ? colors.primary : colors.light}
              strokeWidth={isSelected ? 2 : 1}
              strokeDasharray={isSelected ? 'none' : '4 4'}
            />
          ))}
        </svg>
      )}

      {/* Stand position markers (circles with ability color) */}
      {showStand && markers.map(({ lineup, startScreen, isSelected, baseSize, selectedSize, colors }) => {
        const size = isSelected ? selectedSize : baseSize;
        return (
          <div
            key={`start-${lineup.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(lineup);
            }}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              handleMouseEnter(lineup, rect.left + rect.width / 2, rect.top);
            }}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'absolute',
              left: startScreen.x,
              top: startScreen.y,
              width: size * 2,
              height: size * 2,
              transform: 'translate(-50%, -50%)',
              cursor: 'pointer',
              pointerEvents: 'auto',
              zIndex: isSelected ? 60 : 20,
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: colors.primary,
                border: '2px solid rgba(255,255,255,0.8)',
                boxShadow: isSelected
                  ? `0 0 12px ${colors.light}`
                  : '0 0 4px rgba(0,0,0,0.5)',
                transition: 'all 0.15s ease',
                opacity: isSelected ? 1 : 0.8,
              }}
            />
          </div>
        );
      })}

      {/* Landing position markers (diamonds, red) */}
      {showLanding && markers.map(({ lineup, endScreen, isSelected, baseSize, selectedSize }) => {
        const size = isSelected ? selectedSize : baseSize;
        return (
          <div
            key={`end-${lineup.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(lineup);
            }}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              handleMouseEnter(lineup, rect.left + rect.width / 2, rect.top);
            }}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'absolute',
              left: endScreen.x,
              top: endScreen.y,
              width: size * 2,
              height: size * 2,
              transform: 'translate(-50%, -50%) rotate(45deg)',
              cursor: 'pointer',
              pointerEvents: 'auto',
              zIndex: isSelected ? 60 : 20,
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#ef4444',
                border: '2px solid rgba(255,255,255,0.8)',
                boxShadow: isSelected
                  ? '0 0 12px rgba(248,113,113,0.8)'
                  : '0 0 4px rgba(0,0,0,0.5)',
                transition: 'all 0.15s ease',
                opacity: isSelected ? 1 : 0.8,
              }}
            />
          </div>
        );
      })}

      {/* Tooltip */}
      {hoveredLineup && !hoveredLineup.lineup.id.toString().startsWith('hover-') && (
        <div
          style={{
            position: 'fixed',
            left: hoveredLineup.x,
            top: hoveredLineup.y - 36,
            transform: 'translateX(-50%)',
            padding: '3px 10px',
            backgroundColor: 'rgba(0,0,0,0.9)',
            color: '#fff',
            fontSize: 11,
            whiteSpace: 'nowrap',
            borderRadius: 4,
            pointerEvents: 'none',
            zIndex: 9999,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span style={{ color: ABILITY_COLORS[hoveredLineup.lineup.abilityKey]?.primary || '#3b82f6', fontWeight: 600 }}>
            [{hoveredLineup.lineup.abilityKey}]
          </span>
          {' '}{hoveredLineup.lineup.title}
        </div>
      )}

      {/* 操作提示横幅 */}
      {(lineupEditorMode === 'placing-coord-stand' || lineupEditorMode === 'placing-coord-landing' ||
        lineupEditorMode === 'placing-stand' || lineupEditorMode === 'placing-landing') && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-blue-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/30 animate-pulse">
            {lineupEditorMode === 'placing-coord-stand' && '📍 请点击地图放置站位'}
            {lineupEditorMode === 'placing-coord-landing' && '📍 请点击地图放置落点'}
            {lineupEditorMode === 'placing-stand' && '📍 请点击地图放置站位'}
            {lineupEditorMode === 'placing-landing' && '📍 请点击地图放置落点'}
          </div>
        </div>
      )}

      {/* Temp lineup preview */}
      {tempLineupData && tempPreview && (
        <>
          {/* Preview line */}
          {tempLineupData.standNormalized && tempLineupData.landingNormalized && (
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ width: '100%', height: '100%' }}
            >
              <line
                x1={tempPreview.standScreen!.x}
                y1={tempPreview.standScreen!.y}
                x2={tempPreview.landingScreen!.x}
                y2={tempPreview.landingScreen!.y}
                stroke={tempPreview.color}
                strokeWidth={2}
                strokeDasharray="6 3"
              />
            </svg>
          )}

          {/* Preview stand marker */}
          {tempLineupData.standNormalized && tempPreview.standScreen && (
            <div
              style={{
                position: 'absolute',
                left: tempPreview.standScreen.x,
                top: tempPreview.standScreen.y,
                width: 24,
                height: 24,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  backgroundColor: tempPreview.color,
                  border: '3px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 0 16px rgba(59,130,246,0.9)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
          )}

          {/* Preview landing marker */}
          {tempLineupData.landingNormalized && tempPreview.landingScreen && (
            <div
              style={{
                position: 'absolute',
                left: tempPreview.landingScreen.x,
                top: tempPreview.landingScreen.y,
                width: 24,
                height: 24,
                transform: 'translate(-50%, -50%) rotate(45deg)',
                pointerEvents: 'none',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#ef4444',
                  border: '3px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 0 16px rgba(248,113,113,0.9)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
          )}
        </>
      )}
    </>
  );
});
