'use client';

import { useTacticsStore } from '@/store/tacticsStore';
import { useLanguage } from './I18nProvider';
import { MousePointer, Pencil, Users, Zap, Type } from 'lucide-react';

const tools = [
  { id: 'select', icon: MousePointer },
  { id: 'agent', icon: Users },
  { id: 'ability', icon: Zap },
  { id: 'draw', icon: Pencil },
  { id: 'text', icon: Type },
] as const;

export function Toolbar() {
  const { currentTool, setCurrentTool } = useTacticsStore();
  const { t } = useLanguage();

  const getToolLabel = (id: string) => {
    switch (id) {
      case 'select': return t('toolbar.select');
      case 'agent': return t('toolbar.agent');
      case 'ability': return t('toolbar.ability');
      case 'draw': return t('toolbar.draw');
      case 'text': return 'Text';
      default: return id;
    }
  };

  return (
    <div className="flex flex-col bg-zinc-900 border-r border-zinc-800 p-2 gap-1">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={() => setCurrentTool(tool.id)}
            className={`p-2 rounded-lg transition-colors ${
              currentTool === tool.id
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
            title={getToolLabel(tool.id)}
          >
            <Icon className="w-5 h-5" />
          </button>
        );
      })}
    </div>
  );
}
