/**
 * CENTRALIZED THEME CONFIGURATION
 * 
 * To change the app's color theme, modify the colors below.
 * These 4 main colors control the entire app's appearance:
 * 
 * 1. background - Main page background color
 * 2. surface - Card/component background color  
 * 3. text - Primary text color
 * 4. primary - Primary action/button color
 * 
 * After changing colors here, update app/globals.css CSS variables
 * to match these values for full theme integration.
 */

export const theme = {
  // Light mode colors
  light: {
    background: "#f9fafb", // Main background - gray-50
    surface: "#ffffff", // Cards/surfaces - white
    text: "#111827", // Primary text - gray-900
    primary: "#111827", // Primary actions - gray-900
  },
  // Dark mode colors
  dark: {
    background: "#111827", // Main background - gray-900
    surface: "#1f2937", // Cards/surfaces - gray-800
    text: "#f9fafb", // Primary text - gray-50
    primary: "#f9fafb", // Primary actions - gray-50
  },
}

// Helper function to get theme colors
export function getThemeColors(isDark: boolean) {
  return isDark ? theme.dark : theme.light
}

