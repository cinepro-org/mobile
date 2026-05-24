import React, { useLayoutEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppLogo } from '@/components/AppLogo';
import { useAppTheme } from '@/theme/AppThemeProvider';

export function SplashScreen() {
  const { colors, isDark } = useAppTheme();
  const logoScale = useSharedValue(0.88);
  const logoOpacity = useSharedValue(0);
  const tagOpacity = useSharedValue(0);

  useLayoutEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 520 });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 120 });
    tagOpacity.value = withDelay(280, withTiming(1, { duration: 480 }));
  }, [logoOpacity, logoScale, tagOpacity]);

  const logoAnim = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const tagAnim = useAnimatedStyle(() => ({
    opacity: tagOpacity.value,
  }));

  return (
    <View className="flex-1" style={{ backgroundColor: colors.ink }}>
      <LinearGradient
        colors={
          isDark
            ? ['rgba(229,9,20,0.12)', colors.ink, colors.ink]
            : ['rgba(229,9,20,0.08)', colors.ink, colors.ink]
        }
        locations={[0, 0.45, 1]}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
      >
        <Animated.View
          style={logoAnim}
          className="items-center"
          collapsable={false}
          renderToHardwareTextureAndroid={Platform.OS === 'android'}
        >
          <AppLogo width={200} height={52} />
        </Animated.View>
        <Animated.View
          style={tagAnim}
          className="items-center mt-6 gap-2"
          collapsable={false}
          renderToHardwareTextureAndroid={Platform.OS === 'android'}
        >
          <Text
            className="text-center text-[13px] font-semibold tracking-[0.22em] uppercase"
            style={{ color: colors.textFaint }}
          >
            Open streaming ecosystem
          </Text>
          <Text className="text-center text-[15px] leading-[22px] max-w-[300px]" style={{ color: colors.textMuted }}>
            Your movie & TV experience powered by OMSS and TMDB.
          </Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}
