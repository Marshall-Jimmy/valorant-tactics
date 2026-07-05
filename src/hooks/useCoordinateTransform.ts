import { useCallback, useMemo, useRef } from 'react';
import { NORMALIZED_HEIGHT, WORLD_ASPECT_RATIO } from '@/data/lineups';

export interface CoordinateTransform {
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  worldWidth: number;
  worldHeight: number;
  scaleFactor: number;
}

/**
 * Hook that provides world-to-screen and screen-to-world coordinate conversion.
 * Uses useRef to cache pan/zoom values so function references stay stable,
 * preventing unnecessary child component re-renders.
 *
 * @param containerHeight - The height of the canvas container in pixels
 * @param pan - Current pan offset { x, y }
 * @param zoom - Current zoom level
 */
export function useCoordinateTransform(
  containerHeight: number,
  pan: { x: number; y: number },
  zoom: number
): CoordinateTransform {
  const BASE_HEIGHT = 831;

  const worldWidth = containerHeight * WORLD_ASPECT_RATIO;
  const worldHeight = containerHeight;
  const scaleFactor = containerHeight / BASE_HEIGHT;

  // 用 ref 缓存 pan/zoom，使函数引用保持稳定，避免穿透子组件 memo
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  panRef.current = pan;
  zoomRef.current = zoom;

  const worldToScreen = useCallback(
    (worldX: number, worldY: number) => {
      const pan = panRef.current;
      const zoom = zoomRef.current;
      const containerX = (worldX / (NORMALIZED_HEIGHT * WORLD_ASPECT_RATIO)) * worldWidth;
      const containerY = (worldY / NORMALIZED_HEIGHT) * worldHeight;
      return {
        x: pan.x + containerX * zoom,
        y: pan.y + containerY * zoom,
      };
    },
    [worldWidth, worldHeight]
  );

  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const pan = panRef.current;
      const zoom = zoomRef.current;
      const containerX = (screenX - pan.x) / zoom;
      const containerY = (screenY - pan.y) / zoom;
      const worldX = (containerX / worldWidth) * (NORMALIZED_HEIGHT * WORLD_ASPECT_RATIO);
      const worldY = (containerY / worldHeight) * NORMALIZED_HEIGHT;
      return { x: worldX, y: worldY };
    },
    [worldWidth, worldHeight]
  );

  return useMemo(
    () => ({ worldToScreen, screenToWorld, worldWidth, worldHeight, scaleFactor }),
    [worldToScreen, screenToWorld, worldWidth, worldHeight, scaleFactor]
  );
}
