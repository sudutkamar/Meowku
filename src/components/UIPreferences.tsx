import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type Language = 'id' | 'en';

type UIPreferences = {
  theme: Theme;
  language: Language;
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  toggleSidebar: () => void;
};

const STORAGE_KEY = 'meowku-ui-preferences';
const defaults = { theme: 'light' as Theme, language: 'id' as Language, sidebarCollapsed: false };
const PreferencesContext = createContext<UIPreferences | null>(null);

function readPreferences() {
  if (typeof window === 'undefined') return defaults;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<typeof defaults>;
    return {
      theme: stored.theme === 'dark' ? 'dark' : defaults.theme,
      language: stored.language === 'en' ? 'en' : defaults.language,
      sidebarCollapsed: stored.sidebarCollapsed === true,
    };
  } catch {
    return defaults;
  }
}

export function UIPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readPreferences);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Storage may be unavailable in private browsing or restricted embeds.
    }
  }, [preferences]);

  const value: UIPreferences = {
    ...preferences,
    setTheme: (theme) => setPreferences((current) => ({ ...current, theme })),
    setLanguage: (language) => setPreferences((current) => ({ ...current, language })),
    toggleSidebar: () => setPreferences((current) => ({ ...current, sidebarCollapsed: !current.sidebarCollapsed })),
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useUIPreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('useUIPreferences must be used within UIPreferencesProvider');
  return context;
}
