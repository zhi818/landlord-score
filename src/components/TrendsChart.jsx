import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getSlotColorHex } from './Scoreboard';

const SLOTS = ['A', 'B', 'C'];

function CustomTooltip({ active, payload, players, labels }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">第 {data.roundNumber} 局</div>
      <div className="chart-tooltip-sub">本局得分</div>
      {SLOTS.filter((s) => players[s]?.name).map((s) => {
        const key = `p_${s}_round`;
        const value = data[key];
        const color = labels[s];
        const sign = value > 0 ? 'positive' : value < 0 ? 'negative' : '';
        return (
          <div className="chart-tooltip-row" key={`r-${s}`}>
            <span className="label">
              <span className="dot" style={{ background: color }} />
              {players[s].name}
            </span>
            <span className={`value ${sign}`}>
              {value > 0 ? '+' : ''}
              {value}
            </span>
          </div>
        );
      })}
      <div className="chart-tooltip-sub">累计总分</div>
      {SLOTS.filter((s) => players[s]?.name).map((s) => {
        const key = `p_${s}_cum`;
        const value = data[key];
        const color = labels[s];
        const sign = value > 0 ? 'positive' : value < 0 ? 'negative' : '';
        return (
          <div className="chart-tooltip-row" key={`c-${s}`}>
            <span className="label">
              <span className="dot" style={{ background: color }} />
              {players[s].name}
            </span>
            <span className={`value ${sign}`}>
              {value > 0 ? '+' : ''}
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function TrendsChart({ room, theme }) {
  const data = useMemo(() => {
    const players = room.players ?? {};
    const rounds = room.rounds ?? [];
    const totals = { A: 0, B: 0, C: 0 };
    return rounds.map((r) => {
      const row = { roundNumber: r.roundNumber };
      r.scores.forEach((s) => {
        totals[s.playerId] = (totals[s.playerId] ?? 0) + s.score;
        row[`p_${s.playerId}_round`] = s.score;
        row[`p_${s.playerId}_cum`] = totals[s.playerId];
      });
      return row;
    });
  }, [room.rounds]);

  const labels = useMemo(() => {
    const out = {};
    SLOTS.forEach((s) => { out[s] = getSlotColorHex(s, theme); });
    return out;
  }, [theme]);

  if (data.length === 0) return null;

  const yDomain = useMemo(() => {
    let maxAbs = 1;
    for (const row of data) {
      for (const key of Object.keys(row)) {
        if (key.startsWith('p_')) maxAbs = Math.max(maxAbs, Math.abs(row[key]));
      }
    }
    const ceil = Math.ceil(maxAbs * 1.1 / 10) * 10 || 10;
    return [-ceil, ceil];
  }, [data]);

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 8 }} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="0" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="roundNumber"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            stroke="var(--border)"
            tickLine={false}
            label={{ value: '局', position: 'insideRight', fill: 'var(--text-muted)', fontSize: 11, offset: -4 }}
          />
          <YAxis
            domain={yDomain}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            stroke="var(--border)"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<CustomTooltip players={room.players ?? {}} labels={labels} />}
            cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '2 2' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}
            iconType="plainline"
            formatter={(value) => {
              const slot = value.replace('p_', '').replace('_cum', '');
              const name = room.players?.[slot]?.name;
              return <span style={{ color: 'var(--text-secondary)' }}>{name ?? slot}</span>;
            }}
          />
          {SLOTS.filter((s) => room.players?.[s]?.name).map((s) => (
            <Bar
              key={`bar-${s}`}
              dataKey={`p_${s}_round`}
              fill={labels[s]}
              fillOpacity={0.32}
              maxBarSize={20}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
              legendType="none"
            />
          ))}
          {SLOTS.filter((s) => room.players?.[s]?.name).map((s) => (
            <Line
              key={`line-${s}`}
              type="monotone"
              dataKey={`p_${s}_cum`}
              stroke={labels[s]}
              strokeWidth={2}
              dot={{ r: 3, fill: labels[s], stroke: 'var(--surface)', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: labels[s], stroke: 'var(--surface)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
