import React from 'react';
import type { StyleProp } from 'react-native';
import { Image, type ImageStyle } from 'expo-image';

const appIcon = require('../../assets/icon.png');

type Props = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

/** Square launcher / app icon mark. */
export function AppIcon({ size = 42, style }: Props) {
  return (
    <Image
      source={appIcon}
      style={[{ width: size, height: size, borderRadius: size * 0.24 }, style]}
      contentFit="contain"
      accessibilityLabel="Cine Pro"
    />
  );
}
