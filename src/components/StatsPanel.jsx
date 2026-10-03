// 智能分析面板
import { useMemo } from 'react';
import { computeStats } from '../lib/analytics';

const SLOTS = ['A', 'B', 'C'];

export default function StatsPanel({ rounds, players, theme }) {
  const stats = useMemo(() => computeStats(rounds ?? []), [rounds]);
  const playerMap = useMemo(() => {
    const m = {};
    (players ?? []).forEach((p) => {
      m[p.id] = p.name;
    });
    return m;
  }, [players]);

  const m = stats.multiplier;

  if (m.totalRounds === 0) {
    return (
      <div className="card">
        <h2 className="card-title">智能分析</h2>
        <div className="empty">还没有数据 — 提交第一局后这里会显示连胜、最高倍率等统计。</div>
      </div>
    );
  }

  return (
    <div className="card stats-panel">
      <h2 className="card-title">智能分析</h2>

      {/* 顶部概览 */}
      <div className="stats-hero">
        <StatTile
          label="总局数"
          value={m.totalRounds}
          sub={`平均 M = ${m.avgMultiplier}`}
        />
        <StatTile
          label="最高倍率"
          value={`M = ${m.maxMultiplier}`}
          highlight
          sub={
            m.maxMultiplierRound
              ? `第 ${m.maxMultiplierRound.roundNumber} 局 · ${
                  playerMap[m.maxMultiplierRound.landlordId] ?? m.maxMultiplierRound.landlordId
                } 当地主`
              : ''
          }
        />
        <StatTile
          label="地主胜率"
          value={`${Math.round((m.landlordWinCount / m.totalRounds) * 100)}%`}
          sub={`地主 ${m.landlordWinCount} 胜 · 农民 ${m.farmerWinCount} 胜`}
        />
      </div>

      {/* 倍率事件 */}
      <div className="stats-section">
        <div className="stats-section-title">倍率事件累计</div>
        <div className="stats-chips">
          <Chip label="炸弹" value={m.bombCount} unit="个" />
          <Chip label="王炸" value={m.rocketCount} unit="次" />
          <Chip label="春天" value={m.landlordSpringCount} unit="次" />
          <Chip label="反春天" value={m.farmerSpringCount} unit="次" />
        </div>
      </div>

      {/* 每位玩家的连胜 / 极端分 */}
      <div className="stats-section">
        <div className="stats-section-title">各玩家表现</div>
        <div className="stats-player-grid">
          {SLOTS.map((slot) => {
            const s = stats.streaks[slot];
            const e = stats.extremes[slot];
            const name = playerMap[slot] ?? slot;
            const totalLandlord = s.asLandlord;
            const landlordWinRate =
              totalLandlord > 0 ? Math.round((s.landlordWins / totalLandlord) * 100) : 0;
            const hasStreak = s.currentStreak >= 2;
            return (
              <div key={slot} className="stats-player-card">
                <div className="stats-player-head">
                  <span className={`stats-slot-tag stats-slot-${slot.toLowerCase()}`}>{slot}</span>
                  <span className="stats-player-name">{name}</span>
                  {hasStreak && (
                    <span className="stats-streak-badge" title="当前连胜">
                      🔥 {s.currentStreak} 连胜
                    </span>
                  )}
                </div>
                <div className="stats-row stats-row-wins">
                  <span className="stats-row-label">总胜场</span>
                  <span className="stats-row-value">{s.wins}</span>
                </div>
                <div className="stats-row stats-row-sub-line">
                  <span className="stats-row-sub-label">· 作为地主赢</span>
                  <span className="stats-row-value">
                    {s.landlordWins}
                    {s.wins > 0 && (
                      <span className="stats-row-sub">{Math.round((s.landlordWins / s.wins) * 100)}%</span>
                    )}
                  </span>
                </div>
                <div className="stats-row stats-row-sub-line">
                  <span className="stats-row-sub-label">· 作为农民赢</span>
                  <span className="stats-row-value">
                    {s.farmerWins}
                    {s.wins > 0 && (
                      <span className="stats-row-sub">{Math.round((s.farmerWins / s.wins) * 100)}%</span>
                    )}
                  </span>
                </div>
                <div className="stats-row">
                  <span className="stats-row-label">历史最长连胜</span>
                  <span className="stats-row-value">{s.maxStreak}</span>
                </div>
                <div className="stats-row">
                  <span className="stats-row-label">当地主时胜率</span>
                  <span className="stats-row-value">
                    {totalLandlord > 0
                      ? `${landlordWinRate}%`
                      : '—'}
                    <span className="stats-row-sub">
                      {totalLandlord > 0 ? `${s.landlordWins}/${totalLandlord} 局` : '未当过地主'}
                    </span>
                  </span>
                </div>
                <div className="stats-row">
                  <span className="stats-row-label">当农民时胜率</span>
                  <span className="stats-row-value">
                    {s.asFarmer > 0
                      ? `${Math.round((s.farmerWins / s.asFarmer) * 100)}%`
                      : '—'}
                    <span className="stats-row-sub">
                      {s.asFarmer > 0 ? `${s.farmerWins}/${s.asFarmer} 局` : '未当过农民'}
                    </span>
                  </span>
                </div>
                <div className="stats-row">
                  <span className="stats-row-label">单局最高</span>
                  <span className={`stats-row-value ${e.max > 0 ? 'positive' : ''}`}>
                    {e.max == null ? '—' : (e.max > 0 ? '+' : '') + e.max}
                    {e.maxRound && (
                      <span className="stats-row-sub">第 {e.maxRound.roundNumber} 局</span>
                    )}
                  </span>
                </div>
                <div className="stats-row">
                  <span className="stats-row-label">单局最低</span>
                  <span className={`stats-row-value ${e.min < 0 ? 'negative' : ''}`}>
                    {e.min == null ? '—' : (e.min > 0 ? '+' : '') + e.min}
                    {e.minRound && (
                      <span className="stats-row-sub">第 {e.minRound.roundNumber} 局</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, sub, highlight }) {
  return (
    <div className={`stat-tile${highlight ? ' highlight' : ''}`}>
      <div className="stat-tile-label">{label}</div>
      <div className="stat-tile-value">{value}</div>
      {sub && <div className="stat-tile-sub">{sub}</div>}
    </div>
  );
}

function Chip({ label, value, unit }) {
  return (
    <div className="stats-chip">
      <span className="stats-chip-label">{label}</span>
      <span className="stats-chip-value">
        {value}
        {unit && <span className="stats-chip-unit"> {unit}</span>}
      </span>
    </div>
  );
}