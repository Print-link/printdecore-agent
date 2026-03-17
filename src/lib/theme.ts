/**
 * Theme-aware class utilities.
 * Eliminates 844+ inline `theme === 'dark' ? ... : ...` checks.
 *
 * Usage:
 *   const { surface, text, muted, border } = useThemeClasses();
 *   <div className={surface}> ... </div>
 */
import { useTheme } from '../contexts/ThemeContext';
import { useMemo } from 'react';

/** Pre-computed theme class sets for common patterns */
export interface ThemeClasses {
  // Surfaces
  surface: string;        // bg-white / bg-gray-800 with border
  surfaceRaised: string;  // same + shadow
  surfaceInset: string;   // bg-gray-50 / bg-gray-900

  // Text
  text: string;           // primary text color
  textSecondary: string;  // secondary/muted text
  textTertiary: string;   // very muted text

  // Borders
  border: string;         // standard border
  borderSubtle: string;   // very light border (dividers)

  // Inputs
  input: string;          // input field classes

  // Misc
  isDark: boolean;
}

export function useThemeClasses(): ThemeClasses {
  const { theme } = useTheme();
  const d = theme === 'dark';

  return useMemo(() => ({
    surface: d
      ? 'bg-gray-800 border border-gray-700'
      : 'bg-white border border-gray-200',
    surfaceRaised: d
      ? 'bg-gray-800 border border-gray-700 shadow-lg shadow-black/10'
      : 'bg-white border border-gray-200 shadow-sm',
    surfaceInset: d ? 'bg-gray-900' : 'bg-gray-50',

    text: d ? 'text-gray-100' : 'text-gray-900',
    textSecondary: d ? 'text-gray-400' : 'text-gray-500',
    textTertiary: d ? 'text-gray-500' : 'text-gray-400',

    border: d ? 'border-gray-700' : 'border-gray-200',
    borderSubtle: d ? 'border-gray-700' : 'border-gray-100',

    input: d
      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',

    isDark: d,
  }), [d]);
}
