// FinancePanel — Budget bar and income/expenditure breakdown
function fmtM(val) {
  const m = val / 1_000_000;
  return (m >= 0 ? '+' : '') + '$' + m.toFixed(1) + 'M';
}

function fmtMabs(val) {
  return '$' + (Math.abs(val) / 1_000_000).toFixed(1) + 'M';
}

export default function FinancePanel({ teamState, driverContracts = [], playerDriverIds = [] }) {
  if (!teamState) return null;

  const budget        = teamState.budget ?? 0;
  const sponsorIncome = teamState.sponsorIncome ?? 0;
  const staffCosts    = teamState.staffCosts ?? 0;

  const driverSalaries = playerDriverIds.reduce((sum, id) => {
    return sum + (driverContracts[id]?.salary ?? 0);
  }, 0);

  const totalCosts = staffCosts + driverSalaries;
  const maxBudget  = (teamState.sponsorIncome ?? 100_000_000) * 3;
  const pct        = Math.min(100, (budget / maxBudget) * 100);
  const isLow      = budget < 20_000_000;

  const rows = [
    { label: 'Sponsor income',   value: sponsorIncome,   positive: true  },
    { label: 'Staff costs',      value: -staffCosts,     positive: false },
    { label: 'Driver salaries',  value: -driverSalaries, positive: false },
    { label: 'Net per season',   value: sponsorIncome - totalCosts, positive: sponsorIncome > totalCosts, bold: true },
  ];

  return (
    <div className="panel">
      <div className="section-header">
        <span className="section-title">Finances</span>
        <span className="text-bold text-white">{fmtMabs(budget)}</span>
      </div>

      <div className="budget-bar mb-md">
        <div className={`budget-fill${isLow ? ' budget-low' : ''}`} style={{ width: `${pct}%` }} />
      </div>

      {rows.map(({ label, value, positive, bold }) => (
        <div key={label} className="finance-row">
          <span className={`finance-label${bold ? ' text-bold' : ''}`}>{label}</span>
          <span className={`finance-value ${value >= 0 ? 'finance-positive' : 'finance-negative'}`}>
            {fmtM(value)}
          </span>
        </div>
      ))}
    </div>
  );
}
