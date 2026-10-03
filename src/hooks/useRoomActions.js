import { useCallback } from 'react';
import { nanoid } from 'nanoid';
import { db } from '../lib/db';
import { generateRoomCode, isValidRoomCode } from '../lib/roomCode';
import { settleRound } from '../lib/scoring';

const ROOM_PATH = (code) => `rooms/${code}`;
const PLAYER_PATH = (code, slot) => `rooms/${code}/players/${slot}`;
const ROUND_PATH = (code) => `rooms/${code}/currentRound`;
const ROUNDS_HISTORY_PATH = (code) => `rooms/${code}/rounds`;
const TOTALS_PATH = (code) => `rooms/${code}/totals`;

const SLOTS = ['A', 'B', 'C'];

/**
 * 所有房间写操作。组件只调用这些函数,不直接操作 db。
 */
export function useRoomActions() {
  const createRoom = useCallback((baseScore) => {
    let code;
    let attempts = 0;
    do {
      code = generateRoomCode();
      attempts++;
    } while (db.get(ROOM_PATH(code)) && attempts < 5);

    if (db.get(ROOM_PATH(code))) {
      throw new Error('无法生成唯一房间码,请重试');
    }

    db.set(ROOM_PATH(code), {
      createdAt: Date.now(),
      baseScore,
      status: 'waiting',
      players: { A: null, B: null, C: null },
      currentRound: null,
      rounds: [],
      totals: { A: 0, B: 0, C: 0 },
      lastWinner: null,
    });
    return code;
  }, []);

  const joinRoom = useCallback((roomCode, slot, name) => {
    if (!isValidRoomCode(roomCode)) throw new Error('房间码格式不正确');
    if (!SLOTS.includes(slot)) throw new Error('无效的玩家槽位');
    const trimmed = (name ?? '').trim();
    if (!trimmed) throw new Error('请输入玩家名');

    const room = db.get(ROOM_PATH(roomCode));
    if (!room) throw new Error('房间不存在');

    // 检查槽位是否已被占用(同 slot 不同 name 才算冲突)
    const existing = room.players?.[slot];
    if (existing && existing.name && existing.name !== trimmed) {
      throw new Error(`槽位 ${slot} 已被 ${existing.name} 占用`);
    }

    db.set(PLAYER_PATH(roomCode, slot), {
      id: existing?.id ?? nanoid(8),
      name: trimmed,
      slot,
      joinedAt: existing?.joinedAt ?? Date.now(),
      online: true,
    });
  }, []);

  const leaveRoom = useCallback((roomCode, slot) => {
    db.set(PLAYER_PATH(roomCode, slot), null);
  }, []);

  const startRound = useCallback((roomCode) => {
    const room = db.get(ROOM_PATH(roomCode));
    if (!room) throw new Error('房间不存在');
    // 必须 3 人到齐
    if (!SLOTS.every((s) => room.players?.[s]?.name)) {
      throw new Error('需要 3 位玩家都加入后才能开始');
    }
    // priority caller = 上一局胜者;无历史则用 A
    const priorityCaller = room.lastWinner ?? 'A';
    const roundNumber = (room.rounds?.length ?? 0) + 1;

    db.set(ROUND_PATH(roomCode), {
      roundNumber,
      phase: 'bidding',
      priorityCaller,
      landlord: null,
      calls: { A: null, B: null, C: null },
      grabs: { A: null, B: null, C: null },
      bombCount: 0,
      rocket: false,
      spring: null,
      winnerClaim: null,
      startedAt: Date.now(),
      completedAt: null,
    });
    db.update(ROOM_PATH(roomCode), { status: 'in_round' });
  }, []);

  // 叫地主:任何玩家都可叫;第一个叫的人成为 landlord,进入 grabbing 阶段
  const callLandlord = useCallback((roomCode, slot) => {
    db.transaction(ROUND_PATH(roomCode), (round) => {
      if (!round || round.phase !== 'bidding') return round;
      const calls = { ...round.calls, [slot]: 'call' };
      // 第一个叫的人 = landlord
      const landlord = round.landlord ?? slot;
      return {
        ...round,
        landlord,
        calls,
        phase: 'grabbing',
      };
    });
  }, []);

  // 不叫地主:priority caller 不叫后,其他玩家也可以叫(MVP 简化为:不叫也允许别人叫)
  const skipCall = useCallback((roomCode, slot) => {
    db.transaction(ROUND_PATH(roomCode), (round) => {
      if (!round || round.phase !== 'bidding') return round;
      const calls = { ...round.calls, [slot]: 'skip' };
      // 所有人都 skip → bidding 阶段结束,回到等待
      const allSkipped = SLOTS.every((s) => calls[s] === 'skip');
      if (allSkipped) {
        return { ...round, calls, phase: 'bidding_failed' };
      }
      return { ...round, calls };
    });
  }, []);

  const grab = useCallback((roomCode, slot, action /* 'grab'|'skip' */) => {
    db.transaction(ROUND_PATH(roomCode), (round) => {
      if (!round || round.phase !== 'grabbing') return round;
      // 地主本人不能抢自己
      if (round.landlord === slot) return round;
      const grabs = { ...round.grabs, [slot]: action };
      // 所有非地主玩家都已表态 → 进入 playing
      const nonLandlordDone = SLOTS
        .filter((s) => s !== round.landlord)
        .every((s) => grabs[s] != null);
      if (nonLandlordDone) {
        return { ...round, grabs, phase: 'playing' };
      }
      return { ...round, grabs };
    });
  }, []);

  const declareBomb = useCallback((roomCode) => {
    db.transaction(ROUND_PATH(roomCode), (round) => {
      if (!round || round.phase !== 'playing') return round;
      return { ...round, bombCount: (round.bombCount ?? 0) + 1 };
    });
  }, []);

  const declareRocket = useCallback((roomCode) => {
    db.transaction(ROUND_PATH(roomCode), (round) => {
      if (!round || round.phase !== 'playing') return round;
      if (round.rocket) return round; // 只能声明一次
      return { ...round, rocket: true };
    });
  }, []);

  const markSpring = useCallback((roomCode, value /* 'landlord'|'farmer' */) => {
    db.transaction(ROUND_PATH(roomCode), (round) => {
      if (!round || round.phase !== 'playing') return round;
      return { ...round, spring: value };
    });
  }, []);

  const claimWinner = useCallback((roomCode, slot, winner /* 'landlord'|'farmer' */) => {
    db.transaction(ROUND_PATH(roomCode), (round) => {
      if (!round || round.phase !== 'playing') return round;
      return {
        ...round,
        phase: 'claiming',
        winnerClaim: {
          winner,
          claimedBy: slot,
          claimedAt: Date.now(),
          pcConfirmed: false,
          pcConfirmedAt: null,
        },
      };
    });
  }, []);

  // PC 确认(或超时自动) → 结算入库
  const confirmWinner = useCallback((roomCode) => {
    const room = db.get(ROOM_PATH(roomCode));
    if (!room || !room.currentRound) return;
    const round = room.currentRound;
    if (round.phase !== 'claiming' || !round.winnerClaim) return;
    if (round.winnerClaim.pcConfirmed) return; // 已结算

    const claim = round.winnerClaim;
    const baseScore = room.baseScore;
    const players = room.players;
    // 构造 settleRound 需要的 players 数组(传 id + name)
    const playersForCalc = SLOTS.map((s) => ({
      id: s,
      name: players[s]?.name ?? s,
    }));

    const { totalMultiplier, scores } = settleRound({
      winner: claim.winner,
      players: playersForCalc,
      landlordId: round.landlord,
      baseScore,
      bombCount: round.bombCount ?? 0,
      rocket: !!round.rocket,
      landlordSpring: round.spring === 'landlord',
      farmerSpring: round.spring === 'farmer',
      grabCount: SLOTS.filter((s) => s !== round.landlord && round.grabs[s] === 'grab').length,
    });

    const completedRound = {
      id: nanoid(8),
      roundNumber: round.roundNumber,
      winner: claim.winner,
      landlordId: round.landlord,
      grabCount: SLOTS.filter((s) => s !== round.landlord && round.grabs[s] === 'grab').length,
      bombCount: round.bombCount ?? 0,
      rocket: !!round.rocket,
      landlordSpring: round.spring === 'landlord',
      farmerSpring: round.spring === 'farmer',
      baseScore,
      totalMultiplier,
      scores: scores.map((s) => ({ playerId: s.playerId, score: s.score })),
      createdAt: Date.now(),
      completedAt: Date.now(),
    };

    // 写历史
    const history = room.rounds ?? [];
    db.set(ROUNDS_HISTORY_PATH(roomCode), [...history, completedRound]);

    // 更新累计
    const totals = { ...(room.totals ?? { A: 0, B: 0, C: 0 }) };
    completedRound.scores.forEach((s) => {
      totals[s.playerId] = (totals[s.playerId] ?? 0) + s.score;
    });
    db.set(TOTALS_PATH(roomCode), totals);

    // 标记 currentRound 完成
    db.set(ROUND_PATH(roomCode), {
      ...round,
      phase: 'complete',
      completedAt: Date.now(),
      winnerClaim: { ...claim, pcConfirmed: true, pcConfirmedAt: Date.now() },
    });
    db.update(ROOM_PATH(roomCode), { status: 'round_complete', lastWinner: round.landlord });
  }, []);

  const cancelClaim = useCallback((roomCode) => {
    db.transaction(ROUND_PATH(roomCode), (round) => {
      if (!round || round.phase !== 'claiming') return round;
      return {
        ...round,
        phase: 'playing',
        winnerClaim: null,
      };
    });
  }, []);

  const resetGame = useCallback((roomCode) => {
    const room = db.get(ROOM_PATH(roomCode));
    if (!room) return;
    db.set(ROOM_PATH(roomCode), {
      ...room,
      currentRound: null,
      rounds: [],
      totals: { A: 0, B: 0, C: 0 },
      lastWinner: null,
      status: 'waiting',
    });
  }, []);

  return {
    createRoom,
    joinRoom,
    leaveRoom,
    startRound,
    callLandlord,
    skipCall,
    grab,
    declareBomb,
    declareRocket,
    markSpring,
    claimWinner,
    confirmWinner,
    cancelClaim,
    resetGame,
  };
}

export { SLOTS };
