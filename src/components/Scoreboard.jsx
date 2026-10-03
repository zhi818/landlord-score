import { Crown } from 'lucide-react';
import { ROLE_LABEL } from '../constants';

// 颜色按玩家槽位(A/B/C)绑定,与角色无关
const COLOR_VARS = ['var(--c-landlord)', 'var(--c-farmer-a)', 'var(--c-farmer-b)'];
const COLOR_HEX_LIGHT = ['#4f46e5', '#0891b2', '#d97706'];
const COLOR_HEX_DARK = ['#6366f1', '#0891b2', '#d97706'];

export function getSlotColorVar(slot) {
  return COLOR_VARS[['A', 'B', 'C'].indexOf(slot)] ?? COLOR_VARS[0];
}

export function getSlotColorHex(slot, theme) {
  const idx = ['A', 'B', 'C'].indexOf(slot);
  return (theme === 'dark' ? COLOR_HEX_DARK : COLOR_HEX_LIGHT)[idx] ?? COLOR_HEX_LIGHT[0];
}

export default function Scoreboard({ room }) {
  const totals = room.totals ?? {};
  const players = room.players ?? {};
  const slots = ['A', 'B', 'C'].filter((s) => players[s]?.name);
  if (slots.length === 0) return null;

  const rows = slots.map((s) => ({
    slot: s,
    name: players[s].name,
    total: totals[s] ?? 0,
  }));
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  const top = sorted[0]?.total ?? 0;
  const showCrown = top > 0 && sorted.length > 1 && sorted[1].total < top;

  return (
    <div className="scoreboard">
      {rows.map((p) => {
        const sign = p.total > 0 ? 'positive' : p.total < 0 ? 'negative' : 'neutral';
        const isLeader = showCrown && p.total === top;
        const colorVar = getSlotColorVar(p.slot);
        return (
          <div
            key={p.slot}
            className={`player-card${isLeader ? ' leader' : ''}`}
            style={{ '--player-color': colorVar }}
          >
            <div className="player-header">
              <h3 className="player-name">
                {isLeader && (
                  <span className="crown" aria-label="第一名">
                    <Crown size={16} />
                  </span>
                )}
                {p.name}
              </h3>
              <span className="role-badge farmer">玩家 {p.slot}</span>
            </div>
            <div className={`player-total ${sign}`}>
              {p.total > 0 ? '+' : ''}
              {p.total}
            </div>
          </div>
        );
      })}
    </div>
  );
}
