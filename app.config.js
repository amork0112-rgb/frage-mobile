module.exports = {
  expo: {
    name: 'FRAGE Mobile',
    slug: 'frage-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'frage',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0066CC',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.frage.mobile',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0066CC',
      },
      package: 'com.frage.mobile',
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#0066CC',
        },
      ],
    ],
    extra: {
      router: {
        origin: false,
      },
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};
