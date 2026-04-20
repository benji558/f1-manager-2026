// ============================================================
// CONSTANTS.JS — Game-wide rules, points, and financial constants
// ============================================================

export const GAME_VERSION = '1.0.0';

// F1 points system: positions 1–10 earn points
export const POINTS_TABLE = Object.freeze([25, 18, 15, 12, 10, 8, 6, 4, 2, 1]);

// Extra point for fastest lap (only if driver finishes in top 10)
export const FASTEST_LAP_POINT = 1;

// Constructors' championship end-of-season prize money (USD)
export const CONSTRUCTOR_PRIZE_MONEY = Object.freeze([
  200_000_000, // P1
  175_000_000, // P2
  155_000_000, // P3
  140_000_000, // P4
  128_000_000, // P5
  118_000_000, // P6
  108_000_000, // P7
   98_000_000, // P8
   88_000_000, // P9
   78_000_000, // P10
   68_000_000, // P11
]);

// Per-race prize money based on finishing position (per driver, i.e. per car)
export const RACE_PRIZE_MONEY = Object.freeze([
  2_000_000, 1_500_000, 1_200_000, 1_000_000, 800_000,
    600_000,   400_000,   300_000,   200_000, 100_000,
          0,         0,         0,         0,       0,
          0,         0,         0,         0,       0,
          0,         0,
]);

// R&D tokens earned per race based on finishing positions above team's expected baseline
export const RD_TOKENS_PER_RACE_WIN       = 5;
export const RD_TOKENS_PER_RACE_PODIUM    = 3;
export const RD_TOKENS_PER_RACE_POINTS    = 1;
export const RD_TOKENS_CONSTRUCTORS_LEAD  = 3; // bonus each race while leading WCC

// Fuel and lap simulation constants
export const FUEL_START_KG       = 110;    // starting fuel load in kg
export const FUEL_BURN_PER_LAP   = 1.85;   // average kg burned per lap
export const FUEL_PUSH_EXTRA     = 0.15;   // extra kg burned per lap at max push
export const FUEL_LAP_TIME_COST  = 0.035;  // seconds per kg of fuel weight

// Safety car lap time relative to fastest normal lap
export const SC_LAP_TIME_FACTOR  = 1.38;   // 38% slower than race pace
export const VSC_LAP_TIME_FACTOR = 1.25;   // 25% slower than race pace

// Gap compression per lap while safety car is active
export const SC_GAP_COMPRESSION  = 0.18;   // fraction of gap closed per SC lap
export const SC_MIN_GAP          = 0.5;    // minimum gap maintained between cars (seconds)

// Pit stop time constants
export const PIT_STOP_MEAN       = 24.0;   // average pit stop duration (seconds)
export const PIT_STOP_STDDEV     = 0.8;    // standard deviation (variation in crew speed)

// Simulation speed options (ms per lap tick)
export const SIM_SPEED = Object.freeze({
  NORMAL:  1500,
  FAST:     400,
  INSTANT:    0,
});

// Session phases in order
export const SESSION_PHASES = Object.freeze([
  'MAIN_HUB',
  'PRACTICE',
  'QUALIFYING',
  'STRATEGY',
  'RACE',
  'RESULTS',
]);

// Driver market: free agent pool size each off-season
export const FREE_AGENT_COUNT = 5;

// Qualifying compound rule: P11–P17 must start on Q2 tyre
export const Q2_TYRE_RULE_POSITIONS = [11, 12, 13, 14, 15, 16, 17];

// Default push level for AI drivers (neutral)
export const DEFAULT_PUSH_LEVEL = 0.5;

// Save slot count
export const SAVE_SLOT_COUNT = 3;
export const SAVE_KEY_PREFIX  = 'f1manager_save_';
