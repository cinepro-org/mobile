module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Metro web loads the bundle as a classic script; some deps emit `import.meta`
          // (Hermes profile). Rewrite so it runs in the browser.
          unstable_transformImportMeta: true,
        },
      ],
      'nativewind/babel',
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
