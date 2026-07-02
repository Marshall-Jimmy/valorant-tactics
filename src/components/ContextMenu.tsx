'use client';

import React, { useEffect, useRef, useCallback } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = React.useState(position);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;

    let { x, y } = position;

    // Adjust horizontal position
    if (x + rect.width > innerWidth) {
      x = innerWidth - rect.width - 8;
    }
    if (x < 0) {
      x = 8;
    }

    // Adjust vertical position
    if (y + rect.height > innerHeight) {
      y = innerHeight - rect.height - 8;
    }
    if (y < 0) {
      y = 8;
    }

    setAdjustedPosition({ x, y });
  }, [position]);

  // Close on click outside
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClickOutside, handleKeyDown]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 py-1 min-w-[160px] animate-dropdown-in"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return (
            <div
              key={`separator-${index}`}
              className="border-t border-zinc-700 my-1"
            />
          );
        }

        return (
          <button
            key={`${item.label}-${index}`}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`
              w-full flex items-center gap-2 px-3 py-2 text-sm
              transition-colors duration-150
              hover:bg-zinc-700
              ${item.danger ? 'text-red-400' : 'text-zinc-200'}
            `}
          >
            {item.icon && <span className="w-5 h-5 shrink-0 flex items-center justify-center">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
