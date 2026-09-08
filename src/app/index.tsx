import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Colors } from '@/constants/theme';
import { getAuthToken } from '@/lib/authStorage';
import { getGuestMode } from '@/lib/guestMode';

// Entry route -- decides where a cold launch lands:
//  - a stored session token  -> /home (signed in)
//  - an explicit guest choice -> /home (see lib/guestMode.ts)
//  - otherwise                -> /sign-in, where the player picks sign in,
//    sign up, or Continue as Guest. A fresh install or a just-logged-out
//    user always hits that gate rather than silently becoming a guest.
export default function Index() {
  const [target, setTarget] = useState<'/sign-in' | '/home' | null>(null);

  useEffect(() => {
    Promise.all([getAuthToken(), getGuestMode()]).then(([token, guest]) =>
      setTarget(token || guest ? '/home' : '/sign-in'),
    );
  }, []);

  // Brief blank frame while SecureStore / AsyncStorage are read -- unavoidable
  // since those reads are async and Redirect needs a real href, but it's a
  // background color, not a spinner, since it's normally imperceptible.
  if (!target) return <View style={{ flex: 1, backgroundColor: Colors.bgBase }} />;
  return <Redirect href={target} />;
}
