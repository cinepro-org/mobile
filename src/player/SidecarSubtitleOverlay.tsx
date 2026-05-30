import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

type Props = {
  text: string | null;
  bottomInset?: number;
  fontSize?: number;
};

/** Renders fetched sidecar subtitle cues on top of the video surface. */
export function SidecarSubtitleOverlay({ text, bottomInset = 24, fontSize = 16 }: Props) {
  if (!text) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { paddingBottom: bottomInset }]}>
      <Text style={[styles.text, { fontSize: Platform.isTV ? Math.max(fontSize, 22) : fontSize }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 8,
    elevation: 8,
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
    backgroundColor: 'rgba(0,0,0,0.62)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
    maxWidth: '92%',
  },
});
