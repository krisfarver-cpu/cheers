import Constants from 'expo-constants';

/** Which app this is: 'cheers' (default) or a white-label partner. */
export const VARIANT: string = (Constants.expoConfig?.extra as any)?.variant ?? 'cheers';
export const IS_IB = VARIANT === 'indianabev';

export const BRAND = IS_IB
  ? {
      partnerName: 'Indiana Beverage',
      distributedBy: 'Distributed by Indiana Beverage',
      logo: require('../../assets/brands/indianabev/logo.png'),
      tagline: 'Share a drink with friends across Northern Indiana, and cheer each other back.',
      footer: 'Presented by Indiana Beverage, family-owned since 1939.',
    }
  : null;

/** Drink categories offered on the Send screen in partner apps. */
export const DRINK_CATEGORIES = ['Light Lager', 'IPA', 'Seltzer', 'Non-alc', 'Local craft', 'Import', 'Other'];
export const IB_GRID = false; // true = Option B photo grid on Received
