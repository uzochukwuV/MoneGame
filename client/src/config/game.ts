// Replace with your deployed package ID
export const GAME_PACKAGE_ID = '0xc0356b00aae8b63275fefbb5711469d0fd26d7b0b198761db295f0bee1f56d09';
// real = 0xfe41a2c00448b8aa8f99bbc19d98dea558ce2df7d9fd390cf1eda76354d2db2f
// Tier entry fees in MIST (1 SUI = 1_000_000_000 MIST)
export const TIER_ENTRY_FEES = {
  1: 100_000_000,   // 0.1 SUI
  2: 500_000_000,   // 0.5 SUI
  3: 1_000_000_000, // 1.0 SUI
} as const;
