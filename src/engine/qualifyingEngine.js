// ============================================================
// QUALIFYING ENGINE — Q1 / Q2 / Q3 knockout simulation
// Pure functions only. No React. No side effects.
// ============================================================

import { DRIVER_MAP } from '../data/drivers.js';
import { TEAM_MAP }   from '../data/teams.js';
import { clamp, gaussianRandom } from './engineUtils.js';

/**
 * Simulate a single qualifying lap for one driver.
 *
 * The lap time is derived from the same car/driver formula as the race engine,
 * but optimised for a low-fuel, high-push single flying lap.
 * Qualifying adds a variability roll: each attempt can be slightly better or worse
 * depending on track evolution, traffic, and driver errors.
 *
 * @param {string} driverId
 * @param {string} teamId
 * @param {Object} circuit
 * @param {string} compound - SOFT for Q1/Q2/Q3, or forced compound for Q2 starts
 * @param {number} attemptNumber - 1st, 2nd, 3rd attempt in the session (track improves)
 * @param {Object} carOverrides - optional live car attributes from gameState upgrades
 * @returns {{ lapTime: number, personal_best: boolean }}
 */
export function simulateQualifyingLap(driverId, teamId, circuit, compound = 'SOFT', attemptNumber = 1, carOverrides = null) {
  const driverData = DRIVER_MAP[driverId];
  const teamData   = TEAM_MAP[teamId];
  if (!driverData || !teamData) throw new Error(`Unknown driver/team: ${driverId}/${teamId}`);

  const car  = carOverrides ?? teamData.car;
  const attr = driverData.attributes;

  // ── Car performance score (same formula as race engine) ──
  const downforceW = circuit.downforceRequirement / 100;
  const engineW    = circuit.engineSensitivity / 100;
  const tyreW      = circuit.tyreWear / 100;

  const carScore = (
    car.aerodynamics   * (downforceW * 0.5 + 0.15) +
    car.engine_power   * (engineW    * 0.5 + 0.15) +
    car.tyre_efficiency * (tyreW * 0.3 + 0.10) +
    car.reliability    * 0.10
  ) / (downforceW * 0.5 + 0.15 + engineW * 0.5 + 0.15 + tyreW * 0.3 + 0.10 + 0.10);

  // ── Driver pace (qualification emphasises raw pace more than race) ──
  const driverScore = attr.pace * 0.65 + attr.consistency * 0.20 + attr.racecraft * 0.15;

  const carDelta    = (carScore    - 80) * 0.0025;
  const driverDelta = (driverScore - 80) * 0.0018; // slightly more driver-sensitive in quali

  let lapTime = circuit.baseLapTime * (1 - carDelta) * (1 - driverDelta);

  // ── Qualifying-specific optimisations ──
  // Push level is maximum in qualifying (1.0)
  lapTime -= 0.4; // Push bonus at max attack

  // Low fuel: qualifying uses ~5kg (vs 110kg in race)
  // Saves roughly: (110 - 5) * 0.035 ≈ 3.7 seconds
  lapTime -= 3.7;

  // ── Tyre compound effect ──
  // SOFT tyres are almost always used in qualifying for peak performance
  const compoundBonus = { SOFT: -1.8, MEDIUM: 0, HARD: 1.5 };
  lapTime += compoundBonus[compound] ?? 0;

  // ── Track evolution ──
  // The track "rubbers in" over the course of the session.
  // Later attempts benefit from increased grip.
  const trackEvolution = (attemptNumber - 1) * 0.06;
  lapTime -= trackEvolution;

  // ── Variability ──
  // Even the best drivers make mistakes or hit traffic.
  // Lower consistency = more variance. Q3 heroes can also find lap time.
  const inconsistency = (100 - attr.consistency) / 100;
  const variance = gaussianRandom(0, inconsistency * 0.25);
  lapTime += variance;

  // Floor: can't go below ~97% of reference
  lapTime = Math.max(lapTime, circuit.baseLapTime * 0.92);

  return {
    lapTime,
    isMegaLap: lapTime < circuit.baseLapTime * (1 - carDelta) * (1 - driverDelta) - 1.0,
  };
}

