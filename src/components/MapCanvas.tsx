'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useTacticsStore } from '@/store/tacticsStore';
import { mapsData, getMapScale } from '@/data/maps';
import { agentsData } from '@/data/agents';
import { v4 as uuidv4 } from 'uuid';
import { Trash2, RotateCw, RotateCcw, Copy, Repeat, Heart, Undo2, Redo2, Camera, FlipHorizontal } from 'lucide-react';
import { LanguageSelector, useLanguage } from './I18nProvider';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { useToast } from './Toast';
import { AbilityMarker } from './AbilityMarker';
import { AgentMarker } from './AgentMarker';
import { DrawingLayer } from './canvas/DrawingLayer';
import { LineupOverlay } from './canvas/LineupOverlay';
import { InlineSvg } from './InlineSvg';
import { useCoordinateTransform } from '@/hooks/useCoordinateTransform';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useImagePreload } from '@/hooks/useImagePreload';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import { pointToSegmentDistance } from '@/utils/geometry';
import { handleImageFallback } from '@/utils/image';
import Image from 'next/image';
import { WORLD_ASPECT_RATIO } from '@/data/lineups';
import type { AgentLineupsData } from '@/data/lineups';

type DragTarget = {
  type: 'ability' | 'agent';
  id: string;
} | null;

// Cache for html2canvas dynamic import to avoid repeated loading
// Using any here is acceptable because:
// 1. This is a module-level cache for a dynamically imported third-party library
// 2. The type is only used internally and the return value is properly typed by the library
// 3. html2canvas has complex typings that don't cleanly export the static type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let html2canvasCache: any = null;

async function getHtml2Canvas() {
  if (!html2canvasCache) {
    html2canvasCache = (await import('html2canvas')).default;
  }
  return html2canvasCache;
}

