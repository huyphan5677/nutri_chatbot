import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, getApiUrl } from "@/shared/api/client";
import {
  getInitialLocale,
  normalizeLocale,
  persistLocale,
  type SupportedLocale,
} from "./locale";

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  isLocaleReady: boolean;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(getInitialLocale);
  const [isLocaleReady, setIsLocaleReady] = useState(false);

  const setLocale = useCallback(async (nextLocale: SupportedLocale) => {
    persistLocale(nextLocale);
    setLocaleState(nextLocale);

    const token = localStorage.getItem("nutri_token");
    if (!token) {
      return;
    }

    try {
      await api.patch("/auth/preferences/language", {
        preferred_language: nextLocale,
      });
    } catch (error) {
      console.error("Failed to persist locale preference", error);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const syncLocaleFromAccount = async () => {
      const token = localStorage.getItem("nutri_token");
      if (!token) {
        if (active) {
          setIsLocaleReady(true);
        }
        return;
      }

      try {
        const response = await fetch(`${getApiUrl()}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Accept-Language": locale,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const serverLocale = normalizeLocale(data.preferred_language, locale);

        if (active) {
          persistLocale(serverLocale);
          setLocaleState(serverLocale);
        }
      } catch (error) {
        console.error("Failed to sync locale from account", error);
      } finally {
        if (active) {
          setIsLocaleReady(true);
        }
      }
    };

    syncLocaleFromAccount();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.setAttribute("data-locale", locale);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      isLocaleReady,
    }),
    [isLocaleReady, locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }

  return context;
}
