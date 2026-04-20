// RaceScreen — Main race: SVG track + timing tower + pit/push controls
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import { useRaceContext } from '../context/GameContext.jsx';
import { useRaceSimulation } from '../hooks/useRaceSimulation.js';
import { CIRCUITS } from '../data/circuits.js';
import { DRIVER_MAP } from '../data/drivers.js';
import { SIM_SPEED } from '../data/constants.js';
import TrackMap from '../components/TrackMap.jsx';
import TimingTower from '../components/TimingTower.jsx';
import EventLog from '../components/EventLog.jsx';
import TyreDisplay from '../components/TyreDisplay.jsx';
import WeatherWidget from '../components/WeatherWidget.jsx';

const COMPOUNDS = ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'];

export default function RaceScreen() {
  const { state, dispatch }     = useGame();
  const {
    raceState,
    simSpeed, setSimSpeed, isPaused, setIsPaused,
    playerPitRequest, requestPit, clearPitRequest,
    playerPushLevels, setPushLevel,
  } = useRaceContext();

  const { startRace, simulateInstant, isRunning } = useRaceSimulation();
  const navigate = useNavigate();

  const [pitCompoundSelected, setPitCompoundSelected] = useState({});

  if (!state) return null;

  const { currentRaceIndex, playerDriverIds, playerTeamId } = state;
  const circuit = CIRCUITS[currentRaceIndex];

  // All events accumulated across ticks (we collect from raceState.events per lap)
  const allEvents = raceState?.events ?? [];
  const lap       = raceState?.currentLap ?? 0;
  const totalLaps = raceState?.totalLaps ?? circuit?.laps ?? 57;
  const isComplete = raceState?.isComplete ?? false;
  const weather    = raceState?.weather ?? null;
  const scActive   = raceState?.safetyCarActive;
  const vscActive  = raceState?.virtualSafetyCarActive;

  function handleStart() {
    startRace();
  }

  function handlePauseResume() {
    setIsPaused(!isPaused);
  }

  function handleSpeedChange(speed) {
    if (speed === SIM_SPEED.INSTANT) {
      setIsPaused(true);
      simulateInstant();
    } else {
      setSimSpeed(speed);
    }
  }

  function handlePitRequest(driverId) {
    const compound = pitCompoundSelected[driverId] ?? 'MEDIUM';
    requestPit(driverId, compound);
  }

  function handleFinished() {
    navigate('/results');
  }

  // Get player driver race state
  const playerRaceDrivers = raceState?.drivers?.filter(d => playerDriverIds.includes(d.driverId)) ?? [];

  const speedOptions = [
    { label: '1x', value: SIM_SPEED.NORMAL },
    { label: '3x', value: SIM_SPEED.FAST },
    { label: '⚡', value: SIM_SPEED.INSTANT },
  ];

  return (
    <div className="page-full">
      {/* Top bar: lap counter + SC banners + weather */}
      <div className="flex-between" style={{ padding: '8px var(--gap-lg)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-md">
          <span className="text-xl text-bold text-white">LAP {lap}/{totalLaps}</span>
          {scActive  && <div className="sc-banner">SAFETY CAR</div>}
          {vscActive && <div className="vsc-banner">VIRTUAL SC</div>}
        </div>
        <WeatherWidget weather={weather} compact />
        {isComplete && (
          <button className="btn btn-primary" onClick={handleFinished}>
            Results →
          </button>
        )}
      </div>

      {/* Main race layout */}
      <div className="race-layout" style={{ padding: 'var(--gap-md)', height: 'calc(100vh - var(--navbar-h) - 48px)' }}>
        {/* Track map */}
        <div className="track-area">
          <TrackMap
            circuit={circuit}
            raceState={raceState}
            playerDriverIds={playerDriverIds}
          />
        </div>

        {/* Timing tower */}
        <div className="timing-tower" style={{ overflowY: 'auto', height: '100%' }}>
          <TimingTower raceState={raceState} playerDriverIds={playerDriverIds} />
        </div>

        {/* Controls bar */}
        <div className="race-controls">
          {/* Play/Pause + Speed */}
          <div className="race-controls-section">
            {!raceState ? (
              <button className="btn btn-primary" onClick={handleStart}>
                ▶ Start Race
              </button>
            ) : isComplete ? (
              <span className="badge badge-green">RACE FINISHED</span>
            ) : (
              <>
                <button
                  className={`btn ${isPaused ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={handlePauseResume}
                >
                  {isPaused ? '▶ Resume' : '⏸ Pause'}
                </button>
                <div className="speed-toggle">
                  {speedOptions.map(opt => (
                    <button
                      key={opt.label}
                      className={`speed-btn${simSpeed === opt.value ? ' active' : ''}`}
                      onClick={() => handleSpeedChange(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Player driver controls */}
          {playerRaceDrivers.map(d => {
            const driver    = DRIVER_MAP[d.driverId];
            const pitQueued = !!playerPitRequest[d.driverId];
            const pushLevel = playerPushLevels[d.driverId] ?? 0.5;
            const selectedCompound = pitCompoundSelected[d.driverId] ?? 'MEDIUM';

            return (
              <div key={d.driverId} className="race-controls-section" style={{ borderLeft: '1px solid var(--border)', paddingLeft: 'var(--gap-md)', gap: 'var(--gap-sm)', flexWrap: 'wrap' }}>
                <div>
                  <div className="text-white text-bold text-sm">{driver?.shortName}</div>
                  <div className="flex items-center gap-xs text-xs text-muted">
                    <span>P{d.position}</span>
                    <TyreDisplay compound={d.tyre?.compound} wear={d.tyre?.wear} age={d.tyre?.age} />
                    <span>{d.pitStops}P</span>
                  </div>
                </div>

                {/* Push level */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="control-label">Push</span>
                  <input
                    type="range"
                    className="push-slider"
                    min={0} max={1} step={0.1}
                    value={pushLevel}
                    onChange={e => setPushLevel(d.driverId, parseFloat(e.target.value))}
                  />
                  <span className="text-xs text-muted text-center">{Math.round(pushLevel * 100)}%</span>
                </div>

                {/* Pit compound select */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="control-label">Box on</span>
                  <div className="flex gap-xs">
                    {['SOFT','MEDIUM','HARD'].map(c => (
                      <button
                        key={c}
                        className={`tyre-badge tyre-${c}${selectedCompound === c ? '' : ''}`}
                        style={{
                          opacity: selectedCompound === c ? 1 : 0.4,
                          cursor: 'pointer',
                          border: selectedCompound === c ? '2px solid white' : '2px solid transparent',
                        }}
                        onClick={() => setPitCompoundSelected(prev => ({ ...prev, [d.driverId]: c }))}
                        title={c}
                      >
                        {c[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pit button */}
                {pitQueued ? (
                  <button
                    className="btn btn-yellow btn-sm"
                    onClick={() => clearPitRequest(d.driverId)}
                  >
                    BOX QUEUED ✕
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!!d.dnf || isComplete || !raceState}
                    onClick={() => handlePitRequest(d.driverId)}
                  >
                    BOX THIS LAP
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Event log — below track */}
      <div style={{ padding: '0 var(--gap-lg) var(--gap-md)' }}>
        <EventLog events={allEvents} maxHeight={140} />
      </div>
    </div>
  );
}