export function MapCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<{ x: number; y: number }[]>([]);
  const [lineStartPoint, setLineStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState<{ position: { x: number; y: number }; value: string } | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isReady, setIsReady] = useState(false);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [markerVisibility, setMarkerVisibility] = useState<'all' | 'stand' | 'landing' | 'none'>('all');
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    targetId: string;
    targetType: 'ability' | 'agent';
  } | null>(null);
  const [lineupsData, setLineupsData] = useState<AgentLineupsData | null>(null);
  const { t, currentLanguage } = useLanguage();
  const { addToast } = useToast();

  // Initialize dimensions
  useEffect(() => {
    const updateDimensions = () => {
      const container = canvasRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: rect.width, height: rect.height });
          const worldWidth = rect.height * WORLD_ASPECT_RATIO;
          setPan({ x: (rect.width - worldWidth) / 2, y: 0 });
          setIsReady(true);
        }
      }
    };

    const timer = setTimeout(updateDimensions, 50);
    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  const {
    currentMap, isAttack, showSpawnBarrier, showRegionNames, showUltOrbs,
    currentTool, selectedAbility, selectedAgent, isAlly,
    placedAbilities, placedAgents, placedUltOrbs, drawings,
    selectedElementId, selectedElementType, isScreenshotMode,
    zoom, setZoom,
    addPlacedAbility, addPlacedAgent, addPlacedUltOrb, removePlacedUltOrb, addDrawing, removeDrawing,
    removePlacedAbility, removePlacedAgent,
    updatePlacedAbility, updatePlacedAgent,
    setSelectedElement, setScreenshotMode,
    undo, redo, flipAllElements,
    setIsAttack,
    drawColor, drawStrokeWidth, drawMode,
    showGrid, snapToGrid, gridSize,
    mapHue, mapBrightness, abilityVisibilityFilter,
    toggleAbilityVisibility, clearAbilityVisibilityFilter,
    appMode,
    lineupAgentId, selectedLineupId, setSelectedLineupId,
    lineupEditorMode, tempLineupData, updateTempLineupData, setLineupEditorMode,
    lineupCoordinateOverrides, saveLineupCoordinateOverride,
    customLineups,
    setSelectedAgent,
  } = useTacticsStore();

  const lineupEditorModeRef = useRef(lineupEditorMode);
  useEffect(() => { lineupEditorModeRef.current = lineupEditorMode; }, [lineupEditorMode]);

  const mapScale = getMapScale(currentMap);
  const mapData = mapsData.find(m => m.id === currentMap);

  const getMapSvgPath = useCallback((type: 'map' | 'call_outs' | 'spawn_walls' | 'ult_orbs') => {
    const defenseSuffix = (type === 'map' || type === 'call_outs' || type === 'ult_orbs') && !isAttack ? '_defense' : '';
    // 语言后缀：英文无后缀，中文用_zh，俗称用_slang
    const langSuffix = type === 'call_outs' && currentLanguage !== 'en' ? `_${currentLanguage}` : '';
    return `/maps/${currentMap}_${type}${defenseSuffix}${langSuffix}.svg`;
  }, [currentMap, isAttack, currentLanguage]);

  // Use coordinate transform hook
  const { worldToScreen, screenToWorld, worldWidth, worldHeight, scaleFactor } = useCoordinateTransform(
    dimensions.height, pan, zoom
  );

  // 稳定的回调，避免穿透子组件 memo
  const handleSelectLineup = useCallback((lineup: any) => {
    setSelectedLineupId(lineup.id);
  }, [setSelectedLineupId]);

  const handleSetMarkerVisibility = useCallback((v: 'all' | 'stand' | 'landing' | 'none') => {
    setMarkerVisibility(v);
  }, []);

  // Memoize the transform object for child components
  const transform = useMemo(() => ({ worldToScreen, screenToWorld, worldWidth, worldHeight, scaleFactor }), [worldToScreen, screenToWorld, worldWidth, worldHeight, scaleFactor]);

  // Get map offset (to center the map)
  const mapWidth = dimensions.height * 1.24;
  const mapLeft = (worldWidth - mapWidth) / 2;
  const mapHeight = dimensions.height;

  // Preload map images
  useImagePreload(getMapSvgPath('map'));
  useImagePreload(getMapSvgPath('spawn_walls'));
  useImagePreload(getMapSvgPath('call_outs'));
  useImagePreload(getMapSvgPath('ult_orbs'));

  // Keyboard shortcuts (extracted hook)
  useKeyboardShortcuts({
    onResetView: () => setPan({ x: 0, y: 0 }),
    onClearDragTarget: () => setDragTarget(null),
  });

  // Load lineup data when entering lineup mode or switching agent
  useEffect(() => {
    if (appMode === 'lineup') {
      setLineupsData(null);
      setSelectedLineupId(null);

      const abortController = new AbortController();
      import('@/data/lineups').then(({ loadAgentLineups }) => {
        loadAgentLineups(lineupAgentId, abortController.signal).then((data) => {
          // Only update if not aborted
          if (!abortController.signal.aborted && data) {
            setLineupsData(data);
          }
        });
      });

      return () => abortController.abort();
    }
  }, [appMode, lineupAgentId, setSelectedLineupId]);

  // Get current map lineups with ability key
  const currentMapLineups = useMemo(() => {
    if (!lineupsData) return [];
    const mapData = lineupsData.maps[currentMap];
    if (!mapData) return [];
    // 将数字 key 映射为 C/Q/E/X
    const keyMap: Record<string, string> = { '1': 'C', '2': 'Q', '3': 'E', '4': 'X' };
    const result = Object.entries(mapData.abilities).flatMap(([abilityKey, ability]) =>
      ability.lineups
        .filter((l) => {
          // 有覆盖坐标的也保留
          if (lineupCoordinateOverrides[l.id]) return true;
          return l.coordinates.start.normalized && l.coordinates.end.normalized;
        })
        .map((l) => ({ ...l, abilityKey: keyMap[abilityKey] || ability.key || abilityKey }))
    );
    return result;
  }, [lineupsData, currentMap, lineupCoordinateOverrides]);

  // Find selected lineup from data
  const selectedLineup = useMemo(() => {
    if (!selectedLineupId || !lineupsData) return null;
    const mapData = lineupsData.maps[currentMap];
    if (!mapData) return null;
    for (const ability of Object.values(mapData.abilities)) {
      const found = ability.lineups.find((l) => l.id === selectedLineupId);
      if (found) return found;
    }
    return null;
  }, [selectedLineupId, lineupsData, currentMap]);

  // Handle wheel zoom - zoom toward mouse position
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const newZoom = e.deltaY > 0 ? Math.max(0.3, zoom * 0.9) : Math.min(5, zoom * 1.1);
    if (newZoom === zoom) return;
    const mouseContainerX = (mouseX - pan.x) / zoom;
    const mouseContainerY = (mouseY - pan.y) / zoom;
    setZoom(newZoom);
    setPan({ x: mouseX - mouseContainerX * newZoom, y: mouseY - mouseContainerY * newZoom });
  }, [zoom, pan, setZoom]);

  // Touch gestures for mobile
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchGestures({
    onZoom: (delta, centerX, centerY) => {
      const newZoom = Math.max(0.3, Math.min(5, zoom + delta * zoom));
      if (newZoom === zoom) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = centerX - rect.left;
      const mouseY = centerY - rect.top;
      const mouseContainerX = (mouseX - pan.x) / zoom;
      const mouseContainerY = (mouseY - pan.y) / zoom;
      setZoom(newZoom);
      setPan({ x: mouseX - mouseContainerX * newZoom, y: mouseY - mouseContainerY * newZoom });
    },
    onPan: (deltaX, deltaY) => {
      setPan((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    },
    minZoom: 0.3,
    maxZoom: 5,
  });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 截图模式下忽略鼠标事件，避免干扰截图
    if (isScreenshotMode) return;

    // 鼠标中键拖动地图（所有模式都支持）
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (appMode === 'lineup') {
      const editorMode = lineupEditorModeRef.current;
      if (editorMode === 'placing-stand' || editorMode === 'placing-landing' ||
          editorMode === 'placing-coord-stand' || editorMode === 'placing-coord-landing') {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        import('@/data/lineups').then(({ worldToNormalized }) => {
          const normalized = worldToNormalized(worldPos.x, worldPos.y, !isAttack);

          if (editorMode === 'placing-coord-stand') {
            // 为已有点位添加坐标 - 放置站位
            updateTempLineupData({ standNormalized: [normalized.nx, normalized.ny] });
            setLineupEditorMode('placing-coord-landing');
          } else if (editorMode === 'placing-coord-landing') {
            // 为已有点位添加坐标 - 放置落点后进入 coord-placed 状态显示预览
            updateTempLineupData({ landingNormalized: [normalized.nx, normalized.ny] });
            setLineupEditorMode('coord-placed');
          } else if (editorMode === 'placing-stand') {
            updateTempLineupData({ standNormalized: [normalized.nx, normalized.ny] });
            setLineupEditorMode('placing-landing');
          } else if (editorMode === 'placing-landing') {
            updateTempLineupData({ landingNormalized: [normalized.nx, normalized.ny] });
            setLineupEditorMode('editing');
          }
        });
      }
      return;
    }
    if (e.button !== 0) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    let worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

    if (snapToGrid) {
      worldPos = { x: Math.round(worldPos.x / gridSize) * gridSize, y: Math.round(worldPos.y / gridSize) * gridSize };
    }

    if (currentTool === 'draw') {
      if (drawMode === 'freehand') {
        setIsDrawing(true);
        setCurrentDrawing([worldPos]);
      } else if (drawMode === 'line' || drawMode === 'arrow') {
        setLineStartPoint(worldPos);
        setIsDrawing(true);
        setCurrentDrawing([worldPos]);
      }
    } else if (currentTool === 'text') {
      setTextInput({ position: worldPos, value: '' });
    } else if (currentTool === 'erase') {
      let minDist = Infinity;
      let closestId: string | null = null;
      for (const drawing of drawings) {
        for (let i = 0; i < drawing.points.length - 1; i++) {
          const dist = pointToSegmentDistance(worldPos.x, worldPos.y, drawing.points[i].x, drawing.points[i].y, drawing.points[i + 1].x, drawing.points[i + 1].y);
          if (dist < minDist) { minDist = dist; closestId = drawing.id; }
        }
      }
      if (closestId && minDist < 15) {
        removeDrawing(closestId);
        addToast('info', t('ui.erase'));
      }
    } else if (currentTool === 'ability' && selectedAbility) {
      addPlacedAbility({ id: uuidv4(), ability: selectedAbility, position: worldPos, isAlly });
    } else if (currentTool === 'agent' && selectedAgent) {
      addPlacedAgent({ id: uuidv4(), agentType: selectedAgent, position: worldPos, isAlly, state: 'alive' });
      setSelectedAgent(null);
    } else if (currentTool === 'ultOrb') {
      addPlacedUltOrb({ id: uuidv4(), position: worldPos });
    } else if (currentTool === 'select') {
      setSelectedElement(null, null);
    } else {
      // 点击空白区域 - 取消选中（兜底分支）
      setSelectedElement(null, null);
    }
  }, [currentTool, selectedAbility, selectedAgent, isAlly, pan, screenToWorld, addPlacedAbility, addPlacedAgent, addPlacedUltOrb, setSelectedElement, drawings, removeDrawing, addToast, drawMode, snapToGrid, appMode, updateTempLineupData, setLineupEditorMode, isAttack, setSelectedAgent, isScreenshotMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (isDraggingCanvas) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else if (dragTarget) {
      const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      if (dragTarget.type === 'ability') updatePlacedAbility(dragTarget.id, { position: { x: worldPos.x, y: worldPos.y } }, false);
      else updatePlacedAgent(dragTarget.id, { position: { x: worldPos.x, y: worldPos.y } }, false);
      setIsOverDeleteZone(e.clientY > rect.bottom - 60);
    } else if (isDrawing && currentTool === 'draw') {
      const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      if (drawMode === 'freehand') setCurrentDrawing(prev => [...prev, worldPos]);
      else if ((drawMode === 'line' || drawMode === 'arrow') && lineStartPoint) setCurrentDrawing([lineStartPoint, worldPos]);
    }
  }, [isDraggingCanvas, dragStart, dragTarget, isDrawing, currentTool, screenToWorld, updatePlacedAbility, updatePlacedAgent, drawMode, lineStartPoint]);

  const handleMouseUp = useCallback(() => {
    if (dragTarget && isOverDeleteZone) {
      if (dragTarget.type === 'ability') removePlacedAbility(dragTarget.id);
      else removePlacedAgent(dragTarget.id);
    }
    setDragTarget(null);
    setIsOverDeleteZone(false);

    if (isDrawing && currentDrawing.length > 1) {
      if (drawMode === 'freehand') {
        addDrawing({ id: uuidv4(), type: 'freehand', points: currentDrawing, color: drawColor, strokeWidth: drawStrokeWidth });
      } else if (drawMode === 'line' || drawMode === 'arrow') {
        addDrawing({ id: uuidv4(), type: drawMode, points: currentDrawing, color: drawColor, strokeWidth: drawStrokeWidth });
      }
    }
    setIsDraggingCanvas(false);
    setIsDrawing(false);
    setCurrentDrawing([]);
    setLineStartPoint(null);
  }, [dragTarget, isOverDeleteZone, isDrawing, currentDrawing, drawColor, drawStrokeWidth, addDrawing, removePlacedAbility, removePlacedAgent, drawMode]);

  const onAbilityDragStart = useCallback((e: React.MouseEvent, id: string) => {
    if (isScreenshotMode) return;
    // Allow drag if already selected or in select tool mode
    if (selectedElementId === id || currentTool === 'select') {
      e.stopPropagation();
      setSelectedElement(id, 'ability');
      setDragTarget({ type: 'ability', id });
    }
  }, [currentTool, isScreenshotMode, selectedElementId, setSelectedElement]);

  const onAbilityClick = useCallback((e: React.MouseEvent, id: string) => {
    if (isScreenshotMode) return;
    e.stopPropagation();
    setSelectedElement(id, 'ability');
  }, [isScreenshotMode, setSelectedElement]);

  const onAgentDragStart = useCallback((e: React.MouseEvent, id: string) => {
    if (isScreenshotMode) return;
    // Allow drag if already selected or in select tool mode
    if (selectedElementId === id || currentTool === 'select') {
      e.stopPropagation();
      setSelectedElement(id, 'agent');
      setDragTarget({ type: 'agent', id });
    }
  }, [currentTool, isScreenshotMode, selectedElementId, setSelectedElement]);

  const onAgentClick = useCallback((e: React.MouseEvent, id: string) => {
    if (isScreenshotMode) return;
    e.stopPropagation();
    setSelectedElement(id, 'agent');
  }, [isScreenshotMode, setSelectedElement]);

  const getAgentName = (type: string) => {
    const translated = t(`agents.${type}.name`);
    if (translated === `agents.${type}.name`) {
      const agentData = agentsData[type as keyof typeof agentsData];
      return agentData?.name || type;
    }
    return translated;
  };

  // Right-click context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    for (const ability of placedAbilities) {
      const screenPos = worldToScreen(ability.position.x, ability.position.y);
      if (Math.sqrt((clickX - screenPos.x) ** 2 + (clickY - screenPos.y) ** 2) < 30 * zoom) {
        setContextMenu({ position: { x: e.clientX, y: e.clientY }, targetId: ability.id, targetType: 'ability' });
        return;
      }
    }
    for (const agent of placedAgents) {
      const screenPos = worldToScreen(agent.position.x, agent.position.y);
      if (Math.sqrt((clickX - screenPos.x) ** 2 + (clickY - screenPos.y) ** 2) < 30 * zoom) {
        setContextMenu({ position: { x: e.clientX, y: e.clientY }, targetId: agent.id, targetType: 'agent' });
        return;
      }
    }
  }, [placedAbilities, placedAgents, worldToScreen, zoom]);

  // Context menu action handlers
  const handleContextDelete = () => {
    if (!contextMenu) return;
    if (contextMenu.targetType === 'ability') removePlacedAbility(contextMenu.targetId);
    else removePlacedAgent(contextMenu.targetId);
  };
  const handleContextRotateCW = () => {
    if (!contextMenu || contextMenu.targetType !== 'ability') return;
    const ability = placedAbilities.find(a => a.id === contextMenu.targetId);
    if (ability) updatePlacedAbility(contextMenu.targetId, { rotation: (ability.rotation || 0) + Math.PI / 4 });
  };
  const handleContextRotateCCW = () => {
    if (!contextMenu || contextMenu.targetType !== 'ability') return;
    const ability = placedAbilities.find(a => a.id === contextMenu.targetId);
    if (ability) updatePlacedAbility(contextMenu.targetId, { rotation: (ability.rotation || 0) - Math.PI / 4 });
  };
  const handleContextCopy = () => {
    if (!contextMenu) return;
    if (contextMenu.targetType === 'ability') {
      const ability = placedAbilities.find(a => a.id === contextMenu.targetId);
      if (ability) addPlacedAbility({ ...ability, id: uuidv4(), position: { x: ability.position.x + 20, y: ability.position.y + 20 } });
    } else {
      const agent = placedAgents.find(a => a.id === contextMenu.targetId);
      if (agent) addPlacedAgent({ ...agent, id: uuidv4(), position: { x: agent.position.x + 20, y: agent.position.y + 20 } });
    }
  };
  const handleContextToggleTeam = () => {
    if (!contextMenu) return;
    if (contextMenu.targetType === 'ability') {
      const ability = placedAbilities.find(a => a.id === contextMenu.targetId);
      if (ability) updatePlacedAbility(contextMenu.targetId, { isAlly: !ability.isAlly });
    } else {
      const agent = placedAgents.find(a => a.id === contextMenu.targetId);
      if (agent) updatePlacedAgent(contextMenu.targetId, { isAlly: !agent.isAlly });
    }
  };
  const handleContextToggleState = () => {
    if (!contextMenu || contextMenu.targetType !== 'agent') return;
    const agent = placedAgents.find(a => a.id === contextMenu.targetId);
    if (agent) updatePlacedAgent(contextMenu.targetId, { state: agent.state === 'alive' ? 'dead' : 'alive' });
  };

  const contextMenuItems: ContextMenuItem[] = [
    { label: t('ui.clear'), icon: <Trash2 className="w-4 h-4" />, onClick: handleContextDelete, danger: true },
    { separator: true, label: '', onClick: () => {} },
    ...(contextMenu?.targetType === 'ability' ? [
      { label: t('ui.redo'), icon: <RotateCw className="w-4 h-4" />, onClick: handleContextRotateCW },
      { label: t('ui.redo'), icon: <RotateCcw className="w-4 h-4" />, onClick: handleContextRotateCCW },
      { separator: true, label: '', onClick: () => {} },
    ] : []),
    { label: t('ui.select'), icon: <Copy className="w-4 h-4" />, onClick: handleContextCopy },
    { label: t('team.ally') + '/' + t('team.enemy'), icon: <Repeat className="w-4 h-4" />, onClick: handleContextToggleTeam },
    ...(contextMenu?.targetType === 'agent' ? [
      { label: t('ui.select'), icon: <Heart className="w-4 h-4" />, onClick: handleContextToggleState },
    ] : []),
  ];

  // Screenshot handler
  const handleScreenshot = async () => {
    setScreenshotMode(true);
    await new Promise(r => setTimeout(r, 200));
    const mapEl = canvasRef.current;
    if (!mapEl) { setScreenshotMode(false); return; }
    try {
      const html2canvas = await getHtml2Canvas();
      const canvas = await html2canvas(mapEl, {
        background: '#09090b',
        useCORS: true,
        onclone: (clonedDoc) => {
          // html2canvas does not support CSS lab() color function (used by Tailwind v4).
          // Replace lab() values in computed styles of cloned elements to prevent parse errors.
          const allElements = clonedDoc.querySelectorAll('*');
          const getCS = clonedDoc.defaultView?.getComputedStyle;
          if (getCS) {
            for (let i = 0; i < allElements.length; i++) {
              const el = allElements[i] as HTMLElement;
              try {
                const cs = getCS(el);
                for (let j = 0; j < cs.length; j++) {
                  const prop = cs[j];
                  const val = cs.getPropertyValue(prop);
                  if (val.includes('lab(')) {
                    el.style.setProperty(prop, 'inherit');
                  }
                }
              } catch {
                // skip elements that throw in cloned doc
              }
            }
          }
        },
      });

      // 添加地图名称水印
      const ctx = canvas.getContext('2d')!;
      const padding = 16;
      const fontSize = 14;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      const mapName = mapData?.name || currentMap;
      ctx.fillText(`Valorant Tactics | ${mapName}`, canvas.width - padding, canvas.height - padding);

      const link = document.createElement('a');
      link.download = `tactics-${currentMap}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Screenshot failed:', err);
      addToast('error', t('ui.screenshotFailed'));
    }
    setScreenshotMode(false);
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      {/* Top toolbar */}
      <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-2 sm:px-3 gap-0.5 sm:gap-1 shrink-0 overflow-x-auto">
        <button onClick={undo} className="btn btn-icon btn-ghost" title={`${t('ui.undo')} (Ctrl+Z)`}>
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={redo} className="btn btn-icon btn-ghost" title={`${t('ui.redo')} (Ctrl+Shift+Z)`}>
          <Redo2 className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-zinc-700 mx-0.5 sm:mx-1 shrink-0" />
        <button onClick={handleScreenshot} className="btn btn-icon btn-ghost" title={t('ui.screenshot')}>
          <Camera className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-zinc-700 mx-0.5 sm:mx-1 shrink-0" />
        <button onClick={() => { flipAllElements(); setIsAttack(!isAttack); }} className="btn btn-icon btn-ghost" title={t('mapCanvas.flip')}>
          <FlipHorizontal className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-2" />
        <LanguageSelector />
        <div className="w-px h-5 bg-zinc-700 mx-0.5 sm:mx-1 shrink-0" />
        <span className="text-xs text-zinc-500 whitespace-nowrap hidden sm:inline">
          {currentTool === 'select' ? `${t('ui.selectMode')} (S)` : currentTool === 'draw' ? `${t('ui.drawMode')} (Q) - ${t('ui.clickToErase')}` : currentTool === 'erase' ? t('ui.eraseMode') : currentTool === 'ability' ? t('ui.placeAbility') : currentTool === 'text' ? t('ui.textTool') : currentTool === 'ultOrb' ? t('ui.ultOrbTool') : t('ui.placeAgent')}
        </span>
        <span className="text-xs text-zinc-500 whitespace-nowrap sm:hidden">
          {currentTool === 'select' ? t('ui.select') : currentTool === 'draw' ? t('ui.draw') : currentTool === 'erase' ? t('ui.erase') : currentTool === 'ability' ? t('ui.ability') : currentTool === 'ultOrb' ? t('ui.ultOrbTool') : t('ui.agent')}
        </span>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-hidden bg-zinc-950 cursor-crosshair relative touch-none no-select"
        style={{ minHeight: 0 }}
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
            e.preventDefault();
            if (selectedElementType === 'ability') removePlacedAbility(selectedElementId);
            else if (selectedElementType === 'agent') removePlacedAgent(selectedElementId);
          }
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={(e) => { handleMouseUp(); setMousePosition(null); }}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {!isReady ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse text-zinc-600">{t('ui.loadingMap')}</div>
          </div>
        ) : (
          <>
            {/* World container with pan/zoom transform - only contains the map images */}
            <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', position: 'absolute', width: worldWidth, height: worldHeight }}>
              <div ref={mapContainerRef} className="absolute inset-0">
                <div className="absolute" style={{ left: mapLeft, top: 0, width: mapWidth, height: mapHeight }}>
                  <InlineSvg src={getMapSvgPath('map')} alt={mapData?.name || currentMap} className="w-full h-full" style={{ display: 'block' }} filter={[mapBrightness, mapHue].filter(Boolean).join(' ')} />
                </div>
                {showSpawnBarrier && (
                  <div className="absolute pointer-events-none" style={{ left: mapLeft, top: 0, width: mapWidth, height: mapHeight, transform: !isAttack ? 'scale(-1, -1)' : 'none', transformOrigin: 'center' }}>
                    <img src={getMapSvgPath('spawn_walls')} alt="Spawn Walls" className="w-full h-full" style={{ opacity: 0.7, mixBlendMode: 'screen', display: 'block' }} draggable={false} onError={handleImageFallback} />
                  </div>
                )}
                {showRegionNames && (
                  <div className="absolute pointer-events-none" style={{ left: mapLeft, top: 0, width: mapWidth, height: mapHeight }}>
                    <img src={getMapSvgPath('call_outs')} alt="Callouts" className="w-full h-full" style={{ opacity: 0.8, display: 'block' }} draggable={false} onError={handleImageFallback} />
                  </div>
                )}
                {showUltOrbs && (
                  <div className="absolute pointer-events-none" style={{ left: mapLeft, top: 0, width: mapWidth, height: mapHeight, transform: !isAttack ? 'scale(-1, -1)' : 'none', transformOrigin: 'center' }}>
                    <img src={getMapSvgPath('ult_orbs')} alt="Ult Orbs" className="w-full h-full" style={{ opacity: 0.9, display: 'block' }} draggable={false} onError={handleImageFallback} />
                  </div>
                )}
              </div>
            </div>

            {/* Abilities and Agents - rendered at canvas level using memo components */}
            {/* Hide selection highlight when any Radix Dialog is open (e.g. Settings) */}
            {placedAbilities.map((placed) => (
              <AbilityMarker key={placed.id} placed={placed} isSelected={selectedElementId === placed.id && !document.querySelector('[data-radix-dialog-content]')} isScreenshotMode={isScreenshotMode} currentTool={currentTool} zoom={zoom} scaleFactor={scaleFactor} transform={transform} onDragStart={onAbilityDragStart} onClick={onAbilityClick} />
            ))}
            {placedAgents.map((placed) => (
              <AgentMarker key={placed.id} placed={placed} isSelected={selectedElementId === placed.id && !document.querySelector('[data-radix-dialog-content]')} isScreenshotMode={isScreenshotMode} currentTool={currentTool} zoom={zoom} transform={transform} displayName={getAgentName(placed.agentType)} onDragStart={onAgentDragStart} onClick={onAgentClick} />
            ))}

            {/* Placed Ult Orbs */}
            {placedUltOrbs.map((orb) => {
              const screenPos = transform.worldToScreen(orb.position.x, orb.position.y);
              const orbSize = 24 * zoom;
              return (
                <div
                  key={orb.id}
                  style={{
                    position: 'absolute',
                    left: screenPos.x,
                    top: screenPos.y,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                    cursor: currentTool === 'erase' ? 'pointer' : 'crosshair',
                  }}
                  onClick={(e) => {
                    if (currentTool === 'erase') {
                      e.stopPropagation();
                      removePlacedUltOrb(orb.id);
                      addToast('info', t('ui.erase'));
                    }
                  }}
                >
                  <img
                    src="/map-tools/spike.svg"
                    alt="Spike"
                    style={{
                      width: orbSize,
                      height: orbSize,
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.5))',
                    }}
                  />
                </div>
              );
            })}

            {/* Drawing Layer (extracted component) */}
            <DrawingLayer
              drawings={drawings}
              dimensions={dimensions}
              currentTool={currentTool}
              zoom={zoom}
              drawColor={drawColor}
              drawStrokeWidth={drawStrokeWidth}
              drawMode={drawMode}
              showGrid={showGrid}
              isDrawing={isDrawing}
              currentDrawing={currentDrawing}
              transform={transform}
              onRemoveDrawing={removeDrawing}
            />

            {/* Lineup Overlay (extracted component) */}
            <LineupOverlay
              appMode={appMode}
              lineupsData={lineupsData}
              currentMapLineups={currentMapLineups}
              selectedLineup={selectedLineup}
              currentMap={currentMap}
              isAttack={isAttack}
              zoom={zoom}
              markerVisibility={markerVisibility}
              mousePosition={mousePosition}
              tempLineupData={tempLineupData}
              transform={transform}
              t={t}
              onSelectLineup={handleSelectLineup}
              onSetMarkerVisibility={handleSetMarkerVisibility}
              coordinateOverrides={lineupCoordinateOverrides}
              lineupEditorMode={lineupEditorMode}
              abilityVisibilityFilter={abilityVisibilityFilter}
              viewportWidth={dimensions.width}
              viewportHeight={dimensions.height}
              onToggleAbilityVisibility={toggleAbilityVisibility}
              onClearAbilityVisibility={clearAbilityVisibilityFilter}
            />

            {/* Placement Preview - Ability */}
            {mousePosition && !isScreenshotMode && currentTool === 'ability' && selectedAbility && selectedAbility.abilityData && (() => {
              const ability = selectedAbility.abilityData;
              const worldPos = screenToWorld(mousePosition.x, mousePosition.y);
              const screenPos = worldToScreen(worldPos.x, worldPos.y);
              let previewContent: React.ReactNode = null;
              switch (ability.type) {
                case 'circle': { const size = ability.size * scaleFactor * zoom; previewContent = <div style={{ width: size, height: size, borderRadius: '50%', border: `2px solid ${ability.outlineColor}`, backgroundColor: ability.fillColor || 'transparent', opacity: 0.4, boxSizing: 'border-box' }} />; break; }
                case 'image': { const imgSize = ability.size * scaleFactor * zoom; previewContent = <img src={ability.imagePath} alt="preview" style={{ width: imgSize, height: imgSize, objectFit: 'contain', opacity: 0.4 }} onError={handleImageFallback} />; break; }
                case 'square': { const w = ability.width * scaleFactor * zoom; const h = ability.height * scaleFactor * zoom; previewContent = <div style={{ width: w, height: h, backgroundColor: ability.isTransparent ? 'transparent' : ability.color, border: `2px solid ${ability.color}`, opacity: 0.4, boxSizing: 'border-box' }} />; break; }
                case 'rotatableImage': { const w = ability.width * scaleFactor * zoom; const h = ability.height * scaleFactor * zoom; previewContent = <img src={ability.imagePath} alt="preview" style={{ width: w, height: h, objectFit: 'fill', opacity: 0.4 }} onError={handleImageFallback} />; break; }
                case 'centerSquare': { const w = ability.width * scaleFactor * zoom; const h = ability.height * scaleFactor * zoom; previewContent = <div style={{ width: w, height: h, backgroundColor: ability.color + '40', border: `2px solid ${ability.color}`, opacity: 0.4, boxSizing: 'border-box' }} />; break; }
                case 'resizableSquare': { const w = ability.width * scaleFactor * zoom; const h = ability.height * scaleFactor * zoom; previewContent = <div style={{ width: w, height: h, backgroundColor: ability.isTransparent ? 'transparent' : ability.color + '40', border: `2px solid ${ability.color}`, opacity: 0.4, boxSizing: 'border-box' }} />; break; }
                default: { previewContent = <div style={{ width: 32 * zoom, height: 32 * zoom, backgroundColor: isAlly ? '#4ade80' : '#f87171', borderRadius: '50%', border: '2px solid white', opacity: 0.4, boxSizing: 'border-box' }} />; break; }
              }
              return (<div style={{ position: 'absolute', left: screenPos.x, top: screenPos.y, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 50 }}>{previewContent}</div>);
            })()}

            {/* Placement Preview - Agent */}
            {mousePosition && !isScreenshotMode && currentTool === 'agent' && selectedAgent && (() => {
              const agent = agentsData[selectedAgent];
              if (!agent) return null;
              const worldPos = screenToWorld(mousePosition.x, mousePosition.y);
              const screenPos = worldToScreen(worldPos.x, worldPos.y);
              const size = 28 * zoom;
              return (
                <div style={{ position: 'absolute', left: screenPos.x, top: screenPos.y, transform: 'translate(-50%, -100%)', pointerEvents: 'none', zIndex: 50, opacity: 0.4 }}>
                  <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', border: '2px solid #ffffff', position: 'relative' }}>
                    <Image src={agent.iconPath} alt="preview" fill className="object-cover" sizes={`${size}px`} unoptimized onError={handleImageFallback as any} />
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* Text Input */}
        {textInput && (() => {
          const screenPos = worldToScreen(textInput.position.x, textInput.position.y);
          return (
            <div style={{ position: 'absolute', left: screenPos.x, top: screenPos.y - 30 * zoom, zIndex: 200 }}>
              <input
                autoFocus
                value={textInput.value}
                onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && textInput.value.trim()) {
                    addDrawing({ id: uuidv4(), type: 'text', points: [textInput.position], color: '#ffffff', strokeWidth: 14, text: textInput.value.trim() });
                    setTextInput(null);
                  } else if (e.key === 'Escape') { setTextInput(null); }
                }}
                className="px-2 py-1 bg-zinc-900 border border-blue-500 rounded text-sm text-white w-40 focus:outline-none"
                placeholder={t('ui.textPlaceholder')}
              />
            </div>
          );
        })()}

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu items={contextMenuItems} position={contextMenu.position} onClose={() => setContextMenu(null)} />
        )}

        {/* Delete zone */}
        {!isScreenshotMode && dragTarget && (
          <div className={`absolute bottom-0 left-0 right-0 h-14 flex items-center justify-center transition-colors ${isOverDeleteZone ? 'bg-red-500/80' : 'bg-red-500/30'}`}>
            <Trash2 className={`w-6 h-6 ${isOverDeleteZone ? 'text-white' : 'text-red-300'}`} />
            <span className={`ml-2 text-sm font-medium ${isOverDeleteZone ? 'text-white' : 'text-red-300'}`}>{t('ui.dragToDelete')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
