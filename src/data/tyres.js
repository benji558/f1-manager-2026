// ============================================================
// TYRES.JS — Tyre compound definitions for the 2026 season
// These are frozen constants used by the tyre engine and race engine.
// ============================================================

export const COMPOUNDS = Object.freeze({
  SOFT: {
    id: 'SOFT',
    label: 'Soft',
    color: '#FF2020',
    optimalTempMin: 90,
    optimalTempMax: 110,
    baseDegPerLap: 0.045,    // wear units per lap at nominal load
    grainRisk: 0.25,          // probability per lap when below optimal temp
    blisterRisk: 0.30,        // probability per lap when above optimal temp
    peakPerformance: -1.8,    // seconds FASTER than Medium at 0 wear, optimal temp
    wearCurve: 'AGGRESSIVE',  // performance cliff shape: non-linear drop at high wear
    maxRecommendedLaps: 22,
    wetCapability: 0.0,       // 0 = completely unsafe in rain
    coldStartPenalty: 0.8,    // extra seconds on lap 1 (cold blankets removed)
  },
  MEDIUM: {
    id: 'MEDIUM',
    label: 'Medium',
    color: '#FFFF00',
    optimalTempMin: 85,
    optimalTempMax: 105,
    baseDegPerLap: 0.028,
    grainRisk: 0.10,
    blisterRisk: 0.15,
    peakPerformance: 0.0,     // baseline reference compound
    wearCurve: 'LINEAR',
    maxRecommendedLaps: 38,
    wetCapability: 0.0,
    coldStartPenalty: 0.5,
  },
  HARD: {
    id: 'HARD',
    label: 'Hard',
    color: '#FFFFFF',
    optimalTempMin: 95,
    optimalTempMax: 115,
    baseDegPerLap: 0.016,
    grainRisk: 0.35,          // hardest to get into optimal temperature window
    blisterRisk: 0.05,
    peakPerformance: 1.5,     // seconds SLOWER than Medium at 0 wear
    wearCurve: 'PLATEAU',     // stays flat for longer before dropping
    maxRecommendedLaps: 55,
    wetCapability: 0.0,
    coldStartPenalty: 1.2,
  },
  INTERMEDIATE: {
    id: 'INTERMEDIATE',
    label: 'Intermediate',
    color: '#00CC00',
    optimalTempMin: 40,
    optimalTempMax: 70,
    baseDegPerLap: 0.022,
    grainRisk: 0.05,
    blisterRisk: 0.40,        // dangerous if track dries unexpectedly
    peakPerformance: 0.0,     // reference in light wet conditions
    wearCurve: 'AGGRESSIVE',
    maxRecommendedLaps: 30,
    wetCapability: 0.7,       // 0–1: how suited to full wet vs intermediate
    coldStartPenalty: 0.2,
  },
  WET: {
    id: 'WET',
    label: 'Wet',
    color: '#0055FF',
    optimalTempMin: 20,
    optimalTempMax: 55,
    baseDegPerLap: 0.012,
    grainRisk: 0.02,
    blisterRisk: 0.50,        // extremely dangerous on a drying track
    peakPerformance: 0.0,     // reference in heavy rain
    wearCurve: 'LINEAR',
    maxRecommendedLaps: 40,
    wetCapability: 1.0,
    coldStartPenalty: 0.1,
  },
});

// Array form for iteration
export const COMPOUND_LIST = Object.values(COMPOUNDS);

// Compounds that are safe on a DRY track
export const SLICK_COMPOUNDS = ['SOFT', 'MEDIUM', 'HARD'];

// Compounds that are safe in wet conditions
export const WET_COMPOUNDS = ['INTERMEDIATE', 'WET'];

// Get which compounds are safe for current weather wetness
export function getSafeCompounds(trackWetness) {
  if (trackWetness < 0.1) return SLICK_COMPOUNDS;
  if (trackWetness < 0.5) return ['INTERMEDIATE'];
  return ['WET'];
}
