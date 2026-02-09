/**
 * Color Utility Functions
 *
 * Helper functions to get the appropriate color level based on component nesting.
 *
 * Usage in components:
 * - Page background: bg-background (color1)
 * - First level (navbar, main cards): bg-card (color2)
 * - Nested level 1: bg-secondary (color3)
 * - Nested level 2: bg-muted (color4)
 * - Nested level 3: bg-color5 (color5)
 * - Nested level 4: bg-color6 (color6)
 *
 * Example: Page uses bg-background, then nav bg-card, then nested div bg-secondary, then span bg-muted.
 */

export const colorLevels = {
  // Level 1: Page background
  background: 'bg-background',
  // Level 2: First level components (navbar, main cards, order cards)
  card: 'bg-card',
  // Level 3: Nested components inside level 2
  secondary: 'bg-secondary',
  // Level 4: Nested components inside level 3
  muted: 'bg-muted',
  // Level 5: Nested components inside level 4
  level5: 'bg-color5',
  // Level 6: Nested components inside level 5
  level6: 'bg-color6',
} as const

/**
 * Get the appropriate background color class for a nesting level
 */
export function getBackgroundColor(level: 1 | 2 | 3 | 4 | 5 | 6): string {
  switch (level) {
    case 1:
      return colorLevels.background
    case 2:
      return colorLevels.card
    case 3:
      return colorLevels.secondary
    case 4:
      return colorLevels.muted
    case 5:
      return colorLevels.level5
    case 6:
      return colorLevels.level6
  }
}