/**
 * Run a full qualifying session (Q1, Q2, or Q3).
 *
 * In Q1 and Q2, each driver gets 2–3 timed laps. We simulate their best attempt.
 * In Q3 (top 10), drivers get up to 2 flying laps — their best counts.
 *
 * @param {Array}  entries  - array of { driverId, teamId } (all drivers in this session)
 * @param {Object} circuit
 * @param {string} session  - 'Q1' | 'Q2' | 'Q3'
 * @param {Object} carOverridesMap - optional { [teamId]: carAttributes }
 * @returns {Array} sorted by lapTime asc — [{ driverId, teamId, lapTime, gap }]
 */
export function simulateQualifyingSession(entries, circuit, session, carOverridesMap = {}) {
  const results = entries.map(entry => {
    const carOverrides = carOverridesMap[entry.teamId] ?? null;
    const attempts = session === 'Q3' ? 2 : 2;

    let bestTime = Infinity;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const { lapTime } = simulateQualifyingLap(
        entry.driverId, entry.teamId, circuit, 'SOFT', attempt, carOverrides
      );
      if (lapTime < bestTime) bestTime = lapTime;
    }

    return {
      driverId: entry.driverId,
      teamId:   entry.teamId,
      lapTime:  bestTime,
      gap:      0,
      eliminated: false,
    };
  });

  // Sort by lap time
  results.sort((a, b) => a.lapTime - b.lapTime);

  // Calculate gaps to P1
  const poleTime = results[0].lapTime;
  results.forEach((r, i) => {
    r.gap      = r.lapTime - poleTime;
    r.position = i + 1;
  });

  return results;
}

/**
 * Run the full three-session knockout qualifying.
 * Returns the complete starting grid and per-session times.
 *
 * @param {Array}  allDriverEntries - all 22 { driverId, teamId }
 * @param {Object} circuit
 * @param {Object} carOverridesMap
 * @returns {{ grid, q1Results, q2Results, q3Results }}
 */
export function runFullQualifying(allDriverEntries, circuit, carOverridesMap = {}) {
  // ── Q1: All 22 drivers. Bottom 5 eliminated (P18–P22). ──
  const q1Results = simulateQualifyingSession(allDriverEntries, circuit, 'Q1', carOverridesMap);
  const q1Eliminated = q1Results.slice(17); // P18–P22
  const q2Entries    = q1Results.slice(0, 17).map(r => ({ driverId: r.driverId, teamId: r.teamId }));

  q1Eliminated.forEach(r => { r.eliminated = true; });

  // ── Q2: Top 17 from Q1. Bottom 5 eliminated (P13–P17). ──
  const q2Results = simulateQualifyingSession(q2Entries, circuit, 'Q2', carOverridesMap);
  const q2Eliminated = q2Results.slice(12); // P13–P17
  const q3Entries    = q2Results.slice(0, 10).map(r => ({ driverId: r.driverId, teamId: r.teamId }));

  q2Eliminated.forEach(r => { r.eliminated = true; });

  // ── Q3: Top 10 from Q2. This sets positions P1–P10 on the grid. ──
  const q3Results = simulateQualifyingSession(q3Entries, circuit, 'Q3', carOverridesMap);

  // ── Assemble final starting grid ──
  // Grid positions 1–10: from Q3 order
  // Grid positions 11–17: from Q2 elimination order
  // Grid positions 18–22: from Q1 elimination order
  const grid = [
    ...q3Results.map((r, i) => ({
      driverId:     r.driverId,
      teamId:       r.teamId,
      gridPosition: i + 1,
      q3Time:       r.lapTime,
      q2Time:       q2Results.find(q => q.driverId === r.driverId)?.lapTime ?? null,
      q1Time:       q1Results.find(q => q.driverId === r.driverId)?.lapTime ?? null,
      gap:          r.gap,
    })),
    ...q2Eliminated.map((r, i) => ({
      driverId:     r.driverId,
      teamId:       r.teamId,
      gridPosition: 11 + i,
      q2Time:       r.lapTime,
      q1Time:       q1Results.find(q => q.driverId === r.driverId)?.lapTime ?? null,
      q3Time:       null,
      gap:          null,
    })),
    ...q1Eliminated.map((r, i) => ({
      driverId:     r.driverId,
      teamId:       r.teamId,
      gridPosition: 18 + i,
      q1Time:       r.lapTime,
      q2Time:       null,
      q3Time:       null,
      gap:          null,
    })),
  ];

  return { grid, q1Results, q2Results, q3Results };
}
