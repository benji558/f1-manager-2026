// ============================================================
// TYRE ENGINE — All tyre physics: degradation, thermal state,
// performance modifier calculation.
// Pure functions only. No React. No side effects.
// ============================================================

import { COMPOUNDS } from '../data/tyres.js';
import { clamp, lerp, gaussianRandom } from './engineUtils.js';

/**
 * Create a fresh tyre state object for a given compound.
 * Called when a driver starts the race or exits the pit lane.
 * @param {string} compound - e.g. 'SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'
 * @returns {TyreState}
 */
export function createFreshTyre(compound) {
  const spec = COMPOUNDS[compound];
  if (!spec) throw new Error(`Unknown compound: ${compound}`);
  return {
    compound,
    age: 0,
    wear: 0.0,            // 0.0 = new, 1.0 = fully worn/destroyed
    temperature: 60,      // cold off the blankets — will warm up over laps 1–3
    thermalState: 'COLD',
    performanceModifier: spec.peakPerformance + spec.coldStartPenalty,
    pitStopScheduled: false,
  };
}

/**
 * Compute per-lap tyre degradation rate (wear units per lap).
 * Takes into account: compound base rate, circuit tyre wear,
 * driver tyre management skill, car tyre efficiency, and push level.
 *
 * @param {string} compound
 * @param {number} circuitTyreWear - circuit.tyreWear (0–100)
 * @param {number} driverTyreMgmt - driver.attributes.tyre_management (1–100)
 * @param {number} carTyreEff - team.car.tyre_efficiency (1–100)
 * @param {number} pushLevel - 0.0–1.0
 * @returns {number} wear units to add this lap
 */
export function calculateDegRate(compound, circuitTyreWear, driverTyreMgmt, carTyreEff, pushLevel) {
  const spec = COMPOUNDS[compound];

  // Circuit multiplier: 50 is "standard". Qatar at 88 is brutal; Monaco at 35 is gentle.
  const circuitMult = circuitTyreWear / 50;

  // Driver tyre management reduces wear (score above 80 helps, below 80 hurts slightly)
  const driverMult = 1 - (driverTyreMgmt - 80) / 400;

  // Car's tyre efficiency reduces wear
  const carMult = 1 - (carTyreEff - 80) / 400;

  // Push level: above 0.5 starts generating extra wear
  const pushMult = 1 + Math.max(0, pushLevel - 0.5) * 0.6;

  return spec.baseDegPerLap * circuitMult * driverMult * carMult * pushMult;
}

/**
 * Compute the optimal tyre temperature target for the current lap.
 * Higher push level and warmer circuits push the temperature up.
 *
 * @param {string} compound
 * @param {number} circuitBaseTemp - circuit.baseTemp (Celsius)
 * @param {number} pushLevel - 0.0–1.0
 * @returns {number} target temperature in Celsius
 */
export function getTargetTemp(compound, circuitBaseTemp, pushLevel) {
  const spec = COMPOUNDS[compound];
  const midpoint = (spec.optimalTempMin + spec.optimalTempMax) / 2;
  // Pushing generates heat; cold circuits reduce it
  const pushHeat = pushLevel * 15;
  const ambientEffect = (circuitBaseTemp - 20) * 0.5;
  return midpoint + pushHeat + ambientEffect;
}

/**
 * Determine tyre thermal state based on current temperature vs compound window.
 *
 * @param {string} compound
 * @param {number} temperature
 * @param {number} wear
 * @returns {string} 'COLD' | 'OPTIMAL' | 'OVERHEATING' | 'GRAINING'
 */
export function getThermalState(compound, temperature, wear) {
  const spec = COMPOUNDS[compound];
  if (temperature < spec.optimalTempMin) return 'COLD';
  if (temperature > spec.optimalTempMax) return 'OVERHEATING';
  // Graining can occur at moderate wear when tyre gets used past optimal period
  if (wear > 0.45 && Math.random() < spec.grainRisk * 0.3) return 'GRAINING';
  return 'OPTIMAL';
}

/**
 * Compute the time penalty (seconds added to lap) from thermal state.
 *
 * @param {string} thermalState
 * @param {string} compound
 * @param {number} temperature
 * @returns {number} seconds added to lap time (positive = slower)
 */
export function getThermalPenalty(thermalState, compound, temperature) {
  const spec = COMPOUNDS[compound];
  switch (thermalState) {
    case 'COLD':
      return (spec.optimalTempMin - temperature) * 0.04;
    case 'OVERHEATING':
      return (temperature - spec.optimalTempMax) * 0.06;
    case 'GRAINING':
      return gaussianRandom(0.35, 0.12);
    default:
      return 0;
  }
}

