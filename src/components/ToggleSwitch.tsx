'use client';

/**
 * @agent Frontend Dev
 * @last-modified 2026-07-02
 * @description 通用开关切换组件，从 SettingsPanel.tsx 提取
 */

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
        checked ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-zinc-700'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  );
}
