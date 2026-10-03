import { useEffect, useState } from 'react';
import { db } from '../lib/db';

/**
 * 订阅整个 db 状态树(本地 mock 足够,真后端再按需加 path 参数)
 * @returns {{ state, loading, error }}
 */
export function useDbState() {
  const [snapshot, setSnapshot] = useState({ state: db.state, loading: true });

  useEffect(() => {
    const unsub = db.subscribe((s) => setSnapshot({ state: s, loading: false }));
    return unsub;
  }, []);

  return snapshot;
}

/**
 * 订阅某个房间
 * @param {string|null} roomCode
 * @returns {{ room: object|null, loading: boolean, notFound: boolean }}
 */
export function useRoom(roomCode) {
  const { state, loading } = useDbState();

  if (!roomCode) {
    return { room: null, loading: false, notFound: false };
  }
  const room = state.rooms?.[roomCode] ?? null;
  return {
    room,
    loading,
    notFound: !loading && !room,
  };
}

/**
 * 订阅单个玩家
 */
export function usePlayer(roomCode, slot) {
  const { room } = useRoom(roomCode);
  if (!room) return null;
  return room.players?.[slot] ?? null;
}
