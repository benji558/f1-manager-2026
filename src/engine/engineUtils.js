// ============================================================
// ENGINE UTILS — Shared math helpers for all engine files
// Pure functions only. No React. No side effects.
// ============================================================

/**
 * Clamp a value between min and max (inclusive).
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between a and b by factor t (0–1).
 */
export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Gaussian (normally distributed) random number using Box-Muller transform.
 * mean: centre of distribution
 * stddev: standard deviation
 */
export function gaussianRandom(mean = 0, stddev = 1) {
  // Box-Muller: transform two uniform randoms into a normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * stddev;
}

/**
 * Weighted random selection from an array of items with corresponding weights.
 * items: array of values to choose from
 * weights: array of relative probabilities (need not sum to 1)
 * Returns one item.
 */
export function weightedRandom(items, weights) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Interpolate a position along a polyline of {x, y} points.
 * t: 0.0 = start of polyline, 1.0 = end (which should equal the start for a circuit).
 * Returns {x, y}.
 *
 * Used by TrackMap to place car dots on the SVG track.
 */
export function interpolatePolyline(points, t) {
  if (!points || points.length < 2) return { x: 0, y: 0 };

  // Pre-compute cumulative segment lengths
  const segments = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segments.push(len);
    totalLength += len;
  }

  // Target distance along the polyline
  let targetDist = clamp(t, 0, 1) * totalLength;

  // Walk segments until we reach targetDist
  let cumDist = 0;
  for (let i = 0; i < segments.length; i++) {
    if (cumDist + segments[i] >= targetDist) {
      // Fraction within this segment
      const frac = (targetDist - cumDist) / (segments[i] + 1e-10);
      return {
        x: lerp(points[i].x, points[i + 1].x, frac),
        y: lerp(points[i].y, points[i + 1].y, frac),
      };
    }
    cumDist += segments[i];
  }

  // Fallback: return the last point
  return points[points.length - 1];
}

/**
 * Compute a per-lap random probability from a race-level percentage.
 * raceChancePercent: e.g. 25 means 25% chance it happens in the race
 * totalLaps: race distance in laps
 * Returns probability per lap.
 *
 * Derived from: P(not happening in N laps) = (1 - p)^N = 1 - raceChance/100
 */
export function perLapProbability(raceChancePercent, totalLaps) {
  const raceProb = clamp(raceChancePercent / 100, 0, 0.99);
  return 1 - Math.pow(1 - raceProb, 1 / Math.max(totalLaps, 1));
}

/**
 * Deep clone a plain JS object/array (no functions, no Maps, no special types).
 * Faster than JSON.parse(JSON.stringify()) for small-medium objects.
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  const clone = {};
  for (const key of Object.keys(obj)) {
    clone[key] = deepClone(obj[key]);
  }
  return clone;
}

/**
 * Format lap time (seconds) to mm:ss.sss string.
 * e.g. 93.456 → "1:33.456"
 */
export function formatLapTime(seconds) {
  if (seconds == null || isNaN(seconds)) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}

/**
 * Format a gap/interval (seconds) to a compact string.
 * e.g. 1.234 → "+1.234"  |  0.0 → "LEADER"
 */
export function formatGap(seconds) {
  if (seconds === 0) return 'LEADER';
  if (seconds == null) return '--';
  return `+${seconds.toFixed(3)}`;
}

/**
 * Format USD amount to a compact string.
 * e.g. 165000000 → "$165M"
 */
export function formatMoney(amount) {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000)     return `$${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000)         return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}
