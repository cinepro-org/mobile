const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

/**
 * Expo prebuild was not merging app.json `android.usesCleartextTraffic` into the manifest
 * for this project; without it, Android 9+ blocks http:// (e.g. LAN OMSS Core).
 */
function withAndroidCleartextTraffic(config) {
  return withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    app.$['android:usesCleartextTraffic'] = 'true';
    return config;
  });
}

module.exports = withAndroidCleartextTraffic;
