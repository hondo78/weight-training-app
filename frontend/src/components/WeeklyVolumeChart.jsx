import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

const API_BASE = '/api';
const WEEKS = 12;
const SURFACE = '#33322f';

// Feste Farbe pro Muskelgruppe (folgt der Gruppe, nicht dem Rang); geprüft auf iron-900
const GROUPS = [
  { key: 'Brust', color: '#3987e5' },
  { key: 'Rücken', color: '#d95926' },
  { key: 'Beine', color: '#199e70' },
  { key: 'Schultern', color: '#c98500' },
  { key: 'Arme', color: '#d55181' },
  { key: 'Core', color: '#008300' },
];
const OTHER = { key: 'Andere', color: '#86827a' };
const KNOWN = new Set(GROUPS.map(g => g.key));

const isoWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

const toKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);
  return (
    <div className="bg-iron-800 border border-iron-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-iron-100 font-medium mb-1">{label} · {total} Sätze</p>
      {[...payload].reverse().filter(p => p.value > 0).map(p => (
        <p key={p.dataKey} className="flex items-center gap-2 text-iron-300">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
          {p.dataKey}: <span className="text-iron-100">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function WeeklyVolumeChart() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/stats/weekly-volume?weeks=${WEEKS}`)
      .then(res => res.json())
      .then(setRows)
      .catch(error => console.error('Error loading weekly volume:', error));
  }, []);

  const { data, series, table } = useMemo(() => {
    const today = new Date();
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
    const weeks = [];
    for (let i = WEEKS - 1; i >= 0; i--) {
      const start = new Date(monday);
      start.setDate(monday.getDate() - i * 7);
      weeks.push({ key: toKey(start), label: `KW ${isoWeek(start)}` });
    }
    const byWeek = Object.fromEntries(weeks.map(w => [w.key, { week: w.label }]));
    let hasOther = false;
    rows.forEach(row => {
      const target = byWeek[row.week_start];
      if (!target) return;
      const group = KNOWN.has(row.muscle_group) ? row.muscle_group : OTHER.key;
      if (group === OTHER.key) hasOther = true;
      target[group] = (target[group] || 0) + row.sets;
    });
    const used = [...GROUPS, ...(hasOther ? [OTHER] : [])]
      .filter(g => rows.some(r => (KNOWN.has(r.muscle_group) ? r.muscle_group : OTHER.key) === g.key));
    const chartData = weeks.map(w => {
      const entry = byWeek[w.key];
      used.forEach(g => { entry[g.key] = entry[g.key] || 0; });
      return entry;
    });

    const current = chartData[chartData.length - 1];
    const previous = chartData.slice(-5, -1);
    const tableRows = used.map(g => ({
      ...g,
      thisWeek: current[g.key] || 0,
      average: Math.round((previous.reduce((sum, w) => sum + (w[g.key] || 0), 0) / previous.length) * 10) / 10
    }));
    return { data: chartData, series: used, table: tableRows };
  }, [rows]);

  return (
    <div className="bg-iron-900 rounded-xl p-5">
      <h2 className="section-title text-iron-400 text-sm mb-1">Sätze pro Woche & Muskelgruppe</h2>
      <p className="text-iron-500 text-xs mb-4">Letzte {WEEKS} Wochen, nur ausgefüllte Sätze</p>

      {series.length === 0 ? (
        <p className="text-iron-500 text-center py-8">Noch keine Sätze in den letzten {WEEKS} Wochen</p>
      ) : (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#46443f" strokeDasharray="2 4" />
                <XAxis dataKey="week" stroke="#6b6860" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                <YAxis stroke="#6b6860" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Legend
                  iconType="square"
                  iconSize={10}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value) => <span style={{ color: '#cac8c4' }}>{value}</span>}
                />
                {series.map(g => (
                  <Bar key={g.key} dataKey={g.key} stackId="sets" fill={g.color} stroke={SURFACE} strokeWidth={2} maxBarSize={36} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <table className="w-full mt-4 text-sm">
            <thead>
              <tr className="text-iron-500 text-xs uppercase tracking-wider">
                <th className="text-left font-normal py-1">Muskelgruppe</th>
                <th className="text-right font-normal py-1">Diese Woche</th>
                <th className="text-right font-normal py-1">Ø 4 Wochen davor</th>
              </tr>
            </thead>
            <tbody>
              {table.map(row => (
                <tr key={row.key} className="border-t border-iron-800">
                  <td className="py-1.5 text-iron-200">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm mr-2 align-middle" style={{ backgroundColor: row.color }} />
                    {row.key}
                  </td>
                  <td className="py-1.5 text-right font-mono text-iron-100">{row.thisWeek}</td>
                  <td className="py-1.5 text-right font-mono text-iron-400">{row.average.toLocaleString('de-DE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
