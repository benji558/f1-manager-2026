// ============================================================
// RACE ENGINE — The heart of F1 Manager 2026
//
// This file contains the complete lap-by-lap race simulation.
// Every function here is a pure function: given the same inputs,
// it will always produce the same outputs. No React, no side effects.
//
// The two main exported functions are:
//   initializeRaceState(circuit, grid, strategies, weather)
//   simulateLap(raceState, playerDecisions)
//
// The UI calls simulateLap() on a timer (see useRaceSimulation.js).
// The result is dispatched to the game state reducer for display.
// ============================================================

import { DRIVER_MAP }   from '../data/drivers.js';
import { TEAM_MAP }     from '../data/teams.js';
import { COMPOUNDS }    from '../data/tyres.js';
import {
  FUEL_START_KG, FUEL_BURN_PER_LAP, FUEL_PUSH_EXTRA,
  FUEL_LAP_TIME_COST, SC_LAP_TIME_FACTOR, VSC_LAP_TIME_FACTOR,
  SC_GAP_COMPRESSION, SC_MIN_GAP,
} from '../data/constants.js';
import {
  clamp, lerp, gaussianRandom, weightedRandom,
  perLapProbability, deepClone,
} from './engineUtils.js';
import {
  createFreshTyre, advanceTyreLap, getWrongTyrePenalty,
} from './tyreEngine.js';
import {
  advanceWeatherLap, getWetWeatherModifier,
} from './weatherEngine.js';
import {
  getDrsBonus, getDirtyAirPenalty, resolveOvertakeEvent, describeOvertake,
} from './overtakingEngine.js';
import {
  shouldAIPit, chooseAICompound, decideAIPushLevel, isUnderThreat,
} from './aiStrategy.js';

// ============================================================
// INITIALIZE RACE STATE
// Sets up the starting RaceLapState before lap 1.
// Called once when the race begins.
// ============================================================

/**
 * Build the initial race state from qualifying grid and pre-race strategy choices.
 *
 * @param {Object} circuit - full circuit object from circuits.js
 * @param {Array}  grid    - array of { driverId, teamId, startPosition } sorted P1→P22
 * @param {Object} strategies - map of driverId → { startingCompound, plannedPits, fuelMode }
 * @param {Object} weather - WeatherState from weatherEngine.generateRaceWeather()
 * @param {string} playerTeamId - the human player's team ID
 * @returns {RaceLapState}
 */
export function initializeRaceState(circuit, grid, strategies, weather, playerTeamId) {
  // Compute the starting fuel load. More fuel = heavier = slower early laps.
  // Fuel mode affects starting load: LEAN saves 3kg, RICH adds 3kg.
  const fuelModeOffset = { LEAN: -3, STANDARD: 0, RICH: 3 };

  const drivers = grid.map((entry, idx) => {
    const driverData  = DRIVER_MAP[entry.driverId];
    const teamData    = TEAM_MAP[entry.teamId];
    const strategy    = strategies[entry.driverId] ?? { startingCompound: 'MEDIUM', plannedPits: [], fuelMode: 'STANDARD' };
    const fuelOffset  = fuelModeOffset[strategy.fuelMode ?? 'STANDARD'] ?? 0;
    const startingFuel = FUEL_START_KG + fuelOffset;

    return {
      // ---- IDENTITY ----
      driverId:        entry.driverId,
      teamId:          entry.teamId,
      driverName:      driverData.name,
      driverShortName: driverData.shortName,
      teamColor:       teamData.color,
      isPlayerDriver:  teamData.id === playerTeamId,

      // ---- POSITION ----
      position:        entry.startPosition,   // current race position
      startPosition:   entry.startPosition,   // grid position (for position-change stat)

      // ---- TIMING ----
      totalTime:       entry.startPosition * 0.3, // Formation lap spacing (P1 = 0s, P22 = 6.3s)
      lastLapTime:     null,
      bestLapTime:     Infinity,
      lapFraction:     0.0, // 0–1: estimated progress through current lap (for track animation)

      // ---- GAP ----
      gap:      idx === 0 ? 0 : entry.startPosition * 0.3,
      gapToNext: 0.3, // gap to car ahead

      // ---- PIT & TYRE ----
      tyre:        createFreshTyre(strategy.startingCompound),
      pitStops:    0,
      pitHistory:  [],
      plannedPits: strategy.plannedPits ?? [],

      // ---- FUEL ----
      fuelLoad: startingFuel,

      // ---- RACE CONTROL ----
      pushLevel:    0.5,     // default: neutral pace
      drsEligible:  false,
      drsActive:    false,
      dnf:          false,
      dnfReason:    null,
      penaltySeconds: 0,

      // ---- STATS ----
      positionChanges:  0,   // net positions gained vs start
      lapsCompleted:    0,
    };
  });

  return Object.freeze({
    circuitId:   circuit.id,
    circuit,
    currentLap:  0,          // will be 1 after first simulateLap call
    totalLaps:   circuit.laps,
    weather:     Object.freeze(weather),
    safetyCarActive:          false,
    safetyCarDeployedOnLap:   null,
    safetyCarLapsRemaining:   0,
    virtualSafetyCarActive:   false,
    vscLapsRemaining:         0,
    fastestLapHolder:         null,
    fastestLapTime:           Infinity,
    fastestLapLap:            null,
    drivers:     Object.freeze(drivers),
    events:      Object.freeze([]),
    isComplete:  false,
    playerTeamId,
  });
}

