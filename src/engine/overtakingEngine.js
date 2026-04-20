// ============================================================
// OVERTAKING ENGINE — Calculates DRS, dirty air, and overtake probability
// Pure functions only. No React. No side effects.
// ============================================================

import { clamp, gaussianRandom } from './engineUtils.js';

/**
 * Calculate the DRS time benefit for a driver in a DRS zone.
 * Depends on circuit DRS effectiveness and car engine power.
 *
 * @param {number} drsEffectiveness - circuit.drsEffectiveness (0–100)
 * @param {number} enginePower - team.car.engine_power (1–100)
 * @returns {number} seconds SUBTRACTED from lap time (positive = benefit)
 */
export function getDrsBonus(drsEffectiveness, enginePower) {
  // Base DRS effect scaled by circuit characteristic
  const base = (drsEffectiveness / 100) * 0.65;
  // Engine power bonus: high-power cars extract more from DRS
  const engineBonus = (enginePower - 80) / 100 * 0.12;
  return clamp(base + engineBonus, 0, 0.85);
}

/**
 * Calculate dirty air time penalty for a car following closely.
 * Only applies outside DRS zones and at gaps less than 1.5s.
 *
 * @param {number} gapToNext - gap to car ahead in seconds (0 = bumper to bumper)
 * @param {number} aerodynamics - team.car.aerodynamics (1–100): high-aero cars suffer more in dirty air
 * @returns {number} seconds ADDED to lap time (positive = slower)
 */
export function getDirtyAirPenalty(gapToNext, aerodynamics) {
  if (gapToNext >= 1.5) return 0;
  // Linear scale: 0s gap = max penalty, 1.5s gap = 0 penalty
  const proximity = (1.5 - gapToNext) / 1.5;
  // High-aero cars (sensitive to dirty air) suffer slightly more
  const aeroSensitivity = 1 + (aerodynamics - 80) / 200;
  return proximity * 0.4 * aeroSensitivity;
}

/**
 * Determine whether an overtake attempt succeeds this lap.
 * This is called AFTER sorting positions by totalTime, so overtakes
 * are actually captured by the time comparison. This function exists
 * to add realism by sometimes preventing an "on-paper" faster car
 * from getting past due to circuit difficulty.
 *
 * In practice, the simulator uses this to decide whether to EMIT an
 * OVERTAKE event when a driver moves up in position.
 *
 * @param {Object} attacker - driver state (has lastLapTime, gapToNext, drsActive)
 * @param {Object} defender - driver state ahead
 * @param {Object} circuit - circuit object
 * @returns {{ overtook: boolean, wasDefended: boolean }}
 */
export function resolveOvertakeEvent(attacker, defender, circuit) {
  const paceAdvantage = defender.lastLapTime - attacker.lastLapTime;
  const drsBoost = attacker.drsActive ? 0.35 : 0;
  const circuitDifficulty = circuit.overtakingDifficulty / 100; // 0 = easy, 1 = impossible

  // Minimum pace advantage needed to overtake cleanly
  const thresholdToOvertake = 0.1 + circuitDifficulty * 0.8;

  const adjustedAdvantage = paceAdvantage + drsBoost + gaussianRandom(0, 0.05);

  if (adjustedAdvantage >= thresholdToOvertake) {
    return { overtook: true, wasDefended: false };
  } else if (adjustedAdvantage > 0) {
    // Car behind is faster but can't find a way past — stays close
    return { overtook: false, wasDefended: true };
  }
  return { overtook: false, wasDefended: false };
}

/**
 * Generate a human-readable overtake description for the event log.
 *
 * @param {string} attackerName
 * @param {string} defenderName
 * @param {boolean} drsUsed
 * @param {boolean} safetyCarRestart
 * @returns {string}
 */
export function describeOvertake(attackerName, defenderName, drsUsed, safetyCarRestart) {
  if (safetyCarRestart) {
    return `${attackerName} got ahead of ${defenderName} at the safety car restart`;
  }
  if (drsUsed) {
    return `${attackerName} overtakes ${defenderName} with DRS`;
  }
  const descriptions = [
    `${attackerName} passes ${defenderName} into the braking zone`,
    `${attackerName} dives up the inside on ${defenderName}`,
    `${attackerName} gets ahead of ${defenderName} through superior pace`,
    `${attackerName} outbrakes ${defenderName} at the hairpin`,
    `${attackerName} pulls off a gutsy move on ${defenderName}`,
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}
