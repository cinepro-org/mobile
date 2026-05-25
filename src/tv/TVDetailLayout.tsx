import React, { type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TVFocusableButton } from '@/tv/TVFocusableButton';
import { FocusSurface } from '@/tv/FocusSurface';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { fontScale } from '@/utils/layout';
import Ionicons from '@expo/vector-icons/Ionicons';

type MetaChip = {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

type ActionButton = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  active?: boolean;
  variant?: 'primary' | 'secondary';
  hasTVPreferredFocus?: boolean;
  accessibilityLabel?: string;
};

type Props = {
  backdropUri: string | null | undefined;
  title: string;
  tagline?: string | null;
  overview?: string | null;
  metaChips: MetaChip[];
  primaryAction: ActionButton;
  secondaryActions?: ActionButton[];
  onBack: () => void;
  children?: ReactNode;
  loading?: boolean;
};

/**
 * Android TV detail layout: cinematic backdrop, gradient overlay,
 * large metadata block, and remote-friendly action buttons.
 */
export function TVDetailLayout({
  backdropUri,
  title,
  tagline,
  overview,
  metaChips,
  primaryAction,
  secondaryActions = [],
  onBack,
  children,
  loading,
}: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const heroH = 520 + insets.top;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.ink }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={false}
    >
      <View style={{ minHeight: heroH }}>
        <Image
          source={backdropUri ? { uri: backdropUri } : undefined}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: heroH }}
          contentFit="cover"
          transition={300}
          cachePolicy="memory-disk"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.92)']}
          locations={[0, 0.45, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: heroH }}
        />
        <LinearGradient
          colors={[colors.ink, 'transparent']}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 }}
        />

        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 48, flex: 1, justifyContent: 'flex-end', paddingBottom: 36 }}>
          <FocusSurface
            className="rounded-full items-center justify-center self-start mb-6"
            style={{ width: 48, height: 48, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}
            focusVariant="onMedia"
            onPress={onBack}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" color="#fff" size={26} />
          </FocusSurface>

          {loading ? (
            <View className="gap-3 py-8">
              <View className="h-10 rounded-lg w-[70%]" style={{ backgroundColor: colors.skeleton }} />
              <View className="h-5 rounded-lg w-[40%]" style={{ backgroundColor: colors.skeleton }} />
            </View>
          ) : (
            <>
              <Text
                className="font-black leading-tight"
                style={{ color: colors.text, fontSize: fontScale(40), maxWidth: '78%' }}
                numberOfLines={3}
              >
                {title}
              </Text>
              {tagline ? (
                <Text className="italic mt-2" style={{ color: colors.textFaint, fontSize: fontScale(16) }} numberOfLines={2}>
                  {tagline}
                </Text>
              ) : null}

              <View className="flex-row flex-wrap gap-2 mt-4">
                {metaChips.map((chip) => (
                  <View
                    key={chip.key}
                    className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                    style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
                  >
                    {chip.icon ? <Ionicons name={chip.icon} color={colors.textMuted} size={14} /> : null}
                    <Text className="font-semibold" style={{ color: colors.text, fontSize: fontScale(13) }}>
                      {chip.label}
                    </Text>
                  </View>
                ))}
              </View>

              {overview ? (
                <Text
                  className="mt-5 leading-7"
                  style={{ color: colors.textMuted, fontSize: fontScale(16), maxWidth: '68%' }}
                  numberOfLines={4}
                >
                  {overview}
                </Text>
              ) : null}

              <View className="flex-row items-center flex-wrap gap-4 mt-8">
                <TVFocusableButton
                  label={primaryAction.label}
                  icon={primaryAction.icon}
                  size="hero"
                  focusVariant="accent"
                  hasTVPreferredFocus={primaryAction.hasTVPreferredFocus ?? true}
                  collapseTVNavOnFocus
                  onPress={primaryAction.onPress}
                  style={{
                    backgroundColor: primaryAction.variant === 'secondary' ? colors.inputBg : colors.accent,
                    minWidth: 200,
                  }}
                  iconColor={primaryAction.variant === 'secondary' ? colors.text : colors.textOnAccent}
                  textColor={primaryAction.variant === 'secondary' ? colors.text : colors.textOnAccent}
                  accessibilityLabel={primaryAction.accessibilityLabel ?? primaryAction.label}
                />
                {secondaryActions.map((action) => (
                  <TVFocusableButton
                    key={action.key}
                    label={action.label}
                    icon={action.icon}
                    size="large"
                    focusVariant="default"
                    collapseTVNavOnFocus
                    onPress={action.onPress}
                    style={{
                      backgroundColor: action.active ? colors.accentSoft : 'rgba(255,255,255,0.1)',
                      borderWidth: 1,
                      borderColor: action.active ? colors.accentBorder : 'rgba(255,255,255,0.2)',
                      minWidth: 160,
                    }}
                    iconColor={action.active ? colors.accent : colors.text}
                    textColor={colors.text}
                    accessibilityLabel={action.accessibilityLabel ?? action.label}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </View>

      {children ? <View style={{ paddingHorizontal: 48, marginTop: 24 }}>{children}</View> : null}
    </ScrollView>
  );
}
