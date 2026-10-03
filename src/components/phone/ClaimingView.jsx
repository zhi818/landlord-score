export default function ClaimingView({ room, playerSlot }) {
  const claim = room.currentRound?.winnerClaim;
  if (!claim) return null;

  const myName = room.players?.[playerSlot]?.name;
  const claimedByName = room.players?.[claim.claimedBy]?.name ?? claim.claimedBy;
  const iClaimed = claim.claimedBy === playerSlot;

  return (
    <div className="phone-card">
      <div className="phone-status">
        {iClaimed ? '已上报,等待大屏确认…' : `${claimedByName} 已上报,等待大屏确认…`}
      </div>
      <div className="phone-confirm-result">
        <div className="phone-confirm-winner">
          {claim.winner === 'landlord' ? '地主胜' : '农民胜'}
        </div>
        <div className="phone-confirm-by">由 <strong>{claimedByName}</strong> 上报</div>
      </div>
      <p className="phone-hint">
        {iClaimed
          ? '大屏会在 10 秒内确认或取消。如未操作,你的上报表会被默认采纳。'
          : '大屏正在确认结果,稍等…'}
      </p>
    </div>
  );
}
