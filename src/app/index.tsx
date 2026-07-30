import { Redirect } from 'expo-router';

// Entry route. Will eventually decide between auth and the lobby once
// Supabase session state exists; for now it just routes straight into
// the sign-up flow instead of showing a static placeholder.
export default function Index() {
  return <Redirect href="/sign-up" />;
}
