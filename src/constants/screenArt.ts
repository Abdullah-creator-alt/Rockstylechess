// Locally bundled atmospheric art exported from the Stitch mockups, kept in
// `assets/icons/images/<screen>-<n>.jpg`. Centralised here so screens reference
// a name instead of a brittle `../../../assets/...` path, and so it's obvious at
// a glance which mockup art is actually wired into the app.
//
// Not every provided JPG is here: bot/friend/rank portraits collide with the
// emoji-avatar system (`src/constants/avatars.ts`), and several exports are
// full mockup screenshots with baked-in UI text. See this file's git history /
// the chat that added it for the full disposition.

export const ScreenArt = {
  // Auth
  signInArena: require('../../assets/icons/images/sign-in-0.jpg'),
  signUpArena: require('../../assets/icons/images/sign-up-0.jpg'),

  // Home / rewards
  homeArenaHero: require('../../assets/icons/images/index-0.jpg'),
  dailyBonusChest: require('../../assets/icons/images/daily-bonus-0.jpg'),

  // Venues (setup.tsx) — keyed to the venue ids in that screen
  venueGarage: require('../../assets/icons/images/setup-0.jpg'),
  venueClub: require('../../assets/icons/images/setup-1.jpg'),
  venueArena: require('../../assets/icons/images/setup-2.jpg'),

  // Screen backdrops
  gameRoom: require('../../assets/icons/images/game-room-0.jpg'),
  frontRowCrowd: require('../../assets/icons/images/front-row-1.jpg'),
  puzzlesBoard: require('../../assets/icons/images/puzzles-0.jpg'),
  messagesLounge: require('../../assets/icons/images/messages-0.jpg'),
  rehearsalGarage: require('../../assets/icons/images/collections-1.jpg'),

  // Collectible card art (collections.tsx) — keyed to card ids
  collectibleThrasherMax: require('../../assets/icons/images/collections-0.jpg'),
  collectibleValkyrieRiff: require('../../assets/icons/images/collections-3.jpg'),
  collectibleIronSteed: require('../../assets/icons/images/collections-2.jpg'),
  collectibleSpikeJunior: require('../../assets/icons/images/collections-1.jpg'),
} as const;
