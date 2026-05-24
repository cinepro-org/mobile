import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { SPLASH_MIN_DURATION_MS } from '@/constants/splash';

type SplashGate = {
  /** Zustand (or other) persistence finished. */
  hydrated: boolean;
};

/**
 * Release builds keep the native Expo splash on top until `hideAsync`.
 * Hide it as soon as the JS tree can paint the animated splash, then hold that
 * phase for {@link SPLASH_MIN_DURATION_MS} before showing the main app.
 */
export function useAppSplashGate({ hydrated }: SplashGate) {
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    if (!hydrated || showAnimatedSplash) return;

    let cancelled = false;

    void (async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {
        // Native splash may already be gone in dev; still show the JS splash.
      }
      if (!cancelled) {
        setShowAnimatedSplash(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, showAnimatedSplash]);

  useEffect(() => {
    if (!showAnimatedSplash || splashFinished) return;

    const timer = setTimeout(() => setSplashFinished(true), SPLASH_MIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, [showAnimatedSplash, splashFinished]);

  return { showAnimatedSplash, splashFinished };
}
