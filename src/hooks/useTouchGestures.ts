import { useRef, useCallback, useEffect } from 'react';

interface TouchGesturesOptions {
  onZoom: (delta: number, centerX: number, centerY: number) => void;
  onPan: (deltaX: number, deltaY: number) => void;
  minZoom: number;
  maxZoom: number;
}

/**
 * Hook for handling touch gestures (pinch zoom, pan) on mobile devices.
 * Provides smooth multi-touch interactions for the canvas.
 */
export function useTouchGestures({ onZoom, onPan, minZoom, maxZoom }: TouchGesturesOptions) {
  const touchStartRef = useRef<{
    touches: { x: number; y: number }[];
    initialDistance: number | null;
    initialZoom: number;
  } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - start pan
      touchStartRef.current = {
        touches: [{ x: e.touches[0].clientX, y: e.touches[0].clientY }],
        initialDistance: null,
        initialZoom: 1,
      };
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      touchStartRef.current = {
        touches: [
          { x: e.touches[0].clientX, y: e.touches[0].clientY },
          { x: e.touches[1].clientX, y: e.touches[1].clientY },
        ],
        initialDistance: distance,
        initialZoom: 1,
      };
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      if (e.touches.length === 1 && touchStartRef.current.touches.length === 1) {
        // Pan
        const dx = e.touches[0].clientX - touchStartRef.current.touches[0].x;
        const dy = e.touches[0].clientY - touchStartRef.current.touches[0].y;
        onPan(dx, dy);
        touchStartRef.current.touches = [{ x: e.touches[0].clientX, y: e.touches[0].clientY }];
      } else if (e.touches.length === 2 && touchStartRef.current.initialDistance) {
        // Pinch zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const scale = distance / touchStartRef.current.initialDistance;
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        // Calculate zoom delta
        const delta = scale > 1 ? 0.02 : -0.02;
        onZoom(delta, centerX, centerY);

        // Update initial distance for smooth continuous zooming
        touchStartRef.current.initialDistance = distance;
      }
    },
    [onZoom, onPan]
  );

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
