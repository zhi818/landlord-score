import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const COUNTDOWN_SECONDS = 10;

export default function WinnerClaimDialog({ room, onConfirm, onCancel, onStartNext }) {
  const claim = room.currentRound?.winnerClaim;
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [autoFired, setAutoFired] = useState(false);

  useEffect(() => {
    if (!claim) return;
    const tick = () => {
      const elapsed = (Date.now() - claim.claimedAt) / 1000;
      const left = Math.max(0, COUNTDOWN_SECONDS - elapsed);
      setRemaining(left);
      if (left <= 0 && !autoFired) {
        setAutoFired(true);
        onConfirm();
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [claim, autoFired, onConfirm]);

  if (!claim) return null;
  const claimedBy = room.players?.[claim.claimedBy]?.name ?? claim.claimedBy;
  const winnerLabel = claim.winner === 'landlord' ? '地主胜' : '农民胜';

  return (
    createPortal(
      <div className="modal-backdrop">
        <div className="modal claim-modal">
          <h3 className="modal-title">手机端上报本局结果</h3>
          <div className="claim-body">
            <div className="claim-winner">{winnerLabel}</div>
            <div className="claim-by">由 <strong>{claimedBy}</strong> 上报</div>
          </div>
          <div className={`countdown ${remaining < 4 ? 'urgent' : ''}`}>
            <div className="countdown-num">{Math.ceil(remaining)}</div>
            <div className="countdown-label">秒后自动确认</div>
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={onCancel}>取消</button>
            <button className="btn btn-primary" onClick={onConfirm}>
              确认结算
            </button>
          </div>
          <p className="claim-hint">
            若不操作,{Math.ceil(remaining)} 秒后默认采纳手机上报表结果。
          </p>
        </div>
      </div>,
      document.body
    )
  );
}
