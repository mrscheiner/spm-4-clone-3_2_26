import React, { createContext, useContext, useMemo } from 'react';
import { useSeasonPass } from '@/providers/SeasonPassProvider';
import { getTeamTheme, TeamTheme } from '@/constants/teamThemes';

interface AppThemeContextValue {
  theme: TeamTheme;
}

const DEFAULT_VALUE: AppThemeContextValue = {
  theme: getTeamTheme(),
};

const AppThemeContext = createContext<AppThemeContextValue>(DEFAULT_VALUE);

interface AppThemeProviderProps {
  initialTheme?: TeamTheme;
}

export const AppThemeProvider: React.FC<React.PropsWithChildren<AppThemeProviderProps>> = ({ children, initialTheme }) => {
  const { activeSeasonPass } = useSeasonPass();
  const theme = useMemo(() => {
    if (activeSeasonPass && activeSeasonPass.teamId) {
      return getTeamTheme(activeSeasonPass.teamId);
    }
    if (initialTheme) return initialTheme;
    return getTeamTheme();
  }, [activeSeasonPass, initialTheme]);
  return <AppThemeContext.Provider value={{ theme }}>{children}</AppThemeContext.Provider>;
};

export function useAppTheme(): AppThemeContextValue {
  return useContext(AppThemeContext);
}
