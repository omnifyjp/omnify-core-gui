/**
 * i18n configuration for multi-language support
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.js';
import ja from './locales/ja.js';
import vi from './locales/vi.js';

// Get saved language or detect from browser
const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('omnify-gui-lang') : null;
const browserLang = typeof navigator !== 'undefined' ? (navigator.language.split('-')[0] ?? 'en') : 'en';
const defaultLang = savedLang ?? (['en', 'ja', 'vi'].includes(browserLang) ? browserLang : 'en');

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ja: { translation: ja },
    vi: { translation: vi },
  },
  lng: defaultLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

// Language options for settings
export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'vi', label: 'Tiếng Việt' },
];
