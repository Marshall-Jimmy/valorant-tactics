'use client';

import { useState, useEffect } from 'react';
import { useTacticsStore } from '@/store/tacticsStore';
import { getMapName } from '@/data/maps';
import { useLanguage } from './I18nProvider';
import { Save, FolderOpen, Download, Upload, Trash2, Plus, Pencil, AlertTriangle, CheckCircle, FileJson } from 'lucide-react';
import { validateStrategyImport, getVersionWarning, isVersionCompatible, DATA_VERSION } from '@/schemas';

interface ImportPreview {
  valid: boolean;
  map?: string;
  abilityCount: number;
  agentCount: number;
  drawingCount: number;
  version?: string;
  size: string;
  error?: string;
  warning?: string;
}

export function StrategyPanel() {
  const [newStrategyName, setNewStrategyName] = useState('');
  const [importData, setImportData] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const {
    strategies,
    currentStrategy,
    createStrategy,
    loadStrategy,
    saveCurrentStrategy,
    deleteStrategy,
    renameStrategy,
    exportStrategy,
    importStrategy,
    clearAll,
  } = useTacticsStore();

  // Update preview when import data changes
  useEffect(() => {
    if (!importData.trim()) {
      setImportPreview(null);
      return;
    }

    try {
      const rawData = JSON.parse(importData.trim());
      const validation = validateStrategyImport(rawData);
      
      if (validation.success) {
        const data = validation.data;
        const warning = getVersionWarning(data._version);
        
        setImportPreview({
          valid: true,
          map: data.map,
          abilityCount: data.placedAbilities.length,
          agentCount: data.placedAgents.length,
          drawingCount: data.drawings.length,
          version: data._version,
          size: `${(importData.length / 1024).toFixed(1)} KB`,
          warning: warning || undefined,
        });
      } else {
        setImportPreview({
          valid: false,
          abilityCount: 0,
          agentCount: 0,
          drawingCount: 0,
          size: `${(importData.length / 1024).toFixed(1)} KB`,
          error: validation.error,
        });
      }
    } catch {
      setImportPreview({
        valid: false,
        abilityCount: 0,
        agentCount: 0,
        drawingCount: 0,
        size: `${(importData.length / 1024).toFixed(1)} KB`,
        error: 'Invalid JSON format',
      });
    }
  }, [importData]);
  
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-800 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-zinc-700 rounded w-24 mb-3" />
          <div className="h-10 bg-zinc-700 rounded" />
        </div>
        <div className="bg-zinc-800 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-zinc-700 rounded w-32 mb-3" />
          <div className="h-20 bg-zinc-700 rounded" />
        </div>
      </div>
    );
  }

  const handleCreate = () => {
    if (!newStrategyName.trim()) return;
    createStrategy(newStrategyName.trim());
    setNewStrategyName('');
  };

  const handleExport = () => {
    const data = exportStrategy();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Add random ID to filename for security
    const randomId = Math.random().toString(36).substring(2, 8);
    a.download = `strategy-${Date.now()}-${randomId}.json`;
    a.click();
    // Delay revoke to ensure download starts
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleImport = () => {
    if (!importData.trim() || !importPreview?.valid) return;
    
    // Show confirmation dialog for large imports
    if (importPreview.abilityCount > 50 || importPreview.agentCount > 25) {
      setShowConfirmDialog(true);
      return;
    }
    
    executeImport();
  };

  const executeImport = () => {
    const strategy = importStrategy(importData.trim());
    if (strategy) {
      setImportData('');
      setShowImport(false);
      setImportPreview(null);
      setShowConfirmDialog(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImportPreview({
        valid: false,
        abilityCount: 0,
        agentCount: 0,
        drawingCount: 0,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        error: 'File too large (max 5MB)',
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportData(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Create New */}
      <div className="bg-zinc-800 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">{t('strategy.create')}</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newStrategyName}
            onChange={(e) => setNewStrategyName(e.target.value)}
            placeholder={t('strategy.namePlaceholder')}
            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm focus:outline-none focus:border-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={!newStrategyName.trim()}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Current Strategy Actions */}
      {currentStrategy && (
        <div className="bg-zinc-800 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">{t('strategy.current')}: {currentStrategy.name}</h3>
          <div className="flex gap-2">
            <button
              onClick={saveCurrentStrategy}
              className="flex-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {t('strategy.save')}
            </button>
            <button
              onClick={handleExport}
              className="flex-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {t('strategy.export')}
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Import */}
      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">{t('strategy.import')}</h3>
          <button
            onClick={() => setShowImport(!showImport)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {showImport ? t('strategy.collapse') : t('strategy.expand')}
          </button>
        </div>
        {showImport && (
          <div className="space-y-3">
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-zinc-700 file:text-white hover:file:bg-zinc-600"
            />
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder={t('strategy.importPlaceholder')}
              className="w-full h-24 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
            
            {/* Import Preview */}
            {importPreview && (
              <div className={`p-3 rounded-lg text-sm ${
                importPreview.valid 
                  ? importPreview.warning 
                    ? 'bg-amber-500/10 border border-amber-500/30' 
                    : 'bg-green-500/10 border border-green-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                <div className="flex items-start gap-2">
                  {importPreview.valid ? (
                    importPreview.warning ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    )
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    {importPreview.valid ? (
                      <>
                        <p className="font-medium text-zinc-200">
                          {importPreview.warning ? '可以导入（有警告）' : '数据验证通过'}
                        </p>
                        <div className="mt-1 text-zinc-400 text-xs space-y-0.5">
                          <p>地图: {getMapName(importPreview.map as any) || importPreview.map}</p>
                          <p>技能: {importPreview.abilityCount} | 特工: {importPreview.agentCount} | 绘图: {importPreview.drawingCount}</p>
                          <p>大小: {importPreview.size}</p>
                          {importPreview.version && (
                            <p>版本: {importPreview.version}</p>
                          )}
                        </div>
                        {importPreview.warning && (
                          <p className="mt-2 text-amber-400 text-xs">{importPreview.warning}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-red-400">数据验证失败</p>
                        <p className="mt-1 text-zinc-400 text-xs">{importPreview.error}</p>
                        <p className="mt-1 text-zinc-500 text-xs">大小: {importPreview.size}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={handleImport}
              disabled={!importData.trim() || !importPreview?.valid}
              className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {t('strategy.import')}
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white">确认导入</h3>
            </div>
            
            <p className="text-zinc-400 text-sm mb-4">
              此策略包含大量数据，导入可能需要一些时间。
            </p>
            
            <div className="bg-zinc-800 rounded-lg p-3 mb-4 text-sm">
              <div className="grid grid-cols-2 gap-2 text-zinc-400">
                <span>技能数量:</span>
                <span className="text-zinc-200">{importPreview.abilityCount}</span>
                <span>特工数量:</span>
                <span className="text-zinc-200">{importPreview.agentCount}</span>
                <span>绘图数量:</span>
                <span className="text-zinc-200">{importPreview.drawingCount}</span>
                <span>文件大小:</span>
                <span className="text-zinc-200">{importPreview.size}</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={executeImport}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Strategies */}
      <div className="bg-zinc-800 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">{t('strategy.saved')} ({strategies.length})</h3>
        {strategies.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">{t('strategy.noSaved')}</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className={`p-3 rounded border transition-colors ${
                  currentStrategy?.id === strategy.id
                    ? 'bg-blue-500/10 border-blue-500/50'
                    : 'bg-zinc-900 border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingId === strategy.id ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editingName.trim()) {
                            renameStrategy(strategy.id, editingName.trim());
                            setEditingId(null);
                          } else if (e.key === 'Escape') {
                            setEditingId(null);
                          }
                        }}
                        onBlur={() => {
                          if (editingName.trim()) {
                            renameStrategy(strategy.id, editingName.trim());
                          }
                          setEditingId(null);
                        }}
                        className="w-full px-1.5 py-0.5 bg-zinc-900 border border-blue-500 rounded text-sm text-white focus:outline-none"
                      />
                    ) : (
                      <h4 className="font-medium text-sm truncate">{strategy.name}</h4>
                    )}
                    <p className="text-xs text-zinc-500 mt-1">
                      {getMapName(strategy.map)} · {strategy.isAttack ? t('strategy.attack') : t('strategy.defense')}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {new Date(strategy.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => { setEditingId(strategy.id); setEditingName(strategy.name); }}
                      className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
                      title={t('strategy.rename')}
                    >
                      <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                    <button
                      onClick={() => loadStrategy(strategy)}
                      className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
                      title={t('strategy.load')}
                    >
                      <FolderOpen className="w-4 h-4 text-zinc-400" />
                    </button>
                    <button
                      onClick={() => deleteStrategy(strategy.id)}
                      className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                      title={t('strategy.delete')}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
