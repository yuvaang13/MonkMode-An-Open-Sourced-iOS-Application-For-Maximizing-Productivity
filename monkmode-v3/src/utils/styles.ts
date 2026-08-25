/**
 * utils/styles.ts
 *
 * Single source of truth for typography and color tokens.
 * Every screen imports from here — zero hardcoded values elsewhere.
 */

import { StyleSheet } from 'react-native'

export const Colors = {
  bg:        '#0a0a0a',
  bgSurface: '#0f0f0f',
  bgCard:    '#131313',
  border:    '#1f1f1f',
  borderMid: '#2a2a2a',
  borderHi:  '#3a3a32',
  textDim:   '#333330',
  textMid:   '#5a5a54',
  textSub:   '#9a9a8e',
  textBody:  '#d0d0c8',
  textHi:    '#f5f5f0',
  accent:    '#f5f5f0',
  accentMuted: '#2a2a28',
} as const

/** Typography base styles — apply as spread: { ...T.mono, fontSize: 12 }
 * Falls back gracefully to system monospace if custom fonts not loaded (Expo Font optional).
 */
export const T = {
  display: {
    fontFamily: 'BebasNeue-Regular',
    color: Colors.textHi,
  },
  mono: {
    fontFamily: 'DMMono-Regular',
    color: Colors.textBody,
  },
  monoLight: {
    fontFamily: 'DMMono-Light',
    color: Colors.textSub,
  },
  sans: {
    fontFamily: 'DMSans-Regular',
    color: Colors.textBody,
  },
} as const

export const FontFallback = {
  display: { fontFamily: 'System', fontWeight: '800' as const },
  mono: { fontFamily: 'Courier New' as const },
}

/** Common shared component styles */
export const S = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  safeContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionLabel: {
    fontFamily: 'DMMono-Regular',
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  pill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.borderHi,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start' as const,
    gap: 6,
  },
  pillText: {
    fontFamily: 'DMMono-Regular',
    fontSize: 9,
    color: Colors.textSub,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  primaryBtn: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.textHi,
    borderRadius: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.textHi,
  },
  primaryBtnText: {
    fontFamily: 'BebasNeue-Regular',
    fontSize: 14,
    color: Colors.bg,
    letterSpacing: 3,
  },
  primaryBtnOutline: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.borderHi,
    borderRadius: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryBtnOutlineText: {
    fontFamily: 'BebasNeue-Regular',
    fontSize: 14,
    color: Colors.textHi,
    letterSpacing: 3,
  },
  ghostBtn: {
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  ghostBtnText: {
    fontFamily: 'DMMono-Regular',
    fontSize: 9,
    color: Colors.textMid,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    backgroundColor: Colors.bgCard,
    overflow: 'hidden' as const,
  },
})
