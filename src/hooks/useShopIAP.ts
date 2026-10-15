import { useIAP, type Product, type Purchase, type PurchaseError } from 'react-native-iap';

export interface UseShopIAPOptions {
  onPurchaseSuccess: (purchase: Purchase) => void | Promise<void>;
  onPurchaseError: (error: PurchaseError) => void;
}

export interface UseShopIAPResult {
  connected: boolean;
  products: Product[];
  fetchProducts: (args: { skus: string[]; type: 'in-app' }) => Promise<unknown>;
  requestPurchase: (args: { request: { google: { skus: string[] } }; type: 'in-app' }) => Promise<unknown>;
  finishTransaction: (args: { purchase: Purchase; isConsumable: boolean }) => Promise<unknown>;
}

// Thin pass-through on native. A separate useShopIAP.web.ts (Metro picks it
// automatically for the web platform) exists because this entire module
// can't be imported on web at all -- react-native-iap's native-bridge peer
// dependency (react-native-nitro-modules) reaches directly into real
// react-native internals with no web shim, which crashes the whole app the
// moment this file is evaluated, not just when a purchase is attempted.
export function useShopIAP(options: UseShopIAPOptions): UseShopIAPResult {
  return useIAP(options);
}
