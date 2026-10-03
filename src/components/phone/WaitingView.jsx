export default function WaitingView({ room, playerSlot, playerName }) {
  const roundComplete = room.status === 'round_complete';
  const lastRound = room.rounds?.[room.rounds.length - 1];
  const myScore = lastRound?.scores.find((s) => s.playerId === playerSlot)?.score;

  return (
    <div className="phone-root">
      <div className="phone-card">
        <div className="phone-status">
          {roundComplete ? '✓ 上一局已结算' : '等待房主开始新局…'}
        </div>
        <div className="phone-round-info">
          <div className="phone-info-row">
            <span className="dim">已完成局数</span>
            <strong>{room.rounds?.length ?? 0}</strong>
          </div>
          {lastRound && (
            <div className="phone-info-row">
              <span className="dim">上一局你的得分</span>
              <strong className={myScore > 0 ? 'positive' : myScore < 0 ? 'negative' : ''}>
                {myScore > 0 ? '+' : ''}{myScore ?? 0}
              </strong>
            </div>
          )}
          <div className="phone-info-row">
            <span className="dim">你的累计</span>
            <strong>{room.totals?.[playerSlot] ?? 0}</strong>
          </div>
        </div>
        <p className="phone-hint">
          房主会在大屏上点击「开始新局」。请保持页面打开,游戏开始时会自动进入。
        </p>
      </div>
    </div>
  );
}
