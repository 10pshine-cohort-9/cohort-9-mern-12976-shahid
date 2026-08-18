/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      if (typeof window === "undefined") return "light";

      // Restore from localStorage, fall back to system preference
      const stored = window.localStorage.getItem("theme");
      if (stored === "dark" || stored === "light") return stored;

      if (window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
        
      }
    } catch {
      // Fall back to the default theme when storage/media access is unavailable.
    }

    return "light"; 
  });

  // Keep the <html> class in sync whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    try {
      window.localStorage.setItem("theme", theme);
    } catch {
      // Silently ignore storage quota/security errors
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
