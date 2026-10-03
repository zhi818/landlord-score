import { useState } from 'react';
import { useRoomActions } from '../../hooks/useRoomActions';
import { calculateTotalMultiplier } from '../../lib/scoring';

export default function PlayingView({ room, roomCode, playerSlot }) {
  const round = room.currentRound;
  const actions = useRoomActions();
  const [pendingClaim, setPendingClaim] = useState(null); // 'landlord' | 'farmer'
  const [showConfirm, setShowConfirm] = useState(false);

  const isLandlord = round.landlord === playerSlot;
  const landlordName = room.players?.[round.landlord]?.name;

  const grabCount = ['A', 'B', 'C'].filter(
    (s) => s !== round.landlord && round.grabs[s] === 'grab'
  ).length;

  const M = calculateTotalMultiplier({
    baseScore: room.baseScore,
    bombCount: round.bombCount ?? 0,
    rocket: !!round.rocket,
    landlordSpring: round.spring === 'landlord',
    farmerSpring: round.spring === 'farmer',
    grabCount,
  });

  function submitClaim() {
    if (!pendingClaim) return;
    actions.claimWinner(roomCode, playerSlot, pendingClaim);
    setShowConfirm(false);
    setPendingClaim(null);
  }

  return (
    <div className="phone-card">
      <div className="phone-status">
        出牌中 · 地主 <strong>{landlordName}</strong>
      </div>

      <div className="phone-multiplier-card">
        <div className="phone-multiplier-label">本局倍率</div>
        <div className="phone-multiplier-value">
          M = <strong>{M}</strong>
        </div>
        <div className="phone-multiplier-meta">
          底分 {room.baseScore} × 倍率 {M / room.baseScore}
        </div>
      </div>

      <div className="phone-section">
        <div className="phone-section-title">打出炸弹</div>
        <div className="phone-bomb-row">
          <button className="btn-phone btn-phone-bomb" onClick={() => actions.declareBomb(roomCode)}>
            +1 炸弹
          </button>
          <span className="phone-bomb-count">已 {round.bombCount ?? 0} 个</span>
        </div>
      </div>

      <div className="phone-section">
        <div className="phone-section-title">王炸</div>
        <button
          className={`btn-phone ${round.rocket ? 'btn-phone-active' : ''}`}
          disabled={round.rocket}
          onClick={() => actions.declareRocket(roomCode)}
        >
          {round.rocket ? '✓ 已打出王炸' : '我打出了王炸'}
        </button>
      </div>

      <div className="phone-section">
        <div className="phone-section-title">春天</div>
        <div className="phone-spring-row">
          <button
            className={`btn-phone ${round.spring === 'landlord' ? 'btn-phone-active' : ''}`}
            onClick={() => actions.markSpring(roomCode, 'landlord')}
          >
            地主春天
          </button>
          <button
            className={`btn-phone ${round.spring === 'farmer' ? 'btn-phone-active' : ''}`}
            onClick={() => actions.markSpring(roomCode, 'farmer')}
          >
            农民春天
          </button>
          {round.spring && (
            <button className="btn-phone btn-phone-ghost" onClick={() => actions.markSpring(roomCode, null)}>
              清除
            </button>
          )}
        </div>
      </div>

      <div className="phone-divider" />

      <div className="phone-section">
        <div className="phone-section-title">本局结束?</div>
        {!showConfirm ? (
          <div className="phone-claim-row">
            <button
              className={`btn-phone ${isLandlord ? 'btn-phone-primary' : 'btn-phone-secondary'}`}
              onClick={() => { setPendingClaim('landlord'); setShowConfirm(true); }}
            >
              地主胜
            </button>
            <button
              className={`btn-phone ${!isLandlord ? 'btn-phone-primary' : 'btn-phone-secondary'}`}
              onClick={() => { setPendingClaim('farmer'); setShowConfirm(true); }}
            >
              农民胜
            </button>
          </div>
        ) : (
          <div className="phone-confirm">
            <p>确认上报「<strong>{pendingClaim === 'landlord' ? '地主胜' : '农民胜'}</strong>」?</p>
            <div className="phone-action-row">
              <button className="btn-phone btn-phone-secondary" onClick={() => setShowConfirm(false)}>
                取消
              </button>
              <button className="btn-phone btn-phone-primary" onClick={submitClaim}>
                确认上报
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}