module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for expo-router to statically resolve routes
      require.resolve('expo-router/babel'),
      'react-native-reanimated/plugin',
    ],
  };
};
