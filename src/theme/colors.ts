export const colors = {
  // Core brand
  background: '#F5F2E9',
  card: '#FEFCF7',
  inputFill: '#FFFEF8',
  border: '#DCD8CB',

  // Text
  text: '#2D2926',
  textSecondary: '#6E6962',
  textMuted: '#7A746D',
  textLight: '#8C8782',

  // Brand accent (olive-brown)
  accent: '#7D6B3D',
  accentBg: '#F2E8D2', // light tint for chips, icons
  accentPill: '#EDE8DC', // active nav tab bg
  activeNavBg: '#EDE8DC', // alias kept for backward compat
  accentBorder: '#DED7C7', // secondary button border
  backButtonBorder: '#D8D1C1', // back button border (matches design)

  // Secondary button / surface
  secondaryBg: '#F5F1E8',

  // Tab bar
  tabBarBg: 'rgba(255, 249, 240, 0.85)',

  // Orbit / decorative
  orbitStroke: 'rgba(182, 153, 76, 0.2)',
  orbitStrokeInner: 'rgba(182, 153, 76, 0.12)',
  glowColor: '#DCC68B',

  // Status
  error: '#EF4444',
  success: '#15803D',
  successBg: '#E9F2E3',
  successText: '#5E7A42',
  warningBg: '#FEF3C7',
  warningText: '#92400E',

  // Destructive
  destructive: '#B4553D',

  white: '#FFFFFF',
  black: '#000000'
} as const;

export type ColorKey = keyof typeof colors;
