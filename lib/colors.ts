/**
 * Global Color System
 * 
 * This file defines the color palette for both light and dark modes.
 * Each mode has 6 color levels that get progressively lighter (dark mode) 
 * or darker (light mode) for nested components.
 * 
 * Usage:
 * - Color 1: Page background
 * - Color 2: First level components (navbar, main cards, etc.)
 * - Color 3: Components nested inside color 2
 * - Color 4: Components nested inside color 3
 * - Color 5: Components nested inside color 4
 * - Color 6: Components nested inside color 5
 */

export const colorSystem = {
  light: {
    // Light mode: starts with very light gray and gets progressively darker
    color1: { h: 0, s: 0, l: 96 }, // Page background - very light gray
    color2: { h: 0, s: 0, l: 100 }, // First level components (navbar, cards) - white
    color3: { h: 0, s: 0, l: 98 }, // Nested level 1 - very light gray
    color4: { h: 0, s: 0, l: 95 }, // Nested level 2 - light gray
    color5: { h: 0, s: 0, l: 92 }, // Nested level 3 - slightly darker gray
    color6: { h: 0, s: 0, l: 90 }, // Nested level 4 - medium gray
  },
  dark: {
    // Dark mode: starts with very dark gray and gets progressively lighter
    color1: { h: 0, s: 0, l: 10 }, // Page background - very dark gray
    color2: { h: 0, s: 0, l: 15 }, // First level components (navbar, cards) - dark gray
    color3: { h: 0, s: 0, l: 20 }, // Nested level 1 - slightly lighter
    color4: { h: 0, s: 0, l: 25 }, // Nested level 2 - lighter gray
    color5: { h: 0, s: 0, l: 30 }, // Nested level 3 - even lighter
    color6: { h: 0, s: 0, l: 35 }, // Nested level 4 - lightest dark gray
  },
  // Text colors
  text: {
    light: { h: 0, s: 0, l: 0 }, // Black text for light mode
    dark: { h: 0, s: 0, l: 100 }, // White text for dark mode
  },
  // Accent colors (for hover states)
  accent: {
    light: { h: 217, s: 91, l: 60 }, // Blue for light mode
    dark: { h: 270, s: 70, l: 60 }, // Purple for dark mode
  },
} as const

/**
 * Helper function to convert HSL to CSS variable format
 */
export function hslToCSS(h: number, s: number, l: number): string {
  return `${h} ${s}% ${l}%`
}

/**
 * Get color level for light mode
 */
export function getLightColor(level: 1 | 2 | 3 | 4 | 5 | 6): string {
  const color = colorSystem.light[`color${level}` as keyof typeof colorSystem.light]
  return hslToCSS(color.h, color.s, color.l)
}

/**
 * Get color level for dark mode
 */
export function getDarkColor(level: 1 | 2 | 3 | 4 | 5 | 6): string {
  const color = colorSystem.dark[`color${level}` as keyof typeof colorSystem.dark]
  return hslToCSS(color.h, color.s, color.l)
}

