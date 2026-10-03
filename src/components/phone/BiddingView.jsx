import { useRoomActions } from '../../hooks/useRoomActions';

export default function BiddingView({ room, roomCode, playerSlot }) {
  const round = room.currentRound;
  const actions = useRoomActions();
  const isPriority = round.priorityCaller === playerSlot;
  const myCall = round.calls[playerSlot];
  const phaseFailed = round.phase === 'bidding_failed';

  return (
    <div className="phone-card">
      <div className="phone-status">
        {phaseFailed
          ? '所有人都没叫,本局流局,等待房主重启'
          : isPriority
          ? '轮到你优先叫地主'
          : '等待叫地主…'}
      </div>
      <div className="phone-call-area">
        <div className="phone-priority">
          优先叫地主权:<strong>{room.players?.[round.priorityCaller]?.name}</strong>
        </div>
        {round.landlord && (
          <div className="phone-progress">
            <span className="dim">地主已确定为:</span>
            <strong>{room.players?.[round.landlord]?.name}</strong>
          </div>
        )}
        <div className="phone-calls">
          {['A', 'B', 'C'].map((s) => {
            const v = round.calls[s];
            return (
              <div key={s} className={`call-pill ${v === 'call' ? 'call' : v === 'skip' ? 'skip' : 'pending'}`}>
                <span>{room.players?.[s]?.name}</span>
                <span className="call-action">
                  {v === 'call' ? '叫' : v === 'skip' ? '不叫' : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {myCall == null && !phaseFailed && (
        <div className="phone-action-row">
          <button
            className="btn-phone btn-phone-secondary"
            onClick={() => actions.skipCall(roomCode, playerSlot)}
          >
            不叫
          </button>
          <button
            className="btn-phone btn-phone-primary"
            onClick={() => actions.callLandlord(roomCode, playerSlot)}
          >
            {isPriority ? '我当地主' : '我要叫地主'}
          </button>
        </div>
      )}
      {myCall === 'skip' && <div className="phone-done">你已选择不叫,等待别人叫…</div>}
      {myCall === 'call' && <div className="phone-done">你已成为本局地主</div>}
    </div>
  );
}