/**
 * Compute wear-based performance penalty (seconds added to lap).
 * Non-linear: the last 20% of wear causes a dramatic cliff.
 *
 * @param {string} wearCurve - compound wearCurve type
 * @param {number} wear - 0.0–1.0
 * @returns {number} seconds added to lap time
 */
export function getWearPenalty(wearCurve, wear) {
  if (wear <= 0) return 0;
  switch (wearCurve) {
    case 'AGGRESSIVE':
      // Sharp cliff at 70%+ wear
      return Math.pow(wear, 1.6) * 4.5;
    case 'LINEAR':
      return wear * 3.2;
    case 'PLATEAU':
      // Stays flat until 80% wear, then drops sharply
      if (wear < 0.8) return wear * 1.5;
      return 1.2 + Math.pow((wear - 0.8) / 0.2, 2) * 6.0;
    default:
      return wear * 3.5;
  }
}

/**
 * Full tyre performance modifier (seconds added to lap time).
 * Negative = tyre is faster than medium at zero wear.
 * Positive = tyre is slower.
 *
 * @param {TyreState} tyreState
 * @returns {number} seconds to add to lap time
 */
export function getTyrePerformanceModifier(tyreState) {
  const spec = COMPOUNDS[tyreState.compound];
  const wearPenalty = getWearPenalty(spec.wearCurve, tyreState.wear);
  const thermalPenalty = getThermalPenalty(tyreState.thermalState, tyreState.compound, tyreState.temperature);

  // Peak performance is the compound's baseline advantage/disadvantage at 0 wear
  return spec.peakPerformance + wearPenalty + thermalPenalty;
}

/**
 * Advance tyre state by one lap.
 * Returns a new TyreState object (immutable pattern).
 *
 * @param {TyreState} tyreState - current state
 * @param {string} compound
 * @param {number} circuitTyreWear
 * @param {number} circuitBaseTemp
 * @param {number} driverTyreMgmt
 * @param {number} carTyreEff
 * @param {number} pushLevel
 * @param {boolean} safetyCarActive - SC means less tyre stress
 * @returns {TyreState} new tyre state
 */
export function advanceTyreLap(
  tyreState, compound, circuitTyreWear, circuitBaseTemp,
  driverTyreMgmt, carTyreEff, pushLevel, safetyCarActive
) {
  const spec = COMPOUNDS[compound];

  // Degradation (SC laps cause minimal wear)
  const scFactor = safetyCarActive ? 0.2 : 1.0;
  const degRate = calculateDegRate(compound, circuitTyreWear, driverTyreMgmt, carTyreEff, pushLevel);
  const newWear = clamp(tyreState.wear + degRate * scFactor, 0, 1);

  // Temperature (thermal lag: tyre moves 20% toward target each lap)
  const targetTemp = getTargetTemp(compound, circuitBaseTemp, safetyCarActive ? 0.3 : pushLevel);
  const newTemp = lerp(tyreState.temperature, targetTemp, 0.2);

  // Thermal state
  const newThermalState = getThermalState(compound, newTemp, newWear);

  // Full performance modifier
  const newState = {
    compound,
    age: tyreState.age + 1,
    wear: newWear,
    temperature: newTemp,
    thermalState: newThermalState,
    pitStopScheduled: tyreState.pitStopScheduled,
    performanceModifier: 0, // will be computed below
  };
  newState.performanceModifier = getTyrePerformanceModifier(newState);

  return newState;
}

/**
 * Penalty for running the wrong type of tyre for weather conditions.
 * Running slicks in the wet, or full wets on a dry track, is extremely costly.
 *
 * @param {string} compound
 * @param {number} trackWetness - 0.0–1.0
 * @returns {number} seconds added to lap time
 */
export function getWrongTyrePenalty(compound, trackWetness) {
  const isSlick = ['SOFT', 'MEDIUM', 'HARD'].includes(compound);
  const isFullWet = compound === 'WET';
  const isInter = compound === 'INTERMEDIATE';

  if (isSlick && trackWetness > 0.1) {
    // Slick in rain: catastrophic — also increases failure risk
    return trackWetness * 10.0;
  }
  if (isFullWet && trackWetness < 0.1) {
    // Full wet on dry: severely slow
    return (0.1 - trackWetness) * 40;
  }
  if (isFullWet && trackWetness < 0.5) {
    // Full wet on damp: just slow
    return (0.5 - trackWetness) * 5.0;
  }
  if (isInter && trackWetness > 0.7) {
    // Intermediate in heavy rain: slightly slower than full wet
    return (trackWetness - 0.7) * 3.0;
  }
  return 0;
}
