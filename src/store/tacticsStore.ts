import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  MapValue, 
  Strategy, 
  PlacedAbility, 
  PlacedAgent, 
  PlacedUltOrb,
  DrawingElement,
  ToolType,
  AbilityInfo,
  AgentType 
} from '@/types';
import type { Lineup } from '@/data/lineups';
import { 
  WORLD_WIDTH, 
  NORMALIZED_HEIGHT as WORLD_HEIGHT, 
  MAP_DISPLAY_WIDTH as MAP_WIDTH, 
  MAP_PADDING_X,
} from '@/data/lineups';
import { 
  validateStrategyImport, 
  validateCoordinateOverridesImport,
  DATA_VERSION,
  isVersionCompatible,
  getVersionWarning,
  LIMITS,
} from '@/schemas';
import { useSettingsStore } from './settingsStore';

// Undo/Redo action types
export type ActionType = 'addAbility' | 'removeAbility' | 'updateAbility' 
  | 'addAgent' | 'removeAgent' | 'updateAgent'
  | 'addDrawing' | 'removeDrawing' | 'clearDrawings'
  | 'clearAll';

export interface UndoAction {
  type: ActionType;
  // For ability actions
  ability?: PlacedAbility;
  abilityId?: string;
  abilityUpdates?: Partial<PlacedAbility>;
  abilityPrevState?: PlacedAbility;
  // For agent actions
  agent?: PlacedAgent;
  agentId?: string;
  agentUpdates?: Partial<PlacedAgent>;
  agentPrevState?: PlacedAgent;
  // For drawing actions
  drawing?: DrawingElement;
  drawingId?: string;
  // For clear actions
  prevAbilities?: PlacedAbility[];
  prevAgents?: PlacedAgent[];
  prevDrawings?: DrawingElement[];
}

// Lineup editor types
export type LineupEditorMode = 'idle' | 'placing-stand' | 'placing-landing' | 'editing' | 'placing-coord-stand' | 'placing-coord-landing' | 'coord-placed';

export interface TempLineupData {
  title: string;
  side: 'attack' | 'defense';
  abilityKey: 'C' | 'Q' | 'E' | 'X';
  standNormalized: [number, number] | null;
  landingNormalized: [number, number] | null;
  videoUrl?: string;
  videoTimestamp?: string;
  standImage?: string; // base64 data URL
  detailImages?: string[]; // base64 data URLs
}

interface TacticsState {
  // Current Map & Mode
  currentMap: MapValue;
  isAttack: boolean;
  
  // View Settings
  showSpawnBarrier: boolean;
  showRegionNames: boolean;
  showUltOrbs: boolean;
  zoom: number;
  
  // Interaction State
  currentTool: ToolType;
  selectedAbility: AbilityInfo | null;
  selectedAgent: AgentType | null;
  selectedElementId: string | null;
  selectedElementType: 'ability' | 'agent' | null;
  
  // Placed Elements
  placedAbilities: PlacedAbility[];
  placedAgents: PlacedAgent[];
  placedUltOrbs: PlacedUltOrb[];
  drawings: DrawingElement[];
  
  // Strategies
  strategies: Strategy[];
  currentStrategy: Strategy | null;
  
  // Team
  isAlly: boolean;
  
  // Undo/Redo
  undoStack: UndoAction[];
  redoStack: UndoAction[];
  
  // Screenshot mode
  isScreenshotMode: boolean;

  // App mode
  appMode: 'strategy' | 'lineup';

  // Lineup mode state
  lineupAgentId: string;
  selectedLineupId: number | null;

  // Lineup editor state
  lineupEditorMode: LineupEditorMode;
  tempLineupData: TempLineupData | null;
  editingLineupId: number | null; // For editing existing lineup
  customLineups: Lineup[]; // User-created lineups
  favoriteLineups: number[]; // IDs of favorited lineups (both built-in and custom)

  // Lineup coordinate overrides
  lineupCoordinateOverrides: Record<number, { start: [number, number]; end: [number, number] }>;
  saveLineupCoordinateOverride: (lineupId: number, start: [number, number], end: [number, number]) => void;
  removeLineupCoordinateOverride: (lineupId: number) => void;
  exportCoordinateOverrides: () => string;
  importCoordinateOverrides: (jsonStr: string) => boolean;
  startPlaceCoordinates: (lineupId: number) => void;
  setMapHue: (hue: string) => void;
  setMapBrightness: (brightness: string) => void;
  toggleAbilityVisibility: (key: string) => void;
  clearAbilityVisibilityFilter: () => void;
  
