'use client';

import { Swords, Target } from 'lucide-react';
import { useTacticsStore } from '@/store/tacticsStore';

export function ModeToggle() {
  const appMode = useTacticsStore((s) => s.appMode);
  const setAppMode = useTacticsStore((s) => s.setAppMode);

  const isLineup = appMode === 'lineup';

  return (
    <button
      onClick={() => setAppMode(isLineup ? 'strategy' : 'lineup')}
      className={`mode-toggle ${isLineup ? 'mode-toggle--lineup' : 'mode-toggle--strategy'}`}
      title={isLineup ? '切换到战略模式' : '切换到点位模式'}
    >
      {/* Background scenes */}
      <div className="mode-toggle__scene mode-toggle__scene--strategy">
        <div className="mode-toggle__grid" />
      </div>
      <div className="mode-toggle__scene mode-toggle__scene--lineup">
        <div className="mode-toggle__crosshair" />
      </div>

      {/* Left label: strategy */}
      <span className="mode-toggle__label">
        <Swords
          className="mode-toggle__label-icon"
          style={{ opacity: isLineup ? 0 : 0, width: 0 }}
        />
        <span
          className="mode-toggle__label-text"
          style={{ opacity: isLineup ? 1 : 0 }}
        >
          战略模式
        </span>
      </span>

      {/* Right label: lineup */}
      <span className="mode-toggle__label">
        <Target
          className="mode-toggle__label-icon"
          style={{ opacity: isLineup ? 0 : 0, width: 0 }}
        />
        <span
          className="mode-toggle__label-text"
          style={{ opacity: isLineup ? 0 : 1 }}
        >
          点位模式
        </span>
      </span>

      {/* Sliding indicator with icon */}
      <div className={`mode-toggle__slider ${isLineup ? 'mode-toggle__slider--right' : ''}`}>
        {isLineup ? (
          <Target className="mode-toggle__slider-icon" />
        ) : (
          <Swords className="mode-toggle__slider-icon" />
        )}
      </div>
    </button>
  );
}
