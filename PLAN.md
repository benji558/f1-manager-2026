# F1 Manager 2026 — Project Plan

## a) File & Folder Structure

```
f1-manager-2026/
├── index.html
├── vite.config.js              # @/ alias → src/, port 3000
├── package.json
├── .gitignore
├── PLAN.md                     # This file
├── CLAUDE.md                   # Claude Code session context
└── src/
    ├── main.jsx                # Entry point: GameProvider + BrowserRouter
    ├── App.jsx                 # Route definitions + navigation guard
    ├── index.css               # CSS reset + F1 dark theme variables
    ├── data/
    │   ├── drivers.js          # 22 driver objects with all attributes
    │   ├── teams.js            # 11 team/car objects with all attributes
    │   ├── circuits.js         # 24 circuit objects with trackPoints[]
    │   ├── tyres.js            # 5 compound definitions
    │   └── constants.js        # Points table, financial constants
    ├── engine/                 # PURE FUNCTIONS — zero React imports
    │   ├── engineUtils.js      # gaussianRandom, clamp, lerp, interpolatePolyline
    │   ├── tyreEngine.js       # Tyre deg, thermal state, compound modifier
    │   ├── weatherEngine.js    # Weather generation + transitions
    │   ├── overtakingEngine.js # Pace delta → overtake probability
    │   ├── aiStrategy.js       # AI pit + push level decisions (pure)
    │   ├── raceEngine.js       # Core: initializeRaceState + simulateLap
    │   ├── qualifyingEngine.js # Q1/Q2/Q3 simulation
    │   └── practiceEngine.js   # FP session simulation
    ├── game/
    │   ├── gameState.js        # Central reducer + all action types
    │   ├── seasonManager.js    # Calendar, championship, season-end
    │   ├── teamManager.js      # Budget, R&D upgrades, staff
    │   └── saveManager.js      # localStorage 3-slot save/load
    ├── context/
    │   └── GameContext.jsx     # GameProvider + RaceContext
    ├── hooks/
    │   ├── useGameState.js     # useContext(GameContext)
    │   ├── useRaceSimulation.js # Tick interval: pause/resume/speed
    │   ├── useSaveLoad.js      # Auto-save + manual load
    │   └── useChampionship.js  # Derived standings selectors
    ├── screens/
    │   ├── MainHub.jsx         # Home dashboard
    │   ├── CalendarScreen.jsx  # 24-race calendar
    │   ├── PracticeScreen.jsx  # FP1/FP2/FP3
    │   ├── QualifyingScreen.jsx # Q1/Q2/Q3 animated
    │   ├── StrategyScreen.jsx  # Pre-race strategy builder
    │   ├── RaceScreen.jsx      # Main race: track + tower + controls
    │   ├── ResultsScreen.jsx   # Post-race results
    │   ├── RDScreen.jsx        # R&D upgrade tree
    │   ├── DriverMarket.jsx    # Driver contracts
    │   └── StandingsScreen.jsx # Championship tables
    └── components/
        ├── TrackMap.jsx        # SVG track + animated car dots
        ├── TimingTower.jsx     # Live race timing display
        ├── TyreDisplay.jsx     # Compound badge + wear bar
        ├── ChampionshipTable.jsx # Sortable standings table
        ├── DriverCard.jsx      # Driver attribute card
        ├── TeamCard.jsx        # Team overview card
        ├── UpgradeTree.jsx     # R&D tree visualization
        ├── WeatherWidget.jsx   # Weather icon + forecast
        ├── EventLog.jsx        # Scrollable race events
        ├── FinancePanel.jsx    # Budget breakdown
        ├── StrategyChart.jsx   # recharts lap time chart
        └── Modal.jsx           # Generic modal wrapper
```

## b) Data Flow Diagram

```
Static Data (data/)
     ↓ imported as frozen constants
Pure Engines (engine/)
     ↓ called by game managers
Game Managers (game/)
     ↓ state shaped in reducer
React Context (GameContext.jsx)
     ↓ consumed via hooks
Screens (screens/) → Components (components/)
```

