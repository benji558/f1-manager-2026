// EventLog — Auto-scrolling race event feed
import { useEffect, useRef } from 'react';

const TYPE_ICON = {
  OVERTAKE:            '↑',
  PIT_STOP:            '🔧',
  DNF:                 '🚫',
  SAFETY_CAR_DEPLOYED: '🚗',
  SAFETY_CAR_IN:       '✅',
  VSC_DEPLOYED:        '⚠️',
  VSC_IN:              '✅',
  FASTEST_LAP:         '⚡',
  WEATHER_CHANGE:      '🌧️',
  PENALTY_ISSUED:      '⚖️',
};

export default function EventLog({ events = [], maxHeight = 200 }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  if (!events.length) {
    return (
      <div className="event-log" style={{ maxHeight }}>
        <div className="text-muted text-sm" style={{ padding: 12, textAlign: 'center' }}>
          Race events will appear here
        </div>
      </div>
    );
  }

  return (
    <div className="event-log" style={{ maxHeight }}>
      {events.map((ev, i) => (
        <div key={i} className={`event-item event-type-${ev.type}`}>
          <span className="event-lap">L{ev.lap}</span>
          <span className="event-icon">{TYPE_ICON[ev.type] ?? '•'}</span>
          <span className="event-text">{ev.detail ?? ev.type}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
