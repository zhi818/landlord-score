import { useState, useEffect } from 'react';
import { useRoom } from '../../hooks/useRoom';
import { calculateTotalMultiplier } from '../../lib/scoring';
import JoinView from './JoinView';
import BiddingView from './BiddingView';
import GrabbingView from './GrabbingView';
import PlayingView from './PlayingView';
import ClaimingView from './ClaimingView';
import WaitingView from './WaitingView';

export default function PhoneRoot({ roomCode, playerSlot, onResetSlot }) {
  const { room } = useRoom(roomCode);
  const player = room?.players?.[playerSlot];

  // localStorage 持久化名字(进入房间后,即使刷新也保留)
  const [name, setName] = useState(() => {
    return localStorage.getItem(`poker_score:name:${playerSlot}`) ?? '';
  });
  useEffect(() => {
    if (name) localStorage.setItem(`poker_score:name:${playerSlot}`, name);
  }, [name, playerSlot]);

  if (!roomCode) return <JoinView initialSlot={null} />;

  // 房间不存在
  if (!room) {
    return (
      <div className="phone-root">
        <div className="phone-card">
          <h2 className="phone-title">房间不存在</h2>
          <p className="phone-hint">房间码 <strong>{roomCode}</strong> 无效,或房主已关闭。</p>
          <button className="btn-phone" onClick={onResetSlot}>返回</button>
        </div>
      </div>
    );
  }

  const existingName = player?.name;
  const displayName = existingName || name;

  // 未加入 → JoinView
  if (!existingName && !name) {
    return <JoinView initialSlot={playerSlot} roomCode={roomCode} existingName="" />;
  }

  const round = room.currentRound;
  const phase = round?.phase;

  // 没在游戏中
  if (!round || room.status === 'waiting') {
    return (
      <WaitingView
        room={room}
        playerSlot={playerSlot}
        playerName={displayName}
      />
    );
  }

  return (
    <div className="phone-root">
      <PhoneHeader room={room} playerSlot={playerSlot} playerName={displayName} />

      {phase === 'bidding' && (
        <BiddingView room={room} roomCode={roomCode} playerSlot={playerSlot} />
      )}
      {phase === 'grabbing' && (
        <GrabbingView room={room} roomCode={roomCode} playerSlot={playerSlot} />
      )}
      {phase === 'playing' && (
        <PlayingView room={room} roomCode={roomCode} playerSlot={playerSlot} />
      )}
      {phase === 'claiming' && (
        <ClaimingView room={room} playerSlot={playerSlot} />
      )}
      {phase === 'complete' && (
        <WaitingView room={room} playerSlot={playerSlot} playerName={displayName} />
      )}
    </div>
  );
}

function PhoneHeader({ room, playerSlot, playerName }) {
  const round = room.currentRound;
  const M = round && round.phase !== 'bidding'
    ? calculateTotalMultiplier({
        baseScore: room.baseScore,
        bombCount: round.bombCount ?? 0,
        rocket: !!round.rocket,
        landlordSpring: round.spring === 'landlord',
        farmerSpring: round.spring === 'farmer',
        grabCount: ['A', 'B', 'C'].filter(
          (s) => s !== round.landlord && round.grabs[s] === 'grab'
        ).length,
      })
    : null;

  return (
    <header className="phone-header">
      <div className="phone-header-top">
        <span className="phone-slot-tag">{playerSlot}</span>
        <span className="phone-name">{playerName}</span>
        <span className="phone-room">{room.baseScore} 分底</span>
      </div>
      {M != null && (
        <div className="phone-m">
          本局倍率 <strong>M = {M}</strong>
        </div>
      )}
    </header>
  );
}