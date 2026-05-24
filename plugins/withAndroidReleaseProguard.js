const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const REANIMATED_PROGUARD_MARKER = '# cinestream-reanimated-release';
const REANIMATED_PROGUARD_BLOCK = `
${REANIMATED_PROGUARD_MARKER}
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
`;

/**
 * Ensures Reanimated/Worklets survive R8 when release minification is enabled.
 */
function withAndroidReleaseProguard(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const proguardPath = path.join(config.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      let contents = '';

      if (fs.existsSync(proguardPath)) {
        contents = fs.readFileSync(proguardPath, 'utf8');
      }

      if (!contents.includes(REANIMATED_PROGUARD_MARKER)) {
        fs.writeFileSync(proguardPath, `${contents.trimEnd()}\n${REANIMATED_PROGUARD_BLOCK}\n`);
      }

      return config;
    },
  ]);
}

module.exports = withAndroidReleaseProguard;
