import { useState } from 'react';
import { useRoom } from '../../hooks/useRoom';
import { useRoomActions } from '../../hooks/useRoomActions';
import { BASE_SCORE_OPTIONS, DEFAULT_BASE_SCORE } from '../../constants';
import RoomCodeCard from './RoomCodeCard';
import PlayerSlots from './PlayerSlots';
import InRoundBanner from './InRoundBanner';
import Scoreboard from '../Scoreboard';
import TrendsChart from '../TrendsChart';
import RoundHistory from '../RoundHistory';
import StatsPanel from '../StatsPanel';
import WinnerClaimDialog from './WinnerClaimDialog';

export default function HostView({ theme, onToggleTheme }) {
  const [activeRoom, setActiveRoom] = useState(null);
  const [baseScore, setBaseScore] = useState(DEFAULT_BASE_SCORE);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const actions = useRoomActions();
  const { room } = useRoom(activeRoom);

  function handleCreate() {
    setCreating(true);
    setError('');
    try {
      const code = actions.createRoom(baseScore);
      setActiveRoom(code);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  function handleReset() {
    if (!activeRoom) return;
    if (window.confirm('确定要重置当前房间吗?所有历史局将清空。')) {
      actions.resetGame(activeRoom);
    }
  }

  // 房间已被关闭(刷新场景或被外部清空)
  if (activeRoom && !room && !creating) {
    return (
      <div className="pc-root">
        <header className="pc-header">
          <h1 className="pc-title">♠ 斗地主计分</h1>
          <button className="theme-toggle" onClick={onToggleTheme} aria-label="切换主题">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </header>
        <div className="card" style={{ maxWidth: 480, margin: '40px auto', textAlign: 'center' }}>
          <p>房间不存在或已被关闭</p>
          <button className="btn btn-primary" onClick={() => setActiveRoom(null)} style={{ marginTop: 12 }}>
            返回开房
          </button>
        </div>
      </div>
    );
  }

  // 开房界面
  if (!activeRoom || !room) {
    return (
      <div className="pc-root">
        <header className="pc-header">
          <h1 className="pc-title">♠ 斗地主计分</h1>
          <button className="theme-toggle" onClick={onToggleTheme} aria-label="切换主题">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </header>
        <div className="card" style={{ maxWidth: 480, margin: '40px auto' }}>
          <h2 className="card-title">开一个房间</h2>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
            玩家用手机扫码或输入房间码加入,所有操作都在手机上完成。
          </p>
          <div className="field">
            <label className="field-label">底分(全场通用)</label>
            <div className="radio-group">
              {BASE_SCORE_OPTIONS.map((b) => (
                <label key={b} className={`radio-option${baseScore === b ? ' checked' : ''}`}>
                  <input
                    type="radio"
                    name="baseScore"
                    checked={baseScore === b}
                    onChange={() => setBaseScore(b)}
                  />
                  {b} 分
                </label>
              ))}
            </div>
          </div>
          {error && <div className="field-error">{error}</div>}
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }}
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? '创建中…' : '开房'}
          </button>
        </div>
      </div>
    );
  }

  // 已开房
  const allJoined = ['A', 'B', 'C'].every((s) => room.players?.[s]?.name);
  const roundInProgress = room.status === 'in_round';
  const showClaimDialog =
    room.currentRound?.phase === 'claiming' && !room.currentRound?.winnerClaim?.pcConfirmed;

  return (
    <div className="pc-root">
      <header className="pc-header">
        <h1 className="pc-title">♠ 斗地主计分</h1>
        <div className="pc-header-actions">
          <span className="base-score-chip" title="本房间底分">底分 {room.baseScore}</span>
          <button className="theme-toggle" onClick={onToggleTheme} aria-label="切换主题">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button className="btn btn-ghost" onClick={handleReset} title="重置房间">
            ⟲ 重置
          </button>
        </div>
      </header>

      <RoomCodeCard roomCode={activeRoom} />
      <PlayerSlots room={room} canStart={allJoined} onStartRound={() => actions.startRound(activeRoom)} />

      {roundInProgress && room.currentRound && (
        <InRoundBanner room={room} />
      )}

      <section className="section">
        <h2 className="section-title">总分</h2>
        <Scoreboard room={room} />
      </section>

      {(room.rounds?.length ?? 0) > 0 && (
        <section className="section">
          <h2 className="section-title">得分趋势</h2>
          <div className="card">
            <TrendsChart room={room} theme={theme} />
          </div>
        </section>
      )}

      {(room.rounds?.length ?? 0) > 0 && (
        <section className="section">
          <h2 className="section-title">智能分析</h2>
          <StatsPanel
            rounds={room.rounds}
            players={['A', 'B', 'C'].map((s) => ({ id: s, name: room.players?.[s]?.name ?? s }))}
            theme={theme}
          />
        </section>
      )}

      <section className="section">
        <RoundHistory room={room} />
      </section>

      {showClaimDialog && (
        <WinnerClaimDialog
          room={room}
          onConfirm={() => actions.confirmWinner(activeRoom)}
          onCancel={() => actions.cancelClaim(activeRoom)}
          onStartNext={() => actions.startRound(activeRoom)}
        />
      )}
    </div>
  );
}
