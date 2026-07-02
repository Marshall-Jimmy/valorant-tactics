'use client';

import { useTacticsStore } from '@/store/tacticsStore';
import { Sword, Shield } from 'lucide-react';

export function AttackDefenseToggle() {
  const { isAttack, setIsAttack } = useTacticsStore();

  return (
    <div className="flex bg-zinc-800 rounded p-0.5">
      <button
        onClick={() => setIsAttack(true)}
        className={`flex items-center gap-1.5 px-3 py-1 rounded text-sm font-medium transition-colors ${
          isAttack
            ? 'bg-green-500/20 text-green-400'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        <Sword className="w-3.5 h-3.5" />
        进攻
      </button>
      <button
        onClick={() => setIsAttack(false)}
        className={`flex items-center gap-1.5 px-3 py-1 rounded text-sm font-medium transition-colors ${
          !isAttack
            ? 'bg-red-500/20 text-red-400'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        <Shield className="w-3.5 h-3.5" />
        防守
      </button>
    </div>
  );
}