  // Drawing settings
  drawColor: string;
  drawStrokeWidth: number;
  drawMode: 'freehand' | 'line' | 'arrow';
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  mapHue: string; // CSS hue-rotate filter component
  mapBrightness: string; // CSS brightness/contrast filter component
  abilityVisibilityFilter: string[]; // ['agentId-abilityKey', ...] 空数组=全部显示

  // Actions
  setCurrentMap: (map: MapValue) => void;
  setIsAttack: (isAttack: boolean) => void;
  setShowSpawnBarrier: (show: boolean) => void;
  setShowRegionNames: (show: boolean) => void;
  setShowUltOrbs: (show: boolean) => void;
  setZoom: (zoom: number) => void;
  setCurrentTool: (tool: ToolType) => void;
  setSelectedAbility: (ability: AbilityInfo | null) => void;
  setSelectedAgent: (agent: AgentType | null) => void;
  setIsAlly: (isAlly: boolean) => void;
  setSelectedElement: (id: string | null, type: 'ability' | 'agent' | null) => void;
  setScreenshotMode: (mode: boolean) => void;
  setAppMode: (mode: 'strategy' | 'lineup') => void;
  setLineupAgentId: (id: string) => void;
  setSelectedLineupId: (id: number | null) => void;
  
  // Lineup editor actions
  setLineupEditorMode: (mode: LineupEditorMode) => void;
  setTempLineupData: (data: TempLineupData | null) => void;
  updateTempLineupData: (updates: Partial<TempLineupData>) => void;
  startNewLineup: () => void;
  startEditLineup: (lineupId: number) => void;
  saveTempLineup: () => void;
  cancelLineupEdit: () => void;
  deleteCustomLineup: (lineupId: number) => void;
  exportCustomLineups: () => string;
  toggleFavorite: (lineupId: number) => void;
  isFavorite: (lineupId: number) => boolean;
  setDrawColor: (color: string) => void;
  setDrawStrokeWidth: (width: number) => void;
  setDrawMode: (mode: 'freehand' | 'line' | 'arrow') => void;
  setShowGrid: (show: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;
  setGridSize: (size: number) => void;
  
  // Element Actions (with undo support)
  addPlacedAbility: (ability: PlacedAbility) => void;
  removePlacedAbility: (id: string) => void;
  updatePlacedAbility: (id: string, updates: Partial<PlacedAbility>, recordUndo?: boolean) => void;
  addPlacedAgent: (agent: PlacedAgent) => void;
  removePlacedAgent: (id: string) => void;
  updatePlacedAgent: (id: string, updates: Partial<PlacedAgent>, recordUndo?: boolean) => void;
  addPlacedUltOrb: (orb: PlacedUltOrb) => void;
  removePlacedUltOrb: (id: string) => void;
  addDrawing: (drawing: DrawingElement) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;
  clearAll: () => void;
  
  // Undo/Redo Actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Flip all elements (attack/defense switch)
  flipAllElements: () => void;
  
  // Strategy Actions
  createStrategy: (name: string) => Strategy;
  loadStrategy: (strategy: Strategy) => void;
  saveCurrentStrategy: () => void;
  deleteStrategy: (id: string) => void;
  renameStrategy: (id: string, newName: string) => void;
  
  // Export/Import
  exportStrategy: () => string;
  importStrategy: (json: string) => Strategy | null;
}

// Re-export coordinate constants from lineups.ts for backward compatibility
export { WORLD_WIDTH, WORLD_HEIGHT, MAP_WIDTH, MAP_PADDING_X };

// Undo/Redo stack size limit
const MAX_UNDO_STACK_SIZE = 50;

function pushToUndoStack(stack: UndoAction[], action: UndoAction): UndoAction[] {
  const newStack = [...stack, action];
  if (newStack.length > MAX_UNDO_STACK_SIZE) newStack.shift();
  return newStack;
}

function pushToRedoStack(stack: UndoAction[], action: UndoAction): UndoAction[] {
  const newStack = [...stack, action];
  if (newStack.length > MAX_UNDO_STACK_SIZE) newStack.shift();
  return newStack;
}

export const useTacticsStore = create<TacticsState>()(
  persist(
    (set, get) => ({
      // Initial State
      currentMap: 'bind',
      isAttack: true,
      zoom: 1,
      currentTool: 'select',
      selectedAbility: null,
      selectedAgent: null,
      selectedElementId: null,
      selectedElementType: null,
      placedAbilities: [],
      placedAgents: [],
      placedUltOrbs: [],
      drawings: [],
      strategies: [],
      currentStrategy: null,
      isAlly: true,
      undoStack: [],
      redoStack: [],
      isScreenshotMode: false,
      appMode: 'strategy',
      lineupAgentId: 'sova',
      selectedLineupId: null,

      // Lineup editor initial state
      lineupEditorMode: 'idle',
      tempLineupData: null,
      editingLineupId: null,
      customLineups: [],
      favoriteLineups: [],
      lineupCoordinateOverrides: {} as Record<number, { start: [number, number]; end: [number, number] }>,
      drawColor: useSettingsStore.getState().drawColor,
      drawStrokeWidth: useSettingsStore.getState().drawStrokeWidth,
      drawMode: 'freehand' as 'freehand' | 'line' | 'arrow',
      showGrid: useSettingsStore.getState().showGrid,
      snapToGrid: useSettingsStore.getState().snapToGrid,
      gridSize: useSettingsStore.getState().gridSize,
      showSpawnBarrier: useSettingsStore.getState().defaultLayers.spawnBarrier,
      showRegionNames: useSettingsStore.getState().defaultLayers.regionNames,
      showUltOrbs: useSettingsStore.getState().defaultLayers.ultOrbs,
      mapHue: '',
      mapBrightness: 'brightness(1.1) contrast(1.15) saturate(1.1)',
      abilityVisibilityFilter: [], // 空=全部显示
      
      // Actions
      setCurrentMap: (map) => set((state) => ({
        currentMap: map,
        placedAbilities: [],
        placedAgents: [],
        drawings: [],
        placedUltOrbs: [],
        selectedElementId: null,
        selectedElementType: null,
        undoStack: [],
        redoStack: [],
      })),
      setIsAttack: (isAttack) => set({ isAttack }),
      setShowSpawnBarrier: (show) => {
        set({ showSpawnBarrier: show });
        useSettingsStore.getState().setDefaultLayers({ spawnBarrier: show });
      },
      setShowRegionNames: (show) => {
        set({ showRegionNames: show });
        useSettingsStore.getState().setDefaultLayers({ regionNames: show });
      },
      setShowUltOrbs: (show) => {
        set({ showUltOrbs: show });
        useSettingsStore.getState().setDefaultLayers({ ultOrbs: show });
      },
      setZoom: (zoom) => set({ zoom }),
      setCurrentTool: (tool) => set({ currentTool: tool, selectedElementId: null, selectedElementType: null }),
      setSelectedAbility: (ability) => set({ selectedAbility: ability }),
      setSelectedAgent: (agent) => set({ selectedAgent: agent }),
      setIsAlly: (isAlly) => set({ isAlly }),
      setSelectedElement: (id, type) => set({ selectedElementId: id, selectedElementType: type }),
      setScreenshotMode: (mode) => set({ isScreenshotMode: mode }),
      setAppMode: (mode) => set({ appMode: mode }),
      setLineupAgentId: (id) => set({ lineupAgentId: id }),
      setSelectedLineupId: (id) => set({ selectedLineupId: id }),

      // Lineup editor actions
      setLineupEditorMode: (mode) => set({ lineupEditorMode: mode }),
      setTempLineupData: (data) => set({ tempLineupData: data }),
      // 为已有点位添加坐标（不触碰标题、图片等数据）
      startPlaceCoordinates: (lineupId: number) => set({
        lineupEditorMode: 'placing-coord-stand',
        tempLineupData: {
          title: '',
          side: 'attack',
          abilityKey: 'E',
          standNormalized: null,
          landingNormalized: null,
        },
        editingLineupId: lineupId,
        selectedLineupId: lineupId,
      }),
      updateTempLineupData: (updates) => set((state) => ({
        tempLineupData: state.tempLineupData ? { ...state.tempLineupData, ...updates } : null
      })),
      startNewLineup: () => set({
        lineupEditorMode: 'placing-stand',
        tempLineupData: {
          title: '',
          side: 'attack',
          abilityKey: 'E',
          standNormalized: null,
          landingNormalized: null,
          standImage: undefined,
          detailImages: [],
        },
        editingLineupId: null,
        selectedLineupId: null,
      }),
      startEditLineup: (lineupId) => {
        const state = get();
        const lineup = state.customLineups.find(l => l.id === lineupId);
        if (!lineup) return;
        set({
          lineupEditorMode: 'editing',
          tempLineupData: {
            title: lineup.title,
            side: lineup.side as 'attack' | 'defense',
            abilityKey: lineup.abilityKey as 'C' | 'Q' | 'E' | 'X',
            standNormalized: lineup.coordinates.start.normalized as [number, number],
            landingNormalized: lineup.coordinates.end.normalized as [number, number],
            videoUrl: lineup.video_url,
          },
          editingLineupId: lineupId,
          selectedLineupId: lineupId,
        });
      },
      saveTempLineup: () => {
        const state = get();
        if (!state.tempLineupData) return;
        // 严格检查坐标数组是否存在且长度至少为2
        const hasStandCoords = Array.isArray(state.tempLineupData.standNormalized) && state.tempLineupData.standNormalized.length >= 2;
        const hasLandingCoords = Array.isArray(state.tempLineupData.landingNormalized) && state.tempLineupData.landingNormalized.length >= 2;
        if (!hasStandCoords || !hasLandingCoords) return;
        
        const newLineup: Lineup = {
          id: state.editingLineupId || Date.now(),
          title: state.tempLineupData.title || '未命名点位',
          side: state.tempLineupData.side,
          side_cn: state.tempLineupData.side === 'attack' ? '进攻方' : '防守方',
          abilityKey: state.tempLineupData.abilityKey,
          coordinates: {
            start: {
              normalized: state.tempLineupData.standNormalized!,
              raw: [Math.round(state.tempLineupData.standNormalized![0] * 2000), Math.round(state.tempLineupData.standNormalized![1] * 2000)],
            },
            end: {
              normalized: state.tempLineupData.landingNormalized!,
              raw: [Math.round(state.tempLineupData.landingNormalized![0] * 2000), Math.round(state.tempLineupData.landingNormalized![1] * 2000)],
            },
          },
          coverage_area: [],
          media: {
            stand_image: state.tempLineupData.standImage ? { url: state.tempLineupData.standImage, local: '' } : undefined,
            detail_images: (state.tempLineupData.detailImages || []).map((img, i) => ({
              url: img,
              local: '',
              label: `细节图 ${i + 1}`,
            })),
          },
          video_url: state.tempLineupData.videoUrl,
        };

        if (state.editingLineupId) {
          // Update existing
          set({
            customLineups: state.customLineups.map(l => l.id === state.editingLineupId ? newLineup : l),
            lineupEditorMode: 'idle',
            tempLineupData: null,
            editingLineupId: null,
          });
        } else {
          // Add new
          set({
            customLineups: [...state.customLineups, newLineup],
            lineupEditorMode: 'idle',
            tempLineupData: null,
            editingLineupId: null,
            selectedLineupId: newLineup.id,
          });
        }
      },
      cancelLineupEdit: () => set({
        lineupEditorMode: 'idle',
        tempLineupData: null,
        editingLineupId: null,
      }),
      deleteCustomLineup: (lineupId) => set((state) => ({
        customLineups: state.customLineups.filter(l => l.id !== lineupId),
        selectedLineupId: state.selectedLineupId === lineupId ? null : state.selectedLineupId,
      })),
      saveLineupCoordinateOverride: (lineupId, start, end) => set((state) => ({
        lineupCoordinateOverrides: {
          ...state.lineupCoordinateOverrides,
          [lineupId]: { start, end },
        },
      })),
      removeLineupCoordinateOverride: (lineupId) => set((state) => {
        const overrides = { ...state.lineupCoordinateOverrides };
        delete overrides[lineupId];
        return { lineupCoordinateOverrides: overrides };
      }),
      exportCustomLineups: () => {
        const state = get();
        return JSON.stringify(state.customLineups, null, 2);
      },
      exportCoordinateOverrides: () => {
        const state = get();
        return JSON.stringify(state.lineupCoordinateOverrides, null, 2);
      },
      importCoordinateOverrides: (jsonStr: string) => {
        try {
          // Parse JSON
          let rawData: unknown;
          try {
            rawData = JSON.parse(jsonStr);
          } catch {
            console.error('Invalid JSON format');
            return false;
          }
          
          // Validate data structure
          const validation = validateCoordinateOverridesImport(rawData);
          if (!validation.success) {
            console.error('Coordinate override validation failed:', validation.error);
            return false;
          }
          
          const data = validation.data;
          
          // Check if too many overrides
          const currentCount = Object.keys(get().lineupCoordinateOverrides).length;
          const newCount = Object.keys(data).length;
          if (currentCount + newCount > LIMITS.MAX_COORDINATE_OVERRIDES) {
            console.error(`Too many coordinate overrides. Current: ${currentCount}, New: ${newCount}, Max: ${LIMITS.MAX_COORDINATE_OVERRIDES}`);
            return false;
          }
          
          set((state) => ({
            lineupCoordinateOverrides: { ...state.lineupCoordinateOverrides, ...data },
          }));
          return true;
        } catch (error) {
          console.error('Coordinate import failed:', error);
          return false;
        }
      },
      toggleFavorite: (lineupId) => set((state) => ({
        favoriteLineups: state.favoriteLineups.includes(lineupId)
          ? state.favoriteLineups.filter(id => id !== lineupId)
          : [...state.favoriteLineups, lineupId],
      })),
      isFavorite: (lineupId) => get().favoriteLineups.includes(lineupId),
      setDrawColor: (color) => {
        set({ drawColor: color });
        useSettingsStore.getState().setDrawColor(color);
      },
      setDrawStrokeWidth: (width) => {
        set({ drawStrokeWidth: width });
        useSettingsStore.getState().setDrawStrokeWidth(width);
      },
      setDrawMode: (mode) => set({ drawMode: mode }),
      setShowGrid: (show) => {
        set({ showGrid: show });
        useSettingsStore.getState().setShowGrid(show);
      },
      setSnapToGrid: (snap) => {
        set({ snapToGrid: snap });
        useSettingsStore.getState().setSnapToGrid(snap);
      },
      setGridSize: (size) => {
        set({ gridSize: size });
        useSettingsStore.getState().setGridSize(size);
      },
      setMapHue: (hue) => set({ mapHue: hue }),
      setMapBrightness: (brightness) => set({ mapBrightness: brightness }),
      toggleAbilityVisibility: (key: string) => set((state) => {
        const filters = state.abilityVisibilityFilter;
        if (filters.includes(key)) {
          return { abilityVisibilityFilter: filters.filter(f => f !== key) };
        } else {
          return { abilityVisibilityFilter: [...filters, key] };
        }
      }),
      clearAbilityVisibilityFilter: () => set({ abilityVisibilityFilter: [] }),
      
      // Element Actions (with undo)
      addPlacedAbility: (ability) => set((state) => {
        const action: UndoAction = { type: 'addAbility', ability };
        return {
          placedAbilities: [...state.placedAbilities, ability],
          undoStack: pushToUndoStack(state.undoStack, action),
          redoStack: [],
        };
      }),
      removePlacedAbility: (id) => set((state) => {
        const ability = state.placedAbilities.find(a => a.id === id);
        if (!ability) return state;
        const action: UndoAction = { type: 'removeAbility', ability };
        return {
          placedAbilities: state.placedAbilities.filter(a => a.id !== id),
          undoStack: pushToUndoStack(state.undoStack, action),
          redoStack: [],
          selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
          selectedElementType: state.selectedElementId === id ? null : state.selectedElementType,
        };
      }),
      updatePlacedAbility: (id, updates, recordUndo = true) => set((state) => {
        const prev = state.placedAbilities.find(a => a.id === id);
        if (!prev) return state;
        const newAbilities = state.placedAbilities.map(a => 
          a.id === id ? { ...a, ...updates } : a
        );
        const result: Partial<TacticsState> = { placedAbilities: newAbilities };
        if (recordUndo) {
          const action: UndoAction = { 
            type: 'updateAbility', 
            abilityId: id, 
            abilityUpdates: updates, 
            abilityPrevState: prev 
          };
          result.undoStack = pushToUndoStack(state.undoStack, action);
          result.redoStack = [];
        }
        return result;
      }),
      addPlacedAgent: (agent) => set((state) => {
        const action: UndoAction = { type: 'addAgent', agent };
        return {
          placedAgents: [...state.placedAgents, agent],
          undoStack: pushToUndoStack(state.undoStack, action),
          redoStack: [],
        };
      }),
      removePlacedAgent: (id) => set((state) => {
        const agent = state.placedAgents.find(a => a.id === id);
        if (!agent) return state;
        const action: UndoAction = { type: 'removeAgent', agent };
        return {
          placedAgents: state.placedAgents.filter(a => a.id !== id),
          undoStack: pushToUndoStack(state.undoStack, action),
          redoStack: [],
          selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
          selectedElementType: state.selectedElementId === id ? null : state.selectedElementType,
        };
      }),
      updatePlacedAgent: (id, updates, recordUndo = true) => set((state) => {
        const prev = state.placedAgents.find(a => a.id === id);
        if (!prev) return state;
        const newAgents = state.placedAgents.map(a => 
          a.id === id ? { ...a, ...updates } : a
        );
        const result: Partial<TacticsState> = { placedAgents: newAgents };
        if (recordUndo) {
          const action: UndoAction = { 
            type: 'updateAgent', 
            agentId: id, 
            agentUpdates: updates, 
            agentPrevState: prev 
          };
          result.undoStack = pushToUndoStack(state.undoStack, action);
          result.redoStack = [];
        }
        return result;
      }),
      addPlacedUltOrb: (orb) => set((state) => ({
        placedUltOrbs: [...state.placedUltOrbs, orb],
      })),
      removePlacedUltOrb: (id) => set((state) => ({
        placedUltOrbs: state.placedUltOrbs.filter(o => o.id !== id),
      })),
      addDrawing: (drawing) => set((state) => {
        const action: UndoAction = { type: 'addDrawing', drawing };
        return {
          drawings: [...state.drawings, drawing],
          undoStack: pushToUndoStack(state.undoStack, action),
          redoStack: [],
        };
      }),
      removeDrawing: (id) => set((state) => {
        const drawing = state.drawings.find(d => d.id === id);
        if (!drawing) return state;
        const action: UndoAction = { type: 'removeDrawing', drawing };
        return {
          drawings: state.drawings.filter(d => d.id !== id),
          undoStack: pushToUndoStack(state.undoStack, action),
          redoStack: [],
        };
      }),
      clearDrawings: () => set((state) => {
        const action: UndoAction = { type: 'clearDrawings', prevDrawings: state.drawings };
        return {
          drawings: [],
          undoStack: pushToUndoStack(state.undoStack, action),
          redoStack: [],
        };
      }),
      clearAll: () => set((state) => {
        const action: UndoAction = { 
          type: 'clearAll',
          prevAbilities: state.placedAbilities,
          prevAgents: state.placedAgents,
          prevDrawings: state.drawings,
        };
        return { 
          placedAbilities: [], 
          placedAgents: [], 
          placedUltOrbs: [],
          drawings: [],
          currentStrategy: null,
          selectedElementId: null,
          selectedElementType: null,
          undoStack: pushToUndoStack(state.undoStack, action),
          redoStack: [],
        };
      }),
      
      // Undo/Redo
      undo: () => set((state) => {
        const action = state.undoStack[state.undoStack.length - 1];
        if (!action) return state;
        const newUndoStack = state.undoStack.slice(0, -1);
        
        switch (action.type) {
          case 'addAbility':
            return {
              placedAbilities: state.placedAbilities.filter(a => a.id !== action.ability!.id),
              undoStack: newUndoStack,
              redoStack: pushToRedoStack(state.redoStack, action),
            };
          case 'removeAbility':
            return {
              placedAbilities: [...state.placedAbilities, action.ability!],
              undoStack: newUndoStack,
              redoStack: pushToRedoStack(state.redoStack, action),
            };
          case 'updateAbility': {
            const newAbilities = state.placedAbilities.map(a =>
              a.id === action.abilityId ? action.abilityPrevState! : a
            );
            return {
              placedAbilities: newAbilities,
              undoStack: newUndoStack,
              redoStack: pushToRedoStack(state.redoStack, action),
            };
          }
          case 'addAgent':
            return {
              placedAgents: state.placedAgents.filter(a => a.id !== action.agent!.id),
              undoStack: newUndoStack,
              redoStack: pushToRedoStack(state.redoStack, action),
            };
          case 'removeAgent':
            return {
              placedAgents: [...state.placedAgents, action.agent!],
              undoStack: newUndoStack,
              redoStack: pushToRedoStack(state.redoStack, action),
            };
          case 'updateAgent': {
            const newAgents = state.placedAgents.map(a =>
              a.id === action.agentId ? action.agentPrevState! : a
            );
            return {
              placedAgents: newAgents,
              undoStack: newUndoStack,
              redoStack: pushToRedoStack(state.redoStack, action),
            };
          }
          case 'addDrawing':
            return {
              drawings: state.drawings.filter(d => d.id !== action.drawing!.id),
              undoStack: newUndoStack,
              redoStack: pushToRedoStack(state.redoStack, action),
            };
          case 'removeDrawing':
            return {
              drawings: [...state.drawings, action.drawing!],
              undoStack: newUndoStack,
              redoStack: pushToRedoStack(state.redoStack, action),
            };
          case 'clearDrawings':
            return {
              drawings: action.prevDrawings || [],
              undoStack: newUndoStack,
              redoStack: pushToRedoStack(state.redoStack, action),
            };
          case 'clearAll':
            return {
              placedAbilities: action.prevAbilities || [],
              placedAgents: action.prevAgents || [],
              drawings: action.prevDrawings || [],
              undoStack: newUndoStack,
              redoStack: pushToRedoStack(state.redoStack, action),
            };
          default:
            return state;
        }
      }),
      redo: () => set((state) => {
        const action = state.redoStack[state.redoStack.length - 1];
        if (!action) return state;
        const newRedoStack = state.redoStack.slice(0, -1);
        
        switch (action.type) {
          case 'addAbility':
            return {
              placedAbilities: [...state.placedAbilities, action.ability!],
              undoStack: pushToUndoStack(state.undoStack, action),
              redoStack: newRedoStack,
            };
          case 'removeAbility':
            return {
              placedAbilities: state.placedAbilities.filter(a => a.id !== action.ability!.id),
              undoStack: pushToUndoStack(state.undoStack, action),
              redoStack: newRedoStack,
            };
          case 'updateAbility': {
            const newAbilities = state.placedAbilities.map(a =>
              a.id === action.abilityId ? { ...a, ...action.abilityUpdates! } : a
            );
            return {
              placedAbilities: newAbilities,
              undoStack: pushToUndoStack(state.undoStack, action),
              redoStack: newRedoStack,
            };
          }
          case 'addAgent':
            return {
              placedAgents: [...state.placedAgents, action.agent!],
              undoStack: pushToUndoStack(state.undoStack, action),
              redoStack: newRedoStack,
            };
          case 'removeAgent':
            return {
              placedAgents: state.placedAgents.filter(a => a.id !== action.agent!.id),
              undoStack: pushToUndoStack(state.undoStack, action),
              redoStack: newRedoStack,
            };
          case 'updateAgent': {
            const newAgents = state.placedAgents.map(a =>
              a.id === action.agentId ? { ...a, ...action.agentUpdates! } : a
            );
            return {
              placedAgents: newAgents,
              undoStack: pushToUndoStack(state.undoStack, action),
              redoStack: newRedoStack,
            };
          }
          case 'addDrawing':
            return {
              drawings: [...state.drawings, action.drawing!],
              undoStack: pushToUndoStack(state.undoStack, action),
              redoStack: newRedoStack,
            };
          case 'removeDrawing':
            return {
              drawings: state.drawings.filter(d => d.id !== action.drawing!.id),
              undoStack: pushToUndoStack(state.undoStack, action),
              redoStack: newRedoStack,
            };
          case 'clearDrawings':
            return {
              drawings: [],
              undoStack: pushToUndoStack(state.undoStack, action),
              redoStack: newRedoStack,
            };
          case 'clearAll':
            return {
              placedAbilities: [],
              placedAgents: [],
              drawings: [],
              undoStack: pushToUndoStack(state.undoStack, action),
              redoStack: newRedoStack,
            };
          default:
            return state;
        }
      }),
      canUndo: () => get().undoStack.length > 0,
      canRedo: () => get().redoStack.length > 0,
      
      // Flip all elements for attack/defense switch
      flipAllElements: () => set((state) => {
        const flipX = (x: number) => WORLD_WIDTH - x;
        const flipRotation = (r?: number) => r !== undefined ? r + Math.PI : undefined;
        
        const flippedAbilities = state.placedAbilities.map(a => ({
          ...a,
          position: { x: flipX(a.position.x), y: a.position.y },
          rotation: flipRotation(a.rotation),
        }));
        const flippedAgents = state.placedAgents.map(a => ({
          ...a,
          position: { x: flipX(a.position.x), y: a.position.y },
        }));
        const flippedDrawings = state.drawings.map(d => ({
          ...d,
          points: d.points.map(p => ({ x: flipX(p.x), y: p.y })),
        }));
        
        return {
          placedAbilities: flippedAbilities,
          placedAgents: flippedAgents,
          drawings: flippedDrawings,
          undoStack: [], // Clear undo history after flip
          redoStack: [],
        };
      }),
      
      // Strategy Actions
      createStrategy: (name) => {
        const state = get();
        const strategy: Strategy = {
          id: Date.now().toString(),
          name,
          map: state.currentMap,
          isAttack: state.isAttack,
          placedAbilities: state.placedAbilities,
          placedAgents: state.placedAgents,
          drawings: state.drawings,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({ 
          strategies: [...s.strategies, strategy],
          currentStrategy: strategy 
        }));
        return strategy;
      },
      loadStrategy: (strategy) => set({
        currentStrategy: strategy,
        currentMap: strategy.map,
        isAttack: strategy.isAttack,
        placedAbilities: strategy.placedAbilities,
        placedAgents: strategy.placedAgents,
        drawings: strategy.drawings,
        undoStack: [],
        redoStack: [],
      }),
      saveCurrentStrategy: () => {
        const state = get();
        if (!state.currentStrategy) return;
        
        const updated: Strategy = {
          ...state.currentStrategy,
          map: state.currentMap,
          isAttack: state.isAttack,
          placedAbilities: state.placedAbilities,
          placedAgents: state.placedAgents,
          drawings: state.drawings,
          updatedAt: Date.now(),
        };
        set((s) => ({
          strategies: s.strategies.map(st => 
            st.id === updated.id ? updated : st
          ),
          currentStrategy: updated,
        }));
      },
      deleteStrategy: (id) => set((state) => ({
        strategies: state.strategies.filter(s => s.id !== id),
        currentStrategy: state.currentStrategy?.id === id ? null : state.currentStrategy,
      })),
      renameStrategy: (id, newName) => set((state) => ({
        strategies: state.strategies.map(s =>
          s.id === id ? { ...s, name: newName, updatedAt: Date.now() } : s
        ),
        currentStrategy: state.currentStrategy?.id === id
          ? { ...state.currentStrategy, name: newName, updatedAt: Date.now() }
          : state.currentStrategy,
      })),
      
      // Export/Import
      exportStrategy: () => {
        const state = get();
        const data = {
          _version: DATA_VERSION,
          _exportedAt: new Date().toISOString(),
          _app: 'valorant-tactics',
          map: state.currentMap,
          isAttack: state.isAttack,
          placedAbilities: state.placedAbilities,
          placedAgents: state.placedAgents,
          drawings: state.drawings,
        };
        return JSON.stringify(data);
      },
      importStrategy: (json) => {
        try {
          // Parse JSON
          let rawData: unknown;
          try {
            rawData = JSON.parse(json);
          } catch {
            console.error('Invalid JSON format');
            return null;
          }
          
          // Validate data structure
          const validation = validateStrategyImport(rawData);
          if (!validation.success) {
            console.error('Import validation failed:', validation.error);
            return null;
          }
          
          const data = validation.data;
          
          // Check version compatibility
          if (!isVersionCompatible(data._version)) {
            const warning = getVersionWarning(data._version);
            console.warn('Version compatibility warning:', warning);
            // Still allow import but log warning
          }
          
          // Create strategy with validated data
          const strategy: Strategy = {
            id: Date.now().toString(),
            name: '导入的策略',
            map: data.map,
            isAttack: data.isAttack,
            placedAbilities: data.placedAbilities,
            placedAgents: data.placedAgents,
            drawings: data.drawings,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          
          set((s) => ({ strategies: [...s.strategies, strategy] }));
          return strategy;
        } catch (error) {
          console.error('Import failed:', error);
          return null;
        }
      },
    }),
    {
      name: 'valorant-tactics-storage',
      partialize: (state) => ({
        strategies: state.strategies,
        currentMap: state.currentMap,
        appMode: state.appMode,
        lineupAgentId: state.lineupAgentId,
        customLineups: state.customLineups,
        favoriteLineups: state.favoriteLineups,
        lineupCoordinateOverrides: state.lineupCoordinateOverrides,
      }),
    }
  )
);
