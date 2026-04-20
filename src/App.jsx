// ============================================================
// App.jsx — Route definitions + navigation guard
// ============================================================

import { Routes, Route, Navigate, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useGame } from './context/GameContext.jsx';
import { useSaveLoad } from './hooks/useSaveLoad.js';

// Screens
import TeamSelectScreen  from './screens/TeamSelectScreen.jsx';
import MainHub          from './screens/MainHub.jsx';
import CalendarScreen   from './screens/CalendarScreen.jsx';
import PracticeScreen   from './screens/PracticeScreen.jsx';
import QualifyingScreen from './screens/QualifyingScreen.jsx';
import StrategyScreen   from './screens/StrategyScreen.jsx';
import RaceScreen       from './screens/RaceScreen.jsx';
import ResultsScreen    from './screens/ResultsScreen.jsx';
import RDScreen         from './screens/RDScreen.jsx';
import DriverMarket     from './screens/DriverMarket.jsx';
import StandingsScreen  from './screens/StandingsScreen.jsx';

// ── Navigation guard: redirect to /new-game if no game state ──
function RequireGame({ children }) {
  const { state } = useGame();
  if (!state) return <Navigate to="/new-game" replace />;
  return children;
}

// ── Navbar ──
function Navbar() {
  const { state } = useGame();
  const { saveNow } = useSaveLoad();

  if (!state) return null;

  const teamId  = state.playerTeamId ?? '';
  const teamVar = `var(--team-${teamId.replace('_', '-')})`;
  const raceNum = state.currentRaceIndex + 1;

  function handleSave() {
    saveNow(0);
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        F1 <span>Manager</span> 2026
      </div>

      <div className="navbar-nav">
        <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/hub">Hub</NavLink>
        <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/calendar">Calendar</NavLink>
        <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/standings">Standings</NavLink>
        <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/rd">R&amp;D</NavLink>
        <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/drivers">Drivers</NavLink>
      </div>

      <div className="navbar-right">
        <span className="text-sm text-muted">Race {raceNum}/24</span>
        <span
          className="team-dot"
          style={{ background: teamVar, width: 12, height: 12 }}
          title={teamId}
        />
        <button className="btn btn-ghost btn-sm" onClick={handleSave} title="Save game">
          💾
        </button>
      </div>
    </nav>
  );
}

// ── App ──
export default function App() {
  return (
    <div className="app-layout">
      <Navbar />

      <Routes>
        {/* New game / team select */}
        <Route path="/new-game" element={<TeamSelectScreen />} />

        {/* All game screens require state */}
        <Route path="/hub"        element={<RequireGame><MainHub /></RequireGame>} />
        <Route path="/calendar"   element={<RequireGame><CalendarScreen /></RequireGame>} />
        <Route path="/practice"   element={<RequireGame><PracticeScreen /></RequireGame>} />
        <Route path="/qualifying" element={<RequireGame><QualifyingScreen /></RequireGame>} />
        <Route path="/strategy"   element={<RequireGame><StrategyScreen /></RequireGame>} />
        <Route path="/race"       element={<RequireGame><RaceScreen /></RequireGame>} />
        <Route path="/results"    element={<RequireGame><ResultsScreen /></RequireGame>} />
        <Route path="/rd"         element={<RequireGame><RDScreen /></RequireGame>} />
        <Route path="/drivers"    element={<RequireGame><DriverMarket /></RequireGame>} />
        <Route path="/standings"  element={<RequireGame><StandingsScreen /></RequireGame>} />

        {/* Default redirect */}
        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
    </div>
  );
}

function DefaultRedirect() {
  const { state } = useGame();
  return <Navigate to={state ? '/hub' : '/new-game'} replace />;
}
