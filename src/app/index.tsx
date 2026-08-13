import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Colors } from '@/constants/theme';
import { getAuthToken } from '@/lib/authStorage';

// Entry route -- decides between the auth flow and the home lobby based on
// whether a stored session token exists (self-hosted JWT auth, see
// src/lib/authStorage.ts; supersedes the old "once Supabase session state
// exists" placeholder this route used to have).
export default function Index() {
  const [target, setTarget] = useState<'/sign-up' | '/home' | null>(null);

  useEffect(() => {
    getAuthToken().then((token) => setTarget(token ? '/home' : '/sign-up'));
  }, []);

  // Brief blank frame while SecureStore is read -- unavoidable since that
  // read is async and Redirect needs a real href, but it's a background
  // color, not a spinner, since it's normally imperceptible.
  if (!target) return <View style={{ flex: 1, backgroundColor: Colors.bgBase }} />;
  return <Redirect href={target} />;
}
