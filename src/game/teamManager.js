// ============================================================
// TEAM MANAGER — Budget, R&D upgrades, staff, finances
// Pure functions that return updated team state objects.
// ============================================================

import { TEAM_MAP }  from '../data/teams.js';
import { CONSTRUCTOR_PRIZE_MONEY, RACE_PRIZE_MONEY, RD_TOKENS_PER_RACE_WIN, RD_TOKENS_PER_RACE_PODIUM, RD_TOKENS_PER_RACE_POINTS } from '../data/constants.js';

/**
 * Compute the live car attributes for a team by adding upgrade bonuses
 * on top of the base car attributes from teams.js.
 *
 * Each upgrade level adds 0.8 points to that attribute.
 * Cap at 100 to avoid going above the theoretical maximum.
 *
 * @param {string} teamId
 * @param {Object} upgrades - { aerodynamics, engine_power, reliability, tyre_efficiency }
 * @returns {Object} live car attributes
 */
export function computeLiveCarAttributes(teamId, upgrades) {
  const base = TEAM_MAP[teamId]?.car ?? {};
  return {
    aerodynamics:    Math.min(100, (base.aerodynamics    ?? 70) + (upgrades.aerodynamics    ?? 0) * 0.8),
    engine_power:    Math.min(100, (base.engine_power    ?? 70) + (upgrades.engine_power    ?? 0) * 0.8),
    reliability:     Math.min(100, (base.reliability     ?? 70) + (upgrades.reliability     ?? 0) * 0.6),
    tyre_efficiency: Math.min(100, (base.tyre_efficiency ?? 70) + (upgrades.tyre_efficiency ?? 0) * 0.7),
  };
}

/**
 * Calculate the cost of the next upgrade level for a given attribute.
 *
 * @param {string} teamId
 * @param {string} attribute - 'aerodynamics' | 'engine_power' | 'reliability' | 'tyre_efficiency'
 * @param {number} currentLevel - current upgrade level (0 = none applied)
 * @returns {number} cost in USD, or Infinity if maxed out
 */
export function getUpgradeCost(teamId, attribute, currentLevel) {
  const spec = TEAM_MAP[teamId]?.upgradeSpec?.[attribute];
  if (!spec) return Infinity;
  if (currentLevel >= spec.maxLevel) return Infinity;
  return spec.costPerLevel[currentLevel] ?? Infinity;
}

/**
 * Check whether an upgrade can be afforded and applied.
 * Returns { canAfford, cost, newLevel, newBudget } or { canAfford: false, reason }
 */
export function checkUpgrade(teamState, attribute) {
  const { id, budget, upgrades } = teamState;
  const currentLevel = upgrades[attribute] ?? 0;
  const cost = getUpgradeCost(id, attribute, currentLevel);

  if (cost === Infinity) return { canAfford: false, reason: 'Maximum upgrade level reached' };
  if (budget < cost)     return { canAfford: false, reason: `Insufficient budget ($${(cost / 1e6).toFixed(0)}M needed)` };

  return {
    canAfford: true,
    cost,
    newLevel:  currentLevel + 1,
    newBudget: budget - cost,
  };
}

/**
 * Process race result finances for the player's team.
 * Awards per-race prize money based on driver finishing positions.
 *
 * @param {Object} teamState - current team state (budget, etc.)
 * @param {Array}  raceResult - classified results array
 * @param {Array}  playerDriverIds - IDs of the player's two drivers
 * @returns {{ earned: number, newBudget: number, breakdown: Object }}
 */
export function processRaceFinances(teamState, raceResult, playerDriverIds) {
  let totalEarned = 0;
  const breakdown = {};

  for (const entry of raceResult.classified) {
    if (!playerDriverIds.includes(entry.driverId)) continue;
    const prizeIdx = entry.position - 1;
    const prize = RACE_PRIZE_MONEY[prizeIdx] ?? 0;
    if (prize > 0) {
      totalEarned += prize;
      breakdown[entry.driverId] = prize;
    }
  }

  return {
    earned:    totalEarned,
    newBudget: teamState.budget + totalEarned,
    breakdown,
  };
}

/**
 * Award end-of-season constructor championship prize money.
 *
 * @param {Object} teamState
 * @param {number} constructorsPosition - finishing position in WCC (1–11)
 * @returns {{ earned: number, newBudget: number }}
 */
export function awardConstructorsPrize(teamState, constructorsPosition) {
  const idx    = constructorsPosition - 1;
  const earned = CONSTRUCTOR_PRIZE_MONEY[idx] ?? 0;
  return { earned, newBudget: teamState.budget + earned };
}

/**
 * Deduct per-race costs (driver salaries, logistics, staff) from team budget.
 * These are deducted each race weekend = 1/24th of annual costs.
 *
 * @param {Object} teamState
 * @param {Array}  driverContracts - all active driver contracts for this team
 * @returns {{ cost: number, newBudget: number }}
 */
export function deductRaceCosts(teamState, driverContracts) {
  const annualStaffCost = teamState.staffCosts ?? (TEAM_MAP[teamState.id]?.finances?.staffCosts ?? 40_000_000);
  const driverSalaries  = driverContracts.reduce((sum, c) => sum + (c.salary ?? 0), 0);
  const totalAnnual     = annualStaffCost + driverSalaries;
  const perRaceCost     = Math.floor(totalAnnual / 24);

  return {
    cost:      perRaceCost,
    newBudget: Math.max(0, teamState.budget - perRaceCost),
  };
}

/**
 * Calculate R&D tokens earned from a race result.
 * Win = 5 tokens, Podium = 3, Points = 1 each.
 *
 * @param {Array} raceResult - classified array
 * @param {Array} playerDriverIds
 * @returns {number} tokens earned
 */
export function calculateRDTokens(raceResult, playerDriverIds) {
  let tokens = 0;
  for (const entry of raceResult.classified) {
    if (!playerDriverIds.includes(entry.driverId)) continue;
    if (entry.position === 1)      tokens += RD_TOKENS_PER_RACE_WIN;
    else if (entry.position <= 3)  tokens += RD_TOKENS_PER_RACE_PODIUM;
    else if (entry.position <= 10) tokens += RD_TOKENS_PER_RACE_POINTS;
  }
  return tokens;
}
