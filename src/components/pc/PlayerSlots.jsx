import { ROLE_LABEL } from '../../constants';

const SLOTS = ['A', 'B', 'C'];
const COLOR_CLASS = ['color-a', 'color-b', 'color-c'];

export default function PlayerSlots({ room, canStart, onStartRound }) {
  const roundInProgress = room.status === 'in_round' || room.status === 'round_complete';

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 className="card-title" style={{ margin: 0 }}>玩家</h2>
        {!roundInProgress && (
          <button
            className="btn btn-primary"
            disabled={!canStart}
            onClick={onStartRound}
            title={canStart ? '开始新局' : '等待 3 位玩家到齐'}
          >
            开始新局
          </button>
        )}
      </div>
      <div className="player-slots">
        {SLOTS.map((slot, i) => {
          const p = room.players?.[slot];
          const filled = !!p?.name;
          return (
            <div key={slot} className={`slot-card${filled ? '' : ' empty'}`}>
              <div className={`slot-letter ${COLOR_CLASS[i]}`}>{slot}</div>
              <div className="slot-info">
                <div className="slot-name">
                  {filled ? p.name : <span style={{ color: 'var(--text-muted)' }}>等待加入…</span>}
                </div>
                <div className="slot-status">
                  {filled ? (
                    <span className="slot-online">在线 · {room.lastWinner === slot ? '上局地主' : '玩家'}</span>
                  ) : (
                    '未加入'
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}