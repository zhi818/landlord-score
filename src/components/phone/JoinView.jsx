import { useState } from 'react';
import { useRoom } from '../../hooks/useRoom';
import { useRoomActions } from '../../hooks/useRoomActions';
import { isValidRoomCode, normalizeRoomCode } from '../../lib/roomCode';

const SLOTS = ['A', 'B', 'C'];

export default function JoinView({ initialSlot, roomCode: initialRoomCode, existingName = '' }) {
  const [roomCode, setRoomCode] = useState(initialRoomCode ?? '');
  const [slot, setSlot] = useState(initialSlot ?? null);
  const [name, setName] = useState(existingName);
  const [error, setError] = useState('');
  const actions = useRoomActions();

  // 探查房间
  const { room } = useRoom(normalizeRoomCode(roomCode));

  function handleJoin() {
    setError('');
    const code = normalizeRoomCode(roomCode);
    if (!isValidRoomCode(code)) {
      setError('房间码必须是 4 位字符');
      return;
    }
    if (!slot) {
      setError('请选择你的玩家槽位');
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setError('请输入你的名字');
      return;
    }
    try {
      actions.joinRoom(code, slot, trimmed);
      // 用 location.replace 写入 URL,刷新即可恢复
      const url = new URL(window.location.href);
      url.searchParams.set('room', code);
      url.searchParams.set('player', slot);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="phone-root">
      <div className="phone-card">
        <h2 className="phone-title">加入房间</h2>

        <div className="phone-field">
          <label className="phone-label">房间码</label>
          <input
            className="phone-input code-input"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ABCD"
            maxLength={4}
            autoFocus
            autoCapitalize="characters"
          />
        </div>

        <div className="phone-field">
          <label className="phone-label">选择玩家</label>
          <div className="phone-slots">
            {SLOTS.map((s) => {
              const filled = room?.players?.[s]?.name;
              const taken = !!filled && filled !== name.trim();
              return (
                <button
                  key={s}
                  type="button"
                  className={`phone-slot-btn${slot === s ? ' selected' : ''}${taken ? ' taken' : ''}`}
                  disabled={taken}
                  onClick={() => setSlot(s)}
                >
                  <span className="phone-slot-letter">{s}</span>
                  <span className="phone-slot-name">{filled ?? '空位'}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="phone-field">
          <label className="phone-label">你的名字</label>
          <input
            className="phone-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="昵称"
            maxLength={12}
          />
        </div>

        {error && <div className="phone-error">{error}</div>}

        <button
          className="btn-phone btn-phone-primary"
          onClick={handleJoin}
          disabled={!isValidRoomCode(normalizeRoomCode(roomCode)) || !slot || !name.trim()}
        >
          加入
        </button>
      </div>
    </div>
  );
}
