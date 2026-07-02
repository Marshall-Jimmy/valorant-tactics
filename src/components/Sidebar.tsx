'use client';

import { useState, useEffect } from 'react';
import { useTacticsStore } from '@/store/tacticsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { agentsData, roleNames, roleColors } from '@/data/agents';
import { AgentRole, AgentType } from '@/types';
import { useLanguage } from './I18nProvider';
import { Users, Zap, Shield, Target, Pencil, Trash2, Eraser, X, Minus, ArrowUp, Type, Search } from 'lucide-react';
import Image from 'next/image';
import { handleImageFallback } from '@/utils/image';

const roleIconPaths: Record<AgentRole, string> = {
  controller: '/roles/controller.png',
  duelist: '/roles/duelist.png',
  initiator: '/roles/initiator.png',
  sentinel: '/roles/sentinel.png',
};

const PRESET_COLORS = [
  '#4ade80', '#f87171', '#60a5fa', '#facc15',
  '#ffffff', '#fb923c', '#c084fc', '#22d3ee',
];

const THICKNESS_OPTIONS = [
  { value: 2, label: '细' },
  { value: 4, label: '中' },
  { value: 6, label: '粗' },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'agents' | 'abilities' | 'tools'>('agents');
  const [selectedRole, setSelectedRole] = useState<AgentRole | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();
  const sidebarPosition = useSettingsStore((s) => s.sidebarPosition);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    currentTool,
    setCurrentTool,
    selectedAgent,
    setSelectedAgent,
    selectedAbility,
    setSelectedAbility,
    placedAbilities,
    placedAgents,
    drawings,
    clearDrawings,
    clearAll,
    drawColor,
    drawStrokeWidth,
    setDrawColor,
    setDrawStrokeWidth,
    drawMode,
    setDrawMode,
  } = useTacticsStore();

  const getRoleName = (role: AgentRole) => {
    switch (role) {
      case 'duelist': return t('roles.duelist');
      case 'controller': return t('roles.controller');
      case 'initiator': return t('roles.initiator');
      case 'sentinel': return t('roles.sentinel');
      default: return role;
    }
  };

  // 获取特工的本地化名称
  const getAgentName = (type: AgentType) => {
    const translated = t(`agents.${type}.name`);
    // 如果翻译 key 不存在，i18n 会返回 key 本身，此时回退到 agentsData 中的名称
    if (translated === `agents.${type}.name`) {
      return agentsData[type]?.name || type;
    }
    return translated;
  };

  // 获取技能的本地化名称
  const abilitySlotKeys = ['c', 'q', 'e', 'x'];
  const getAbilityName = (type: AgentType, index: number) => {
    const slotKey = abilitySlotKeys[index];
    if (!slotKey) return '';
    const translated = t(`agents.${type}.abilities.${slotKey}`);
    if (translated === `agents.${type}.abilities.${slotKey}`) {
      return agentsData[type]?.abilities[index]?.name || '';
    }
    return translated;
  };

  const filteredAgents = Object.values(agentsData).filter(
    agent => {
      const matchesRole = selectedRole === 'all' || agent.role === selectedRole;
      const matchesSearch = !searchQuery ||
        agent.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getAgentName(agent.type).toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRole && matchesSearch;
    }
  );

  const handleAgentClick = (agentType: AgentType) => {
    // Toggle agent selection - click again to deselect
    if (selectedAgent === agentType && currentTool === 'agent') {
      setSelectedAgent(null);
      setCurrentTool('select');
    } else {
      setSelectedAgent(agentType);
      setCurrentTool('agent');
    }
  };

  const handleAbilityClick = (agentType: AgentType, abilityIndex: number) => {
    const agent = agentsData[agentType];
    const ability = agent.abilities[abilityIndex];
    if (ability) {
      // Toggle: click same ability again to deselect
      if (selectedAbility?.type === agentType && selectedAbility?.index === abilityIndex && currentTool === 'ability') {
        setSelectedAbility(null);
        return;
      }
      setSelectedAbility(ability);
      setCurrentTool('ability');
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className={`w-80 bg-zinc-900 ${sidebarPosition === 'right' ? 'border-l border-zinc-800' : 'border-r lg:border-r-0 lg:border-l border-zinc-800'} flex flex-col h-full`}>
        <div className="flex border-b border-zinc-800">
          {(['agents', 'abilities', 'tools'] as const).map((tab) => (
            <div key={tab} className="flex-1 py-3 text-sm font-medium capitalize text-zinc-400 bg-zinc-800/50" />
          ))}
        </div>
        <div className="flex-1 p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-zinc-800 rounded" />
            <div className="grid grid-cols-4 gap-2">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="aspect-square bg-zinc-800 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-72 sm:w-80 bg-zinc-900 ${sidebarPosition === 'right' ? 'border-l border-zinc-800' : 'border-r lg:border-r-0 lg:border-l border-zinc-800'} flex flex-col h-full`}>
      {/* Header with close button for mobile */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800 lg:hidden">
        <span className="font-bold text-white">{t('common.menu')}</span>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {(['agents', 'abilities', 'tools'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs sm:text-sm font-semibold capitalize transition-colors ${
              activeTab === tab
                ? 'bg-zinc-800 text-white border-b-2 border-purple-500'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            {tab === 'agents' ? t('sidebar.tabs.agents') : tab === 'abilities' ? t('sidebar.tabs.abilities') : t('sidebar.tabs.tools')}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {activeTab === 'agents' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="px-0 pb-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('sidebar.search')}
                  className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-xs focus:outline-none focus:border-blue-500 text-zinc-300 placeholder-zinc-600"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                  onClick={() => setSelectedRole('all')}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    selectedRole === 'all' ? 'bg-purple-500/20 border border-purple-500 text-purple-400' : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400'
                  }`}
                >
                  {t('ui.select')}
                </button>
              {(Object.keys(roleNames) as AgentRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-2 py-1 text-xs rounded-md flex items-center gap-1.5 transition-colors ${
                    selectedRole === role ? 'bg-purple-500/20 border border-purple-500 text-purple-400' : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400'
                  }`}
                  style={{ borderLeft: `2px solid ${roleColors[role]}` }}
                >
                  <div className="relative w-4 h-4 flex-shrink-0">
                    <Image
                      src={roleIconPaths[role]}
                      alt={getRoleName(role)}
                      fill
                      className="object-contain"
                      sizes="16px"
                      unoptimized
                    />
                  </div>
                  <span className="hidden sm:inline">{getRoleName(role)}</span>
                </button>
              ))}
            </div>

            {/* Agent Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
              {filteredAgents.map((agent) => (
                <button
                  key={agent.type}
                  onClick={() => handleAgentClick(agent.type)}
                  className={`aspect-square rounded-lg border-2 transition-all duration-150 overflow-hidden relative ${
                    selectedAgent === agent.type && currentTool === 'agent'
                      ? 'border-purple-500 bg-purple-500/20 hover:scale-[1.03]'
                      : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800 hover:bg-zinc-700 hover:scale-[1.03]'
                  }`}
                  title={getAgentName(agent.type)}
                >
                  <Image
                    src={agent.iconPath}
                    alt={getAgentName(agent.type)}
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized
                    onError={handleImageFallback as any}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'abilities' && (
          <div className="space-y-4">
            {filteredAgents.map((agent) => (
              <div key={agent.type} className="bg-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: roleColors[agent.role] }}
                  />
                  <span className="font-medium text-sm">{getAgentName(agent.type)}</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-1">
                  {agent.abilities.map((ability, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAbilityClick(agent.type, idx)}
                      className={`aspect-square rounded-md border transition-all overflow-hidden relative ${
                        selectedAbility?.type === agent.type && 
                        selectedAbility?.index === idx && 
                        currentTool === 'ability'
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700'
                      }`}
                      title={getAbilityName(agent.type, idx)}
                    >
                      <Image
                        src={ability.iconPath}
                        alt={getAbilityName(agent.type, idx)}
                        fill
                        className="object-contain p-0.5"
                        sizes="40px"
                        unoptimized
                        onError={handleImageFallback as any}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-4">
            {/* Drawing Tools */}
            <div className="bg-zinc-800 rounded-lg p-3">
              <h3 className="text-sm font-semibold mb-2">{t('sidebar.drawingTools')}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentTool('draw')}
                  className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center gap-2 transition-colors ${
                    currentTool === 'draw'
                      ? 'bg-purple-500/20 border border-purple-500 text-purple-400'
                      : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('ui.draw')}</span>
                </button>
                <button
                  onClick={() => setCurrentTool('select')}
                  className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center gap-2 transition-colors ${
                    currentTool === 'select'
                      ? 'bg-purple-500/20 border border-purple-500 text-purple-400'
                      : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('ui.select')}</span>
                </button>
                <button
                  onClick={() => setCurrentTool('erase')}
                  className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center gap-2 transition-colors ${
                    currentTool === 'erase'
                      ? 'bg-purple-500/20 border border-purple-500 text-purple-400'
                      : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
                  }`}
                >
                  <Eraser className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('ui.erase')}</span>
                </button>
              </div>

              {/* Draw Mode Selector */}
              <div className="mt-3">
                <h4 className="text-xs text-zinc-400 mb-1.5">{t('ui.drawMode')}</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setDrawMode('freehand'); setCurrentTool('draw'); }}
                    className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                      currentTool === 'draw' && drawMode === 'freehand'
                        ? 'bg-purple-500/20 border border-purple-500 text-purple-400'
                        : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
                    }`}
                    title={t('ui.freehand')}
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="text-xs">{t('ui.freehand')}</span>
                  </button>
                  <button
                    onClick={() => { setDrawMode('line'); setCurrentTool('draw'); }}
                    className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                      currentTool === 'draw' && drawMode === 'line'
                        ? 'bg-purple-500/20 border border-purple-500 text-purple-400'
                        : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
                    }`}
                    title={t('ui.line')}
                  >
                    <Minus className="w-4 h-4" />
                    <span className="text-xs">{t('ui.line')}</span>
                  </button>
                  <button
                    onClick={() => { setDrawMode('arrow'); setCurrentTool('draw'); }}
                    className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                      currentTool === 'draw' && drawMode === 'arrow'
                        ? 'bg-purple-500/20 border border-purple-500 text-purple-400'
                        : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
                    }`}
                    title={t('ui.arrow')}
                  >
                    <ArrowUp className="w-4 h-4" />
                    <span className="text-xs">{t('ui.arrow')}</span>
                  </button>
                </div>
              </div>

              {/* Text Tool */}
              <div className="mt-3">
                <button
                  onClick={() => setCurrentTool('text')}
                  className={`w-full py-2 px-3 rounded-md flex items-center justify-center gap-2 transition-colors ${
                    currentTool === 'text'
                      ? 'bg-purple-500/20 border border-purple-500 text-purple-400'
                      : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
                  }`}
                  title={t('ui.textTool')}
                >
                  <Type className="w-4 h-4" />
                  <span className="text-xs">{t('ui.textTool')}</span>
                </button>
              </div>

              {/* Color Picker */}
              <div className="mt-3">
                <h4 className="text-xs text-zinc-400 mb-1.5">{t('draw.color')}</h4>
                <div className="flex gap-1.5 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setDrawColor(color)}
                      className={`w-6 h-6 rounded-md transition-all duration-150 hover:scale-110 ${
                        drawColor === color ? 'ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Thickness Selector */}
              <div className="mt-3">
                <h4 className="text-xs text-zinc-400 mb-1.5">{t('draw.thickness')}</h4>
                <div className="flex gap-2">
                  {THICKNESS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDrawStrokeWidth(opt.value)}
                      className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                        drawStrokeWidth === opt.value
                          ? 'bg-purple-500/20 border border-purple-500 text-purple-400'
                          : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
                      }`}
                    >
                      <div
                        className="w-5 flex items-center justify-center"
                      >
                        <div
                          className="bg-current rounded-full"
                          style={{ width: 16, height: opt.value }}
                        />
                      </div>
                      <span className="text-xs">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clear Actions */}
            <div className="bg-zinc-800 rounded-lg p-3">
              <h3 className="text-sm font-semibold mb-2">{t('ui.clear')}</h3>
              <div className="space-y-2">
                <button
                  onClick={clearDrawings}
                  disabled={drawings.length === 0}
                  className="w-full py-2 px-3 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Eraser className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">{t('sidebar.clearDrawings')} ({drawings.length})</span>
                </button>
                <button
                  onClick={clearAll}
                  disabled={placedAbilities.length === 0 && placedAgents.length === 0 && drawings.length === 0}
                  className="w-full py-2 px-3 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">{t('ui.clear')}</span>
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-zinc-800 rounded-lg p-3">
              <h3 className="text-sm font-semibold mb-2">{t('ui.select')}</h3>
              <div className="space-y-1 text-sm text-zinc-400">
                <div className="flex justify-between">
                  <span>{t('ui.ability')}:</span>
                  <span className="text-white">{placedAbilities.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('ui.agent')}:</span>
                  <span className="text-white">{placedAgents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('ui.draw')}:</span>
                  <span className="text-white">{drawings.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
