import { useEffect, useRef } from 'react';
import { useTacticsStore } from '@/store/tacticsStore';
import { v4 as uuidv4 } from 'uuid';

interface KeyboardShortcutsOptions {
  /** Called when Space is pressed to reset view */
  onResetView: () => void;
  /** Called when Escape is pressed */
  onClearDragTarget: () => void;
}

/**
 * Hook that handles all keyboard shortcuts for the canvas.
 * Uses refs and getState() to minimize dependencies — the effect runs once and never re-subscribes.
 */
export function useKeyboardShortcuts({ onResetView, onClearDragTarget }: KeyboardShortcutsOptions) {
  const selectedElementIdRef = useRef<string | null>(null);
  const selectedElementTypeRef = useRef<'ability' | 'agent' | null>(null);
  const placedAbilitiesRef = useRef(useTacticsStore.getState().placedAbilities);
  const placedAgentsRef = useRef(useTacticsStore.getState().placedAgents);

  // Subscribe to store changes to keep refs in sync
  const unsub = useTacticsStore.subscribe((state) => {
    selectedElementIdRef.current = state.selectedElementId;
    selectedElementTypeRef.current = state.selectedElementType;
    placedAbilitiesRef.current = state.placedAbilities;
    placedAgentsRef.current = state.placedAgents;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const state = useTacticsStore.getState();

      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        state.undo();
        return;
      }
      // Ctrl+Shift+Z / Ctrl+Z: Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        state.redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Z') {
        e.preventDefault();
        state.redo();
        return;
      }

      // Delete / Backspace: Remove selected element
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selId = selectedElementIdRef.current;
        const selType = selectedElementTypeRef.current;
        if (selId && selType) {
          e.preventDefault();
          if (selType === 'ability') state.removePlacedAbility(selId);
          else if (selType === 'agent') state.removePlacedAgent(selId);
          state.setSelectedElement(null, null);
        }
        return;
      }

      // Escape: Deselect
      if (e.key === 'Escape') {
        state.setSelectedElement(null, null);
        onClearDragTarget();
        return;
      }

      // Q: Draw mode
      if (e.key === 'q' || e.key === 'Q') {
        state.setCurrentTool('draw');
        return;
      }

      // S: Select mode (without Ctrl)
      if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
        state.setCurrentTool('select');
        return;
      }

      // R: Rotate selected ability
      if (e.key === 'r' || e.key === 'R') {
        const selId = selectedElementIdRef.current;
        const selType = selectedElementTypeRef.current;
        if (selId && selType === 'ability') {
          const ability = placedAbilitiesRef.current.find(a => a.id === selId);
          if (ability) {
            const delta = e.shiftKey ? -Math.PI / 4 : Math.PI / 4;
            state.updatePlacedAbility(selId, { rotation: (ability.rotation || 0) + delta });
          }
        }
        return;
      }

      // Ctrl+Shift+D: Duplicate selected element (Shift required to avoid browser bookmark conflict)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        const selId = selectedElementIdRef.current;
        const selType = selectedElementTypeRef.current;
        if (selId) {
          if (selType === 'ability') {
            const source = placedAbilitiesRef.current.find(a => a.id === selId);
            if (source) {
              state.addPlacedAbility({
                id: uuidv4(),
                ability: source.ability,
                position: { x: source.position.x + 30, y: source.position.y + 30 },
                isAlly: source.isAlly,
              });
            }
          } else if (selType === 'agent') {
            const source = placedAgentsRef.current.find(a => a.id === selId);
            if (source) {
              state.addPlacedAgent({
                id: uuidv4(),
                agentType: source.agentType,
                position: { x: source.position.x + 30, y: source.position.y + 30 },
                isAlly: source.isAlly,
                state: source.state,
              });
            }
          }
        }
        return;
      }

      // Space: Reset view
      if (e.key === ' ' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        state.setZoom(1);
        onResetView();
        return;
      }

      // E: Toggle erase mode
      if (e.key === 'e' && !e.ctrlKey && !e.metaKey) {
        state.setCurrentTool(state.currentTool === 'erase' ? 'select' : 'erase');
        return;
      }

      // W: Toggle draw mode
      if (e.key === 'w' && !e.ctrlKey && !e.metaKey) {
        state.setCurrentTool(state.currentTool === 'draw' ? 'select' : 'draw');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unsub();
    };
  }, [onResetView, onClearDragTarget, unsub]);
}
