'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTacticsStore, type TempLineupData } from '@/store/tacticsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useLanguage } from './I18nProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { VideoPlayer } from './VideoPlayer';
import { handleImageFallback } from '@/utils/image';
import { downloadJson, importJsonFile } from '@/utils/fileIO';
import { CustomSelect } from './CustomSelect';

import {
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  X,
  ImageIcon,
  Plus,
  Download,
  Trash2,
  Edit2,
  Star,
  ZoomIn,
  MapPin,
  UploadCloud,
} from 'lucide-react';
import {
  loadAgentLineups,
  getAvailableAgents,
  getLineupsForMap,
  ABILITY_COLORS,
  AgentLineupsData,
  Lineup,
  LineupAbility,
} from '@/data/lineups';
import { useToast } from '@/components/Toast';
import { validateImageFile, validateBase64Image, LIMITS } from '@/schemas';

interface LineupPanelProps {
  onClose?: () => void;
}

export function LineupPanel({ onClose }: LineupPanelProps) {
  const { addToast } = useToast();
  const { 
    currentMap, lineupAgentId, setLineupAgentId, selectedLineupId, setSelectedLineupId,
    // Editor state
    lineupEditorMode, tempLineupData, customLineups,
    startNewLineup, startPlaceCoordinates, updateTempLineupData, saveTempLineup, cancelLineupEdit,
    setLineupEditorMode, editingLineupId,
    deleteCustomLineup, exportCustomLineups,
    exportCoordinateOverrides, importCoordinateOverrides,
    favoriteLineups, toggleFavorite, isFavorite,
    lineupCoordinateOverrides, saveLineupCoordinateOverride,
  } = useTacticsStore();
  const { t } = useLanguage();
  const sidebarPosition = useSettingsStore((s) => s.sidebarPosition);

  const [loadedData, setLoadedData] = useState<AgentLineupsData | null>(null);
  const [expandedAbilities, setExpandedAbilities] = useState<Set<string>>(new Set());
  const [sideFilter, setSideFilter] = useState<'all' | 'attack' | 'defense'>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

  const agents = getAvailableAgents();

  // Load lineup data when agent or map changes
  useEffect(() => {
    setIsLoading(true);
    setLoadedData(null);
    setSelectedLineupId(null);
    setExpandedAbilities(new Set());
    setDetailImageIndex(0);
    setImageErrors(new Set());
    loadAgentLineups(lineupAgentId).then((data) => {
      setIsLoading(false);
      if (data) {
        setLoadedData(data);
        // Auto-expand all abilities
        const mapData = data.maps[currentMap];
        if (mapData) {
          setExpandedAbilities(new Set(Object.keys(mapData.abilities)));
        }
      }
    });
  }, [lineupAgentId, currentMap, setSelectedLineupId]);

  // Get current map lineup data
  const mapLineupData = useMemo(() => {
    if (!loadedData) return null;
    return getLineupsForMap(loadedData, currentMap);
  }, [loadedData, currentMap]);

  // 获取技能图标文件夹名称 - isoox 数据需要特殊映射
  const getAbilityIconFolder = (agentId: string, abilityNameEn: string): string => {
    // 非 isoox 数据直接使用特工ID
    if (!agentId.startsWith('isoox_')) {
      return agentId;
    }
    
    // isoox 数据映射表：特工ID -> 图标文件夹
    const iconFolderMap: Record<string, string> = {
      isoox_sova: 'sova',
      isoox_killjoy: 'killjoy',
      isoox_viper: 'viper',
      isoox_brimstone: 'brimstone',
      isoox_fade: 'yoru',        // fade文件实际是夜露(Yoru)
      isoox_sage: 'sage',
      isoox_deadlock: 'fade',    // deadlock文件实际是黑梦(Fade)
      isoox_kayo: 'kayo',
      isoox_gekko: 'gekko',
      isoox_lock: 'deadlock',    // lock文件实际是钢锁(Deadlock)
      isoox_phoenix: 'phoenix',
      isoox_neon: 'neon',
      isoox_vyse: 'vyse',
    };
    
    return iconFolderMap[agentId] || agentId.replace(/^isoox_/, '');
  };

  // Find selected lineup object from data
  const selectedLineup = useMemo(() => {
    if (!selectedLineupId || !mapLineupData) return null;
    for (const ability of Object.values(mapLineupData.abilities)) {
      const found = ability.lineups.find((l) => l.id === selectedLineupId);
      if (found) return found;
    }
    return null;
  }, [selectedLineupId, mapLineupData]);

  // Filter lineups by side and search query
  const filteredAbilities = useMemo(() => {
    if (!mapLineupData) return [];
    const abilities = Object.values(mapLineupData.abilities) as LineupAbility[];

    // 根据标题关键词推断技能类型 (仅针对 Sova)
    // 优先级: Q > C > E (Q和C的关键词更具体，优先检查)
    const getSovaAbilityKeyFromTitle = (title: string): string => {
      const t = title.toLowerCase();
      
      // Q 雷击箭 (优先检查): 秒杀、电击、雷击、电箭、电、绊线、清、防拆包、抽奖、下包位、吃球、吸球、豆、点后箭
      if (t.includes('秒杀') || t.includes('电击') || t.includes('雷击') || t.includes('电箭') ||
          t.includes('电') || t.includes('绊线') || t.includes('清') || t.includes('防拆包') ||
          t.includes('抽奖') || t.includes('下包位') || t.includes('吃球') ||
          t.includes('吸球') || t.includes('豆') || t.includes('点后箭')) {
        return 'Q';
      }
      
      // C 枭型无人机: 飞机
      if (t.includes('飞机')) {
        return 'C';
      }
      
      // E 寻敌箭 (最后检查): 探测箭、侦查箭、侦察箭、探测、控、探、藏树箭、回防、包点箭、中路箭、支援、信息、寻敌
      if (t.includes('探测箭') || t.includes('侦查箭') || t.includes('侦察箭') ||
          t.includes('探测') || t.includes('控') || t.includes('探') ||
          t.includes('藏树箭') || t.includes('回防') || t.includes('包点箭') ||
          t.includes('中路箭') || t.includes('支援') || t.includes('信息') || t.includes('寻敌')) {
        return 'E';
      }
      
      // 其他未匹配的
      return 'other';
    };

    // 重新分类所有点位
    const allLineups = [
      ...abilities.flatMap(a => a.lineups.map(l => ({ ...l, originalKey: a.key }))),
      ...customLineups.map(l => ({ ...l, originalKey: l.abilityKey || 'C' })),
    ].map(l => {
      // 对 Sova 的所有点位（内置+自定义）都应用关键词规则
      let inferredKey: string;
      if (lineupAgentId === 'sova') {
        const keywordKey = getSovaAbilityKeyFromTitle(l.title);
        // 关键词匹配到了就用匹配结果，否则默认归为 E（探测箭）
        inferredKey = keywordKey !== 'other' ? keywordKey : 'E';
      } else {
        inferredKey = l.abilityKey || l.originalKey || 'other';
      }
      return { ...l, inferredKey };
    });

    // 按技能分类
    const lineupsByKey = new Map<string, typeof allLineups>();
    for (const lineup of allLineups) {
      const key = lineup.inferredKey;
      if (!lineupsByKey.has(key)) {
        lineupsByKey.set(key, []);
      }
      lineupsByKey.get(key)!.push(lineup);
    }

    // 构建结果
    const result: LineupAbility[] = [];
    
    // 从原始数据中查找技能信息
    const findAbilityInfo = (key: string): { name_cn: string; name_en: string; type: string } | null => {
      const ability = abilities.find(a => a.key === key);
      if (ability && ability.name_cn) {
        return {
          name_cn: ability.name_cn,
          name_en: ability.name_en || '',
          type: ability.type || '技能',
        };
      }
      return null;
    };
    
    // 兜底：根据特工 ID 返回默认技能名称
    const getDefaultAbilityNames = (agentId: string, key: string) => {
      const abilityMap: Record<string, Record<string, { name_cn: string; name_en: string; type: string }>> = {
        fade: {
          'C': { name_cn: '噩梦', name_en: 'Nightfall', type: '技能' },
          'Q': { name_cn: '猎犬', name_en: 'Prowler', type: '技能' },
          'E': { name_cn: '尖啸', name_en: 'Haunt', type: '技能' },
          'X': { name_cn: '狂潮', name_en: 'Hauntparty', type: '大招' },
        },
        sova: {
          'C': { name_cn: '枭型无人机', name_en: 'Owl Drone', type: '技能' },
          'Q': { name_cn: '雷击箭', name_en: 'Shock Bolt', type: '技能' },
          'E': { name_cn: '寻敌箭', name_en: 'Recon Bolt', type: '技能' },
          'X': { name_cn: '狂猎之怒', name_en: "Hunter's Fury", type: '大招' },
        },
      };
      
      const agentAbilities = abilityMap[agentId] || abilityMap['sova'];
      return agentAbilities[key] || { name_cn: `技能 ${key}`, name_en: 'Ability', type: '技能' };
    };

    for (const [key, lineups] of lineupsByKey) {
      let filtered = lineups;
      if (sideFilter !== 'all') {
        filtered = filtered.filter((l) => l.side === sideFilter);
      }
      if (debouncedSearchQuery.trim()) {
        const q = debouncedSearchQuery.trim().toLowerCase();
        filtered = filtered.filter((l) => l.title.toLowerCase().includes(q));
      }
      // 收藏筛选
      if (showFavoritesOnly) {
        filtered = filtered.filter((l) => favoriteLineups.includes(l.id));
      }
      if (filtered.length > 0) {
        // 优先从原始数据获取技能名称，否则使用默认值
        const abilityInfo = findAbilityInfo(key);
        const defaultInfo = getDefaultAbilityNames(lineupAgentId, key);
        result.push({
          key,
          name_cn: abilityInfo?.name_cn || defaultInfo.name_cn,
          name_en: abilityInfo?.name_en || defaultInfo.name_en,
          type: abilityInfo?.type || defaultInfo.type,
          lineups: filtered,
        });
      }
    }

    return result;
  }, [mapLineupData, sideFilter, debouncedSearchQuery, customLineups, showFavoritesOnly, favoriteLineups]);

  const toggleAbility = (key: string) => {
    setExpandedAbilities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectLineup = (lineup: Lineup) => {
    // 切换点位时，如果正在放置坐标则先取消
    if (lineupEditorMode !== 'idle' && lineupEditorMode !== 'editing') {
      cancelLineupEdit();
    }
    setSelectedLineupId(lineup.id);
    setDetailImageIndex(0);
    setImageErrors(new Set());
  };

  const handleDeselectLineup = () => {
    setSelectedLineupId(null);
    setDetailImageIndex(0);
    setImageErrors(new Set());
    setLightboxOpen(false);
  };

  const openLightbox = (index: number) => {
    setLightboxImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (!selectedLineup?.media?.detail_images) return;
    const total = selectedLineup.media.detail_images.length;
    if (direction === 'prev') {
      setLightboxImageIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
    } else {
      setLightboxImageIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
    }
  };

  const currentAgentInfo = agents.find((a) => a.id === lineupAgentId);

  const getAbilityColorClass = (key: string) => {
    return ABILITY_COLORS[key]?.bg || 'bg-blue-500/10 text-blue-400';
  };

  return (
    <div className={`w-72 sm:w-80 bg-zinc-900 ${sidebarPosition === 'right' ? 'border-l border-zinc-800' : 'border-r lg:border-r-0 lg:border-l border-zinc-800'} flex flex-col h-full`}>
      {/* Header with close button for mobile */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800 lg:hidden">
        <span className="font-bold text-white">{t('lineup.title')}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Agent Selector */}
      <div className="p-3 border-b border-zinc-800">
        {agents.length === 1 ? (
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm font-medium text-white">{agents[0].name_cn}</span>
            <span className="text-xs text-zinc-500">{agents[0].name_en}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CustomSelect
              value={lineupAgentId}
              onValueChange={setLineupAgentId}
              options={agents.map((agent) => ({
                value: agent.id,
                label: `${agent.name_cn} (${agent.name_en})`,
              }))}
              className="flex-1"
            />
          </div>
        )}
      </div>

      {/* Editor Toolbar */}
      <div className="flex gap-1 p-3 border-b border-zinc-800">
        <button
          onClick={startNewLineup}
          disabled={lineupEditorMode !== 'idle'}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          添加点位
        </button>
        {customLineups.length > 0 && (
          <button
            onClick={() => {
              downloadJson(exportCustomLineups(), `custom-lineups-${currentMap}.json`);
            }}
            className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors"
            title="导出自定义点位"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
        {Object.keys(lineupCoordinateOverrides).length > 0 && (
          <button
            onClick={() => {
              downloadJson(exportCoordinateOverrides(), `coordinate-overrides-${currentMap}.json`);
            }}
            className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/50 transition-colors"
            title="导出手动添加的坐标"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => {
            importJsonFile((text) => {
              const ok = importCoordinateOverrides(text);
              if (ok) {
                addToast('坐标覆盖已导入', 'success');
              } else {
                addToast('导入失败：JSON 格式错误', 'error');
              }
            });
          }}
          className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors"
          title="导入坐标覆盖 (JSON)"
        >
          <UploadCloud className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editor Panel */}
      {tempLineupData && (
        <div className="p-3 border-b border-zinc-800 bg-zinc-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white">
              {lineupEditorMode === 'placing-coord-stand' && '📍 请点击地图放置站位'}
              {lineupEditorMode === 'placing-coord-landing' && '📍 请点击地图放置落点'}
              {lineupEditorMode === 'coord-placed' && '📍 坐标已放置，请选择操作'}
              {lineupEditorMode === 'placing-stand' && '步骤 1: 点击地图放置站位'}
              {lineupEditorMode === 'placing-landing' && '步骤 2: 点击地图放置落点'}
              {lineupEditorMode === 'editing' && '编辑点位'}
            </span>
            <button
              onClick={cancelLineupEdit}
              className="p-1 hover:bg-zinc-700 rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {/* Position status */}
          <div className="flex gap-2 mb-2">
            <div className={`flex-1 text-xs px-2 py-1 rounded-md ${tempLineupData.standNormalized ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-700 text-zinc-500'}`}>
              站位: {tempLineupData.standNormalized ? '✓' : '待放置'}
            </div>
            <div className={`flex-1 text-xs px-2 py-1 rounded-md ${tempLineupData.landingNormalized ? 'bg-red-500/20 text-red-400' : 'bg-zinc-700 text-zinc-500'}`}>
              落点: {tempLineupData.landingNormalized ? '✓' : '待放置'}
            </div>
          </div>

          {/* 坐标放置完成后的操作按钮 */}
          {lineupEditorMode === 'coord-placed' && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const selId = editingLineupId;
                  const standNorm = tempLineupData?.standNormalized;
                  const landingNorm = tempLineupData?.landingNormalized;
                  if (selId && standNorm && landingNorm) {
                    saveLineupCoordinateOverride(selId, standNorm, landingNorm);
                    cancelLineupEdit();
                    addToast('坐标已保存', 'success');
                  }
                }}
                className="flex-1 py-1.5 text-xs font-medium rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                保存坐标
              </button>
              <button
                onClick={() => {
                  // 清空坐标，重新放置
                  updateTempLineupData({ standNormalized: null, landingNormalized: null });
                  setLineupEditorMode('placing-coord-stand');
                }}
                className="flex-1 py-1.5 text-xs font-medium rounded-md bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
              >
                重新放置
              </button>
            </div>
          )}

          {/* 仅自定义点位编辑模式显示完整表单，添加坐标模式只显示站位/落点 */}
          {lineupEditorMode !== 'placing-coord-stand' && lineupEditorMode !== 'placing-coord-landing' && lineupEditorMode !== 'coord-placed' && (
          <>
          {/* Form fields */}
          <div className="space-y-2">
            <input
              type="text"
              value={tempLineupData.title}
              onChange={(e) => updateTempLineupData({ title: e.target.value })}
              placeholder="点位标题"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-2">
              <CustomSelect
                value={tempLineupData.side}
                onValueChange={(v) => updateTempLineupData({ side: v as 'attack' | 'defense' })}
                options={[
                  { value: 'attack', label: '进攻方' },
                  { value: 'defense', label: '防守方' },
                ]}
                className="flex-1"
              />
              <CustomSelect
                value={tempLineupData.abilityKey}
                onValueChange={(v) => updateTempLineupData({ abilityKey: v as 'C' | 'Q' | 'E' | 'X' })}
                options={[
                  { value: 'C', label: 'C 枭型无人机' },
                  { value: 'Q', label: 'Q 技能' },
                  { value: 'E', label: 'E 技能' },
                  { value: 'X', label: 'X 大招' },
                ]}
                className="flex-1"
              />
            </div>
            <input
              type="text"
              value={tempLineupData.videoUrl || ''}
              onChange={(e) => updateTempLineupData({ videoUrl: e.target.value })}
              placeholder="视频链接 (选填)"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Image uploads */}
          <div className="mt-2 space-y-2">
            {/* Stand image */}
            <div>
              <div className="text-xs text-zinc-400 mb-1">站位截图</div>
              {tempLineupData.standImage ? (
                <div className="relative group">
                  <img
                    src={tempLineupData.standImage}
                    alt="站位截图"
                    className="w-full h-24 object-cover rounded border border-zinc-600"
                  />
                  <button
                    onClick={() => updateTempLineupData({ standImage: undefined })}
                    className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center h-20 border-2 border-dashed border-zinc-700 rounded-md cursor-pointer hover:border-zinc-500 hover:bg-zinc-800/50 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      // Validate file
                      const validation = validateImageFile(file);
                      if (!validation.valid) {
                        addToast(validation.error || 'Invalid image file', 'error');
                        return;
                      }
                      
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = reader.result as string;
                        
                        // Validate base64 data
                        const base64Validation = validateBase64Image(result);
                        if (!base64Validation.valid) {
                          addToast(base64Validation.error || 'Invalid image data', 'error');
                          return;
                        }
                        
                        updateTempLineupData({ standImage: result });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <div className="text-center">
                    <ImageIcon className="w-5 h-5 text-zinc-500 mx-auto mb-1" />
                    <span className="text-xs text-zinc-500">点击上传 (最大 {(LIMITS.MAX_IMAGE_SIZE / 1024 / 1024).toFixed(0)}MB)</span>
                  </div>
                </label>
              )}
            </div>

            {/* Detail images */}
            <div>
              <div className="text-xs text-zinc-400 mb-1">细节图 ({(tempLineupData.detailImages || []).length}/5)</div>
              <div className="flex gap-1.5 flex-wrap">
                {(tempLineupData.detailImages || []).map((img, i) => (
                  <div key={i} className="relative group w-16 h-16">
                    <img src={img} alt={`细节图 ${i + 1}`} className="w-full h-full object-cover rounded border border-zinc-600" />
                    <button
                      onClick={() => {
                        const imgs = [...(tempLineupData.detailImages || [])];
                        imgs.splice(i, 1);
                        updateTempLineupData({ detailImages: imgs });
                      }}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
                {(tempLineupData.detailImages || []).length < 5 && (
                  <label className="w-16 h-16 flex items-center justify-center border-2 border-dashed border-zinc-700 rounded-md cursor-pointer hover:border-zinc-500 hover:bg-zinc-800/50 transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        // Validate file
                        const validation = validateImageFile(file);
                        if (!validation.valid) {
                          addToast(validation.error || 'Invalid image file', 'error');
                          return;
                        }
                        
                        const reader = new FileReader();
                        reader.onload = () => {
                          const result = reader.result as string;
                          
                          // Validate base64 data
                          const base64Validation = validateBase64Image(result);
                          if (!base64Validation.valid) {
                            addToast(base64Validation.error || 'Invalid image data', 'error');
                            return;
                          }
                          
                          const imgs = [...(tempLineupData.detailImages || []), result];
                          updateTempLineupData({ detailImages: imgs });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <Plus className="w-4 h-4 text-zinc-500" />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Save button */}
          {tempLineupData.standNormalized && tempLineupData.landingNormalized && (
            <button
              onClick={saveTempLineup}
              className="w-full mt-2 py-1.5 text-xs font-medium rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              保存点位
            </button>
          )}
          </>
          )}
        </div>
      )}

      {/* Search */}
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('lineup.searchPlaceholder')}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-md pl-8 pr-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Side Filter */}
      <div className="flex gap-1 p-3 border-b border-zinc-800">
        {(['all', 'attack', 'defense'] as const).map((side) => (
          <button
            key={side}
            onClick={() => setSideFilter(side)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              sideFilter === side
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            {t(`lineup.filter.${side}`)}
          </button>
        ))}
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`p-1.5 rounded-md transition-colors ${
            showFavoritesOnly
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
              : 'bg-zinc-800 text-zinc-400 hover:text-yellow-400 hover:bg-zinc-700 border border-zinc-700'
          }`}
          title={t('lineup.myFavorites')}
        >
          <Star className={`w-4 h-4 ${favoriteLineups.length > 0 ? 'fill-yellow-400' : ''}`} />
        </button>
      </div>

      {/* Lineup List - 动态高度：有选中点位时限制高度，无选中点位时占满剩余空间 */}
      <div className={`overflow-y-auto min-h-0 shrink-0 ${selectedLineup && (selectedLineup.media?.detail_images?.length > 0 || selectedLineup.media?.video?.bilibili || selectedLineup.video_url) ? 'max-h-[35vh]' : 'flex-1'}`}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-zinc-500">{t('lineup.loading')}</span>
          </div>
        ) : !mapLineupData ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-sm">
            <MapPin className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            {t('lineup.noData')}
          </div>
        ) : filteredAbilities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-sm">
            <MapPin className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            {t('lineup.noResults')}
          </div>
        ) : (
          <div className="py-1">
            {filteredAbilities.map((ability) => {
              const isExpanded = expandedAbilities.has(ability.key);
              return (
                <div key={ability.key} className="border-b border-zinc-800/50">
                  {/* Ability header */}
                  <button
                    onClick={() => toggleAbility(ability.key)}
                    className="w-full flex items-center justify-between px-3 py-3 hover:bg-zinc-800/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${getAbilityColorClass(ability.key)} shadow-sm`}>
                        {ability.key}
                      </span>
                      {(() => {
                        // 获取图标文件夹
                        const iconFolder = getAbilityIconFolder(lineupAgentId, ability.name_en);
                        // 钢锁需要交换 grenade 和 ability2 的文件名
                        const isDeadlock = lineupAgentId === 'isoox_lock';
                        let iconFile: string;
                        if (ability.key === 'C') {
                          iconFile = isDeadlock ? 'ability2' : 'grenade';
                        } else if (ability.key === 'Q') {
                          iconFile = 'ability1';
                        } else if (ability.key === 'E') {
                          iconFile = isDeadlock ? 'grenade' : 'ability2';
                        } else if (ability.key === 'X') {
                          iconFile = 'ultimate';
                        } else {
                          iconFile = 'grenade';
                        }
                        const abilityPath = `/abilities/${iconFolder}/${iconFile}.png`;
                        return (
                          <img
                            src={abilityPath}
                            alt={ability.key}
                            className="w-6 h-6 group-hover:scale-110 transition-transform"
                            onError={handleImageFallback}
                          />
                        );
                      })()}
                      <div className="flex flex-col">
                        <span className="text-sm text-white font-semibold leading-tight">
                          {ability.name_cn}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {ability.type} · {ability.lineups.length} 个点位
                        </span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>

                  {/* Lineup items */}
                  {isExpanded && (
                    <div className="pb-2 space-y-1">
                      {ability.lineups.map((lineup) => {
                        const isSelected = selectedLineupId === lineup.id;
                        const isCustom = customLineups.some(l => l.id === lineup.id);
                        const fav = isFavorite(lineup.id);
                        const hasCoords = (lineupCoordinateOverrides[lineup.id]) || (
                          lineup.coordinates?.start?.normalized &&
                          Array.isArray(lineup.coordinates.start.normalized) &&
                          lineup.coordinates.start.normalized.length >= 2 &&
                          lineup.coordinates?.end?.normalized &&
                          Array.isArray(lineup.coordinates.end.normalized) &&
                          lineup.coordinates.end.normalized.length >= 2
                        );
                        const needsCoords = !hasCoords && !isCustom;
                        return (
                          <div
                            key={lineup.id}
                            className={`flex items-center mx-2 rounded-lg transition-all duration-200 ${
                              isSelected
                                ? 'bg-blue-500/15 border border-blue-500/30'
                                : 'hover:bg-zinc-800/50 border border-transparent'
                            }`}
                          >
                            <button
                              onClick={() => handleSelectLineup(lineup)}
                              className={`flex-1 text-left px-3 py-2.5 text-sm transition-colors ${
                                isSelected
                                  ? 'text-blue-300'
                                  : 'text-zinc-300 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                                    lineup.side === 'attack'
                                      ? 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]'
                                      : lineup.side === 'defense'
                                        ? 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.5)]'
                                        : 'bg-zinc-400'
                                  }`}
                                />
                                <span className="truncate font-medium">{lineup.title}</span>
                                {isCustom && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{t('lineup.custom')}</span>
                                )}
                                {needsCoords && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">缺坐标</span>
                                )}
                              </div>
                            </button>
                            {needsCoords && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startPlaceCoordinates(lineup.id);
                                }}
                                className="p-2 text-amber-500 hover:text-amber-300 hover:bg-amber-500/10 rounded-md transition-all"
                                title="在地图上添加站位和落点坐标"
                              >
                                <MapPin className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(lineup.id);
                              }}
                              className="p-2 text-zinc-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-md transition-all"
                              title={fav ? t('lineup.unfavorite') : t('lineup.favorite')}
                            >
                              <Star className={`w-4 h-4 ${fav ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                            </button>
                            {isCustom && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCustomLineup(lineup.id);
                                }}
                                className="p-2 mr-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lineup Detail - 只有当有内容时才显示 */}
      {selectedLineup && (selectedLineup.media?.detail_images?.length > 0 || selectedLineup.media?.video?.bilibili || selectedLineup.video_url) && (
        <div className="border-t border-zinc-800 bg-zinc-900/95 flex-1 min-h-0 flex flex-col">
          {/* Detail header */}
          <div className="flex items-center justify-between p-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                  selectedLineup.side === 'attack'
                    ? 'bg-red-400'
                    : selectedLineup.side === 'defense'
                      ? 'bg-blue-400'
                      : 'bg-zinc-400'
                }`}
              />
              <span className="text-sm font-medium text-white truncate">
                {selectedLineup.title}
              </span>
            </div>
            <button
              onClick={handleDeselectLineup}
              className="p-1 hover:bg-zinc-800 rounded transition-colors shrink-0"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {/* Detail content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Image carousel */}
            {selectedLineup.media?.detail_images?.length > 0 && (
              <div className="relative">
                {(() => {
                  const detailImg = selectedLineup.media.detail_images[detailImageIndex];
                  const detailImgPath = detailImg?.local ? `/lineups/images/${detailImg.local}` : detailImg?.url;
                  return (
                <div
                  className="relative w-full aspect-video bg-zinc-950 overflow-hidden cursor-zoom-in group"
                  onClick={() => openLightbox(detailImageIndex)}
                >
                  {!imageErrors.has(detailImageIndex) ? (
                    <>
                      <img
                        src={detailImgPath}
                        alt={detailImg?.label ?? ''}
                        className="w-full h-full object-contain"
                        onError={() => {
                          setImageErrors((prev) => new Set(prev).add(detailImageIndex));
                        }}
                      />
                      {/* Zoom icon overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="p-2 bg-black/50 rounded-full">
                          <ZoomIn className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-600">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-xs">{t('lineup.imageError')}</span>
                    </div>
                  )}

                  {/* Image label - 放在图片容器内 */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-1.5">
                    <span className="text-xs text-zinc-300">
                      {selectedLineup.media.detail_images[detailImageIndex].label}
                    </span>
                    <span className="text-xs text-zinc-500 ml-2">
                      {detailImageIndex + 1}/
                      {selectedLineup.media.detail_images.length}
                    </span>
                  </div>

                  {/* 图片计数器 */}
                  {selectedLineup.media.detail_images.length > 1 && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded-full text-xs text-white">
                      {detailImageIndex + 1} / {selectedLineup.media.detail_images.length}
                    </div>
                  )}
                </div>
                );
                })()}

                {/* 左右切换按钮 - 悬浮在图片上方两侧 */}
                {selectedLineup.media.detail_images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailImageIndex((prev) =>
                          prev > 0
                            ? prev - 1
                            : selectedLineup.media.detail_images.length - 1
                        );
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 bg-black/70 hover:bg-black/90 rounded-full transition-all hover:scale-110 shadow-lg pointer-events-auto"
                      title="上一张"
                    >
                      <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailImageIndex((prev) =>
                          prev < selectedLineup.media.detail_images.length - 1
                            ? prev + 1
                            : 0
                        );
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 bg-black/70 hover:bg-black/90 rounded-full transition-all hover:scale-110 shadow-lg pointer-events-auto"
                      title="下一张"
                    >
                      <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Video player */}
            {(selectedLineup.media.video?.bilibili || selectedLineup.video_url) && (
              <div className="p-3 border-t border-zinc-800">
                <VideoPlayer
                  bilibiliUrl={selectedLineup.media.video?.bilibili || selectedLineup.video_url}
                  timestamp={selectedLineup.media.video?.timestamp}
                />
              </div>
            )}

            {/* Side info */}
            <div className="px-3 pb-3 flex items-center gap-2 text-xs text-zinc-500">
              <span>{selectedLineup.side_cn}</span>
              {selectedLineup.source_url && (
                <>
                  <span>|</span>
                  <a
                    href={selectedLineup.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-zinc-300 transition-colors"
                  >
                    {t('lineup.source')}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal - Portal to body for full-screen */}
      {lightboxOpen && selectedLineup?.media?.detail_images && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-overlay-in"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/50 rounded-full text-sm text-white">
            {lightboxImageIndex + 1} / {selectedLineup.media.detail_images.length}
          </div>

          {/* Main image */}
          <div
            className="relative w-screen h-screen flex items-center justify-center animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            const lightboxImg = selectedLineup.media.detail_images[lightboxImageIndex];
            const lightboxImgPath = lightboxImg.local ? `/lineups/images/${lightboxImg.local}` : lightboxImg.url;
            <img
              src={lightboxImgPath}
              alt={lightboxImg.label}
              className="max-w-screen max-h-screen object-contain cursor-zoom-out"
              style={{ maxWidth: '100vw', maxHeight: '100vh' }}
            />
          </div>

          {/* Image label - 移到顶部避免与缩略图条重叠 */}
          <div className="absolute top-16 left-0 right-0 text-center pointer-events-none z-20">
            <span className="px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg text-sm text-white">
              {selectedLineup.media.detail_images[lightboxImageIndex].label}
            </span>
          </div>

          {/* Navigation arrows */}
          {selectedLineup.media.detail_images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox('prev');
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox('next');
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            </>
          )}

          {/* Thumbnail strip */}
          {selectedLineup.media.detail_images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-lg max-w-[90vw] overflow-x-auto">
              {selectedLineup.media.detail_images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxImageIndex(idx);
                  }}
                  className={`w-12 h-12 rounded overflow-hidden border-2 transition-colors shrink-0 ${
                    idx === lightboxImageIndex
                      ? 'border-blue-500'
                      : 'border-transparent hover:border-zinc-500'
                  }`}
                >
                  const thumbPath = img.local ? `/lineups/images/${img.local}` : img.url;
                  <img
                    src={thumbPath}
                    alt={img.label}
                    className="w-full h-full object-cover"
                    onError={handleImageFallback}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      , document.body)}
    </div>
  );
}
