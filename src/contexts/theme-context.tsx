"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { themes } from "@/styles/theme";

export type Theme = keyof typeof themes;

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [isInitialized, setIsInitialized] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (savedTheme && Object.keys(themes).includes(savedTheme)) {
        setTheme(savedTheme);
      }
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    
    const root = document.documentElement;
    console.log('Theme changing to:', theme);
    
    // Save theme to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
    
    // Remove all theme classes (dark, light)
    Object.keys(themes).forEach((t) => root.classList.remove(t));
    
    // Remove dark class (for Tailwind dark mode)
    root.classList.remove('dark');

    // Add current theme class
    // 'light' theme uses :root styles, so no class needed
    // Other themes need their class added
    if (theme !== 'light') {
      root.classList.add(theme);
      console.log('Added class:', theme);
    }

    // Handle Tailwind dark mode
    // Dark theme needs the 'dark' class for Tailwind's dark: modifier
    // Light theme should not have the 'dark' class
    const isDark = theme === 'dark';
    if (isDark) {
      root.classList.add('dark');
      console.log('Added dark class');
    }
  }, [theme, isInitialized]);

  const handleSetTheme = (newTheme: Theme) => {
    console.log('Setting theme to:', newTheme);
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
