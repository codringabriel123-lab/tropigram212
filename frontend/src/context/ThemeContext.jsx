import { createContext, useContext, useState, useEffect } from "react";

export const THEMES = {
  dark: {
    name: "Dark",
    emoji: "🌑",
    bg: "#0d0d0d",
    surface: "#1a1a1a",
    surface2: "#222",
    border: "#1f1f1f",
    border2: "#2a2a2a",
    text: "#ffffff",
    textMuted: "#888",
    textFaint: "#555",
    accent: "#e91e8c",
    accentHover: "#c2176e",
    scrollTrack: "#111",
    scrollThumb: "#333",
    inputBg: "#1a1a1a",
    notifUnread: "#1f1020",
    shadow: "#00000088",
    shadowDeep: "#000000aa",
  },
  light: {
    name: "Light",
    emoji: "☀️",
    bg: "#f5f5f5",
    surface: "#ffffff",
    surface2: "#f0f0f0",
    border: "#e0e0e0",
    border2: "#d0d0d0",
    text: "#111111",
    textMuted: "#666",
    textFaint: "#aaa",
    accent: "#e91e8c",
    accentHover: "#c2176e",
    scrollTrack: "#eee",
    scrollThumb: "#bbb",
    inputBg: "#f0f0f0",
    notifUnread: "#fff0f7",
    shadow: "#00000022",
    shadowDeep: "#00000044",
  },
  ocean: {
    name: "Ocean",
    emoji: "🌊",
    bg: "#0a1628",
    surface: "#0f2040",
    surface2: "#162a50",
    border: "#1a3060",
    border2: "#1e3870",
    text: "#e8f4ff",
    textMuted: "#7aaad0",
    textFaint: "#3a6090",
    accent: "#00c8ff",
    accentHover: "#00a8d8",
    scrollTrack: "#0a1628",
    scrollThumb: "#1a3060",
    inputBg: "#0f2040",
    notifUnread: "#0a1e40",
    shadow: "#00000066",
    shadowDeep: "#00000099",
  },
  sunset: {
    name: "Sunset",
    emoji: "🌅",
    bg: "#1a0a0a",
    surface: "#2a1010",
    surface2: "#331818",
    border: "#3d1f1f",
    border2: "#4a2828",
    text: "#fff0e8",
    textMuted: "#d09080",
    textFaint: "#805040",
    accent: "#ff6b35",
    accentHover: "#e85520",
    scrollTrack: "#1a0a0a",
    scrollThumb: "#4a2828",
    inputBg: "#2a1010",
    notifUnread: "#331010",
    shadow: "#00000066",
    shadowDeep: "#00000099",
  },
  forest: {
    name: "Forest",
    emoji: "🌲",
    bg: "#0a1a0d",
    surface: "#0f2814",
    surface2: "#14301a",
    border: "#1a3d20",
    border2: "#204a28",
    text: "#e8ffe0",
    textMuted: "#7daa80",
    textFaint: "#3a6040",
    accent: "#4caf50",
    accentHover: "#388e3c",
    scrollTrack: "#0a1a0d",
    scrollThumb: "#1a3d20",
    inputBg: "#0f2814",
    notifUnread: "#0a2210",
    shadow: "#00000066",
    shadowDeep: "#00000099",
  },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState(() => {
    return localStorage.getItem("trp_theme") || "dark";
  });

  const theme = THEMES[themeKey] || THEMES.dark;

  useEffect(() => {
    localStorage.setItem("trp_theme", themeKey);
    const root = document.documentElement;
    root.style.setProperty("--bg", theme.bg);
    root.style.setProperty("--surface", theme.surface);
    root.style.setProperty("--surface2", theme.surface2);
    root.style.setProperty("--border", theme.border);
    root.style.setProperty("--border2", theme.border2);
    root.style.setProperty("--text", theme.text);
    root.style.setProperty("--text-muted", theme.textMuted);
    root.style.setProperty("--text-faint", theme.textFaint);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--accent-hover", theme.accentHover);
    root.style.setProperty("--input-bg", theme.inputBg);
    root.style.setProperty("--shadow", theme.shadow);
    root.style.setProperty("--shadow-deep", theme.shadowDeep);
    document.body.style.background = theme.bg;
    document.body.style.color = theme.text;
  }, [themeKey, theme]);

  const setTheme = (key) => {
    if (THEMES[key]) setThemeKey(key);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeKey, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
