import { computed, Injectable, signal } from '@angular/core';
import { Locale, TRANSLATIONS } from './translations';

const STORAGE_KEY = 'plate.locale';

function readLocale(): Locale {
  if (typeof localStorage === 'undefined') {
    return 'ar';
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'en' || stored === 'ar' ? stored : 'ar';
}

export const locale = signal<Locale>(readLocale());

export function t(key: string, params?: Record<string, string | number>): string {
  const table = TRANSLATIONS[locale()] ?? TRANSLATIONS.en;
  let text = table[key] ?? TRANSLATIONS.en[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function applyDocumentLocale(next: Locale = locale()): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.lang = next;
  document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
  document.title = t('app.title');
}

export function setLocale(next: Locale): void {
  locale.set(next);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, next);
  }
  applyDocumentLocale(next);
}

@Injectable({ providedIn: 'root' })
export class I18n {
  readonly locale = locale;
  readonly dir = computed(() => (this.locale() === 'ar' ? 'rtl' : 'ltr'));
  readonly t = t;
  readonly setLocale = setLocale;

  constructor() {
    applyDocumentLocale();
  }
}
