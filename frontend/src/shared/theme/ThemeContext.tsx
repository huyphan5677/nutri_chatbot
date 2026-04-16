import { api, getApiUrl } from "@/shared/api/client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  isThemeReady: boolean;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getTimeBasedTheme(): Theme {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 7 ? "dark" : "light";
}

function getInitialTheme(): Theme {
  return (localStorage.getItem("theme") as Theme) || getTimeBasedTheme();
}

function applyTheme(theme: Theme) {
  const root = window.document.documentElement;
  const body = window.document.body;
  const rootPortal = window.document.getElementById("root");

  if (theme === "dark") {
    root.classList.add("dark");
    body.classList.add("dark");
    rootPortal?.classList.add("dark");
  } else {
    root.classList.remove("dark");
    body.classList.remove("dark");
    rootPortal?.classList.remove("dark");

    // Force cleanup for all potential targets
    [root, body, rootPortal].forEach((el) => {
      if (el && el.classList.contains("dark")) {
        el.className = el.className.replace(/\bdark\b/g, "").trim();
      }
    });
  }

  localStorage.setItem("theme", theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [isThemeReady, setIsThemeReady] = useState(false);

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Handle automatic time transitions (checking every minute)
  useEffect(() => {
    const interval = setInterval(() => {
      const hasStoredPreference = localStorage.getItem("theme");
      const token = localStorage.getItem("nutri_token");

      // Only auto-switch if user hasn't manually set a preference locally
      // and isn't logged in (which means we should follow default logic)
      if (!hasStoredPreference && !token) {
        const expectedTheme = getTimeBasedTheme();
        setThemeState((prev) => (prev !== expectedTheme ? expectedTheme : prev));
      }
    }, 60000); // Check once per minute

    return () => clearInterval(interval);
  }, []);

  // Sync from DB on mount (if user is logged in)
  useEffect(() => {
    let active = true;

    const syncThemeFromAccount = async () => {
      const token = localStorage.getItem("nutri_token");
      if (!token) {
        setIsThemeReady(true);
        return;
      }

      try {
        const response = await fetch(`${getApiUrl()}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user profile");
        }

        const data = await response.json();
        const serverTheme: Theme = data.preferred_theme === "dark" ? "dark" : "light";

        if (active) {
          setThemeState(prev => {
            if (prev !== serverTheme) {
              console.log(`[Theme] Syncing from server: ${serverTheme}`);
              return serverTheme;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("Failed to sync theme from account", error);
      } finally {
        if (active) setIsThemeReady(true);
      }
    };

    syncThemeFromAccount();

    return () => {
      active = false;
    };
  }, []); // Only sync once on mount or when auth state would change

  const setTheme = useCallback(async (newTheme: Theme) => {
    // Immediate UI update via state
    setThemeState(newTheme);

    const token = localStorage.getItem("nutri_token");
    if (!token) return;

    try {
      await api.patch("/auth/preferences/theme", {
        preferred_theme: newTheme,
      });
    } catch (error) {
      console.error("Failed to persist theme preference", error);
    }
  }, []);

  const refreshTheme = useCallback(async () => {
    const token = localStorage.getItem("nutri_token");
    if (!token) return;

    try {
      const response = await fetch(`${getApiUrl()}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch user profile");

      const data = await response.json();
      const serverTheme: Theme = data.preferred_theme === "dark" ? "dark" : "light";

      setThemeState(prev => {
        if (prev !== serverTheme) {
          console.log(`[Theme] Refreshed from server: ${serverTheme}`);
          return serverTheme;
        }
        return prev;
      });
    } catch (error) {
      console.error("Failed to refresh theme", error);
    }
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, isThemeReady, refreshTheme }),
    [theme, setTheme, isThemeReady, refreshTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
