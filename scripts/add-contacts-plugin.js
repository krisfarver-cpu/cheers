// Adds the contacts permission message to app.json. Run once: node scripts/add-contacts-plugin.js
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const plugins = (cfg.expo.plugins = cfg.expo.plugins || []);
const entry = ['expo-contacts', {
  contactsPermission: 'CHEERS! checks which of your contacts are on CHEERS! so you can add them. Your contacts are never uploaded or saved.',
}];
const i = plugins.findIndex((p) => p === 'expo-contacts' || (Array.isArray(p) && p[0] === 'expo-contacts'));
if (i >= 0) plugins[i] = entry; else plugins.push(entry);
fs.writeFileSync('app.json', JSON.stringify(cfg, null, 2) + '\n');
console.log('✓ Contacts permission added to app.json');
