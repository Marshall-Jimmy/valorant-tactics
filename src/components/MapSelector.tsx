'use client';

import { useState, useEffect } from 'react';
import { useTacticsStore } from '@/store/tacticsStore';
import { mapsData, availableMaps, outOfPlayMaps } from '@/data/maps';
import { useLanguage } from './I18nProvider';
import { ChevronDown, MapPin } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Image from 'next/image';
import { handleImageFallback } from '@/utils/image';

export function MapSelector() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { currentMap, setCurrentMap } = useTacticsStore();
  const { t, currentLanguage } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentMapData = mapsData.find(m => m.id === currentMap);
  
  // 根据当前语言获取地图名称
  const getMapName = (map: typeof mapsData[0] | undefined) => {
    if (!map) return '';
    return currentLanguage === 'en' ? map.name_en : map.name;
  };

  if (!mounted) {
    return (
      <button className="btn btn-secondary">
        <MapPin className="w-4 h-4" />
        <span className="hidden sm:inline">{t('map.select')}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
    );
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button className="btn btn-secondary">
          <MapPin className="w-4 h-4" />
          <span className="hidden sm:inline">{getMapName(currentMapData) || currentMap}</span>
          <span className="sm:hidden">{getMapName(currentMapData)?.slice(0, 2) || currentMap.slice(0, 2)}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[200px] bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl p-1 z-50 animate-dropdown-in"
          sideOffset={4}
        >
          <div className="px-2 py-1.5 text-xs font-medium text-zinc-500 uppercase">
            {t('map.select')}
          </div>
          {availableMaps.map((mapId) => {
            const map = mapsData.find(m => m.id === mapId);
            return (
              <DropdownMenu.Item
                key={mapId}
                onClick={() => {
                  setCurrentMap(mapId);
                  setOpen(false);
                }}
                className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer outline-none transition-colors ${
                  currentMap === mapId
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'hover:bg-zinc-800 text-zinc-300'
                }`}
              >
                <div className="relative w-6 h-6 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                  <Image
                    src={`/maps/icons/${mapId}.png`}
                    alt={getMapName(map) || mapId}
                    fill
                    className="object-cover"
                    sizes="24px"
                    unoptimized
                    onError={handleImageFallback as any}
                  />
                </div>
                {getMapName(map) || mapId}
              </DropdownMenu.Item>
            );
          })}

          <div className="px-2 py-1.5 text-xs font-medium text-zinc-500 uppercase mt-2 border-t border-zinc-800">
            {t('map.select')}
          </div>
          {outOfPlayMaps.map((mapId) => {
            const map = mapsData.find(m => m.id === mapId);
            return (
              <DropdownMenu.Item
                key={mapId}
                onClick={() => {
                  setCurrentMap(mapId);
                  setOpen(false);
                }}
                className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer outline-none transition-colors ${
                  currentMap === mapId
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'hover:bg-zinc-800 text-zinc-500'
                }`}
              >
                <div className="relative w-6 h-6 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                  <Image
                    src={`/maps/icons/${mapId}.png`}
                    alt={getMapName(map) || mapId}
                    fill
                    className="object-cover"
                    sizes="24px"
                    unoptimized
                    onError={handleImageFallback as any}
                  />
                </div>
                {getMapName(map) || mapId}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
