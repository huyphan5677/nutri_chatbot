export const SUPPORTED_LOCALES = ["vi", "en"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_STORAGE_KEY = "nutri_locale";

export const isSupportedLocale = (
  locale: string | null | undefined,
): locale is SupportedLocale =>
  locale === "vi" || locale === "en";

export const normalizeLocale = (
  locale: string | null | undefined,
  defaultLocale: SupportedLocale = "en",
): SupportedLocale => {
  if (!locale) {
    return defaultLocale;
  }

  const candidate = locale.trim().toLowerCase().replace("_", "-");
  const primary = candidate.split(",")[0].split(";")[0].split("-")[0];
  return isSupportedLocale(primary) ? primary : defaultLocale;
};

export const getStoredLocale = (): SupportedLocale | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isSupportedLocale(storedLocale) ? storedLocale : null;
};

export const getInitialLocale = (): SupportedLocale => {
  if (typeof window === "undefined") {
    return "en";
  }

  const storedLocale = getStoredLocale();
  if (storedLocale) {
    return storedLocale;
  }

  return navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en";
};

export const persistLocale = (locale: SupportedLocale) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
};
