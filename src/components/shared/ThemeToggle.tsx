'use client';

/**
 * ThemeToggle Component
 *
 * A button component that toggles between light and dark themes.
 * Displays appropriate icon based on current theme state.
 */

import { useUIStore } from '@/stores';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useUIStore();

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      case 'system':
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getTitle = () => {
    switch (theme) {
      case 'light':
        return 'Light mode (click for dark)';
      case 'dark':
        return 'Dark mode (click for system)';
      case 'system':
        return 'System theme (click for light)';
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        "p-2 rounded-md transition-colors",
        "text-muted hover:text-foreground hover:bg-accent/10"
      )}
      title={getTitle()}
      aria-label={getTitle()}
    >
      {getIcon()}
    </button>
  );
}
