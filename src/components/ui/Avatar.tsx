import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const AVATAR_COLORS = ['#7D6B3D', '#5E5954', '#8C8782', '#2D2926', '#B56532'];

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

interface AvatarProps {
  name: string;
  size?: number;
  imageUri?: string;
}

export function Avatar({ name, size = 40, imageUri }: AvatarProps) {
  const bgColor = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const initials = getInitials(name);
  const fontSize = Math.floor(size * 0.36);

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]} />;
  }

  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }]}>
      <Text style={[typography.label, { color: colors.white, fontSize, lineHeight: undefined }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  }
});
