// TyreDisplay — Shows compound badge + wear bar
export default function TyreDisplay({ compound, wear = 0, age = 0, size = 'md', showWear = true }) {
  const letter = compound?.[0] ?? '?';
  const wearClass = wear < 0.4 ? 'wear-low' : wear < 0.65 ? 'wear-medium' : wear < 0.82 ? 'wear-high' : 'wear-crit';
  const badgeClass = `tyre-badge tyre-${compound ?? 'MEDIUM'}${size === 'lg' ? ' tyre-badge-lg' : ''}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span className={badgeClass}>{letter}</span>
        {age > 0 && <span className="text-xs text-muted">L{age}</span>}
      </div>
      {showWear && (
        <div className="tyre-wear-bar" style={{ width: size === 'lg' ? 36 : 24 }}>
          <div className={`tyre-wear-fill ${wearClass}`} style={{ width: `${Math.min(100, wear * 100)}%` }} />
        </div>
      )}
    </div>
  );
}
