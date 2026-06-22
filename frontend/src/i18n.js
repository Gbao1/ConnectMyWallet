import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import bnCommon from './locales/bn/common.json';
import hiCommon from './locales/hi/common.json';
import urCommon from './locales/ur/common.json';

const resources = {
  en: { common: enCommon },
  bn: { common: bnCommon },
  hi: { common: hiCommon },
  ur: { common: urCommon }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'bn', 'hi', 'ur'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });


const initialLng = i18n.resolvedLanguage || i18n.language || 'en';
const initialDir = initialLng === 'ur' ? 'rtl' : 'ltr';
document.documentElement.dir = initialDir;
document.documentElement.lang = initialLng;

i18n.on('languageChanged', (lng) => {
  const dir = lng === 'ur' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
});

export default i18n;
