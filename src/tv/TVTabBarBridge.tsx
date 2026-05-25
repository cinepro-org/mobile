import React, { useEffect } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';

/** Captures tab bar props so the side rail can live beside content in one focus tree. */
export function TVTabBarCapture({
  tabBarProps,
  onTabBarProps,
}: {
  tabBarProps: BottomTabBarProps;
  onTabBarProps: (props: BottomTabBarProps) => void;
}) {
  useEffect(() => {
    onTabBarProps(tabBarProps);
  }, [onTabBarProps, tabBarProps, tabBarProps.state.index]);

  return null;
}

/** Zero-size placeholder required by the tab navigator slot. */
export function TVTabBarPlaceholder() {
  return <View style={{ width: 0, height: 0 }} />;
}
