// ============================================================
// TEAMS.JS — All 11 F1 teams for the 2026 season
// Car attributes are frozen base values.
// Live car values (after R&D upgrades) live in gameState.teams[id].car
// ============================================================

export const TEAMS = Object.freeze([
  {
    id: 'mclaren',
    fullName: 'McLaren F1 Team',
    shortName: 'McLaren',
    color: '#FF8000',
    secondaryColor: '#000000',
    engineSupplier: 'Mercedes',
    // Base car attributes (aerodynamics, engine_power, reliability, tyre_efficiency)
    car: { aerodynamics: 95, engine_power: 93, reliability: 90, tyre_efficiency: 92 },
    finances: { budget: 265_000_000, sponsorIncome: 90_000_000, staffCosts: 65_000_000 },
    upgradeSpec: {
      aerodynamics:    { maxLevel: 10, costPerLevel: [5e6,7e6,10e6,14e6,19e6,25e6,32e6,40e6,50e6,65e6] },
      engine_power:    { maxLevel: 10, costPerLevel: [4e6,6e6,9e6,13e6,18e6,24e6,31e6,39e6,49e6,62e6] },
      reliability:     { maxLevel: 8,  costPerLevel: [3e6,5e6,7e6,10e6,14e6,18e6,23e6,30e6] },
      tyre_efficiency: { maxLevel: 8,  costPerLevel: [4e6,6e6,8e6,11e6,15e6,20e6,26e6,33e6] },
    },
  },
  {
    id: 'ferrari',
    fullName: 'Scuderia Ferrari HP',
    shortName: 'Ferrari',
    color: '#DC0000',
    secondaryColor: '#FFFFFF',
    engineSupplier: 'Ferrari',
    car: { aerodynamics: 93, engine_power: 94, reliability: 88, tyre_efficiency: 89 },
    finances: { budget: 275_000_000, sponsorIncome: 95_000_000, staffCosts: 70_000_000 },
    upgradeSpec: {
      aerodynamics:    { maxLevel: 10, costPerLevel: [5e6,7e6,10e6,14e6,19e6,25e6,32e6,40e6,50e6,65e6] },
      engine_power:    { maxLevel: 10, costPerLevel: [4e6,6e6,9e6,13e6,18e6,24e6,31e6,39e6,49e6,62e6] },
      reliability:     { maxLevel: 8,  costPerLevel: [3e6,5e6,7e6,10e6,14e6,18e6,23e6,30e6] },
      tyre_efficiency: { maxLevel: 8,  costPerLevel: [4e6,6e6,8e6,11e6,15e6,20e6,26e6,33e6] },
    },
  },
  {
    id: 'mercedes',
    fullName: 'Mercedes-AMG Petronas F1 Team',
    shortName: 'Mercedes',
    color: '#00D2BE',
    secondaryColor: '#000000',
    engineSupplier: 'Mercedes',
    car: { aerodynamics: 90, engine_power: 92, reliability: 91, tyre_efficiency: 90 },
    finances: { budget: 280_000_000, sponsorIncome: 100_000_000, staffCosts: 70_000_000 },
    upgradeSpec: {
      aerodynamics:    { maxLevel: 10, costPerLevel: [5e6,7e6,10e6,14e6,19e6,25e6,32e6,40e6,50e6,65e6] },
      engine_power:    { maxLevel: 10, costPerLevel: [4e6,6e6,9e6,13e6,18e6,24e6,31e6,39e6,49e6,62e6] },
      reliability:     { maxLevel: 8,  costPerLevel: [3e6,5e6,7e6,10e6,14e6,18e6,23e6,30e6] },
      tyre_efficiency: { maxLevel: 8,  costPerLevel: [4e6,6e6,8e6,11e6,15e6,20e6,26e6,33e6] },
    },
  },
  {
    id: 'red_bull',
    fullName: 'Oracle Red Bull Racing',
    shortName: 'Red Bull',
    color: '#3671C6',
    secondaryColor: '#CC1E4A',
    engineSupplier: 'Honda RBPT',
    car: { aerodynamics: 92, engine_power: 91, reliability: 89, tyre_efficiency: 91 },
    finances: { budget: 270_000_000, sponsorIncome: 95_000_000, staffCosts: 68_000_000 },
    upgradeSpec: {
      aerodynamics:    { maxLevel: 10, costPerLevel: [5e6,7e6,10e6,14e6,19e6,25e6,32e6,40e6,50e6,65e6] },
      engine_power:    { maxLevel: 10, costPerLevel: [4e6,6e6,9e6,13e6,18e6,24e6,31e6,39e6,49e6,62e6] },
      reliability:     { maxLevel: 8,  costPerLevel: [3e6,5e6,7e6,10e6,14e6,18e6,23e6,30e6] },
      tyre_efficiency: { maxLevel: 8,  costPerLevel: [4e6,6e6,8e6,11e6,15e6,20e6,26e6,33e6] },
    },
  },
  {
    id: 'aston_martin',
    fullName: 'Aston Martin Aramco F1 Team',
    shortName: 'Aston Martin',
    color: '#358C75',
    secondaryColor: '#6CD3BF',
    engineSupplier: 'Mercedes',
    car: { aerodynamics: 82, engine_power: 88, reliability: 85, tyre_efficiency: 83 },
    finances: { budget: 195_000_000, sponsorIncome: 70_000_000, staffCosts: 50_000_000 },
    upgradeSpec: {
      aerodynamics:    { maxLevel: 10, costPerLevel: [4e6,6e6,9e6,12e6,16e6,21e6,27e6,34e6,43e6,54e6] },
      engine_power:    { maxLevel: 10, costPerLevel: [3e6,5e6,7e6,10e6,14e6,19e6,25e6,32e6,40e6,50e6] },
      reliability:     { maxLevel: 8,  costPerLevel: [3e6,4e6,6e6,9e6,12e6,16e6,20e6,26e6] },
      tyre_efficiency: { maxLevel: 8,  costPerLevel: [3e6,5e6,7e6,9e6,13e6,17e6,22e6,28e6] },
    },
  },
  {
    id: 'alpine',
    fullName: 'BWT Alpine F1 Team',
    shortName: 'Alpine',
    color: '#0093CC',
    secondaryColor: '#FF69B4',
    engineSupplier: 'Renault',
    car: { aerodynamics: 80, engine_power: 81, reliability: 82, tyre_efficiency: 80 },
    finances: { budget: 185_000_000, sponsorIncome: 55_000_000, staffCosts: 45_000_000 },
    upgradeSpec: {
      aerodynamics:    { maxLevel: 10, costPerLevel: [4e6,5e6,7e6,10e6,13e6,17e6,22e6,28e6,35e6,44e6] },
      engine_power:    { maxLevel: 10, costPerLevel: [3e6,4e6,6e6,9e6,12e6,16e6,21e6,27e6,34e6,43e6] },
      reliability:     { maxLevel: 8,  costPerLevel: [2e6,4e6,5e6,7e6,10e6,13e6,17e6,22e6] },
      tyre_efficiency: { maxLevel: 8,  costPerLevel: [2e6,4e6,5e6,7e6,10e6,13e6,17e6,22e6] },
    },
  },
  {
    id: 'williams',
    fullName: 'Williams Racing',
    shortName: 'Williams',
    color: '#37BEDD',
    secondaryColor: '#041E42',
    engineSupplier: 'Mercedes',
    car: { aerodynamics: 79, engine_power: 80, reliability: 81, tyre_efficiency: 79 },
    finances: { budget: 165_000_000, sponsorIncome: 45_000_000, staffCosts: 38_000_000 },
    upgradeSpec: {
      aerodynamics:    { maxLevel: 10, costPerLevel: [3e6,5e6,7e6,9e6,12e6,16e6,20e6,26e6,32e6,40e6] },
      engine_power:    { maxLevel: 10, costPerLevel: [3e6,4e6,6e6,8e6,11e6,15e6,19e6,24e6,31e6,39e6] },
      reliability:     { maxLevel: 8,  costPerLevel: [2e6,3e6,5e6,7e6,9e6,12e6,15e6,20e6] },
      tyre_efficiency: { maxLevel: 8,  costPerLevel: [2e6,3e6,5e6,7e6,9e6,12e6,15e6,20e6] },
    },
  },
  {
    id: 'racing_bulls',
    fullName: 'Visa Cash App Racing Bulls F1 Team',
    shortName: 'Racing Bulls',
    color: '#4E7C99',
    secondaryColor: '#FFFFFF',
    engineSupplier: 'Honda RBPT',
    car: { aerodynamics: 81, engine_power: 83, reliability: 83, tyre_efficiency: 81 },
    finances: { budget: 160_000_000, sponsorIncome: 40_000_000, staffCosts: 35_000_000 },
    upgradeSpec: {
      aerodynamics:    { maxLevel: 10, costPerLevel: [3e6,5e6,7e6,9e6,12e6,16e6,20e6,26e6,32e6,40e6] },
      engine_power:    { maxLevel: 10, costPerLevel: [3e6,4e6,6e6,8e6,11e6,15e6,19e6,24e6,31e6,39e6] },
      reliability:     { maxLevel: 8,  costPerLevel: [2e6,3e6,5e6,7e6,9e6,12e6,15e6,20e6] },
      tyre_efficiency: { maxLevel: 8,  costPerLevel: [2e6,3e6,5e6,7e6,9e6,12e6,15e6,20e6] },
    },
  },
  {
    id: 'haas',
    fullName: 'MoneyGram Haas F1 Team',
    shortName: 'Haas',
    color: '#B6BABD',
    secondaryColor: '#E8002D',
    engineSupplier: 'Ferrari',
    car: { aerodynamics: 78, engine_power: 82, reliability: 79, tyre_efficiency: 78 },
    finances: { budget: 140_000_000, sponsorIncome: 35_000_000, staffCosts: 30_000_000 },
    upgradeSpec: {
      aerodynamics:    { maxLevel: 10, costPerLevel: [3e6,4e6,6e6,8e6,11e6,14e6,18e6,23e6,29e6,36e6] },
      engine_power:    { maxLevel: 10, costPerLevel: [2e6,4e6,5e6,7e6,10e6,13e6,17e6,21e6,27e6,34e6] },
      reliability:     { maxLevel: 8,  costPerLevel: [2e6,3e6,4e6,6e6,8e6,11e6,14e6,18e6] },
      tyre_efficiency: { maxLevel: 8,  costPerLevel: [2e6,3e6,4e6,6e6,8e6,11e6,14e6,18e6] },
    },
  },
  {
    id: 'audi',
    fullName: 'Audi F1 Team',
    shortName: 'Audi',
    color: '#B2B7BE',
    secondaryColor: '#BB0A30',
    engineSupplier: 'Audi',
    // New 2026 constructor — lowest-rated car
    car: { aerodynamics: 72, engine_power: 74, reliability: 70, tyre_efficiency: 71 },
    finances: { budget: 155_000_000, sponsorIncome: 50_000_000, staffCosts: 35_000_000 },
    upgradeSpec: {
      aerodynamics:    { maxLevel: 10, costPerLevel: [3e6,4e6,6e6,8e6,11e6,14e6,18e6,23e6,29e6,36e6] },
      engine_power:    { maxLevel: 10, costPerLevel: [3e6,4e6,6e6,8e6,11e6,14e6,18e6,23e6,29e6,36e6] },
      reliability:     { maxLevel: 8,  costPerLevel: [2e6,3e6,4e6,6e6,8e6,11e6,14e6,18e6] },
      tyre_efficiency: { maxLevel: 8,  costPerLevel: [2e6,3e6,4e6,6e6,8e6,11e6,14e6,18e6] },
    },
  },
  {
    id: 'cadillac',
    fullName: 'Cadillac F1 Team',
    shortName: 'Cadillac',
    color: '#C8A96E',
    secondaryColor: '#FFFFFF',
    engineSupplier: 'GM',
    // New 2026 constructor — lowest-rated car alongside Audi
    car: { aerodynamics: 70, engine_power: 71, reliability: 68, tyre_efficiency: 69 },
    finances: { budget: 135_000_000, sponsorIncome: 40_000_000, staffCosts: 30_000_000 },
    upgradeSpec: {
      aerodynamics:    { maxLevel: 10, costPerLevel: [3e6,4e6,6e6,8e6,11e6,14e6,18e6,23e6,29e6,36e6] },
      engine_power:    { maxLevel: 10, costPerLevel: [3e6,4e6,6e6,8e6,11e6,14e6,18e6,23e6,29e6,36e6] },
      reliability:     { maxLevel: 8,  costPerLevel: [2e6,3e6,4e6,6e6,8e6,11e6,14e6,18e6] },
      tyre_efficiency: { maxLevel: 8,  costPerLevel: [2e6,3e6,4e6,6e6,8e6,11e6,14e6,18e6] },
    },
  },
]);

// Quick lookup by ID
export const TEAM_MAP = Object.freeze(
  Object.fromEntries(TEAMS.map(t => [t.id, t]))
);
