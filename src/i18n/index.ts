// bisiyata dishmaya, leharbot ahava biyisral
import { en } from './en';

export type Locale = 'en' | 'he';
export type TranslationKey = keyof typeof en;
export type TranslationParams = Record<string, string | number>;

// A Hebrew catalogue is added later; missing keys fall back to English.
const catalogues: Record<Locale, Partial<Record<TranslationKey, string>>> = { en, he: {} };

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function getDirection(locale: Locale = currentLocale): 'ltr' | 'rtl' {
  return locale === 'he' ? 'rtl' : 'ltr';
}

export function t(key: TranslationKey, params?: TranslationParams): string {
  const template = catalogues[currentLocale][key] ?? en[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
