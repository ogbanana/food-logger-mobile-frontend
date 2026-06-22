import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Colors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  calBg: string;
  calText: string;
  proteinBg: string;
  proteinText: string;
  carbsBg: string;
  carbsText: string;
  fatBg: string;
  fatText: string;
  fiberBg: string;
  fiberText: string;
  error: string;
  errorBg: string;
  warning: string;
  warningBg: string;
  drawerHeaderBg: string;
  tabBarBg: string;
  tabActive: string;
  tabInactive: string;
  inputBorder: string;
  inputBg: string;
  userBubbleBg: string;
  barNormal: string;
  barOver: string;
  barEmpty: string;
};

export const light: Colors = {
  bg: "#E9E9EE",
  surface: "#FFFFFF",
  surfaceAlt: "#F2F2F2",
  border: "rgba(0,0,0,0.07)",
  borderStrong: "rgba(0,0,0,0.13)",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B6B6B",
  textMuted: "#9D9D9D",
  primary: "#1A1A1A",
  primaryText: "#FFFFFF",
  calBg: "#FAEEDA",
  calText: "#854F0B",
  proteinBg: "#EAF3DE",
  proteinText: "#3B6D11",
  carbsBg: "#E6F1FB",
  carbsText: "#185FA5",
  fatBg: "#FCEBEB",
  fatText: "#A32D2D",
  fiberBg: "#D6F5EC",
  fiberText: "#0B6B50",
  error: "#A32D2D",
  errorBg: "#FCEBEB",
  warning: "#854F0B",
  warningBg: "#FAEEDA",
  drawerHeaderBg: "#681114",
  tabBarBg: "#FFFFFF",
  tabActive: "#1A1A1A",
  tabInactive: "#9D9D9D",
  inputBorder: "rgba(0,0,0,0.18)",
  inputBg: "#FFFFFF",
  userBubbleBg: "#E6F1FB",
  barNormal: "#FAC775",
  barOver: "#F09595",
  barEmpty: "#E0E0E0",
};

export const dark: Colors = {
  bg: "#111111",
  surface: "#1C1C1E",
  surfaceAlt: "#2C2C2E",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  textPrimary: "#F2F2F7",
  textSecondary: "#AEAEB2",
  textMuted: "#636366",
  primary: "#F2F2F7",
  primaryText: "#111111",
  calBg: "#3D2600",
  calText: "#FFB347",
  proteinBg: "#1A3300",
  proteinText: "#7ED348",
  carbsBg: "#001A3D",
  carbsText: "#5BA3E6",
  fatBg: "#3D0000",
  fatText: "#E87474",
  fiberBg: "#003D2A",
  fiberText: "#3DCCA0",
  error: "#E87474",
  errorBg: "#3D0000",
  warning: "#FFB347",
  warningBg: "#3D2600",
  drawerHeaderBg: "#000000",
  tabBarBg: "#1C1C1E",
  tabActive: "#F2F2F7",
  tabInactive: "#636366",
  inputBorder: "rgba(255,255,255,0.12)",
  inputBg: "#2C2C2E",
  userBubbleBg: "#0A1E3A",
  barNormal: "#C47D1A",
  barOver: "#8A3A3A",
  barEmpty: "#3A3A3C",
};

type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  colors: Colors;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  colors: light,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("theme_dark").then(val => {
      if (val === "true") setIsDark(true);
    });
  }, []);

  function toggleTheme() {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem("theme_dark", String(next));
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors: isDark ? dark : light }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
