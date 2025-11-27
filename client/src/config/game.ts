// Replace with your deployed package ID
export const GAME_PACKAGE_ID = '0x16d2cab2772b1fc4372cefe3a50c76bc3c18feb9b7b685f56cd7b46c9e923d0a';

// Tier entry fees in MIST (1 SUI = 1_000_000_000 MIST)
export const TIER_ENTRY_FEES = {
  1: 100_000_000,   // 0.1 SUI
  2: 500_000_000,   // 0.5 SUI
  3: 1_000_000_000, // 1.0 SUI
} as const;
