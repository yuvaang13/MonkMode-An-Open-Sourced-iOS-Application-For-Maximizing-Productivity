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
  borderHi:  '#444440',
  textDim:   '#2a2a2a',
  textMid:   '#444440',
  textSub:   '#888880',
  textBody:  '#d0d0c8',
  textHi:    '#f5f5f0',
} as const

/** Typography base styles — apply as spread: { ...T.mono, fontSize: 12 } */
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
    height: 48,
    borderWidth: 1,
    borderColor: Colors.textHi,
    borderRadius: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryBtnText: {
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
})
