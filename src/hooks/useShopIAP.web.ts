import type { UseShopIAPOptions, UseShopIAPResult } from './useShopIAP';

// Web stub -- real-money purchases can't happen in a browser (there's no
// Play Billing there), and react-native-iap can't even be imported on web
// (see useShopIAP.ts's comment). Metro resolves this file instead of
// useShopIAP.ts automatically for the web platform, so react-native-iap
// never enters the web bundle at all.
export function useShopIAP(_options: UseShopIAPOptions): UseShopIAPResult {
  return {
    connected: false,
    products: [],
    fetchProducts: async () => {},
    requestPurchase: async () => {
      throw new Error('Purchases are not available on web.');
    },
    finishTransaction: async () => {},
    getOwnedPurchases: async () => [],
  };
}
