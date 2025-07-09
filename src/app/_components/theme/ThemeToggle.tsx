"use client";

import { useTheme } from "./ThemeContext";
import { FaSun, FaMoon } from "react-icons/fa";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="bg-secondary hover:bg-tertiary border-primary rounded-lg border p-2 transition-colors"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <FaMoon className="text-secondary h-4 w-4" />
      ) : (
        <FaSun className="text-secondary h-4 w-4" />
      )}
    </button>
  );
}
