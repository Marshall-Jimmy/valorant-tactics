import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhTranslations from './locales/zh.json';
import enTranslations from './locales/en.json';

// 仅在客户端初始化 i18n
if (typeof window !== 'undefined') {
  i18n
    .use(initReactI18next)
    .init({
      lng: 'zh',
      fallbackLng: 'en',
      ns: ['common', 'agents'],
      defaultNS: 'common',
      resources: {
        zh: {
          common: zhTranslations,
          agents: {}
        },
        en: {
          common: enTranslations,
          agents: {}
        }
      },
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
}

export default i18n;
