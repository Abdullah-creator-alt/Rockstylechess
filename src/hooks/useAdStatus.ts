import { useCallback, useEffect, useState } from 'react';

import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { getAdStatus, type AdStatus } from '@/lib/api';
import { getAuthToken } from '@/lib/authStorage';

// Today's remaining rewarded-ad redemptions per placement, for button labels
// ("Watch ad" vs "Come back tomorrow"). Display only -- the server enforces the
// caps. `refetch` after any redeem; null until loaded / for guests.
export function useAdStatus(): { adStatus: AdStatus | null; refetch: () => Promise<void> } {
  const { status } = usePlayerProfile();
  const [adStatus, setAdStatus] = useState<AdStatus | null>(null);

  const refetch = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) return;
    try {
      setAdStatus(await getAdStatus(token));
    } catch (error) {
      console.log('Failed to load ad status', error);
    }
  }, []);

  useEffect(() => {
    if (status === 'ready') void refetch();
  }, [status, refetch]);

  return { adStatus, refetch };
}
