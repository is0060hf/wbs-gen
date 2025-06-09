'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // ローカルストレージからテーマを読み込み
    const savedTheme = localStorage.getItem('wbs-theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // テーマの解決とDOM更新
    let resolved: 'light' | 'dark';
    
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = theme;
    }

    setResolvedTheme(resolved);

    // HTMLクラスの更新
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);

    // ローカルストレージに保存
    localStorage.setItem('wbs-theme', theme);
  }, [theme]);

  useEffect(() => {
    // システムテーマの変更を監視
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? 'dark' : 'light');
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// ダークモード切替ボタン用のコンポーネント
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleToggle = () => {
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return '🔄'; // システム
    }
    return resolvedTheme === 'dark' ? '🌙' : '☀️';
  };

  const getTitle = () => {
    if (theme === 'system') {
      return 'システム設定に従う';
    }
    return resolvedTheme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替';
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleToggle}
        className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        title={getTitle()}
      >
        <span className="text-lg">{getIcon()}</span>
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`text-xs px-2 py-1 rounded transition-colors ${
          theme === 'system'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
        title="システム設定に従う"
      >
        自動
      </button>
    </div>
  );
} 