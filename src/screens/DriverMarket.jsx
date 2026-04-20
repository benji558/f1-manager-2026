// DriverMarket — Driver contracts: view, negotiate, release, sign free agents
import { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { DRIVERS, DRIVER_MAP } from '../data/drivers.js';
import { TEAM_MAP } from '../data/teams.js';
import DriverCard from '../components/DriverCard.jsx';
import Modal from '../components/Modal.jsx';

function fmtM(v) { return '$' + (v / 1e6).toFixed(1) + 'M'; }

export default function DriverMarket() {
  const { state, dispatch } = useGame();
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);

  if (!state) return null;

  const { playerTeamId, playerDriverIds, driverContracts, teams } = state;
  const budget = teams[playerTeamId]?.budget ?? 0;

  // Group drivers
  const myDrivers    = playerDriverIds.map(id => DRIVER_MAP[id]).filter(Boolean);
  const otherDrivers = DRIVERS.filter(d =>
    !playerDriverIds.includes(d.id) && driverContracts[d.id]?.teamId !== 'free_agent'
  );
  const freeAgents   = DRIVERS.filter(d => driverContracts[d.id]?.teamId === 'free_agent');

  const selectedDriver = selectedDriverId ? DRIVER_MAP[selectedDriverId] : null;
  const selectedContract = selectedDriverId ? driverContracts[selectedDriverId] : null;
  const isMine = playerDriverIds.includes(selectedDriverId);
  const isFreeAgent = selectedContract?.teamId === 'free_agent';

  function handleSign() {
    if (!selectedDriverId || !selectedContract) return;
    const cost = selectedContract.salary;
    dispatch({
      type: 'CONTRACT_SIGN',
      driverId: selectedDriverId,
      teamId:   playerTeamId,
      salary:   cost,
      years:    2,
    });
    setShowSignModal(false);
    setSelectedDriverId(null);
  }

  function handleRelease() {
    if (!selectedDriverId) return;
    dispatch({ type: 'CONTRACT_RELEASE', driverId: selectedDriverId });
    setShowReleaseModal(false);
    setSelectedDriverId(null);
  }

  function DriverRow({ driver, tag }) {
    const contract = driverContracts[driver.id];
    const team     = TEAM_MAP[contract?.teamId];
    const isSelected = selectedDriverId === driver.id;
    return (
      <div
        className={`driver-list-item${isSelected ? ' selected' : ''}`}
        onClick={() => setSelectedDriverId(isSelected ? null : driver.id)}
      >
        <div
          className="team-dot"
          style={{ background: team?.color ?? '#888', width: 12, height: 12 }}
        />
        <div className="driver-name-block">
          <div className="driver-full-name">{driver.name}</div>
          <div className="driver-team-name">
            {isFreeAgent ? 'Free Agent' : (team?.shortName ?? contract?.teamId)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span className="driver-salary">{fmtM(contract?.salary ?? 0)}/yr</span>
          <span className="text-xs text-muted">{contract?.yearsRemaining ?? 0}yr</span>
        </div>
        {tag && <span className="badge badge-red ml-sm">{tag}</span>}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Driver Market</div>
          <div className="page-subtitle">Manage contracts · Budget: {fmtM(budget)}</div>
        </div>
      </div>

      <div className="driver-market-grid">
        {/* Left: driver lists */}
        <div>
          {/* My drivers */}
          <div className="card mb-md">
            <div className="card-header">
              <span className="card-title">My Drivers</span>
              <span className="badge badge-red">{myDrivers.length}/2</span>
            </div>
            {myDrivers.map(d => <DriverRow key={d.id} driver={d} tag="CONTRACTED" />)}
          </div>

          {/* Free agents */}
          {freeAgents.length > 0 && (
            <div className="card mb-md">
              <div className="card-header">
                <span className="card-title">Free Agents</span>
              </div>
              {freeAgents.map(d => <DriverRow key={d.id} driver={d} />)}
            </div>
          )}

          {/* All other drivers */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">All Drivers</span>
              <span className="text-muted text-sm">Click to view · Release clause required</span>
            </div>
            {otherDrivers.map(d => <DriverRow key={d.id} driver={d} />)}
          </div>
        </div>

        {/* Right: driver detail panel */}
        <div>
          {selectedDriver ? (
            <div>
              <DriverCard driver={selectedDriver} showTeam />

              <div className="card mt-md">
                <div className="card-title mb-md">Contract</div>
                <div className="finance-row">
                  <span className="finance-label">Annual salary</span>
                  <span className="finance-value">{fmtM(selectedContract?.salary ?? 0)}</span>
                </div>
                <div className="finance-row">
                  <span className="finance-label">Years remaining</span>
                  <span className="finance-value">{selectedContract?.yearsRemaining ?? 0}</span>
                </div>
                {!isMine && (
                  <div className="finance-row">
                    <span className="finance-label">Release clause</span>
                    <span className="finance-value finance-negative">{fmtM(selectedContract?.releaseClause ?? 0)}</span>
                  </div>
                )}

                <div className="flex gap-sm mt-md">
                  {isMine ? (
                    <>
                      <span className="badge badge-green">Your driver</span>
                      {playerDriverIds.length > 1 && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setShowReleaseModal(true)}
                        >
                          Release
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      className="btn btn-primary"
                      disabled={budget < (selectedContract?.salary ?? Infinity)}
                      onClick={() => setShowSignModal(true)}
                    >
                      {isFreeAgent ? 'Sign Driver' : 'Trigger Release Clause'}
                    </button>
                  )}
                </div>

                {!isMine && budget < (selectedContract?.salary ?? 0) && (
                  <div className="badge badge-red mt-sm">Insufficient budget</div>
                )}
              </div>
            </div>
          ) : (
            <div className="card flex-center" style={{ minHeight: 300, flexDirection: 'column', gap: 'var(--gap-md)' }}>
              <div className="empty-state-icon">👤</div>
              <div className="text-muted">Select a driver to view details</div>
            </div>
          )}
        </div>
      </div>

      {/* Sign modal */}
      {showSignModal && selectedDriver && (
        <Modal
          title={`Sign ${selectedDriver.name}?`}
          onClose={() => setShowSignModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowSignModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSign}>Confirm Sign</button>
            </>
          }
        >
          <div className="text-secondary">
            {isFreeAgent
              ? `Sign ${selectedDriver.name} for ${fmtM(selectedContract?.salary ?? 0)}/year on a 2-year contract.`
              : `Trigger release clause: ${fmtM(selectedContract?.releaseClause ?? 0)} to sign ${selectedDriver.name} on a 2-year deal at ${fmtM(selectedContract?.salary ?? 0)}/year.`
            }
            <br /><br />
            Remaining budget after signing: <strong>{fmtM(budget - (selectedContract?.salary ?? 0))}</strong>
          </div>
        </Modal>
      )}

      {/* Release modal */}
      {showReleaseModal && selectedDriver && (
        <Modal
          title={`Release ${selectedDriver.name}?`}
          onClose={() => setShowReleaseModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowReleaseModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: 'var(--red)' }} onClick={handleRelease}>
                Confirm Release
              </button>
            </>
          }
        >
          <div className="text-secondary">
            Release {selectedDriver.name}? They will become a free agent.
            You will need to find a replacement before the next race.
            {selectedContract?.releaseClause > 0 && (
              <><br /><br />Release penalty: <strong style={{ color: 'var(--red)' }}>{fmtM(selectedContract.releaseClause)}</strong></>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
