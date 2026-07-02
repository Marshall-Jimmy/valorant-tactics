'use client';

import { useEffect, useState } from 'react';
import { useTacticsStore } from '@/store/tacticsStore';
import { useLanguage } from './I18nProvider';
import { Eye, EyeOff, Shield, MapPin, Sparkles, LayoutGrid } from 'lucide-react';

export function MapLayerToggles() {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();
  const {
    showSpawnBarrier,
    setShowSpawnBarrier,
    showRegionNames,
    setShowRegionNames,
    showUltOrbs,
    setShowUltOrbs,
    showGrid,
    setShowGrid,
  } = useTacticsStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1">
        <button className="p-1.5 rounded text-zinc-600"><Eye className="w-4 h-4" /></button>
        <button className="p-1.5 rounded text-zinc-600"><MapPin className="w-4 h-4" /></button>
        <button className="p-1.5 rounded text-zinc-600"><Sparkles className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setShowSpawnBarrier(!showSpawnBarrier)}
        title={t('map.layers.spawnBarrier')}
        className={`p-1.5 rounded transition-colors ${
          showSpawnBarrier
            ? 'bg-blue-500/20 text-blue-400'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        {showSpawnBarrier ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
      <button
        onClick={() => setShowRegionNames(!showRegionNames)}
        title={t('map.layers.regionNames')}
        className={`p-1.5 rounded transition-colors ${
          showRegionNames
            ? 'bg-blue-500/20 text-blue-400'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <MapPin className="w-4 h-4" />
      </button>
      <button
        onClick={() => setShowUltOrbs(!showUltOrbs)}
        title={t('map.layers.ultimateOrb')}
        className={`p-1.5 rounded transition-colors ${
          showUltOrbs
            ? 'bg-blue-500/20 text-blue-400'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <Sparkles className="w-4 h-4" />
      </button>
      <button
        onClick={() => setShowGrid(!showGrid)}
        title={t('map.layers.grid')}
        className={`p-1.5 rounded transition-colors ${
          showGrid ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
    </div>
  );
}
