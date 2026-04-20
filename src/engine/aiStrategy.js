// ============================================================
// AI STRATEGY — Pit stop decisions and push level selection
// for AI-controlled drivers.
// Pure functions only. No React. No side effects.
// ============================================================

import { clamp } from './engineUtils.js';
import { getRecommendedCompound } from './weatherEngine.js';

/**
 * Decide whether an AI driver should pit this lap.
 * Checks in priority order — first matching condition wins.
 *
 * @param {Object} driver - driver race state (tyre, fuelLoad, position, etc.)
 * @param {Object} raceState - full RaceLapState
 * @param {Object} circuit
 * @returns {boolean}
 */
export function shouldAIPit(driver, raceState, circuit) {
  const { tyre, pitStops, position } = driver;
  const { currentLap, totalLaps, safetyCarActive, weather } = raceState;
  const lapsRemaining = totalLaps - currentLap;

  // PRIORITY 1: Tyre destroyed — must pit immediately
  if (tyre.wear > 0.88) return true;

  // PRIORITY 2: Wrong compound for current weather
  const recommendedType = getWetDryType(weather.trackWetness, tyre.compound);
  if (recommendedType === 'WRONG') return true;

  // PRIORITY 3: Too close to end of race to make a pit worthwhile
  // Don't pit if fewer than 5 laps remain (unless forced)
  if (lapsRemaining < 5) return false;

  // PRIORITY 4: Safety car is out — free pit stop opportunity
  if (safetyCarActive && tyre.wear > 0.30 && pitStops < 3) {
    return true;
  }

  // PRIORITY 5: Planned strategic window
  // One-stop strategy: pit between laps 25–45% of race distance
  if (pitStops === 0) {
    const windowStart = Math.floor(totalLaps * 0.28);
    const windowEnd   = Math.floor(totalLaps * 0.48);
    if (currentLap >= windowStart && currentLap <= windowEnd && tyre.wear > 0.45) {
      return true;
    }
  }

  // PRIORITY 6: Two-stop second pit window
  if (pitStops === 1) {
    const windowStart = Math.floor(totalLaps * 0.62);
    const windowEnd   = Math.floor(totalLaps * 0.80);
    if (currentLap >= windowStart && currentLap <= windowEnd && tyre.wear > 0.50) {
      return true;
    }
  }

  // PRIORITY 7: High tyre wear — urgent pit (not quite critical)
  if (tyre.wear > 0.78 && lapsRemaining > 5) return true;

  return false;
}

/**
 * Choose which compound an AI driver should go on after their pit stop.
 * Prefers a compound that will last to the end of the race.
 *
 * @param {Object} driver - driver race state
 * @param {Object} raceState
 * @returns {string} compound ID
 */
export function chooseAICompound(driver, raceState) {
  const { currentLap, totalLaps, weather } = raceState;
  const { pitStops } = driver;
  const lapsRemaining = totalLaps - currentLap;

  // Weather override: if track is wet, go to correct compound
  if (weather.trackWetness > 0.5) return 'WET';
  if (weather.trackWetness > 0.1) return 'INTERMEDIATE';

  // For a dry track, choose based on laps remaining
  if (lapsRemaining > 40) return 'MEDIUM';
  if (lapsRemaining > 25) {
    // If already on medium or hard, try medium/soft; if on soft, go medium
    return driver.tyre.compound === 'SOFT' ? 'MEDIUM' : 'HARD';
  }
  if (lapsRemaining > 12) {
    // Late race with >12 laps: medium or soft sprint
    return pitStops >= 2 ? 'SOFT' : 'MEDIUM';
  }
  // Final stint: softs for maximum pace
  return 'SOFT';
}

/**
 * Decide push level for an AI driver this lap.
 * Balances pace vs tyre conservation vs race position.
 *
 * @param {Object} driver - driver race state
 * @param {Object} raceState
 * @returns {number} 0.0–1.0
 */
