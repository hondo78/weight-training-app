import { Fragment, useEffect, useMemo, useState } from 'react';

const API_BASE = '/api';
const WEEKS = 26;
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// Sequentielle Rost-Skala: leer → viele Sätze
const LEVEL_COLORS = ['#3a3936', '#5c3a28', '#8a4523', '#b8541f', '#e07b4a'];
const LEVEL_LABELS = ['kein Training', '1–9 Sätze', '10–19 Sätze', '20–29 Sätze', '30+ Sätze'];

const toKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function levelFor(day) {
  if (!day || day.sessions === 0) return 0;
  if (day.sets >= 30) return 4;
  if (day.sets >= 20) return 3;
  if (day.sets >= 10) return 2;
  return 1;
}

export default function TrainingCalendar() {
  const [days, setDays] = useState({});
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/stats/calendar?days=${WEEKS * 7 + 7}`)
      .then(res => res.json())
      .then(rows => setDays(Object.fromEntries(rows.map(r => [r.date, r]))))
      .catch(error => console.error('Error loading calendar:', error));
  }, []);

  const { columns, monthLabels, totalSessions, streak } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const start = new Date(monday);
    start.setDate(monday.getDate() - (WEEKS - 1) * 7);

    const cols = [];
    const labels = [];
    let lastMonth = null;
    for (let w = 0; w < WEEKS; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const key = toKey(date);
        week.push({ key, date, future: date > today, data: days[key] });
      }
      const month = week[0].date.getMonth();
      labels.push(month !== lastMonth ? week[0].date.toLocaleDateString('de-DE', { month: 'short' }) : '');
      lastMonth = month;
      cols.push(week);
    }

    const trainedWeeks = cols.map(week => week.some(day => day.data?.sessions > 0));
    let count = 0;
    let i = trainedWeeks.length - 1;
    if (!trainedWeeks[i]) i--; // laufende Woche zählt erst, wenn trainiert wurde
    for (; i >= 0 && trainedWeeks[i]; i--) count++;

    const sessions = cols.flat().reduce((sum, day) => sum + (day.data?.sessions || 0), 0);
    return { columns: cols, monthLabels: labels, totalSessions: sessions, streak: count };
  }, [days]);

  const describe = (day) => {
    const date = day.date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
    if (!day.data?.sessions) return `${date}: kein Training`;
    const volume = Math.round(day.data.volume).toLocaleString('de-DE');
    return `${date}: ${day.data.sessions} ${day.data.sessions === 1 ? 'Training' : 'Trainings'}, ${day.data.sets} Sätze, ${volume} kg Volumen`;
  };

  return (
    <div className="bg-iron-900 rounded-xl p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h2 className="section-title text-iron-400 text-sm">Trainingskalender (26 Wochen)</h2>
        <p className="text-iron-400 text-sm">
          <span className="text-iron-100 font-medium">{totalSessions}</span> Trainings ·{' '}
          <span className="text-iron-100 font-medium">{streak}</span> {streak === 1 ? 'Woche' : 'Wochen'} in Folge
        </p>
      </div>

      <div
        className="grid gap-[3px] text-[10px] text-iron-500"
        style={{ gridTemplateColumns: `auto repeat(${WEEKS}, minmax(0, 1fr))` }}
      >
        <span />
        {monthLabels.map((label, w) => (
          <span key={`m${w}`} className="whitespace-nowrap h-4 leading-4">{label}</span>
        ))}
        {WEEKDAYS.map((weekday, d) => (
          <Fragment key={weekday}>
            <span className="pr-1 leading-none flex items-center">{d % 2 === 0 ? weekday : ''}</span>
            {columns.map(week => {
              const day = week[d];
              return (
                <button
                  key={day.key}
                  type="button"
                  disabled={day.future}
                  onMouseEnter={() => setHovered(day)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(day)}
                  onClick={() => setHovered(day)}
                  aria-label={describe(day)}
                  className={`aspect-square w-full rounded-[3px] ${day.future ? 'opacity-0' : 'hover:ring-2 hover:ring-iron-200'} ${hovered?.key === day.key ? 'ring-2 ring-iron-100' : ''}`}
                  style={{ backgroundColor: LEVEL_COLORS[levelFor(day.data)] }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 min-h-5">
        <p className="text-iron-300 text-xs">{hovered ? describe(hovered) : 'Tag antippen oder überfahren für Details'}</p>
        <div className="flex items-center gap-1 text-[10px] text-iron-500">
          <span>Weniger</span>
          {LEVEL_COLORS.map((color, i) => (
            <span key={color} title={LEVEL_LABELS[i]} className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: color }} />
          ))}
          <span>Mehr</span>
        </div>
      </div>
    </div>
  );
}
