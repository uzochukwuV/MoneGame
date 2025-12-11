// Replace with your deployed package ID
export const GAME_PACKAGE_ID = '0x2877c01934184cc7c8fc5074b30ed286433b7be73056964bc8d5994a3407a8f1';
// real = 0xfe41a2c00448b8aa8f99bbc19d98dea558ce2df7d9fd390cf1eda76354d2db2f
// Tier entry fees in MIST (1 SUI = 1_000_000_000 MIST)
export const TIER_ENTRY_FEES = {
  1: 100_000_000,   // 0.1 SUI
  2: 500_000_000,   // 0.5 SUI
  3: 1_000_000_000, // 1.0 SUI
} as const;
