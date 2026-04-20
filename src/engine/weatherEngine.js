// ============================================================
// WEATHER ENGINE — Race weather generation and mid-race transitions
// Pure functions only. No React. No side effects.
// ============================================================

import { gaussianRandom, clamp } from './engineUtils.js';

/**
 * Generate the starting weather state for a race weekend.
 * @param {Object} circuit - circuit object with weatherRisk and baseTemp
 * @param {number} totalLaps - total race distance in laps
 * @returns {WeatherState}
 */
export function generateRaceWeather(circuit, totalLaps) {
  const { weatherRisk, baseTemp } = circuit;

  // Roll for starting condition
  const startRoll = Math.random() * 100;
  let startCondition = 'DRY';
  let startWetness = 0.0;

  if (startRoll < weatherRisk * 0.4) {
    // Heavy rain from the start
    startCondition = 'HEAVY_WET';
    startWetness = 0.9;
  } else if (startRoll < weatherRisk * 0.8) {
    // Light rain from the start
    startCondition = 'LIGHT_WET';
    startWetness = 0.35;
  }

  // Roll for mid-race weather change
  const changeRoll = Math.random() * 100;
  let changeAt = null;
  let changeToCondition = null;

  if (changeRoll < weatherRisk) {
    // Weather change will happen during the race
    // Earliest change: lap 5; ensures drivers can't just pit on lap 1
    const minChangeLap = Math.max(5, Math.floor(totalLaps * 0.15));
    const maxChangeLap = Math.floor(totalLaps * 0.80);
    changeAt = Math.floor(Math.random() * (maxChangeLap - minChangeLap)) + minChangeLap;

    if (startCondition === 'DRY') {
      // Dry → wet
      changeToCondition = Math.random() < 0.6 ? 'LIGHT_WET' : 'HEAVY_WET';
    } else {
      // Wet → dry (track drying)
      changeToCondition = 'DRY';
    }
  }

  return {
    condition: startCondition,
    trackWetness: startWetness,
    temperature: baseTemp + gaussianRandom(0, 3), // ±3°C variation
    forecast: changeToCondition ?? startCondition,
    changeAt,
    changeToCondition,
    dryingRate: startCondition !== 'DRY' ? 0 : 0.05, // track drying rate per lap
  };
}

/**
 * Advance weather state by one lap.
 * Handles mid-race change trigger and gradual wetness transitions.
 *
 * @param {WeatherState} weather - current state
 * @param {number} currentLap
 * @returns {{ weather: WeatherState, event: Object|null }}
 */
export function advanceWeatherLap(weather, currentLap) {
  let newWeather = { ...weather };
  let event = null;

  // Trigger weather change if we hit the designated lap
  if (weather.changeAt && currentLap === weather.changeAt) {
    newWeather.condition = weather.changeToCondition;
    newWeather.changeAt = null;
    event = {
      type: 'WEATHER_CHANGE',
      lap: currentLap,
      from: weather.condition,
      to: newWeather.condition,
      detail: newWeather.condition === 'DRY'
        ? 'Track drying — slicks may be viable soon'
        : 'Rain beginning — intermediates recommended',
    };
  }

  // Adjust trackWetness toward target
  const targetWetness = getTargetWetness(newWeather.condition);
  if (newWeather.trackWetness < targetWetness) {
    // Getting wetter
    newWeather.trackWetness = clamp(newWeather.trackWetness + 0.08, 0, 1);
  } else if (newWeather.trackWetness > targetWetness) {
    // Drying out (slower process)
    newWeather.trackWetness = clamp(newWeather.trackWetness - 0.04, 0, 1);
  }

  // Snap condition if wetness crosses thresholds (e.g. light wet becoming heavy)
  if (newWeather.trackWetness > 0.7 && newWeather.condition === 'LIGHT_WET') {
    newWeather.condition = 'HEAVY_WET';
  } else if (newWeather.trackWetness < 0.1 && newWeather.condition !== 'DRY') {
    newWeather.condition = 'DRY';
  }

  return { weather: newWeather, event };
}

/**
 * Get the target trackWetness for a given condition.
 */
function getTargetWetness(condition) {
  switch (condition) {
    case 'DRY':       return 0.0;
    case 'LIGHT_WET': return 0.4;
    case 'HEAVY_WET': return 0.85;
    default:          return 0.0;
  }
}

/**
 * Compute wet weather lap time modification based on:
 * - current trackWetness
 * - tyre compound suitability
 * - driver wet weather attribute
 *
 * Returns seconds to ADD (positive) or SUBTRACT (negative) from base lap time.
 *
 * @param {number} trackWetness - 0.0–1.0
 * @param {string} compound
 * @param {number} driverWetWeather - driver.attributes.wet_weather (1–100)
 * @returns {number}
 */
export function getWetWeatherModifier(trackWetness, compound, driverWetWeather) {
  if (trackWetness <= 0.0) return 0;

  const isSlick = ['SOFT', 'MEDIUM', 'HARD'].includes(compound);
  const isFullWet = compound === 'WET';
  const isInter = compound === 'INTERMEDIATE';

  let modifier = 0;

  if (isSlick) {
    // Slick tyres in the wet: enormous penalty scaling with wetness
    modifier = trackWetness * 9.0;
  } else if (isInter) {
    // Inters: ideal in light wet (0.2–0.5), good up to 0.7, bad above
    if (trackWetness <= 0.5) {
      modifier = 0; // Inters at their best
    } else {
      modifier = (trackWetness - 0.5) * 4.0; // Getting slower in heavy rain
    }
  } else if (isFullWet) {
    // Full wets: only good in heavy rain; slow in light wet
    if (trackWetness >= 0.5) {
      modifier = 0; // Full wets at their best
    } else {
      modifier = (0.5 - trackWetness) * 6.0; // Very slow on a damp track
    }
  }

  // Driver wet weather skill modifies the base penalty for correct tyre
  // High skill = gains time vs lower-skill drivers in the wet
  if (!isSlick && trackWetness > 0.1) {
    const skillFactor = (driverWetWeather - 80) / 100; // -0.8 to +0.2
    modifier -= skillFactor * trackWetness * 2.0;
  }

  return modifier;
}

/**
 * Get a text description of current weather for display.
 * @param {WeatherState} weather
 * @returns {string}
 */
export function getWeatherLabel(weather) {
  switch (weather.condition) {
    case 'DRY':       return '☀ Dry';
    case 'LIGHT_WET': return '🌦 Damp';
    case 'HEAVY_WET': return '🌧 Wet';
    default:          return 'Unknown';
  }
}

/**
 * Returns the recommended tyre compound for current conditions.
 */
export function getRecommendedCompound(trackWetness) {
  if (trackWetness < 0.1) return 'MEDIUM';
  if (trackWetness < 0.5) return 'INTERMEDIATE';
  return 'WET';
}
