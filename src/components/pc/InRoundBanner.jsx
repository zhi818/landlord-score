import { useMemo } from 'react';
import { calculateTotalMultiplier, describeMultipliers } from '../../lib/scoring';

const PHASE_LABEL = {
  bidding: '叫地主中',
  grabbing: '抢地主中',
  playing: '出牌中',
  claiming: '等待 PC 确认',
  complete: '本局已完成',
  bidding_failed: '无人叫地主',
};

export default function InRoundBanner({ room }) {
  const round = room.currentRound;
  if (!round) return null;

  const M = useMemo(() => {
    if (round.phase === 'bidding' || round.phase === 'bidding_failed') return null;
    const grabCount = ['A', 'B', 'C'].filter(
      (s) => s !== round.landlord && round.grabs[s] === 'grab'
    ).length;
    return calculateTotalMultiplier({
      baseScore: room.baseScore,
      bombCount: round.bombCount ?? 0,
      rocket: !!round.rocket,
      landlordSpring: round.spring === 'landlord',
      farmerSpring: round.spring === 'farmer',
      grabCount,
    });
  }, [round, room.baseScore]);

  const landlordName = round.landlord ? room.players?.[round.landlord]?.name : null;

  return (
    <div className={`card in-round-banner phase-${round.phase}`}>
      <div className="in-round-head">
        <span className="in-round-phase">{PHASE_LABEL[round.phase] ?? round.phase}</span>
        {M != null && (
          <span className="in-round-multiplier">
            M = <strong>{M}</strong>
          </span>
        )}
      </div>

      <div className="in-round-progress">
        {round.phase === 'bidding' && (
          <>
            <span>本局优先叫地主:<strong>{room.players?.[round.priorityCaller]?.name}</strong></span>
            <ProgressRow
              slots={['A', 'B', 'C']}
              values={round.calls}
              players={room.players}
              empty="—"
              yes="叫"
              no="不叫"
            />
          </>
        )}

        {round.phase === 'grabbing' && (
          <>
            <span>本局地主:<strong>{landlordName}</strong></span>
            <ProgressRow
              slots={['A', 'B', 'C'].filter((s) => s !== round.landlord)}
              values={round.grabs}
              players={room.players}
              empty="—"
              yes="抢"
              no="不抢"
            />
          </>
        )}

        {(round.phase === 'playing' || round.phase === 'claiming') && (
          <>
            <span>本局地主:<strong>{landlordName}</strong></span>
            <span className="mult-tag">
              {describeMultipliers({
                bombCount: round.bombCount ?? 0,
                rocket: !!round.rocket,
                landlordSpring: round.spring === 'landlord',
                farmerSpring: round.spring === 'farmer',
                grabCount: ['A', 'B', 'C'].filter(
                  (s) => s !== round.landlord && round.grabs[s] === 'grab'
                ).length,
              })}
            </span>
            {round.phase === 'claiming' && round.winnerClaim && (
              <span className="claim-waiting">
                {room.players?.[round.winnerClaim.claimedBy]?.name} 上报「
                {round.winnerClaim.winner === 'landlord' ? '地主胜' : '农民胜'}」,等待确认…
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProgressRow({ slots, values, players, empty, yes, no }) {
  return (
    <div className="progress-row">
      {slots.map((s) => {
        const v = values[s];
        const status = v === 'call' || v === 'grab' ? 'yes' : v === 'skip' ? 'no' : 'pending';
        return (
          <div key={s} className={`progress-pill ${status}`}>
            <span className="progress-name">{players?.[s]?.name ?? s}</span>
            <span className="progress-val">
              {status === 'yes' ? yes : status === 'no' ? no : empty}
            </span>
          </div>
        );
      })}
    </div>
  );
}
