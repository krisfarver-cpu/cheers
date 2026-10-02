// One codebase, two apps. Normal builds are CHEERS!.
// Builds with APP_VARIANT=indianabev become Indiana Beverage's white-label app.
const IB = process.env.APP_VARIANT === 'indianabev';

module.exports = ({ config }) => {
  if (!IB) return { ...config, extra: { ...config.extra, variant: 'cheers' } };

  const brand = './assets/brands/indianabev';
  const plugins = (config.plugins || []).map((p) =>
    (p === 'expo-splash-screen' || (Array.isArray(p) && p[0] === 'expo-splash-screen'))
      ? ['expo-splash-screen', { backgroundColor: '#FFFFFF', image: `${brand}/splash.png`, imageWidth: 240,
          dark: { backgroundColor: '#FFFFFF', image: `${brand}/splash.png` } }]
      : p);

  return {
    ...config,
    name: 'IB Cheers',
    scheme: 'ibcheers',
    icon: `${brand}/icon.png`,
    ios: { ...config.ios, bundleIdentifier: 'com.cheerssocial.indianabev', icon: `${brand}/icon.png` },
    android: {
      ...config.android,
      package: 'com.cheerssocial.indianabev',
      googleServicesFile: undefined, // Android for this app needs its own Firebase registration first
      adaptiveIcon: { backgroundColor: '#FFFFFF', foregroundImage: `${brand}/icon.png` },
    },
    plugins,
    extra: { ...config.extra, variant: 'indianabev' },
  };
};
