'use client';

import { useEffect, useState } from 'react';
import { useTacticsStore } from '@/store/tacticsStore';
import { useLanguage } from './I18nProvider';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export function ZoomControls() {
  const [mounted, setMounted] = useState(false);
  const { zoom, setZoom } = useTacticsStore();
  const { t } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleZoomIn = () => setZoom(Math.min(5, zoom * 1.2));
  const handleZoomOut = () => setZoom(Math.max(0.5, zoom / 1.2));
  const handleReset = () => setZoom(1);

  if (!mounted) {
    return (
      <div className="flex flex-col glass border border-zinc-800 rounded-lg overflow-hidden">
        <button className="p-2 text-zinc-600"><ZoomIn className="w-5 h-5" /></button>
        <div className="px-2 py-1 text-center text-xs font-medium text-zinc-600 border-y border-zinc-800">100%</div>
        <button className="p-2 text-zinc-600"><ZoomOut className="w-5 h-5" /></button>
        <button className="p-2 text-zinc-600"><RotateCcw className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <div className="flex flex-col glass border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={handleZoomIn}
        className="p-2 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
        title={t('zoom.in')}
      >
        <ZoomIn className="w-5 h-5" />
      </button>
      <div className="px-2 py-1 text-center text-xs font-medium text-zinc-500 border-y border-zinc-800">
        {Math.round(zoom * 100)}%
      </div>
      <button
        onClick={handleZoomOut}
        className="p-2 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
        title={t('zoom.out')}
      >
        <ZoomOut className="w-5 h-5" />
      </button>
      <button
        onClick={handleReset}
        className="p-2 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
        title={t('zoom.reset')}
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
}
