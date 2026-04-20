# F1 Manager 2026 — Claude Code Context

## Project Summary
Browser-based F1 Manager game. Vite + React. No backend. All data hardcoded.
11 teams, 22 drivers, 24-race 2026 calendar. Tick-based lap-by-lap race simulation.

## Key Files
- `src/engine/raceEngine.js` — core simulation; read ALL comments before editing
- `src/data/` — frozen static constants; NEVER mutate these imports
- `src/game/gameState.js` — central reducer; all state transitions go through here
- `src/context/GameContext.jsx` — GameProvider + RaceContext (separate for performance)
- `src/hooks/useRaceSimulation.js` — setInterval tick that drives race playback

## Architecture Rules
1. Files in `src/engine/` must have ZERO React imports — pure JS functions only
2. All state changes dispatch through gameState reducer (no ad-hoc setState on game data)
3. `simulateLap()` is pure — never mutate the `raceState` argument; always return new frozen object
4. `activeRace` updates every tick (400–1500ms) — only RaceContext subscribers re-render
5. Auto-save to localStorage happens via useEffect in GameContext after every dispatch

## Team Colors (CSS vars in index.css)
--team-mclaren: #FF8000   --team-ferrari: #DC0000   --team-mercedes: #00D2BE
--team-red-bull: #3671C6  --team-aston-martin: #358C75  --team-alpine: #0093CC
--team-williams: #37BEDD  --team-racing-bulls: #4E7C99  --team-haas: #B6BABD
--team-audi: #B2B7BE      --team-cadillac: #C8A96E

## Data Reference
- Driver attributes: pace, racecraft, consistency, tyre_management, wet_weather (all 1–100)
- Car attributes: aerodynamics, engine_power, reliability, tyre_efficiency (all 1–100)
- Cadillac + Audi are lowest-rated (new 2026 constructors)
- Points: 25-18-15-12-10-8-6-4-2-1 + 1 fastest lap (top 10 finishers only)
- Tyre compounds: SOFT, MEDIUM, HARD, INTERMEDIATE, WET

## Dev Commands
```
npm run dev    → start dev server at http://localhost:3000
npm run build  → production build to /dist
```
