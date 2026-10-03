import { useRoomActions } from '../../hooks/useRoomActions';

export default function GrabbingView({ room, roomCode, playerSlot }) {
  const round = room.currentRound;
  const actions = useRoomActions();
  const isLandlord = round.landlord === playerSlot;
  const myGrab = round.grabs[playerSlot];

  if (isLandlord) {
    return (
      <div className="phone-card">
        <div className="phone-status">
          你是本局地主(<strong>{room.players?.[playerSlot]?.name}</strong>)
        </div>
        <p className="phone-hint">等待其他玩家表态是否抢地主…</p>
        <div className="phone-calls">
          {['A', 'B', 'C'].filter((s) => s !== playerSlot).map((s) => {
            const v = round.grabs[s];
            return (
              <div
                key={s}
                className={`call-pill ${v === 'grab' ? 'grab' : v === 'skip' ? 'skip' : 'pending'}`}
              >
                <span>{room.players?.[s]?.name}</span>
                <span className="call-action">
                  {v === 'grab' ? '抢' : v === 'skip' ? '不抢' : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="phone-card">
      <div className="phone-status">
        <strong>{room.players?.[round.landlord]?.name}</strong> 已是地主,你要抢吗?
      </div>
      {myGrab == null ? (
        <div className="phone-action-row">
          <button
            className="btn-phone btn-phone-secondary"
            onClick={() => actions.grab(roomCode, playerSlot, 'skip')}
          >
            不抢
          </button>
          <button
            className="btn-phone btn-phone-primary"
            onClick={() => actions.grab(roomCode, playerSlot, 'grab')}
          >
            我抢
          </button>
        </div>
      ) : (
        <div className="phone-done">
          你已选择「{myGrab === 'grab' ? '抢' : '不抢'}」,等待其他玩家…
        </div>
      )}
    </div>
  );
}