// ============================================================
// SIMULATE ONE LAP
// The core of the game. Pure function — never mutates its inputs.
// Call this once per tick in useRaceSimulation.js.
// ============================================================

/**
 * Advance the race by one lap and return the new state.
 *
 * @param {RaceLapState} raceState - current state (immutable)
 * @param {Object} playerDecisions - {
 *   pitRequests: Set<driverId>,       // player clicked "BOX THIS LAP"
 *   pushLevels: Map<driverId, float>, // push slider value for player drivers
 * }
 * @returns {RaceLapState} new frozen state
 */
export function simulateLap(raceState, playerDecisions = {}) {
  // Unpack inputs
  const {
    circuit, currentLap, totalLaps, weather: prevWeather,
    safetyCarActive: prevSC, safetyCarLapsRemaining: prevSCLaps,
    virtualSafetyCarActive: prevVSC, vscLapsRemaining: prevVSCLaps,
    fastestLapTime: prevFastestTime, drivers: prevDrivers,
    playerTeamId,
  } = raceState;

  const { pitRequests = new Set(), pushLevels = new Map() } = playerDecisions;

  const newLap    = currentLap + 1;
  const events    = [];

  // ──────────────────────────────────────────────────────────
  // STEP 1: RESOLVE SAFETY CAR STATUS
  // Safety car deploys for a random number of laps (3–6),
  // bunching the field, then is withdrawn to allow racing.
  // ──────────────────────────────────────────────────────────

  let scActive  = prevSC;
  let scLaps    = prevSCLaps;
  let vscActive = prevVSC;
  let vscLaps   = prevVSCLaps;

  if (scActive) {
    scLaps--;
    if (scLaps <= 0) {
      scActive = false;
      // Emit "safety car in this lap" — racing resumes next lap
      events.push({ type: 'SAFETY_CAR_IN', lap: newLap, detail: 'Safety car coming in — restart next lap' });
    }
  }

  if (vscActive) {
    vscLaps--;
    if (vscLaps <= 0) {
      vscActive = false;
      events.push({ type: 'VSC_IN', lap: newLap, detail: 'Virtual safety car period ending' });
    }
  }

  // ──────────────────────────────────────────────────────────
  // STEP 2: WEATHER TICK
  // Weather can change mid-race. Track wetness transitions gradually.
  // ──────────────────────────────────────────────────────────

  const { weather: newWeather, event: weatherEvent } = advanceWeatherLap(prevWeather, newLap);
  if (weatherEvent) events.push(weatherEvent);

  // ──────────────────────────────────────────────────────────
  // STEP 3: PROCESS EACH DRIVER
  // We iterate in current position order (1→22).
  // Each driver gets: pit decision, lap time calculation, tyre update, DNF check.
  // ──────────────────────────────────────────────────────────

  let newDrivers = prevDrivers.map(d => ({ ...d })); // shallow mutable copy
  let newFastestLapTime = prevFastestTime;
  let newFastestLapHolder = raceState.fastestLapHolder;
  let newFastestLapLap = raceState.fastestLapLap;

  for (let i = 0; i < newDrivers.length; i++) {
    const d = newDrivers[i];

    // Skip DNF'd cars — they no longer run
    if (d.dnf) continue;

    const driverData = DRIVER_MAP[d.driverId];
    const teamData   = TEAM_MAP[d.teamId];
    // Live car attributes (may include R&D upgrades — passed in via teamData from gameState)
    const car = teamData.car;
    const attr = driverData.attributes;

    // ── 3a. UPDATE PUSH LEVEL ──────────────────────────────
    // Player drivers: use the push level from playerDecisions
    // AI drivers: calculate based on race situation
    if (d.isPlayerDriver && pushLevels.has(d.driverId)) {
      d.pushLevel = clamp(pushLevels.get(d.driverId), 0, 1);
    } else if (!d.isPlayerDriver) {
      d.pushLevel = decideAIPushLevel(d, raceState);
    }

    // ── 3b. PIT STOP DECISION ─────────────────────────────
    // Pit requests come from: player click, AI decision, or planned strategy.
    // A pit stop adds ~24 seconds to the driver's total time
    // and resets their tyre to a fresh set.

    const isPlayerPitRequest = pitRequests.has(d.driverId);
    const isPlannedPit = d.plannedPits.some(p => p.onLap === newLap);
    const isAIPit = !d.isPlayerDriver && (
      shouldAIPit(d, raceState, circuit) ||
      isUnderThreat(d, newDrivers, events)
    );

    if (isPlayerPitRequest || isPlannedPit || isAIPit) {
      // Choose new compound
      const toCompound = isPlayerPitRequest
        ? (pitRequests.get?.(d.driverId) ?? 'MEDIUM') // player may have specified compound
        : isPlannedPit
          ? d.plannedPits.find(p => p.onLap === newLap)?.toCompound ?? 'MEDIUM'
          : chooseAICompound(d, raceState);

      // Pit stop duration: average 24s with variation
      const pitDuration = clamp(gaussianRandom(24.0, 0.8), 21.5, 27.5);

      // Record the pit stop event
      events.push({
        type: 'PIT_STOP',
        lap: newLap,
        driverId: d.driverId,
        driverName: d.driverName,
        position: d.position,
        fromCompound: d.tyre.compound,
        toCompound,
        duration: Math.round(pitDuration * 10) / 10,
        detail: `${d.driverShortName} pits: ${d.tyre.compound} → ${toCompound} (${pitDuration.toFixed(1)}s)`,
      });

      // Apply pit stop
      d.totalTime  += pitDuration;
      d.tyre        = createFreshTyre(toCompound);
      d.pitStops   += 1;
      d.pitHistory  = [...d.pitHistory, { lap: newLap, fromCompound: d.tyre.compound, toCompound, duration: pitDuration }];
      d.plannedPits = d.plannedPits.filter(p => p.onLap !== newLap);
      d.lastLapTime = pitDuration + 30; // pit lap is slower (drive through + pit stop)
      d.lapsCompleted++;

      // Do NOT calculate a normal lap time — pit lap is done
      continue;
    }

    // ── 3c. BASE LAP TIME CALCULATION ────────────────────────
    // We blend car performance and driver pace against the circuit's
    // reference lap time. The reference is calibrated for a P50 car
    // (aero ≈ 83, engine ≈ 85) with a P50 driver (pace ≈ 83).
    //
    // Formula: lapTime = baseLapTime × (1 - carDelta) × (1 - driverDelta)
    //
    // At peak performance (car=95, driver=97):  ~3.5s faster than reference
    // At bottom (car=70, driver=77):            ~2.5s slower than reference
    // Total spread across field:                ~6s per lap on a 90s circuit

    // Car score: weighted average of attributes depending on circuit type
    const downforceW = circuit.downforceRequirement / 100;
    const engineW    = circuit.engineSensitivity / 100;
    const tyreW      = circuit.tyreWear / 100;
    const carScore = (
      car.aerodynamics  * (downforceW * 0.5 + 0.15) +
      car.engine_power  * (engineW    * 0.5 + 0.15) +
      car.tyre_efficiency * (tyreW * 0.3 + 0.10) +
      car.reliability   * 0.10
    ) / (downforceW * 0.5 + 0.15 + engineW * 0.5 + 0.15 + tyreW * 0.3 + 0.10 + 0.10);

    // Driver score: pace is dominant, modified by circuit-relevant skills
    const driverScore = (
      attr.pace         * 0.45 +
      attr.consistency  * 0.20 +
      attr.racecraft    * 0.20 +
      attr.tyre_management * 0.15
    );

    // Convert scores to lap time delta vs reference
    // Each 10 points above "neutral" (80) = roughly 0.25s car, 0.15s driver
    const carDelta    = (carScore    - 80) * 0.0025;
    const driverDelta = (driverScore - 80) * 0.0015;

    let lapTime = circuit.baseLapTime * (1 - carDelta) * (1 - driverDelta);

    // ── 3d. TYRE PERFORMANCE MODIFIER ────────────────────────
    // New tyres are faster; worn tyres are progressively slower.
    // The tyre engine handles the non-linear wear cliff.
    //
    // We advance the tyre state first, then apply the modifier.

    const newTyre = advanceTyreLap(
      d.tyre,
      d.tyre.compound,
      circuit.tyreWear,
      circuit.baseTemp,
      attr.tyre_management,
      car.tyre_efficiency,
      d.pushLevel,
      scActive
    );
    d.tyre = newTyre;

    // Apply tyre performance to lap time
    lapTime += newTyre.performanceModifier;

    // Safety check: if running wrong tyre for weather, massive penalty
    lapTime += getWrongTyrePenalty(d.tyre.compound, newWeather.trackWetness);

    // ── 3e. FUEL WEIGHT EFFECT ────────────────────────────────
    // A full fuel tank adds ~3.85s at the start of the race.
    // As fuel burns off, the car gets lighter and faster.
    // Push level increases fuel consumption slightly.

    const fuelBurn  = FUEL_BURN_PER_LAP + (d.pushLevel * FUEL_PUSH_EXTRA);
    d.fuelLoad      = Math.max(0, d.fuelLoad - fuelBurn);
    const fuelPenalty = d.fuelLoad * FUEL_LAP_TIME_COST;
    lapTime += fuelPenalty;

    // ── 3f. PUSH LEVEL EFFECT ─────────────────────────────────
    // Pushing (>0.5) gives raw pace at the cost of tyre wear.
    // Lifting (>0.5) saves tyres and fuel at a small time cost.
    // Range: -0.4s (full attack) to +0.4s (maximum conservation)

    const pushBonus = (d.pushLevel - 0.5) * -0.8;
    lapTime += pushBonus;

    // ── 3g. DRS EFFECT ───────────────────────────────────────
    // DRS (Drag Reduction System) opens a rear wing flap when a car
    // is within 1 second of the car ahead at a DRS detection point.
    // Effect: typically 0.3–0.65 seconds per lap depending on circuit.

    d.drsEligible = d.gapToNext < 1.0 && newLap >= 2 && !scActive && !vscActive;
    d.drsActive   = d.drsEligible && circuit.drsZones > 0;

    if (d.drsActive) {
      const drsTime = getDrsBonus(circuit.drsEffectiveness, car.engine_power);
      lapTime -= drsTime;
    }

    // ── 3h. DIRTY AIR EFFECT ─────────────────────────────────
    // Following closely disrupts aerodynamic downforce.
    // Only applies when within 1.5s of the car ahead and NOT using DRS
    // (DRS effectively cancels dirty air on the straight).

    if (!d.drsActive && d.gapToNext < 1.5) {
      lapTime += getDirtyAirPenalty(d.gapToNext, car.aerodynamics);
    }

    // ── 3i. CONSISTENCY VARIANCE ─────────────────────────────
    // No driver is perfect every lap. Consistency attribute controls
    // how much lap-to-lap variation a driver exhibits.
    // Inconsistent drivers (low score) have wider swings.
    // Gaussian distribution ensures variance is realistic, not uniform.

    const inconsistency = (100 - attr.consistency) / 100;
    const variance = gaussianRandom(0, inconsistency * 0.35);
    lapTime += variance;

    // ── 3j. SAFETY CAR LAP TIME ──────────────────────────────
    // When the safety car is out, everyone follows at SC pace.
    // Gaps between cars compress gradually (20% per SC lap).
    // Min gap: 0.5s to prevent impossible tailgating.

    if (scActive) {
      const scLapTime = circuit.baseLapTime * SC_LAP_TIME_FACTOR;
      lapTime = scLapTime + gaussianRandom(0, 0.1);
    } else if (vscActive) {
      // VSC: slower lap but NO gap compression (unlike full SC)
      lapTime *= VSC_LAP_TIME_FACTOR;
    }

    // ── 3k. WET WEATHER MODIFICATION ────────────────────────
    // Driver wet weather skill matters a lot in the rain.
    // High wet_weather drivers are relatively faster in wet conditions.
    // Running the wrong compound in wet conditions = massive penalty.

    if (newWeather.trackWetness > 0.0) {
      lapTime += getWetWeatherModifier(
        newWeather.trackWetness,
        d.tyre.compound,
        attr.wet_weather
      );
    }

    // ── 3l. PHYSICAL FLOOR ────────────────────────────────────
    // Lap times cannot be physically unrealistic. Cap at 94% of circuit reference.
    lapTime = Math.max(lapTime, circuit.baseLapTime * 0.94);

    // ── 3m. APPLY LAP TIME ────────────────────────────────────
    d.lastLapTime   = lapTime;
    d.totalTime    += lapTime;
    d.lapsCompleted++;

    if (lapTime < d.bestLapTime) {
      d.bestLapTime = lapTime;
    }

    // ── 3n. DNF CHECK ─────────────────────────────────────────
    // Each lap there is a small chance of mechanical failure.
    // Reliability score: higher is better. DNF chance increases with push level.
    // A car with reliability 70 and max push has ~0.3% chance per lap.
    // A car with reliability 90 at default push has ~0.05% chance per lap.

    const reliabilityScore  = clamp(car.reliability, 60, 100);
    const baseDNFProb       = (101 - reliabilityScore) / 18000;
    const pushDNFMultiplier = 1 + d.pushLevel * 0.5;
    const dnfThisLap        = baseDNFProb * pushDNFMultiplier;

    if (Math.random() < dnfThisLap) {
      d.dnf = true;
      d.dnfReason = weightedRandom(
        ['ENGINE', 'HYDRAULICS', 'SUSPENSION', 'COLLISION', 'GEARBOX', 'ELECTRICAL'],
        [30, 20, 15, 15, 12, 8]
      );
      events.push({
        type: 'DNF',
        lap: newLap,
        driverId: d.driverId,
        driverName: d.driverName,
        position: d.position,
        reason: d.dnfReason,
        detail: `${d.driverShortName} retires with ${d.dnfReason.toLowerCase()} failure`,
      });
    }
  } // end driver loop

  // ──────────────────────────────────────────────────────────
  // STEP 4: SAFETY CAR GAP COMPRESSION
  // While SC is active, gaps close by 20% per lap, floored at 0.5s.
  // This realistically bunches the field without teleporting everyone.
  // ──────────────────────────────────────────────────────────

  if (scActive) {
    const activeDrivers = newDrivers.filter(d => !d.dnf);
    if (activeDrivers.length > 1) {
      const leader = activeDrivers[0]; // will be sorted below, use provisional leader
      for (let i = 1; i < activeDrivers.length; i++) {
        const gap = activeDrivers[i].totalTime - activeDrivers[0].totalTime;
        const compressedGap = Math.max(
          gap * (1 - SC_GAP_COMPRESSION),
          SC_MIN_GAP * i
        );
        activeDrivers[i].totalTime = activeDrivers[0].totalTime + compressedGap;
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // STEP 5: SORT AND RECALCULATE POSITIONS
  // Sort all drivers by cumulative race time.
  // DNF drivers go to the back, sorted by lap completed.
  // Then recompute gaps to leader and to car ahead.
  // ──────────────────────────────────────────────────────────

  newDrivers.sort((a, b) => {
    if (a.dnf && !b.dnf) return 1;
    if (!a.dnf && b.dnf) return -1;
    if (a.dnf && b.dnf) return b.lapsCompleted - a.lapsCompleted;
    return a.totalTime - b.totalTime;
  });

  const leader = newDrivers[0];
  for (let i = 0; i < newDrivers.length; i++) {
    const oldPos         = newDrivers[i].position;
    newDrivers[i].position = i + 1;
    newDrivers[i].positionChanges = newDrivers[i].startPosition - (i + 1);
    newDrivers[i].gap    = newDrivers[i].dnf ? null : (newDrivers[i].totalTime - leader.totalTime);
    newDrivers[i].gapToNext = i === 0 ? 0 : (newDrivers[i].totalTime - newDrivers[i - 1].totalTime);

    // Estimate lap fraction for SVG track animation (0–1 progress through current lap)
    // Uses last lap time to estimate current position on track
    const avgLapTime = newDrivers[i].bestLapTime < Infinity ? newDrivers[i].bestLapTime : circuit.baseLapTime;
    newDrivers[i].lapFraction = newDrivers[i].dnf ? 0 : (newLap / totalLaps + 0.5 / totalLaps);

    // ── 3o. GENERATE OVERTAKE EVENTS ──────────────────────────
    // When a driver's position improved vs last lap, emit an overtake event.
    const prevDriver = prevDrivers.find(pd => pd.driverId === newDrivers[i].driverId);
    if (prevDriver && newDrivers[i].position < prevDriver.position && !newDrivers[i].dnf) {
      const overtakenDriver = prevDrivers.find(pd => pd.position === newDrivers[i].position);
      if (overtakenDriver) {
        const wasScRestart = !prevSC && scActive;
        events.push({
          type: 'OVERTAKE',
          lap: newLap,
          driverId: newDrivers[i].driverId,
          driverName: newDrivers[i].driverName,
          targetDriverId: overtakenDriver.driverId,
          targetDriverName: overtakenDriver.driverName,
          drsUsed: newDrivers[i].drsActive,
          detail: describeOvertake(
            newDrivers[i].driverShortName,
            overtakenDriver.driverShortName,
            newDrivers[i].drsActive,
            wasScRestart
          ),
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // STEP 6: FASTEST LAP CHECK
  // Track who holds the fastest lap. Awards 1 bonus point
  // to the driver with the fastest lap IF they finish in the top 10.
  // ──────────────────────────────────────────────────────────

  if (!scActive && !vscActive) {
    for (const d of newDrivers) {
      if (!d.dnf && d.lastLapTime && d.lastLapTime < newFastestLapTime) {
        const previousHolder = newFastestLapHolder;
        newFastestLapTime   = d.lastLapTime;
        newFastestLapHolder = d.driverId;
        newFastestLapLap    = newLap;
        events.push({
          type: 'FASTEST_LAP',
          lap: newLap,
          driverId: d.driverId,
          driverName: d.driverName,
          time: d.lastLapTime,
          detail: `${d.driverShortName} sets fastest lap: ${d.lastLapTime.toFixed(3)}s`,
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // STEP 7: SAFETY CAR ROLL FOR NEXT LAP
  // Per-lap SC probability derived from race-level percentage.
  // A DNF this lap increases SC probability 3×.
  // ──────────────────────────────────────────────────────────

  let newScActive         = scActive;
  let newScLaps           = scLaps;
  let newScDeployedOnLap  = raceState.safetyCarDeployedOnLap;
  let newVscActive        = vscActive;
  let newVscLaps          = vscLaps;

  if (!scActive && !vscActive && newLap < totalLaps - 3) {
    const hasDNFThisLap = events.some(e => e.type === 'DNF');
    const perLapSCProb  = perLapProbability(circuit.safetyCarChance, totalLaps);
    const perLapVSCProb = perLapProbability(circuit.virtualSafetyCarChance, totalLaps);

    const scRoll = Math.random();
    if (scRoll < perLapSCProb * (hasDNFThisLap ? 3.0 : 1.0)) {
      newScActive        = true;
      newScLaps          = Math.floor(gaussianRandom(4.0, 0.8));
      newScLaps          = clamp(newScLaps, 3, 6);
      newScDeployedOnLap = newLap;
      events.push({
        type:   'SAFETY_CAR_DEPLOYED',
        lap:    newLap,
        detail: hasDNFThisLap
          ? 'Safety car deployed following the incident'
          : 'Safety car deployed for track debris',
      });
    } else if (scRoll < perLapSCProb + perLapVSCProb * (hasDNFThisLap ? 2.0 : 1.0)) {
      newVscActive = true;
      newVscLaps   = 2;
      events.push({
        type: 'VSC_DEPLOYED',
        lap: newLap,
        detail: 'Virtual safety car deployed',
      });
    }
  }

  // ──────────────────────────────────────────────────────────
  // STEP 8: CHECK RACE COMPLETE
  // ──────────────────────────────────────────────────────────

  const isComplete = newLap >= totalLaps;

  // ──────────────────────────────────────────────────────────
  // STEP 9: RETURN NEW IMMUTABLE STATE
  // Object.freeze ensures nothing mutates this snapshot.
  // The UI can safely read it; the next simulateLap call
  // will create a fresh clone via deepClone internally.
  // ──────────────────────────────────────────────────────────

  return Object.freeze({
    circuitId:               raceState.circuitId,
    circuit:                 raceState.circuit,
    currentLap:              newLap,
    totalLaps,
    weather:                 Object.freeze(newWeather),
    safetyCarActive:         newScActive,
    safetyCarDeployedOnLap:  newScDeployedOnLap,
    safetyCarLapsRemaining:  newScLaps,
    virtualSafetyCarActive:  newVscActive,
    vscLapsRemaining:        newVscLaps,
    fastestLapHolder:        newFastestLapHolder,
    fastestLapTime:          newFastestLapTime,
    fastestLapLap:           newFastestLapLap,
    drivers:                 Object.freeze(newDrivers),
    events:                  Object.freeze(events),
    isComplete,
    playerTeamId:            raceState.playerTeamId,
  });
}

// ============================================================
// COMPUTE FINAL RACE RESULT
// Called once when isComplete === true.
// Extracts the classified result, points, and statistics.
// ============================================================

/**
 * Build the final race result object from a completed RaceLapState.
 *
 * @param {RaceLapState} finalState - the state after the last lap
 * @param {import('../data/constants.js')} constants
 * @returns {FinalRaceResult}
 */
export function computeFinalResult(finalState) {
  const { POINTS_TABLE, FASTEST_LAP_POINT } = { POINTS_TABLE: [25,18,15,12,10,8,6,4,2,1], FASTEST_LAP_POINT: 1 };
  const { drivers, fastestLapHolder, fastestLapTime, fastestLapLap, circuit, weather, currentLap } = finalState;

  const classified = drivers.map((d, idx) => {
    const position = d.position;
    let points = !d.dnf && position <= POINTS_TABLE.length ? POINTS_TABLE[position - 1] : 0;

    // Fastest lap point (only if driver finishes in top 10)
    const hasFastestLap = d.driverId === fastestLapHolder && !d.dnf && position <= 10;
    if (hasFastestLap) points += FASTEST_LAP_POINT;

    return {
      position,
      driverId:     d.driverId,
      teamId:       d.teamId,
      totalTime:    d.totalTime,
      lapsCompleted: d.lapsCompleted,
      points,
      fastestLap:   hasFastestLap,
      pitStops:     d.pitStops,
      startPosition: d.startPosition,
      positionChanges: d.positionChanges,
      status:       d.dnf ? 'DNF' : 'FINISHED',
      dnfReason:    d.dnfReason,
      bestLapTime:  d.bestLapTime,
    };
  });

  const retirements = drivers
    .filter(d => d.dnf)
    .map(d => ({ driverId: d.driverId, driverName: d.driverName, lap: d.lapsCompleted, reason: d.dnfReason }));

  return Object.freeze({
    circuitId:    circuit.id,
    circuitName:  circuit.name,
    raceNumber:   circuit.raceNumber,
    date:         circuit.date,
    weather:      weather.condition,
    classified,
    fastestLap: fastestLapHolder ? {
      driverId: fastestLapHolder,
      lap:      fastestLapLap,
      time:     fastestLapTime,
    } : null,
    retirements,
    totalLaps:    circuit.laps,
  });
}
