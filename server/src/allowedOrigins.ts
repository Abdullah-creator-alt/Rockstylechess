// Feeds three call sites that used to be wide open (Express `cors()` with no
// options, Socket.IO's `cors: { origin: '*' }`, and better-auth's
// `trustedOrigins`): browser/web clients send an `Origin` header that must
// match one of these to pass CORS; native Expo/React Native clients don't
// send one at all, so this list has no effect on them.
const webOrigins = (process.env.WEB_CLIENT_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// better-auth's `trustedOrigins` also accepts app-scheme URIs (e.g.
// "rockstylechess://") to validate OAuth/deep-link redirects against, on top
// of the web origins above.
const appScheme = process.env.MOBILE_APP_SCHEME;
const appSchemeOrigins = appScheme ? [`${appScheme}://`] : [];

// Running the app through the Expo Go client (rather than a standalone/
// dev-client build) ignores app.json's "scheme" entirely -- Expo Go's own
// Linking.createURL always reports an "exp://<lan-ip>:<port>" origin
// instead, which varies per dev machine/network and can't be pinned to one
// value. better-auth's origin matcher treats a scheme-only pattern with no
// host as a prefix match (see matchesOriginPattern in better-auth's
// trusted-origins.ts), so "exp://" here trusts any exp:// origin -- fine
// for local dev, since only the Expo Go client itself ever presents one.
const expoGoOrigins = ['exp://'];

export const allowedWebOrigins = webOrigins;
export const allowedAppSchemes = appSchemeOrigins;
export const allowedTrustedOrigins = [...webOrigins, ...appSchemeOrigins, ...expoGoOrigins];
