'use client';

import React from 'react';
import { PlacedAgent } from '@/types';
import { agentsData } from '@/data/agents';
import type { CoordinateTransform } from '@/hooks/useCoordinateTransform';
import Image from 'next/image';
import { handleImageFallback } from '@/utils/image';

interface AgentMarkerProps {
  placed: PlacedAgent;
  isSelected: boolean;
  isScreenshotMode: boolean;
  currentTool: string;
  zoom: number;
  transform: CoordinateTransform;
  displayName: string;
  onDragStart: (e: React.MouseEvent, id: string) => void;
}

/**
 * Memoized agent marker component.
 * Extracted from MapCanvas to avoid re-creating on every render.
 */
export const AgentMarker = React.memo(function AgentMarker({
  placed,
  isSelected,
  currentTool,
  zoom,
  transform,
  displayName,
  onDragStart,
}: AgentMarkerProps) {
  const agent = agentsData[placed.agentType];
  if (!agent) return null;

  const screenPos = transform.worldToScreen(placed.position.x, placed.position.y);
  const size = 28 * zoom;
  const pointerSize = 6 * zoom;

  return (
    <div
      key={placed.id}
      onMouseDown={(e) => onDragStart(e, placed.id)}
      style={{
        position: 'absolute',
        left: screenPos.x,
        top: screenPos.y,
        transform: 'translate(-50%, -100%)',
        cursor: currentTool === 'select' ? 'move' : 'crosshair',
        zIndex: isSelected ? 100 : 10,
      }}
    >
      {/* Avatar container */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          border: `3px solid ${isSelected ? '#60a5fa' : placed.state === 'dead' ? '#6b7280' : '#ffffff'}`,
          boxShadow: isSelected
            ? '0 0 16px rgba(96,165,250,0.8), 0 0 8px rgba(96,165,250,0.4)'
            : placed.isAlly
              ? '0 0 8px rgba(74,222,128,0.6)'
              : '0 0 8px rgba(248,113,113,0.6)',
          opacity: placed.state === 'dead' ? 0.5 : 1,
          position: 'relative',
        }}
      >
        <Image
          src={agent.iconPath}
          alt={displayName}
          fill
          className="object-cover"
          sizes={`${size}px`}
          unoptimized
          onError={handleImageFallback as any}
        />
        {/* Team indicator bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 3 * zoom,
            backgroundColor: placed.isAlly ? '#4ade80' : '#f87171',
          }}
        />
      </div>
      {/* White triangle pointer */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: `${pointerSize}px solid transparent`,
          borderRight: `${pointerSize}px solid transparent`,
          borderTop: `${pointerSize}px solid ${isSelected ? '#60a5fa' : '#ffffff'}`,
          margin: '0 auto',
          marginTop: -1,
        }}
      />
    </div>
  );
});
