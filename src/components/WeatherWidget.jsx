// WeatherWidget — Current weather conditions display
const ICONS = {
  DRY:       '☀️',
  LIGHT_WET: '🌦️',
  HEAVY_WET: '⛈️',
  CLOUDY:    '☁️',
};

export default function WeatherWidget({ weather, compact = false }) {
  if (!weather) return null;
  const { condition = 'DRY', temperature = 25, trackWetness = 0, forecast } = weather;
  const icon = ICONS[condition] ?? '☀️';

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>{icon}</span>
        <span className="text-sm text-muted">{temperature}°C</span>
      </div>
    );
  }

  return (
    <div className="weather-widget">
      <span className="weather-icon">{icon}</span>
      <div className="weather-info">
        <div className="weather-condition">{condition.replace('_', ' ')}</div>
        <div className="weather-temp">
          {temperature}°C
          {trackWetness > 0 && ` · Track ${Math.round(trackWetness * 100)}% wet`}
          {forecast && forecast !== condition && ` · Forecast: ${ICONS[forecast] ?? ''} ${forecast.replace('_', ' ')}`}
        </div>
      </div>
    </div>
  );
}
