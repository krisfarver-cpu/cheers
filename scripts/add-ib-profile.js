// Adds the Indiana Beverage build profile to eas.json. Run once: node scripts/add-ib-profile.js
const fs = require('fs');
const eas = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
eas.build = eas.build || {};
eas.build.indianabev = {
  extends: 'production',
  environment: 'production',
  channel: 'indianabev',
  env: { APP_VARIANT: 'indianabev' },
};
eas.submit = eas.submit || {};
eas.submit.indianabev = eas.submit.production || {};
fs.writeFileSync('eas.json', JSON.stringify(eas, null, 2) + '\n');
console.log('✓ Added the "indianabev" build profile to eas.json');
