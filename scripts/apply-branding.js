// Points app.json at the new CHEERS! icon, Android icon layers, splash screen, and favicon.
// Run once from the project folder:  node scripts/apply-branding.js
const fs = require('fs');

const cfg = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const e = cfg.expo;
const GREEN = '#3F9B74';

e.name = 'CHEERS!'; // the name shown under the icon
e.icon = './assets/images/icon.png';
e.ios = { ...e.ios, icon: './assets/images/icon.png' };
e.android = {
  ...e.android,
  adaptiveIcon: {
    backgroundColor: GREEN,
    foregroundImage: './assets/images/android-icon-foreground.png',
    backgroundImage: './assets/images/android-icon-background.png',
    monochromeImage: './assets/images/android-icon-monochrome.png',
  },
};
e.web = { ...e.web, favicon: './assets/images/favicon.png' };

const splash = {
  backgroundColor: GREEN,
  image: './assets/images/splash-icon.png',
  imageWidth: 220,
  dark: { backgroundColor: GREEN, image: './assets/images/splash-icon.png' },
};
e.plugins = e.plugins || [];
const i = e.plugins.findIndex((p) => p === 'expo-splash-screen' || (Array.isArray(p) && p[0] === 'expo-splash-screen'));
if (i >= 0) e.plugins[i] = ['expo-splash-screen', splash];
else e.plugins.push(['expo-splash-screen', splash]);

fs.writeFileSync('app.json', JSON.stringify(cfg, null, 2) + '\n');
console.log('✓ app.json updated: icon, Android icon, splash screen, favicon, and app name');
