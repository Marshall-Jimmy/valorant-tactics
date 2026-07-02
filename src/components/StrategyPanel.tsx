'use client';

import { useState, useEffect } from 'react';
import { useTacticsStore } from '@/store/tacticsStore';
import { getMapName } from '@/data/maps';
import { useLanguage } from './I18nProvider';
import { Save, FolderOpen, Download, Upload, Trash2, Plus, Pencil, AlertTriangle, CheckCircle, FileJson, Shield, Clock, MapPin, Swords } from 'lucide-react';
import { validateStrategyImport, getVersionWarning, isVersionCompatible, DATA_VERSION } from '@/schemas';
import { downloadJson } from '@/utils/fileIO';

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
      <div className="space-y-4">
        <div className="bg-zinc-800/50 rounded-xl p-4 animate-pulse border border-zinc-800/50">
          <div className="h-4 bg-zinc-700 rounded w-24 mb-3" />
          <div className="h-10 bg-zinc-700 rounded-lg" />
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-4 animate-pulse border border-zinc-800/50">
          <div className="h-4 bg-zinc-700 rounded w-32 mb-3" />
          <div className="h-20 bg-zinc-700 rounded-lg" />
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
    // Add random ID to filename for security
    const randomId = Math.random().toString(36).substring(2, 8);
    downloadJson(data, `strategy-${Date.now()}-${randomId}.json`);
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
    <div className="space-y-4">
      {/* Create New Strategy */}
      <section className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <Plus className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">{t('strategy.create')}</h3>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newStrategyName}
            onChange={(e) => setNewStrategyName(e.target.value)}
            placeholder={t('strategy.namePlaceholder')}
            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-zinc-300 placeholder-zinc-600 transition-colors"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={!newStrategyName.trim()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Current Strategy Actions */}
      {currentStrategy && (
        <section className="bg-zinc-800/50 rounded-xl p-4 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-zinc-200 truncate">
                {t('strategy.current')}: {currentStrategy.name}
              </h3>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveCurrentStrategy}
              className="flex-1 px-3 py-2.5 bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/20 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              {t('strategy.save')}
            </button>
            <button
              onClick={handleExport}
              className="flex-1 px-3 py-2.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/20 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              {t('strategy.export')}
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium transition-colors"
              title={t('strategy.clearCurrent')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* Divider */}
      <div className="border-t border-zinc-800/60" />

      {/* Import */}
      <section className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Upload className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">{t('strategy.import')}</h3>
          </div>
          <button
            onClick={() => setShowImport(!showImport)}
            className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded-md hover:bg-zinc-700/50 transition-colors"
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
              className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zinc-700 file:text-white hover:file:bg-zinc-600 file:transition-colors file:cursor-pointer"
            />
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder={t('strategy.importPlaceholder')}
              className="w-full h-24 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none text-zinc-300 placeholder-zinc-600 transition-colors"
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
                          {importPreview.warning ? t('strategy.dataValidWithWarning') : t('strategy.dataValid')}
                        </p>
                        <div className="mt-1 text-zinc-400 text-xs space-y-0.5">
                          <p>{t('strategy.map')}: {getMapName(importPreview.map as any) || importPreview.map}</p>
                          <p>{t('strategy.abilities')}: {importPreview.abilityCount} | {t('strategy.agents')}: {importPreview.agentCount} | {t('strategy.drawings')}: {importPreview.drawingCount}</p>
                          <p>{t('strategy.size')}: {importPreview.size}</p>
                          {importPreview.version && (
                            <p>{t('strategy.version')}: {importPreview.version}</p>
                          )}
                        </div>
                        {importPreview.warning && (
                          <p className="mt-2 text-amber-400 text-xs">{importPreview.warning}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-red-400">{t('strategy.dataInvalid')}</p>
                        <p className="mt-1 text-zinc-400 text-xs">{importPreview.error}</p>
                        <p className="mt-1 text-zinc-500 text-xs">{t('strategy.size')}: {importPreview.size}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={handleImport}
              disabled={!importData.trim() || !importPreview?.valid}
              className="w-full px-3 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 text-white shadow-sm"
            >
              <Upload className="w-4 h-4" />
              {t('strategy.import')}
            </button>
          </div>
        )}
      </section>

      {/* Confirmation Dialog */}
      {showConfirmDialog && importPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl w-full max-w-md p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white">{t('strategy.confirmClear')}</h3>
            </div>
            
            <p className="text-zinc-400 text-sm mb-4">
              {t('strategy.confirmClearDesc')}
            </p>
            
            <div className="bg-zinc-800 rounded-lg p-3 mb-4 text-sm border border-zinc-700/50">
              <div className="grid grid-cols-2 gap-2 text-zinc-400">
                <span>{t('strategy.abilities')}:</span>
                <span className="text-zinc-200">{importPreview.abilityCount}</span>
                <span>{t('strategy.agents')}:</span>
                <span className="text-zinc-200">{importPreview.agentCount}</span>
                <span>{t('strategy.drawings')}:</span>
                <span className="text-zinc-200">{importPreview.drawingCount}</span>
                <span>{t('strategy.size')}:</span>
                <span className="text-zinc-200">{importPreview.size}</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors border border-zinc-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={executeImport}
                className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                {t('strategy.confirmImportBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-zinc-800/60" />

      {/* Saved Strategies */}
      <section className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-zinc-700/50 rounded-lg flex items-center justify-center">
            <FolderOpen className="w-4 h-4 text-zinc-400" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">
            {t('strategy.saved')} ({strategies.length})
          </h3>
        </div>
        {strategies.length === 0 ? (
          <div className="text-center py-8">
            <FileJson className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">{t('strategy.noSaved')}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {strategies.map((strategy, index) => (
              <div
                key={strategy.id}
                className={`p-3 rounded-lg border transition-all group ${
                  currentStrategy?.id === strategy.id
                    ? 'bg-blue-500/10 border-blue-500/40 shadow-sm shadow-blue-500/5'
                    : 'bg-zinc-900/50 border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-900/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {/* Sequence number badge */}
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold shrink-0 ${
                        currentStrategy?.id === strategy.id
                          ? 'bg-blue-500/30 text-blue-400'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {index + 1}
                      </span>
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
                          className="flex-1 px-2 py-0.5 bg-zinc-900 border border-blue-500 rounded-md text-sm text-white focus:outline-none min-w-0"
                        />
                      ) : (
                        <h4 className="font-medium text-sm truncate text-zinc-200">{strategy.name}</h4>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 ml-7">
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <MapPin className="w-3 h-3" />
                        {getMapName(strategy.map)}
                      </span>
                      <span className={`flex items-center gap-1 text-xs ${strategy.isAttack ? 'text-red-400/70' : 'text-blue-400/70'}`}>
                        <Swords className="w-3 h-3" />
                        {strategy.isAttack ? t('strategy.attack') : t('strategy.defense')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 ml-7 text-xs text-zinc-600">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(strategy.createdAt).toLocaleDateString()}</span>
                      <span className="mx-1">·</span>
                      <span>{new Date(strategy.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingId(strategy.id); setEditingName(strategy.name); }}
                      className="p-1.5 hover:bg-zinc-700 rounded-md transition-colors"
                      title={t('strategy.rename')}
                    >
                      <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                    <button
                      onClick={() => loadStrategy(strategy)}
                      className="p-1.5 hover:bg-zinc-700 rounded-md transition-colors"
                      title={t('strategy.load')}
                    >
                      <FolderOpen className="w-4 h-4 text-zinc-400" />
                    </button>
                    <button
                      onClick={() => deleteStrategy(strategy.id)}
                      className="p-1.5 hover:bg-red-500/20 rounded-md transition-colors"
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
      </section>
    </div>
  );
}