## c) Build Order

1. Data layer (all static data)
2. Engine utilities (shared math helpers)
3. Tyre + Weather engines (sub-systems)
4. Overtaking + AI strategy (pure functions)
5. Race engine — the core (simulateLap)
6. Qualifying + Practice engines
7. Game managers (gameState reducer, season, team, save)
8. React context + hooks
9. App shell + routing
10. All screens + components

## d) Key Data Structures

### Driver
```js
{ id, name, shortName, number, nationality, age, teamId,
  attributes: { pace, racecraft, consistency, tyre_management, wet_weather },
  contract: { salary, yearsRemaining, releaseClause } }
```

### Team/Car
```js
{ id, fullName, color, car: { aerodynamics, engine_power, reliability, tyre_efficiency },
  finances: { budget, sponsorIncome, staffCosts },
  upgradeSpec: { aerodynamics, engine_power, reliability, tyre_efficiency } }
```

### Circuit
```js
{ id, name, laps, lapLength, baseLapTime, tyreWear, overtakingDifficulty,
  downforceRequirement, engineSensitivity, streetCircuit, nightRace, altitudeEffect,
  weatherRisk, baseTemp, safetyCarChance, drsZones, drsEffectiveness,
  trackPoints: [{x,y}], sectors: { s1End, s2End } }
```

### Race Lap State (immutable, returned by simulateLap)
```js
{ circuitId, currentLap, totalLaps, weather, safetyCarActive,
  drivers: [{ driverId, position, gap, gapToNext, lastLapTime, totalTime,
              tyre, fuelLoad, pushLevel, drsActive, dnf, pitHistory }],
  events: [{ type, lap, driverId, detail }] }
```

### Tyre State
```js
{ compound, age, wear, temperature, thermalState, performanceModifier, pitStopScheduled }
```

### Game State (localStorage)
```js
{ version, playerTeamId, playerDriverIds, currentSeason, currentRaceIndex,
  sessionPhase, raceResults, standings: { drivers, constructors },
  teams: { [id]: { budget, rdTokens, upgrades, car } },
  driverContracts, activeRace, qualifyingResult, raceStrategy, newsLog }
```

## e) Race Engine — How simulateLap Works

Pure function. Takes previous RaceLapState + playerDecisions, returns new frozen state.

Per-lap for each of 22 drivers:
1. Resolve pit stop (player manual / AI forced / AI strategic / weather emergency)
2. Base lap time = circuit.baseLapTime scaled by carScore + driverScore
3. Tyre modifier: wear cliff (non-linear x^1.8), thermal state, compound baseline delta
4. Fuel penalty (~0.035s/kg, burns ~1.85kg/lap)
5. Push level effect (±0.4s, also increases tyre wear)
6. DRS boost (up to -0.65s within 1.0s of car ahead)
7. Dirty air penalty (up to +0.4s within 1.5s behind, outside DRS zone)
8. Consistency variance (gaussianRandom scaled by driver.consistency)
9. Safety car: fixed SC pace + 20% gap compression per SC lap
10. Wet weather: wrong compound = massive penalty; wet_weather attribute matters in rain
11. DNF check (reliability-based probability, increases with push level)
12. Sort by cumulative time → update positions + gaps
13. Generate overtake events from position changes
14. Roll for safety car deployment next lap
15. Return Object.freeze(newState)

## f) Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| State management | React Context + useReducer | No async APIs; synchronous ticks |
| Race simulation | Tick-by-tick (simulateLap pure fn) | Player decisions affect live race |
| Track visualization | SVG + CSS transitions | 22 cars, low DOM count, zero extra deps |
| Car dot animation | CSS transition on cx/cy | Free smooth motion between tick intervals |
| Persistence | localStorage, 3 save slots | ~200KB/save, no backend needed |
| Race re-render | Separate RaceContext | Prevents full app re-render every 400ms tick |
| Immutability | Object.freeze on all engine output | Debuggable, React-friendly |
| Dependencies | react-router-dom + recharts only | recharts isolated to StrategyChart.jsx |
