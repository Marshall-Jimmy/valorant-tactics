'use client';

import React from 'react';
import { PlacedAbility } from '@/types';
import type { CoordinateTransform } from '@/hooks/useCoordinateTransform';
import { handleImageFallback } from '@/utils/image';

interface AbilityMarkerProps {
  placed: PlacedAbility;
  isSelected: boolean;
  isScreenshotMode: boolean;
  currentTool: string;
  zoom: number;
  scaleFactor: number;
  transform: CoordinateTransform;
  onDragStart: (e: React.MouseEvent, id: string) => void;
}

/**
 * Memoized ability marker component.
 * Extracted from MapCanvas to avoid re-creating on every render.
 */
export const AbilityMarker = React.memo(function AbilityMarker({
  placed,
  isSelected,
  isScreenshotMode,
  currentTool,
  zoom,
  scaleFactor,
  transform,
  onDragStart,
}: AbilityMarkerProps) {
  const ability = placed.ability.abilityData;
  if (!ability) return null;

  const screenPos = transform.worldToScreen(placed.position.x, placed.position.y);
  const rotation = placed.rotation || 0;

  let content: React.ReactNode = null;

  switch (ability.type) {
    case 'circle': {
      const size = ability.size * scaleFactor * zoom;
      content = (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            border: `2px solid ${ability.outlineColor}`,
            backgroundColor: ability.fillColor || 'transparent',
            opacity: ability.opacity !== undefined ? ability.opacity / 100 : 0.5,
            boxSizing: 'border-box',
          }}
        />
      );
      break;
    }
    case 'square': {
      const w = ability.width * scaleFactor * zoom;
      const h = ability.height * scaleFactor * zoom;
      content = (
        <div style={{ width: w, height: h, backgroundColor: ability.isTransparent ? 'transparent' : ability.color, border: `2px solid ${ability.color}`, opacity: 0.4, boxSizing: 'border-box' }} />
      );
      break;
    }
    case 'image': {
      const imgSize = ability.size * scaleFactor * zoom;
      content = (
        <img
          src={ability.imagePath}
          alt="ability"
          style={{
            width: imgSize,
            height: imgSize,
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
          }}
          onError={handleImageFallback}
        />
      );
      break;
    }
    case 'rotatableImage': {
      const w = ability.width * scaleFactor * zoom;
      const h = ability.height * scaleFactor * zoom;
      content = (
        <img
          src={ability.imagePath}
          alt="ability"
          style={{
            width: w,
            height: h,
            objectFit: 'fill',
            filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
          }}
          onError={handleImageFallback}
        />
      );
      break;
    }
    case 'centerSquare': {
      const w = ability.width * scaleFactor * zoom;
      const h = ability.height * scaleFactor * zoom;
      content = (
        <div style={{
          width: w,
          height: h,
          backgroundColor: ability.color + '40',
          border: `2px solid ${ability.color}`,
          opacity: 0.6,
          boxSizing: 'border-box',
        }} />
      );
      break;
    }
    case 'resizableSquare': {
      const w = ability.width * scaleFactor * zoom;
      const h = ability.height * scaleFactor * zoom;
      content = (
        <div style={{
          width: w,
          height: h,
          backgroundColor: ability.isTransparent ? 'transparent' : ability.color + '40',
          border: `2px solid ${ability.color}`,
          opacity: 0.6,
          boxSizing: 'border-box',
          borderTop: ability.hasTopBorder ? `2px solid ${ability.color}` : undefined,
          borderLeft: ability.hasSideBorders ? `2px solid ${ability.color}` : undefined,
          borderRight: ability.hasSideBorders ? `2px solid ${ability.color}` : undefined,
        }} />
      );
      break;
    }
    default: {
      content = (
        <div style={{ width: 32 * zoom, height: 32 * zoom, backgroundColor: placed.isAlly ? '#4ade80' : '#f87171', borderRadius: '50%', border: '2px solid white', boxSizing: 'border-box' }} />
      );
      break;
    }
  }

  return (
    <div
      key={placed.id}
      onMouseDown={(e) => onDragStart(e, placed.id)}
      style={{
        position: 'absolute',
        left: screenPos.x,
        top: screenPos.y,
        transform: `translate(-50%, -50%) rotate(${rotation}rad)`,
        cursor: currentTool === 'select' ? 'move' : 'crosshair',
        zIndex: isSelected ? 100 : 10,
      }}
    >
      {content}
      {isSelected && !isScreenshotMode && (
        <div
          className="absolute border-2 border-blue-400 rounded pointer-events-none"
          style={{
            transform: `translate(-50%, -50%) rotate(${rotation}rad)`,
            left: '50%',
            top: '50%',
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            boxShadow: '0 0 12px rgba(96, 165, 250, 0.6), inset 0 0 8px rgba(96, 165, 250, 0.3)',
            animation: 'pulse-selected 2s ease-in-out infinite',
          }}
        />
      )}
    </div>
  );
});
