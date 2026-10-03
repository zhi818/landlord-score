import { WINNER_LABEL } from '../constants';
import { describeMultipliers } from '../lib/scoring';

export default function RoundHistory({ room, onRemove }) {
  const rounds = [...(room.rounds ?? [])].reverse();
  if (rounds.length === 0) {
    return (
      <div className="card">
        <h2 className="card-title">历史局</h2>
        <div className="empty">还没有记录。第一局开始后会显示在这里。</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">历史局</h2>
      <div className="rounds-list">
        {rounds.map((r) => {
          const landlordName = room.players?.[r.landlordId]?.name ?? '?';
          return (
            <div className="round-item" key={r.id}>
              <div className="round-num">{r.roundNumber}</div>
              <div className="round-main">
                <div className="round-meta">
                  <span className={`winner-tag ${r.winner}`}>{WINNER_LABEL[r.winner]}</span>
                  <span className="round-landlord">
                    地主:<strong>{landlordName}</strong>
                  </span>
                  <span className="mult-tag">
                    M = {r.totalMultiplier} · {describeMultipliers(r)}
                  </span>
                </div>
                <div className="round-scores">
                  {r.scores.map((s) => {
                    const p = room.players?.[s.playerId];
                    const sign = s.score > 0 ? 'positive' : s.score < 0 ? 'negative' : '';
                    return (
                      <span key={s.playerId}>
                        <span className="pname">{p?.name ?? s.playerId}</span>
                        <span className={`pval ${sign}`}>
                          {s.score > 0 ? '+' : ''}
                          {s.score}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
              {onRemove && (
                <div className="round-actions">
                  <button
                    className="btn btn-ghost btn-danger"
                    onClick={() => onRemove(r.id)}
                    aria-label="删除这一局"
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
