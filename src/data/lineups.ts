// Lineup data types and utilities for the lineup quick-reference mode

export interface LineupDetailImage {
  url: string;
  local: string;
  label: string;
}

export interface LineupVideo {
  bilibili: string;
  timestamp: string;
  cut_video: string;
}

export interface Lineup {
  id: number;
  title: string;
  side: 'attack' | 'defense' | 'unknown';
  side_cn: string;
  abilityKey?: string; // Optional: for custom lineups
  coordinates: {
    start: { raw: number[]; normalized: number[] };
    end: { raw: number[]; normalized: number[] };
  };
  coverage_area: number[][];
  media: {
    stand_image?: { url: string; local: string };
    detail_images: LineupDetailImage[];
    video?: LineupVideo;
    video_url?: string; // For custom lineups
  };
  created_at?: string;
  source_url?: string;
  video_url?: string; // For custom lineups
}

// Extended lineup with ability key for color coding on map
export type LineupWithAbility = Lineup & { abilityKey: string };

export interface LineupAbility {
  key: string;
  name_cn: string;
  name_en: string;
  type: string;
  lineups: Lineup[];
}

export interface LineupMap {
  name_cn: string;
  name_en: string;
  lineup_count: number;
  abilities: Record<string, LineupAbility>;
}

export interface AgentLineupsData {
  metadata: {
    agent: string;
    agent_cn: string;
    source: string;
    coordinate_system: { type: string; width: number; height: number };
    last_updated: string;
    total_lineups: number;
    maps_count: number;
  };
  maps: Record<string, LineupMap>;
}

// Coordinate conversion: lineups normalized [0,1] -> project world coordinates
// The map image is centered in the world space with padding on both sides
export const NORMALIZED_HEIGHT = 1000;
export const WORLD_ASPECT_RATIO = 16 / 9;
export const WORLD_WIDTH = NORMALIZED_HEIGHT * WORLD_ASPECT_RATIO; // 1777.78

// Map SVG original dimensions (416x474) and display dimensions
export const MAP_SVG_WIDTH = 416;
export const MAP_SVG_HEIGHT = 474;
export const MAP_DISPLAY_WIDTH = 1240;
export const MAP_DISPLAY_HEIGHT = 1000;
export const MAP_PADDING_X = (WORLD_WIDTH - MAP_DISPLAY_WIDTH) / 2; // ~268.89

export function normalizedToWorld(nx: number, ny: number, flip = false): { x: number; y: number } {
  // Affine transform derived from 4 reference points on Icebox
  // worldX = -24.8055 * nx + 917.7683 * ny + 441.5591
  // worldY = -940.7984 * nx + -6.6050 * ny + 969.9544
  let x = -24.8055 * nx + 917.7683 * ny + 441.5591;
  let y = -940.7984 * nx + -6.6050 * ny + 969.9544;

  if (flip) {
    // Match CSS scale(-1, -1) which is 180-degree rotation
    x = WORLD_WIDTH - x;
    y = NORMALIZED_HEIGHT - y;
  }
  return { x, y };
}

// Inverse transform: world coordinates -> normalized [0,1]
// Solves the inverse of the affine transform above
export function worldToNormalized(wx: number, wy: number, flip = false): { nx: number; ny: number } {
  // If flipped, first un-flip
  if (flip) {
    wx = WORLD_WIDTH - wx;
    wy = NORMALIZED_HEIGHT - wy;
  }

  // Matrix coefficients from normalizedToWorld:
  // worldX = a*nx + b*ny + c
  // worldY = d*nx + e*ny + f
  const a = -24.8055, b = 917.7683, c = 441.5591;
  const d = -940.7984, e = -6.6050, f = 969.9544;

  // Determinant
  const det = a * e - b * d; // ≈ 863081.3

  // Inverse: [nx, ny] = inverse(M) * ([wx, wy] - [c, f])
  const nx = (e * (wx - c) - b * (wy - f)) / det;
  const ny = (-d * (wx - c) + a * (wy - f)) / det;

  return { nx, ny };
}

