'use client';

import { useEffect, useState } from 'react';
import { useTacticsStore } from '@/store/tacticsStore';
import { useLanguage } from './I18nProvider';
import { Users } from 'lucide-react';

export function TeamToggle() {
  const [mounted, setMounted] = useState(false);
  const { isAlly, setIsAlly } = useTacticsStore();
  const { t } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="btn btn-secondary">
        <Users className="w-4 h-4" />
        <span className="hidden sm:inline">{t('team.ally')}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setIsAlly(!isAlly)}
      className={`btn ${
        isAlly
          ? 'bg-green-500/20 text-green-400 border-green-500 hover:bg-green-500/30'
          : 'bg-red-500/20 text-red-400 border-red-500 hover:bg-red-500/30'
      }`}
    >
      <Users className="w-4 h-4" />
      <span className="hidden sm:inline">{isAlly ? t('team.ally') : t('team.enemy')}</span>
    </button>
  );
}
