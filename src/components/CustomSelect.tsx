'use client';

/**
 * @agent Frontend Dev
 * @last-modified 2026-07-02
 * @description 统一下拉选择器组件，基于 Radix UI Select
 * @dependencies @radix-ui/react-select, lucide-react
 */

import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

interface CustomSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export function CustomSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className = '',
}: CustomSelectProps) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger
        className={`
          inline-flex items-center justify-between gap-2
          bg-zinc-800 border border-zinc-700 rounded-lg
          px-3 py-1.5 text-sm text-zinc-300
          hover:bg-zinc-700 hover:border-zinc-600
          transition-all
          outline-none
          data-[state=open]:bg-zinc-700
          data-[state=open]:border-zinc-600
          ${className}
        `}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon asChild>
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className="animate-dropdown-in overflow-hidden bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-50"
          position="popper"
          sideOffset={4}
          align="start"
        >
          <Select.Viewport className="max-h-[200px] overflow-y-auto p-1">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="
                  relative flex items-center justify-between
                  px-3 py-2 rounded-md text-sm text-zinc-300
                  cursor-pointer outline-none
                  data-[highlighted]:bg-zinc-700/50
                  data-[disabled]:text-zinc-600 data-[disabled]:pointer-events-none
                  transition-colors
                "
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check className="w-4 h-4 text-purple-400" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
