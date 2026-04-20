// ============================================================
// PRACTICE ENGINE — FP1 / FP2 / FP3 session simulation
// Provides tyre data, setup balance info, and driver feedback.
// Pure functions only. No React. No side effects.
// ============================================================

import { DRIVER_MAP } from '../data/drivers.js';
import { TEAM_MAP }   from '../data/teams.js';
import { gaussianRandom, clamp } from './engineUtils.js';

/**
 * Simulate a practice session for the player's team.
 * Returns tyre wear data, setup balance, and simulated lap times.
 *
 * @param {Array}  playerDriverIds - e.g. ['carlos_sainz', 'alexander_albon']
 * @param {string} playerTeamId
 * @param {Object} circuit
 * @param {string} session - 'FP1' | 'FP2' | 'FP3'
 * @param {Object} carAttributes - live car attributes (with upgrades applied)
 * @returns {Object} practice session result
 */
export function simulatePracticeSession(playerDriverIds, playerTeamId, circuit, session, carAttributes) {
  const teamData = TEAM_MAP[playerTeamId];
  const car = carAttributes ?? teamData.car;

  const results = playerDriverIds.map(driverId => {
    const driverData = DRIVER_MAP[driverId];
    const attr = driverData.attributes;

    // ── Simulate long run (tyre wear characterisation) ──
    const longRunLaps = { FP1: 8, FP2: 14, FP3: 6 }[session] ?? 10;
    const tyreData = {};

    ['SOFT', 'MEDIUM', 'HARD'].forEach(compound => {
      const lapsPerCompound = Math.floor(longRunLaps / 3);
      const wearPerLap = (circuit.tyreWear / 100) * (0.025 + Math.random() * 0.01);
      const degradationRate = wearPerLap * (1 - (attr.tyre_management - 75) / 150);

      tyreData[compound] = {
        compound,
        lapsSimulated: lapsPerCompound,
        estimatedDegPerLap: degradationRate,
        projectedStintLength: Math.floor(0.80 / degradationRate),
        thermalFeedback: getThermalFeedback(compound, circuit.baseTemp),
      };
    });

    // ── Simulate setup balance ──
    // Player can tweak this on the strategy screen
    const setupBalance = getSetupFeedback(car, circuit);

    // ── Simulate representative lap time ──
    const carScore = (car.aerodynamics * 0.35 + car.engine_power * 0.35 + car.tyre_efficiency * 0.30);
    const driverScore = attr.pace * 0.60 + attr.consistency * 0.25 + attr.racecraft * 0.15;
    const carDelta = (carScore - 80) * 0.0025;
    const driverDelta = (driverScore - 80) * 0.0018;
    const bestLap = circuit.baseLapTime * (1 - carDelta) * (1 - driverDelta) - 1.6 + gaussianRandom(0, 0.15);

    return {
      driverId,
      driverName: driverData.name,
      shortName:  driverData.shortName,
      session,
      bestLapTime: bestLap,
      longRunPace: bestLap + 0.6 + gaussianRandom(0.2, 0.1),
      tyreData,
      setupBalance,
      feedback: generateDriverFeedback(attr, car, circuit, session),
    };
  });

  return {
    session,
    circuitId: circuit.id,
    results,
    aiComparison: generateAIComparison(circuit, session),
  };
}

/** Generate thermal feedback text for a tyre compound at this circuit */
function getThermalFeedback(compound, baseTemp) {
  const tempMap = {
    SOFT: baseTemp > 25 ? 'Blistering risk at high ambient — watch temperatures' : 'Good thermal window',
    MEDIUM: 'Stable across all conditions',
    HARD: baseTemp < 20 ? 'Graining risk — tyre slow to warm up' : 'Strong durability expected',
  };
  return tempMap[compound] ?? 'Normal behaviour';
}

/** Analyse setup vs circuit characteristics and return recommendations */
function getSetupFeedback(car, circuit) {
  const overallBalance = car.aerodynamics > 85 && circuit.downforceRequirement > 70
    ? 'Strong downforce advantage at this circuit'
    : car.engine_power > 90 && circuit.engineSensitivity > 80
    ? 'Engine power should be decisive on the long straights'
    : 'Balanced setup recommended';

  return {
    summary: overallBalance,
    aeroRating: clamp(Math.round((car.aerodynamics / 100) * circuit.downforceRequirement), 0, 100),
    engineRating: clamp(Math.round((car.engine_power / 100) * circuit.engineSensitivity), 0, 100),
    tyreRating: clamp(Math.round((car.tyre_efficiency / 100) * circuit.tyreWear), 0, 100),
  };
}

/** Generate realistic driver feedback quote */
function generateDriverFeedback(attr, car, circuit, session) {
  const messages = [];

  if (car.aerodynamics < 80 && circuit.downforceRequirement > 65)
    messages.push('Car is struggling for downforce in the high-speed sections.');
  if (car.reliability < 75)
    messages.push('Engineering flagged some concerning data from the power unit sensors.');
  if (circuit.tyreWear > 75)
    messages.push('High tyre wear circuit — we will need a conservative approach.');
  if (circuit.streetCircuit)
    messages.push('It is tight here. Qualifying position will be everything.');
  if (session === 'FP2')
    messages.push('Long run data is looking decent. We should be in good shape for Sunday.');

  return messages.length > 0
    ? messages[Math.floor(Math.random() * messages.length)]
    : 'Positive session. The car is working well.';
}

/** Generate a simplified AI team comparison for the practice screen */
function generateAIComparison(circuit, session) {
  // Returns estimated P1 / P10 / P20 representative lap times
  // These are approximate benchmarks only — not from full simulation
  const p1Time = circuit.baseLapTime * (1 - 0.05) - 1.8; // top team + best driver
  const p10Time = p1Time + 1.2;
  const p20Time = p1Time + 3.8;
  return { p1: p1Time, p10: p10Time, p20: p20Time };
}
