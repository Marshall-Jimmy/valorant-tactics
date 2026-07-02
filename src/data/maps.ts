import { MapData, MapValue } from '@/types';

export const mapsData: MapData[] = [
  { id: 'ascent', name: '亚海悬城', name_en: 'Ascent', scale: 1 },
  { id: 'breeze', name: '微风岛屿', name_en: 'Breeze', scale: 1.02 },
  { id: 'lotus', name: '莲华古城', name_en: 'Lotus', scale: 1.25 },
  { id: 'icebox', name: '森寒冬港', name_en: 'Icebox', scale: 1.05 },
  { id: 'sunset', name: '日落之城', name_en: 'Sunset', scale: 1.048 },
  { id: 'split', name: '霓虹町', name_en: 'Split', scale: 1.18 },
  { id: 'haven', name: '隐世修所', name_en: 'Haven', scale: 1.09 },
  { id: 'fracture', name: '裂变峡谷', name_en: 'Fracture', scale: 1 },
  { id: 'abyss', name: '幽邃地窟', name_en: 'Abyss', scale: 1.167 },
  { id: 'pearl', name: '深海明珠', name_en: 'Pearl', scale: 1.185 },
  { id: 'bind', name: '源工重镇', name_en: 'Bind', scale: 0.835 },
  { id: 'corrode', name: '盐海矿镇', name_en: 'Corrode', scale: 0.985 },
  { id: 'summit', name: '天枢云阙', name_en: 'Summit', scale: 1.087 },
];

export const availableMaps: MapValue[] = ['bind', 'haven', 'pearl', 'corrode', 'split', 'breeze', 'abyss', 'summit'];
export const outOfPlayMaps: MapValue[] = ['sunset', 'ascent', 'lotus', 'icebox', 'fracture'];

export const getMapById = (id: MapValue): MapData | undefined => {
  return mapsData.find(map => map.id === id);
};

export const getMapName = (id: MapValue): string => {
  const map = getMapById(id);
  return map?.name || id;
};

export const getMapScale = (id: MapValue): number => {
  const map = getMapById(id);
  return map?.scale || 1;
};
