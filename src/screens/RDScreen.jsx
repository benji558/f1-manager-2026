// RDScreen — R&D upgrade tree with cost, progress, and token display
import { useGame } from '../context/GameContext.jsx';
import { TEAM_MAP } from '../data/teams.js';
import UpgradeTree from '../components/UpgradeTree.jsx';
import TeamCard from '../components/TeamCard.jsx';

function fmtM(v) { return '$' + (v / 1e6).toFixed(0) + 'M'; }

export default function RDScreen() {
  const { state, dispatch } = useGame();
  if (!state) return null;

  const { playerTeamId } = state;
  const teamState = state.teams[playerTeamId];
  const base = TEAM_MAP[playerTeamId];
  if (!base || !teamState) return null;

  const { budget = 0, rdTokens = 0, upgrades = {} } = teamState;
  const totalLevels = Object.values(upgrades).reduce((s, v) => s + v, 0);

  function handleUpgrade(attribute) {
    dispatch({ type: 'UPGRADE_PURCHASE', teamId: playerTeamId, attribute });
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Research &amp; Development</div>
          <div className="page-subtitle">
            {base.shortName} · Budget: {fmtM(budget)} · R&amp;D Tokens: {rdTokens} · Total upgrades: {totalLevels}
          </div>
        </div>
      </div>

      {/* Current car summary */}
      <div className="grid-3 mb-xl">
        <div className="col-span-1">
          <TeamCard teamId={playerTeamId} teamState={teamState} showBudget />
        </div>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-title mb-md">Upgrade Path</div>
          <div className="text-sm text-secondary mb-sm">
            Each upgrade level adds <span className="text-green">+0.8 rating</span> to the car attribute.
            Higher-tier upgrades cost significantly more. Earn R&amp;D tokens by scoring points in races.
          </div>
          <div className="flex gap-md flex-wrap">
            {Object.entries(upgrades).map(([attr, level]) => (
              <div key={attr} className="panel text-center" style={{ minWidth: 120 }}>
                <div className="text-muted text-xs text-upper">{attr.replace('_', ' ')}</div>
                <div className="text-2xl text-bold text-white mt-xs">{(base.car[attr] + level * 0.8).toFixed(1)}</div>
                <div className="text-xs text-muted">Level {level}/{TEAM_MAP[playerTeamId]?.upgradeSpec?.[attr]?.maxLevel ?? 10}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full upgrade tree */}
      <UpgradeTree
        teamId={playerTeamId}
        teamState={teamState}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
