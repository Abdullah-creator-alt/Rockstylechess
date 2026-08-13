import { io, type Socket } from 'socket.io-client';

import { getAuthToken } from './authStorage';

// Baked into the client bundle at build time (Expo's EXPO_PUBLIC_* convention)
// -- falls back to a local dev URL so `npx expo start` + `npm run dev` in
// server/ just work together without any .env file. On a physical device
// over Expo Go, "localhost" is the phone itself, so real device testing
// needs EXPO_PUBLIC_SERVER_URL set to the dev machine's LAN IP (see
// server/README.md).
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;
let readyPromise: Promise<Socket> | null = null;

function createSocket(): Socket {
  return io(SERVER_URL, { transports: ['websocket'], autoConnect: true });
}

// Synchronous accessor, for call sites that only need to attach listeners
// or send something that doesn't depend on auth having resolved yet (e.g.
// queue:leave on unmount). Creates the connection on first call.
export function getSocket(): Socket {
  if (!socket) {
    socket = createSocket();
    void ensureAuthenticated();
  }
  return socket;
}

// Awaits the stored auth token (if any) being attached to the connection
// before resolving. Call sites where the server needs to see a trusted
// userId -- currently just matchmaking.tsx's queue:join -- should await
// this rather than just calling getSocket(), otherwise the async
// SecureStore read below can lose the race and the join goes out on the
// still-anonymous initial connection even though the player is signed in.
export function ensureAuthenticated(): Promise<Socket> {
  if (!socket) socket = createSocket();
  if (!readyPromise) {
    const currentSocket = socket;
    readyPromise = getAuthToken().then((token) => {
      if (token) {
        currentSocket.auth = { token };
        currentSocket.disconnect().connect();
      }
      return currentSocket;
    });
  }
  return readyPromise;
}

// Called right after a successful signup/login so the *current* connection
// picks up the new token immediately -- ensureAuthenticated()'s own lookup
// above only ever runs once, at first creation, so a login happening after
// that point needs this instead.
export function reauthenticateSocket(token: string): void {
  if (!socket) return;
  socket.auth = { token };
  socket.disconnect().connect();
  readyPromise = Promise.resolve(socket);
}

// Called on logout -- drops the trusted userId from the current connection
// by reconnecting with no token, falling back to anonymous/guest play
// rather than tearing the connection down entirely.
export function clearSocketAuth(): void {
  if (!socket) return;
  socket.auth = {};
  socket.disconnect().connect();
  readyPromise = Promise.resolve(socket);
}
