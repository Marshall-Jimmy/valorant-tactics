'use client';

import React from 'react';
import type { DrawingElement } from '@/types';
import type { CoordinateTransform } from '@/hooks/useCoordinateTransform';

interface DrawingLayerProps {
  drawings: DrawingElement[];
  dimensions: { width: number; height: number };
  currentTool: string;
  zoom: number;
  drawColor: string;
  drawStrokeWidth: number;
  drawMode: string;
  showGrid: boolean;
  isDrawing: boolean;
  currentDrawing: { x: number; y: number }[];
  transform: CoordinateTransform;
  onRemoveDrawing: (id: string) => void;
}

/** Renders the SVG drawing layer (grid, drawings, current drawing preview) */
export const DrawingLayer = React.memo(function DrawingLayer({
  drawings,
  dimensions,
  currentTool,
  zoom,
  drawColor,
  drawStrokeWidth,
  drawMode,
  showGrid,
  isDrawing,
  currentDrawing,
  transform,
  onRemoveDrawing,
}: DrawingLayerProps) {
  const { worldToScreen, screenToWorld } = transform;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      preserveAspectRatio="none"
    >
      {/* Grid lines */}
      {showGrid && (() => {
        const gridSpacing = 50;
        const lines: React.ReactNode[] = [];
        const topLeft = screenToWorld(0, 0);
        const bottomRight = screenToWorld(dimensions.width, dimensions.height);
        const startX = Math.floor(topLeft.x / gridSpacing) * gridSpacing;
        const endX = Math.ceil(bottomRight.x / gridSpacing) * gridSpacing;
        const startY = Math.floor(topLeft.y / gridSpacing) * gridSpacing;
        const endY = Math.ceil(bottomRight.y / gridSpacing) * gridSpacing;
        for (let x = startX; x <= endX; x += gridSpacing) {
          const s1 = worldToScreen(x, topLeft.y);
          const s2 = worldToScreen(x, bottomRight.y);
          lines.push(<line key={`v${x}`} x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />);
        }
        for (let y = startY; y <= endY; y += gridSpacing) {
          const s1 = worldToScreen(topLeft.x, y);
          const s2 = worldToScreen(bottomRight.x, y);
          lines.push(<line key={`h${y}`} x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />);
        }
        return <g>{lines}</g>;
      })()}

      {/* Existing drawings */}
      {drawings.map((drawing) => {
        if (drawing.type === 'text' && drawing.points.length > 0) {
          const pos = worldToScreen(drawing.points[0].x, drawing.points[0].y);
          return (
            <text
              key={drawing.id}
              x={pos.x}
              y={pos.y}
              fill={drawing.color}
              fontSize={drawing.strokeWidth * zoom}
              fontWeight="bold"
              style={{ textAnchor: 'middle', dominantBaseline: 'middle',
                paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.7)', strokeWidth: 3 * zoom }}
            >
              {drawing.text}
            </text>
          );
        }

        const screenPoints = drawing.points.map(p => worldToScreen(p.x, p.y));
        const isArrow = drawing.type === 'arrow';
        return (
          <g key={drawing.id}>
            <path
              d={`M ${screenPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
              fill="none"
              stroke={drawing.color}
              strokeWidth={drawing.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={currentTool === 'draw' ? 'cursor-pointer hover:opacity-50' : ''}
              onClick={(e) => {
                if (currentTool === 'draw') {
                  e.stopPropagation();
                  onRemoveDrawing(drawing.id);
                }
              }}
            />
            {isArrow && screenPoints.length >= 2 && (() => {
              const last = screenPoints[screenPoints.length - 1];
              const prev = screenPoints[screenPoints.length - 2];
              const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
              const arrowSize = 10 * zoom;
              const arrowPoints = [
                `${last.x},${last.y}`,
                `${last.x - arrowSize * Math.cos(angle - Math.PI / 6)},${last.y - arrowSize * Math.sin(angle - Math.PI / 6)}`,
                `${last.x - arrowSize * Math.cos(angle + Math.PI / 6)},${last.y - arrowSize * Math.sin(angle + Math.PI / 6)}`,
              ].join(' ');
              return <polygon points={arrowPoints} fill={drawing.color} />;
            })()}
          </g>
        );
      })}

      {/* Current drawing preview */}
      {isDrawing && currentDrawing.length > 1 && (
        <g>
          <path
            d={`M ${currentDrawing.map(p => {
              const s = worldToScreen(p.x, p.y);
              return `${s.x},${s.y}`;
            }).join(' L ')}`}
            fill="none"
            stroke={drawColor}
            strokeWidth={drawStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {(drawMode === 'arrow') && currentDrawing.length >= 2 && (() => {
            const lastScreen = worldToScreen(currentDrawing[currentDrawing.length - 1].x, currentDrawing[currentDrawing.length - 1].y);
            const prevScreen = worldToScreen(currentDrawing[currentDrawing.length - 2].x, currentDrawing[currentDrawing.length - 2].y);
            const angle = Math.atan2(lastScreen.y - prevScreen.y, lastScreen.x - prevScreen.x);
            const arrowSize = 10 * zoom;
            const arrowPoints = [
              `${lastScreen.x},${lastScreen.y}`,
              `${lastScreen.x - arrowSize * Math.cos(angle - Math.PI / 6)},${lastScreen.y - arrowSize * Math.sin(angle - Math.PI / 6)}`,
              `${lastScreen.x - arrowSize * Math.cos(angle + Math.PI / 6)},${lastScreen.y - arrowSize * Math.sin(angle + Math.PI / 6)}`,
            ].join(' ');
            return <polygon points={arrowPoints} fill={drawColor} />;
          })()}
        </g>
      )}
    </svg>
  );
});