// Ability color mapping - 与 Valorant 游戏内颜色一致
export const ABILITY_COLORS: Record<string, { primary: string; light: string; bg: string }> = {
  C: { primary: '#10b981', light: 'rgba(16,185,129,0.5)', bg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
  Q: { primary: '#3b82f6', light: 'rgba(59,130,246,0.5)', bg: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' },
  E: { primary: '#a855f7', light: 'rgba(168,85,247,0.5)', bg: 'bg-purple-500/15 text-purple-400 border border-purple-500/30' },
  X: { primary: '#f59e0b', light: 'rgba(245,158,11,0.5)', bg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
};

// Agent registry entry type
export interface AgentRegistryEntry {
  file: string;
  name_cn: string;
  name_en: string;
  iconPath?: string;
  enabled?: boolean;
}

// Agent registry and loading functions
// 支持多个数据源：原有数据 + isoox.cn 爬取的数据
export const AGENT_LINEUP_REGISTRY: Record<string, AgentRegistryEntry> = {
  // 原有数据源
  sova: { file: '/lineups/sova.json', name_cn: '猎枭', name_en: 'Sova', enabled: true },
  fade: { file: '/lineups/fade.json', name_cn: '黑梦', name_en: 'Fade', enabled: true },
  // isoox.cn 数据源 (12个特工 - 已修正：删除重复的锁男，修正夜露英文名)
  isoox_sova: { file: '/lineups/data2/isoox_structured_sova.json', name_cn: '猎枭(isoox)', name_en: 'Sova (isoox)', enabled: true },
  isoox_killjoy: { file: '/lineups/data2/isoox_structured_killjoy.json', name_cn: '奇乐', name_en: 'Killjoy', enabled: true },
  isoox_viper: { file: '/lineups/data2/isoox_structured_viper.json', name_cn: '蝰蛇', name_en: 'Viper', enabled: true },
  isoox_brimstone: { file: '/lineups/data2/isoox_structured_brimstone.json', name_cn: '炼狱', name_en: 'Brimstone', enabled: true },
  // 注意：isoox_fade.json 实际数据是夜露(Yoru)，但文件名错误地写成 fade
  isoox_fade: { file: '/lineups/data2/isoox_structured_fade.json', name_cn: '夜露', name_en: 'Yoru', enabled: true },
  isoox_sage: { file: '/lineups/data2/isoox_structured_sage.json', name_cn: '贤者', name_en: 'Sage', enabled: true },
  // 注意：isoox_deadlock.json 实际数据是黑梦(Fade)，但文件名错误地写成 deadlock
  isoox_deadlock: { file: '/lineups/data2/isoox_structured_deadlock.json', name_cn: '黑梦', name_en: 'Fade', enabled: true },
  isoox_kayo: { file: '/lineups/data2/isoox_structured_kayo.json', name_cn: 'K/O', name_en: 'KAY/O', enabled: true },
  isoox_gekko: { file: '/lineups/data2/isoox_structured_gekko.json', name_cn: '盖可', name_en: 'Gekko', enabled: true },
  // 注意：isoox_lock.json 才是真正的钢锁(Deadlock)
  isoox_lock: { file: '/lineups/data2/isoox_structured_lock.json', name_cn: '钢锁', name_en: 'Deadlock', enabled: true },
  isoox_phoenix: { file: '/lineups/data2/isoox_structured_phoenix.json', name_cn: '不死鸟', name_en: 'Phoenix', enabled: true },
  isoox_neon: { file: '/lineups/data2/isoox_structured_neon.json', name_cn: '霓虹', name_en: 'Neon', enabled: true },
  isoox_vyse: { file: '/lineups/data2/isoox_structured_vyse.json', name_cn: '维斯', name_en: 'Vyse', enabled: true },
};

export function getAvailableAgents(): { id: string; name_cn: string; name_en: string; iconPath?: string }[] {
  return Object.entries(AGENT_LINEUP_REGISTRY)
    .filter(([, info]) => info.enabled !== false)
    .map(([id, info]) => ({
      id,
      name_cn: info.name_cn,
      name_en: info.name_en,
      iconPath: info.iconPath,
    }));
}

// In-memory cache for lineup data (LRU: max 20 entries)
const MAX_CACHE_SIZE = 20;
const lineupCache = new Map<string, AgentLineupsData>();

// Fix misclassified lineups: data source marks many Recon Bolt (E) lineups as Hunter's Fury (X)
// Heuristic: if a lineup under X has title containing 探测箭/侦察箭/侦查箭, it's actually E
function fixAbilityMisclassification(data: AgentLineupsData): AgentLineupsData {
  const reconKeywords = ['探测箭', '侦察箭', '侦查箭'];
  const fixedMaps: Record<string, LineupMap> = {};

  for (const [mapId, mapData] of Object.entries(data.maps)) {
    const fixedAbilities: Record<string, LineupAbility> = {};
    const xLineupsToMove: { lineup: Lineup; key: string }[] = [];

    for (const [abilityKey, ability] of Object.entries(mapData.abilities)) {
      if (ability.key === 'X') {
        const realX = ability.lineups.filter(
          (l) => !reconKeywords.some((kw) => l.title.includes(kw))
        );
        const toMove = ability.lineups.filter((l) =>
          reconKeywords.some((kw) => l.title.includes(kw))
        );
        xLineupsToMove.push(...toMove.map((l) => ({ lineup: l, key: abilityKey })));
        fixedAbilities[abilityKey] = { ...ability, lineups: realX };
      } else {
        fixedAbilities[abilityKey] = ability;
      }
    }

    // Move misclassified lineups to E ability
    if (xLineupsToMove.length > 0) {
      const existingE = fixedAbilities['E'] || {
        key: 'E',
        name_cn: '寻敌箭',
        name_en: 'Recon Bolt',
        type: '信息',
        lineups: [],
      };
      existingE.lineups = [...existingE.lineups, ...xLineupsToMove.map((l) => l.lineup)];
      fixedAbilities['E'] = existingE;
    }

    // Remove empty abilities and update lineup count
    const nonEmptyAbilities: Record<string, LineupAbility> = {};
    let totalCount = 0;
    for (const [k, a] of Object.entries(fixedAbilities)) {
      if (a.lineups.length > 0) {
        nonEmptyAbilities[k] = a;
        totalCount += a.lineups.length;
      }
    }

    fixedMaps[mapId] = {
      ...mapData,
      lineup_count: totalCount,
      abilities: nonEmptyAbilities,
    };
  }

  return { ...data, maps: fixedMaps };
}

// isoox.cn 数据中技能名称 -> 正确按键 (C/Q/E/X) 的映射
// 注意：以下映射基于实际数据文件内容，而非文件名
const ISOOX_ABILITY_KEY_MAP: Record<string, Record<string, { key: string; name_en: string; type: string }>> = {
  killjoy: {
    '纳米蜂群': { key: 'C', name_en: 'Nanoswarm', type: '技能' },
    '自动哨兵': { key: 'Q', name_en: 'Alarmbot', type: '技能' },
    '哨戒炮台': { key: 'E', name_en: 'Turret', type: '技能' },
    '全面封锁': { key: 'X', name_en: 'Lockdown', type: '大招' },
  },
  viper: {
    '腐蚀池': { key: 'C', name_en: 'Toxic Screen', type: '技能' },
    '毒幕': { key: 'Q', name_en: 'Poison Cloud', type: '技能' },
    '破云': { key: 'Q', name_en: 'Poison Cloud', type: '技能' },
    '蛇吻': { key: 'E', name_en: 'Viper\'s Pit', type: '技能' },
    '蝰蛇巢穴': { key: 'X', name_en: 'Viper\'s Pit', type: '大招' },
  },
  brimstone: {
    '振奋信标': { key: 'C', name_en: 'Stim Beacon', type: '技能' },
    '燃烧榴弹': { key: 'Q', name_en: 'Incendiary', type: '技能' },
    '空投烟幕': { key: 'E', name_en: 'Sky Smoke', type: '技能' },
    '轨道轰炸': { key: 'X', name_en: 'Orbital Strike', type: '大招' },
  },
  // fade 文件实际数据是夜露(Yoru)
  fade: {
    '出其不意': { key: 'C', name_en: 'Fakeout', type: '技能' },
    '攻其不备': { key: 'Q', name_en: 'Blindside', type: '技能' },
    '不请自来': { key: 'E', name_en: 'Gatecrash', type: '技能' },
    '神鬼不觉': { key: 'X', name_en: 'Dimensional Drift', type: '大招' },
  },
  sage: {
    '玉城': { key: 'C', name_en: 'Barrier Orb', type: '技能' },
    '薄冰': { key: 'Q', name_en: 'Slow Orb', type: '技能' },
    '逢春': { key: 'E', name_en: 'Healing Orb', type: '技能' },
    '再起': { key: 'X', name_en: 'Resurrection', type: '大招' },
  },
  // deadlock 文件实际数据是黑梦(Fade)
  deadlock: {
    '幽爪': { key: 'C', name_en: 'Prowler', type: '技能' },
    '捕猎者': { key: 'C', name_en: 'Prowler', type: '技能' },
    '诡眼': { key: 'E', name_en: 'Haunt', type: '技能' },
    '魅影': { key: 'E', name_en: 'Haunt', type: '技能' },
    '攫取': { key: 'Q', name_en: 'Seize', type: '技能' },
    '夜幕降临': { key: 'X', name_en: 'Nightfall', type: '大招' },
  },
  kayo: {
    '碎片溢出': { key: 'C', name_en: 'FRAG/MENT', type: '技能' },
    '闪光': { key: 'Q', name_en: 'Flash/DRIVE', type: '技能' },
    '过载': { key: 'Q', name_en: 'Flash/DRIVE', type: '技能' },
    '零点': { key: 'E', name_en: 'ZERO/POINT', type: '技能' },
    '指令': { key: 'E', name_en: 'ZERO/POINT', type: '技能' },
    '无效': { key: 'X', name_en: 'NULL/CMD', type: '大招' },
    '命令': { key: 'X', name_en: 'NULL/CMD', type: '大招' },
  },
  gekko: {
    '晕眩光波': { key: 'Q', name_en: 'Wingman', type: '技能' },
    '嗨爆全场': { key: 'C', name_en: 'Mosh Pit', type: '技能' },
    '顽皮搭档': { key: 'E', name_en: 'Dizzy', type: '技能' },
    '无敌超鲨': { key: 'X', name_en: 'Thrash', type: '大招' },
  },
  // lock 文件实际数据是钢锁(Deadlock)
  lock: {
    '重力捕网': { key: 'C', name_en: 'GravNet', type: '技能' },
    '声波传感器': { key: 'Q', name_en: 'Sonic Sensor', type: '技能' },
    '阻隔墙': { key: 'E', name_en: 'Barrier Mesh', type: '技能' },
    '湮灭': { key: 'X', name_en: 'Annihilation', type: '大招' },
  },
  phoenix: {
    '烈焰': { key: 'C', name_en: 'Blaze', type: '技能' },
    '弧球': { key: 'Q', name_en: 'Curveball', type: '技能' },
    '炙手': { key: 'E', name_en: 'Hot Hands', type: '技能' },
    '火热手感': { key: 'Q', name_en: 'Curveball', type: '技能' },
    '重生': { key: 'X', name_en: 'Run It Back', type: '大招' },
  },
  neon: {
    '高速通道': { key: 'C', name_en: 'Relay Bolt', type: '技能' },
    '闪电弹球': { key: 'Q', name_en: 'Electric Wall', type: '技能' },
    '充能疾驰': { key: 'E', name_en: 'High Gear', type: '技能' },
    '过载': { key: 'X', name_en: 'Overdrive', type: '大招' },
  },
  vyse: {
    '光棱闪爆': { key: 'C', name_en: 'Arc Rose', type: '技能' },
    '剃刀藤蔓': { key: 'C', name_en: 'Arc Rose', type: '技能' },
    '光速飞跃': { key: 'Q', name_en: 'Raze', type: '技能' },
    '溯流回光': { key: 'E', name_en: 'Shear', type: '技能' },
    '时光修罗场': { key: 'X', name_en: 'Ruin', type: '大招' },
  },
  sova: {
    '枭型无人机': { key: 'C', name_en: 'Owl Drone', type: '技能' },
    '雷击箭': { key: 'Q', name_en: 'Shock Bolt', type: '技能' },
    '寻敌箭': { key: 'E', name_en: 'Recon Bolt', type: '技能' },
    '狂猎之怒': { key: 'X', name_en: "Hunter's Fury", type: '大招' },
  },
};

// 修正 isoox 数据中的技能 key 和名称
function fixIsooxAbilityKeys(data: AgentLineupsData, agentId: string): AgentLineupsData {
  // 提取原始特工 ID（去掉 isoox_ 前缀）
  const realAgentId = agentId.replace(/^isoox_/, '');
  const agentMap = ISOOX_ABILITY_KEY_MAP[realAgentId];
  if (!agentMap) return data;

  const fixedMaps: Record<string, LineupMap> = {};
  for (const [mapId, mapData] of Object.entries(data.maps)) {
    const fixedAbilities: Record<string, LineupAbility> = {};
    for (const [abilityId, ability] of Object.entries(mapData.abilities)) {
      // 根据 name_cn 查找正确的按键映射
      const mapping = agentMap[ability.name_cn];
      if (mapping) {
        fixedAbilities[abilityId] = {
          ...ability,
          key: mapping.key,
          name_en: mapping.name_en,
          type: mapping.type,
        };
      } else {
        fixedAbilities[abilityId] = ability;
      }
    }

    // 重新按 key 分组，合并相同 key 的 abilities
    const mergedAbilities: Record<string, LineupAbility> = {};
    for (const ability of Object.values(fixedAbilities)) {
      if (mergedAbilities[ability.key]) {
        mergedAbilities[ability.key].lineups = [
          ...mergedAbilities[ability.key].lineups,
          ...ability.lineups,
        ];
      } else {
        mergedAbilities[ability.key] = { ...ability };
      }
    }

    let totalCount = 0;
    for (const a of Object.values(mergedAbilities)) {
      totalCount += a.lineups.length;
    }

    fixedMaps[mapId] = {
      ...mapData,
      lineup_count: totalCount,
      abilities: mergedAbilities,
    };
  }

  return { ...data, maps: fixedMaps };
}

export async function loadAgentLineups(agentId: string, signal?: AbortSignal): Promise<AgentLineupsData | null> {
  if (lineupCache.has(agentId)) return lineupCache.get(agentId)!;
  const entry = AGENT_LINEUP_REGISTRY[agentId];
  if (!entry) return null;
  try {
    const res = await fetch(entry.file, { signal });
    if (!res.ok) return null;
    const data: AgentLineupsData = await res.json();
    let fixed = fixAbilityMisclassification(data);
    // 对 isoox 数据源，额外修正技能按键映射
    if (agentId.startsWith('isoox_')) {
      fixed = fixIsooxAbilityKeys(fixed, agentId);
    }
    lineupCache.set(agentId, fixed);
    // LRU 淘汰：超过上限时删除最早的条目
    if (lineupCache.size > MAX_CACHE_SIZE) {
      const firstKey = lineupCache.keys().next().value;
      if (firstKey) lineupCache.delete(firstKey);
    }
    return fixed;
  } catch (e) {
    // Ignore abort errors
    if (e instanceof Error && e.name === 'AbortError') return null;
    return null;
  }
}

export function getLineupsForMap(data: AgentLineupsData, mapId: string): LineupMap | null {
  return data.maps[mapId] || null;
}

// Get all lineups for a map with ability key attached
export function getLineupsWithAbilityForMap(data: AgentLineupsData, mapId: string): LineupWithAbility[] {
  const mapData = data.maps[mapId];
  if (!mapData) return [];
  return Object.entries(mapData.abilities).flatMap(([abilityKey, ability]) =>
    ability.lineups.map((l) => ({ ...l, abilityKey }))
  );
}
