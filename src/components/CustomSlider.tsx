'use client';

/**
 * @agent Frontend Dev
 * @last-modified 2026-07-02
 * @description 统一滑块组件，基于 Radix UI Slider，支持显示数值标签
 * @dependencies @radix-ui/react-slider
 */

import * as Slider from '@radix-ui/react-slider';
import { useMemo } from 'react';

interface CustomSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  showValue?: boolean;
  valueSuffix?: string;
}

export function CustomSlider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className = '',
  showValue = false,
  valueSuffix = '',
}: CustomSliderProps) {
  const percentage = useMemo(
    () => ((value - min) / (max - min)) * 100,
    [value, min, max]
  );

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Slider.Root
        className="relative flex items-center select-none w-full touch-none h-5"
        value={[value]}
        onValueChange={([v]) => onValueChange(v)}
        min={min}
        max={max}
        step={step}
      >
        {/* Track background */}
        <Slider.Track className="relative grow h-[6px] rounded-full bg-zinc-800">
          {/* Filled range */}
          <Slider.Range
            className="absolute h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400"
            style={{ left: '0%', right: `${100 - percentage}%` }}
          />
        </Slider.Track>

        {/* Thumb */}
        <Slider.Thumb
          className="
            block w-[18px] h-[18px] rounded-full
            bg-purple-500 border-2 border-zinc-950
            shadow-[0_0_8px_rgba(139,92,246,0.3)]
            hover:scale-[1.15]
            hover:shadow-[0_0_16px_rgba(139,92,246,0.5)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
            transition-transform transition-shadow duration-150
            cursor-pointer
          "
        />
      </Slider.Root>

      {/* Value label */}
      {showValue && (
        <span
          className="
            shrink-0
            bg-zinc-800/60 px-2 py-0.5 rounded-md
            border border-zinc-700/50
            text-sm text-zinc-300 font-mono
            whitespace-nowrap
          "
        >
          {value}
          {valueSuffix}
        </span>
      )}
    </div>
  );
}