export function decideAIPushLevel(driver, raceState) {
  const { tyre, gapToNext, position } = driver;
  const { currentLap, totalLaps } = raceState;
  const lapsRemaining = totalLaps - currentLap;

  // If on worn tyres, back off to avoid failure
  if (tyre.wear > 0.75) return 0.30;
  if (tyre.wear > 0.60) return 0.40;

  // Final 5 laps: all out
  if (lapsRemaining <= 5) return 0.85;

  // Fighting for position: push hard
  if (gapToNext < 0.5) return 0.88;
  if (gapToNext < 1.5) return 0.75;

  // Comfortable gap ahead — manage tyres
  if (gapToNext > 5.0) return 0.38;

  // Default balanced pace
  return 0.52;
}

/**
 * Check if the compound type is correct for current track conditions.
 * Returns 'OK', 'WRONG', or 'SUBOPTIMAL'.
 */
function getWetDryType(trackWetness, compound) {
  const isSlick = ['SOFT', 'MEDIUM', 'HARD'].includes(compound);
  const isWetCompound = ['INTERMEDIATE', 'WET'].includes(compound);

  if (trackWetness < 0.1 && isWetCompound) return 'SUBOPTIMAL';
  if (trackWetness >= 0.5 && isSlick) return 'WRONG';
  if (trackWetness >= 0.15 && isSlick) return 'WRONG';
  return 'OK';
}

/**
 * Generate an initial race strategy for an AI driver.
 * Returns a strategy object with starting compound and planned pit windows.
 *
 * @param {string} driverId
 * @param {Object} circuit
 * @param {number} gridPosition
 * @returns {Object} strategy
 */
export function generateAIStrategy(driverId, circuit, gridPosition) {
  const { totalLaps = circuit.laps, tyreWear } = { totalLaps: circuit.laps, ...circuit };

  // High tyre wear circuits (Qatar, Bahrain) force more stops
  const isHighWear = tyreWear > 70;

  let startingCompound;
  let plannedPits;

  if (isHighWear) {
    // Two-stop preferred on high-wear circuits
    startingCompound = 'MEDIUM';
    const pit1 = Math.floor(totalLaps * 0.28) + Math.floor(Math.random() * 4);
    const pit2 = Math.floor(totalLaps * 0.60) + Math.floor(Math.random() * 4);
    plannedPits = [
      { onLap: pit1, toCompound: 'HARD' },
      { onLap: pit2, toCompound: 'MEDIUM' },
    ];
  } else {
    // One-stop: front runners often go soft then hard
    const isTopTeam = gridPosition <= 6;
    startingCompound = isTopTeam ? 'SOFT' : 'MEDIUM';
    const pit1 = Math.floor(totalLaps * 0.35) + Math.floor(Math.random() * 6);
    plannedPits = [
      { onLap: pit1, toCompound: isTopTeam ? 'MEDIUM' : 'HARD' },
    ];
  }

  return {
    startingCompound,
    plannedPits,
    fuelMode: 'STANDARD',
  };
}

/**
 * Check if an AI driver should react to an undercut threat —
 * i.e., the car immediately behind just pitted.
 *
 * @param {Object} driver
 * @param {Object[]} allDrivers - all driver race states
 * @param {Object[]} lapEvents - events from this lap
 * @returns {boolean}
 */
export function isUnderThreat(driver, allDrivers, lapEvents) {
  // Find the car 1–3 positions behind that just pitted
  const pitEvents = lapEvents.filter(e => e.type === 'PIT_STOP');
  for (const event of pitEvents) {
    const pitter = allDrivers.find(d => d.driverId === event.driverId);
    if (!pitter) continue;
    const posDiff = driver.position - pitter.position;
    if (posDiff > 0 && posDiff <= 3) {
      // Someone closely behind just pitted — potential undercut
      return true;
    }
  }
  return false;
}

/**
 * Check if an AI driver should attempt an overcut —
 * stay out and bank a big enough gap while leader pits.
 *
 * @param {Object} driver
 * @param {Object[]} lapEvents
 * @returns {boolean}
 */
export function canOvercut(driver, lapEvents) {
  const leaderPitted = lapEvents.some(
    e => e.type === 'PIT_STOP' && e.position === 1
  );
  // Only overcut if our tyre is good enough for a few more laps
  return leaderPitted && driver.tyre.wear < 0.55 && driver.position <= 5;
}
