'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

// 直接导入翻译资源
import zhCommon from '@/i18n/locales/zh.json';
import enCommon from '@/i18n/locales/en.json';

// 初始化 i18n
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        zh: {
          common: zhCommon
        },
        en: {
          common: enCommon
        }
      },
      lng: 'zh',
      fallbackLng: 'zh',
      defaultNS: 'common',
      ns: ['common'],
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false
      }
    });
}

// 支持的语言类型
export type LanguageType = 'en' | 'zh' | 'slang';

interface LanguageContextType {
  currentLanguage: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: 'zh',
  setLanguage: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { t, i18n: i18nInstance } = useTranslation('common');
  const [currentLanguage, setCurrentLanguage] = useState(i18nInstance.language || 'zh');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 从 localStorage 读取保存的语言设置
    const savedLang = localStorage.getItem('language') as LanguageType;
    if (savedLang && ['zh', 'en', 'slang'].includes(savedLang)) {
      i18nInstance.changeLanguage(savedLang);
      setCurrentLanguage(savedLang);
    }
    setIsReady(true);
  }, [i18nInstance]);

  const setLanguage = useCallback((lang: LanguageType) => {
    if (['zh', 'en', 'slang'].includes(lang)) {
      i18nInstance.changeLanguage(lang);
      setCurrentLanguage(lang);
      localStorage.setItem('language', lang);
    }
  }, [i18nInstance]);

  // 包装 t 函数，确保返回字符串
  const translate = useCallback((key: string): string => {
    const result = t(key);
    // 如果返回的是键名（翻译不存在），返回键名本身
    return typeof result === 'string' ? result : key;
  }, [t]);

  if (!isReady) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within I18nProvider');
  }
  return context;
}

// LanguageSelector 组件 - 支持三种语言切换
export function LanguageSelector() {
  const { currentLanguage, setLanguage } = useLanguage();

  const languages: { key: LanguageType; label: string; title: string }[] = [
    { key: 'en', label: 'EN', title: 'English' },
    { key: 'zh', label: '中文', title: '简体中文' },
    { key: 'slang', label: '俗称', title: '国内俗称' },
  ];

  const currentIdx = languages.findIndex(l => l.key === currentLanguage);
  const nextIdx = (currentIdx + 1) % languages.length;
  const nextLang = languages[nextIdx];

  return (
    <button
      onClick={() => setLanguage(nextLang.key)}
      className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white text-xs transition-colors"
      title={`切换到${nextLang.title}`}
    >
      <Globe className="w-3.5 h-3.5" />
      <span>{languages[currentIdx].label}</span>
    </button>
  );
}
