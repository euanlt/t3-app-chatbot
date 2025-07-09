"use client";

import { useTheme } from './ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-secondary hover:bg-tertiary transition-colors border border-primary"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <FaMoon className="w-4 h-4 text-secondary" />
      ) : (
        <FaSun className="w-4 h-4 text-secondary" />
      )}
    </button>
  );
}