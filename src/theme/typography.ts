import { StyleSheet } from 'react-native';

export const fonts = {
  heading: 'FunnelSans-Bold',
  body: 'Geist_400Regular',
  bodySemiBold: 'Geist_600SemiBold',
  bodySerif: 'Newsreader_500Medium',
  tagline: 'Newsreader_400Regular_Italic'
} as const;

export const typography = StyleSheet.create({
  h1: { fontFamily: fonts.heading, fontSize: 30, lineHeight: 32 },
  h2: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 28 },
  h3: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  bodyMd: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  button: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 20 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  tagline: { fontFamily: fonts.tagline, fontSize: 14, fontStyle: 'italic' }
});
