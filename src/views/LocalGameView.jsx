// 线下模式:单设备本机计分
// 数据存 localStorage,shape 与历史版本兼容(由 src/lib/storage.js 处理迁移)

import { useEffect, useMemo, useReducer, useState } from 'react'
import { nanoid } from 'nanoid'
import {
  BASE_SCORE_OPTIONS,
  DEFAULT_BASE_SCORE,
  ROLE,
  ROLE_LABEL,
  WINNER,
  WINNER_LABEL,
} from '../constants'
import {
  loadGameState,
  saveGameState,
  clearGameState,
} from '../lib/storage'
import {
  calculateTotalMultiplier,
  distributeScores,
  breakdownMultiplier,
} from '../lib/scoring'
import {
  stateToCsv,
  downloadCsv,
  csvToState,
  pickAndParseCsv,
} from '../lib/excel'
import Scoreboard from '../components/Scoreboard'
import TrendsChart from '../components/TrendsChart'
import RoundHistory from '../components/RoundHistory'
import StatsPanel from '../components/StatsPanel'

const SLOTS = ['A', 'B', 'C']

function reducer(state, action) {
  switch (action.type) {
    case 'init':
      return state

    case 'start': {
      const names = action.players
      if (!SLOTS.every((s) => names[s]?.trim())) return state
      return {
        baseScore: action.baseScore,
        players: SLOTS.map((s) => ({ id: s, name: names[s].trim() })),
        rounds: [],
      }
    }

    case 'addRound': {
      const newRound = {
        id: nanoid(8),
        roundNumber: (state.rounds?.length ?? 0) + 1,
        ...action.round,
        createdAt: Date.now(),
        completedAt: Date.now(),
      }
      return { ...state, rounds: [...(state.rounds ?? []), newRound] }
    }

    case 'removeRound': {
      const rounds = (state.rounds ?? []).filter((r) => r.id !== action.id)
      return { ...state, rounds }
    }

    case 'load':
      return {
        baseScore: action.baseScore,
        players: action.players,
        rounds: action.rounds,
      }

    case 'reset':
      return emptyState()

    default:
      return state
  }
}

function emptyState() {
  return { baseScore: DEFAULT_BASE_SCORE, players: [], rounds: [] }
}

function loadInitial() {
  const loaded = loadGameState()
  if (!loaded) return emptyState()
  return loaded
}

export default function LocalGameView({ theme, onToggleTheme }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial)
  const hasGame = state.players.length === 3

  useEffect(() => {
    if (hasGame) saveGameState(state)
  }, [state, hasGame])

  function handleSwitch() {
    const url = new URL(window.location.href)
    url.searchParams.delete('mode')
    window.history.replaceState({}, '', url.toString())
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  function handleReset() {
    if (!window.confirm('确定清空当前游戏?所有局数和比分都将删除。')) return
    clearGameState()
    dispatch({ type: 'reset' })
  }

  function handleExport() {
    const csv = stateToCsv(state)
    const ts = new Date().toISOString().slice(0, 10)
    downloadCsv(`斗地主计分_${ts}.csv`, csv)
  }

  async function handleImport() {
    try {
      const parsed = await pickAndParseCsv()
      const msg = `确认导入?\n· 底分:${parsed.baseScore}\n· 玩家:${parsed.players.map((p) => p.name).join('、')}\n· 历史局数:${parsed.rounds.length}\n\n(导入会替换当前游戏数据,不可恢复)`
      if (!window.confirm(msg)) return
      dispatch({ type: 'load', baseScore: parsed.baseScore, players: parsed.players, rounds: parsed.rounds })
      // saveGameState 会在 useEffect 里自动触发
      window.alert(`导入成功:${parsed.rounds.length} 局历史已恢复`)
    } catch (e) {
      window.alert(`导入失败:${e?.message ?? e}`)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-title-wrap">
          <h1 className="header-title">
            <span className="suit">♠</span>斗地主计分
          </h1>
          {hasGame && (
            <span className="base-score-chip">底分 {state.baseScore}</span>
          )}
        </div>
        <div className="header-actions">
          <span className="mode-tag mode-tag-local">线下模式</span>
          {hasGame && (
            <button className="btn btn-ghost" onClick={handleExport} title="把当前对局导出为 CSV 文件">
              导出
            </button>
          )}
          <button className="btn btn-ghost" onClick={handleImport} title="从 CSV 文件恢复对局">
            导入
          </button>
          <button className="btn btn-ghost" onClick={handleSwitch} title="切换到线上模式">
            切到线上
          </button>
          <button className="theme-toggle" onClick={onToggleTheme} aria-label="切换主题">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      {!hasGame ? (
        <SetupForm onStart={(players, baseScore) => dispatch({ type: 'start', players, baseScore })} />
      ) : (
        <GameScreen state={state} dispatch={dispatch} onReset={handleReset} theme={theme} />
      )}
    </div>
  )
}

// ===== Setup =====
function SetupForm({ onStart }) {
  const [names, setNames] = useReducer(
    (s, patch) => ({ ...s, ...patch }),
    { A: '', B: '', C: '' }
  )
  const [baseScore, setBaseScore] = useState(DEFAULT_BASE_SCORE)
  const [error, setError] = useState('')

  function handleStart() {
    if (!SLOTS.every((s) => names[s]?.trim())) {
      setError('请填写 3 位玩家的名字')
      return
    }
    if (new Set(SLOTS.map((s) => names[s].trim())).size !== 3) {
      setError('3 位玩家不能重名')
      return
    }
    onStart(names, baseScore)
  }

  return (
    <div className="card">
      <h2 className="card-title">新建游戏</h2>
      <div className="form-grid">
        <div>
          <div className="field">
            <label className="field-label">玩家 A</label>
            <input
              className="input"
              value={names.A}
              onChange={(e) => setNames({ A: e.target.value })}
              placeholder="名字"
              autoFocus
            />
          </div>
          <div className="field">
            <label className="field-label">玩家 B</label>
            <input
              className="input"
              value={names.B}
              onChange={(e) => setNames({ B: e.target.value })}
              placeholder="名字"
            />
          </div>
          <div className="field">
            <label className="field-label">玩家 C</label>
            <input
              className="input"
              value={names.C}
              onChange={(e) => setNames({ C: e.target.value })}
              placeholder="名字"
            />
          </div>
        </div>
        <div>
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
        </div>
      </div>
      {error && <div className="field-error">{error}</div>}
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={handleStart}>
        开始
      </button>
    </div>
  )
}

// ===== Game screen =====
function GameScreen({ state, dispatch, onReset, theme }) {
  // 把 local state 转成"伪 room"喂给 Scoreboard/TrendsChart/RoundHistory
  const syntheticRoom = useMemo(() => {
    const totals = { A: 0, B: 0, C: 0 }
    state.rounds.forEach((r) => {
      r.scores.forEach((s) => {
        totals[s.playerId] = (totals[s.playerId] ?? 0) + s.score
      })
    })
    const players = {}
    state.players.forEach((p) => {
      players[p.id] = { name: p.name }
    })
    return { baseScore: state.baseScore, players, totals, rounds: state.rounds }
  }, [state])

  return (
    <>
      <section className="section">
        <h2 className="section-title">总分</h2>
        <Scoreboard room={syntheticRoom} />
      </section>

      <section className="section">
        <RoundForm
          state={state}
          onSubmit={(round) => dispatch({ type: 'addRound', round })}
          onReset={onReset}
        />
      </section>

      {state.rounds.length > 0 && (
        <section className="section">
          <h2 className="section-title">智能分析</h2>
          <StatsPanel rounds={state.rounds} players={state.players} theme={theme} />
        </section>
      )}

      {state.rounds.length > 0 && (
        <section className="section">
          <h2 className="section-title">得分趋势</h2>
          <div className="card">
            <TrendsChart room={syntheticRoom} theme={theme} />
          </div>
        </section>
      )}

      <section className="section">
        <RoundHistory
          room={syntheticRoom}
          onRemove={(id) => {
            if (window.confirm('删除这一局?')) dispatch({ type: 'removeRound', id })
          }}
        />
      </section>
    </>
  )
}

// ===== Round form =====
function RoundForm({ state, onSubmit, onReset }) {
  const [round, setRound] = useReducer(
    (s, patch) => ({ ...s, ...patch }),
    {
        // 谁拿到地主牌:物理上拿到 3 张额外牌的人(发牌阶段)
        cardsTo: null,
        // 谁是地主:实际以地主身份打牌的人(决定计分角色)
        landlordId: null,
        bombCount: 0,
        rocket: false,
        spring: null, // 'landlord' | 'farmer' | null
        grabCount: 0,
      }
  )
  const [confirmOpen, setConfirmOpen] = useState(false)

  const hasCardsTo = round.cardsTo != null
  const hasLandlord = round.landlordId != null

  function setSpring(v) {
    setRound({ spring: round.spring === v ? null : v })
  }

  // 倍率 M 不依赖胜方:在表单里就可算出
  const totalMultiplier = useMemo(() => {
    if (!round.landlordId) return null
    return calculateTotalMultiplier({
      baseScore: state.baseScore,
      bombCount: round.bombCount,
      rocket: round.rocket,
      landlordSpring: round.spring === 'landlord',
      farmerSpring: round.spring === 'farmer',
      grabCount: round.grabCount,
    })
  }, [round, state])

  const factors = useMemo(() => {
    if (!round.landlordId) return []
    return breakdownMultiplier({
      baseScore: state.baseScore,
      bombCount: round.bombCount,
      rocket: round.rocket,
      landlordSpring: round.spring === 'landlord',
      farmerSpring: round.spring === 'farmer',
      grabCount: round.grabCount,
    })
  }, [round, state])

  function handleSubmit() {
    if (!round.landlordId) return
    setConfirmOpen(true)
  }

  function handleFinalConfirm(winner, scores) {
    if (!round.landlordId) return
    onSubmit({
      winner,
      landlordId: round.landlordId,
      scores,
      totalMultiplier,
      bombCount: round.bombCount,
      rocket: round.rocket,
      landlordSpring: round.spring === 'landlord',
      farmerSpring: round.spring === 'farmer',
      grabCount: round.grabCount,
      baseScore: state.baseScore,
    })
    setConfirmOpen(false)
    resetRoundForm()
  }

  function resetRoundForm() {
    setRound({
      cardsTo: null,
      landlordId: null,
      bombCount: 0,
      rocket: false,
      spring: null,
      grabCount: 0,
    })
  }

  function handleResetRound() {
    const isEmpty =
      round.cardsTo == null &&
      round.landlordId == null &&
      round.bombCount === 0 &&
      !round.rocket &&
      round.spring == null &&
      round.grabCount === 0
    if (isEmpty) {
      resetRoundForm()
      return
    }
    if (window.confirm('清空当前正在录入的本局信息?(不会删除已提交的局)')) {
      resetRoundForm()
    }
  }

  function handleResetGame() {
    onReset()
  }

  const stepBomb = (delta) => {
    setRound({ bombCount: Math.max(0, round.bombCount + delta) })
  }
  const stepGrab = (delta) => {
    setRound({ grabCount: Math.max(0, Math.min(5, round.grabCount + delta)) })
  }

  return (
    <div className="card">
      <div className="card-title-row">
        <h2 className="card-title" style={{ margin: 0 }}>添加本局</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost"
            onClick={handleResetRound}
            title="只清空当前正在录入的本局(地主/抢地主/炸弹/王炸/春天),不影响已提交的局"
          >
            清空本局
          </button>
          <button className="btn btn-ghost btn-danger" onClick={handleResetGame}>
            重置游戏
          </button>
        </div>
      </div>

      <div className="form-grid">
        <div>
          <div className="field">
            <label className="field-label">
              ① 谁拿到地主牌
              {hasCardsTo && <span className="field-done">✓</span>}
            </label>
            <p className="field-hint">拿到 3 张底牌的人获得本局「优先叫地主」的权利。</p>
            <div className="radio-group">
              {SLOTS.map((s) => {
                const p = state.players.find((x) => x.id === s)
                return (
                  <label key={s} className={`radio-option${round.cardsTo === s ? ' checked' : ''}`}>
                    <input
                      type="radio"
                      name="cardsTo"
                      checked={round.cardsTo === s}
                      onChange={() => setRound({ cardsTo: s })}
                    />
                    {p?.name ?? s}
                  </label>
                )
              })}
            </div>
          </div>

          <div className={`field-locked${hasCardsTo ? ' unlocked' : ''}`}>
          <div className="field">
            <label className="field-label">
              ② 谁是地主
              {hasLandlord && <span className="field-done">✓</span>}
              {!hasCardsTo && <span className="field-lock-hint">先选 ①</span>}
            </label>
            <p className="field-hint">最终以地主身份打牌的人(决定本局计分)。</p>
            <div className="radio-group">
              {SLOTS.map((s) => {
                const p = state.players.find((x) => x.id === s)
                return (
                  <label key={s} className={`radio-option${round.landlordId === s ? ' checked' : ''}`}>
                    <input
                      type="radio"
                      name="landlordId"
                      checked={round.landlordId === s}
                      onChange={() => setRound({ landlordId: s })}
                      disabled={!hasCardsTo}
                    />
                    {p?.name ?? s}
                  </label>
                )
              })}
            </div>
          </div>

          <div className="field">
            <label className="field-label">
              ③ 抢地主次数
              {!hasCardsTo && <span className="field-lock-hint">先选 ①</span>}
            </label>
            <div className="stepper-row">
              <div className="stepper">
                <button type="button" onClick={() => stepGrab(-1)} disabled={!hasCardsTo || round.grabCount === 0}>−</button>
                <span className="stepper-value">{round.grabCount}</span>
                <button type="button" onClick={() => stepGrab(1)} disabled={!hasCardsTo || round.grabCount >= 5}>+</button>
              </div>
              <span className="stepper-hint">
                {round.grabCount > 0
                  ? `×${Math.pow(2, round.grabCount)} 倍`
                  : '无人抢地主'}
              </span>
            </div>
          </div>
        </div>
        </div>

        <div className={`field-locked${hasLandlord ? ' unlocked' : ''}`}>
          <div className="field">
            <label className="field-label">
              ④ 倍率事件(炸弹 / 王炸 / 春天)
              {!hasLandlord && <span className="field-lock-hint">先选 ②</span>}
            </label>
            <p className="field-hint">这些事件只影响总倍率 M;胜方在「最终确认」弹窗里选。</p>
          </div>

          <div className="field">
            <label className="field-label">炸弹</label>
            <div className="stepper-row">
              <div className="stepper">
                <button type="button" onClick={() => stepBomb(-1)} disabled={!hasLandlord || round.bombCount === 0}>−</button>
                <span className="stepper-value">{round.bombCount}</span>
                <button type="button" onClick={() => stepBomb(1)} disabled={!hasLandlord}>＋</button>
              </div>
              <span className="stepper-hint">
                {round.bombCount > 0 ? `×${Math.pow(2, round.bombCount)} 倍` : '无'}
              </span>
            </div>
          </div>

          <div className="field">
            <label className="field-label">王炸</label>
            <div className="radio-group">
              <label className={`radio-option${round.rocket ? ' checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={round.rocket}
                  disabled={!hasLandlord}
                  onChange={(e) => setRound({ rocket: e.target.checked })}
                />
                打出了王炸 ×2
              </label>
            </div>
          </div>

          <div className="field">
            <label className="field-label">春天 / 反春天</label>
            <div className="radio-group">
              <label className={`radio-option${round.spring === 'landlord' ? ' checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={round.spring === 'landlord'}
                  disabled={!hasLandlord}
                  onChange={() => setSpring('landlord')}
                />
                春天 ×2
              </label>
              <label className={`radio-option${round.spring === 'farmer' ? ' checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={round.spring === 'farmer'}
                  disabled={!hasLandlord}
                  onChange={() => setSpring('farmer')}
                />
                反春天 ×2
              </label>
            </div>
          </div>
        </div>
      </div>

      <PreviewBlock
        ready={!!round.landlordId}
        totalMultiplier={totalMultiplier}
        factors={factors}
        scores={null}
        players={state.players}
        landlordId={round.landlordId}
      />

      <button
        className="btn btn-primary"
        style={{ width: '100%', marginTop: 12 }}
        disabled={!round.landlordId}
        onClick={handleSubmit}
      >
        下一步:最终确认
      </button>

      {confirmOpen && (
        <ConfirmRoundDialog
          round={round}
          state={state}
          totalMultiplier={totalMultiplier}
          factors={factors}
          onConfirm={handleFinalConfirm}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  )
}

function PreviewBlock({ ready, totalMultiplier, factors, scores, players, landlordId }) {
  if (!ready) {
    return (
      <div className="preview">
        <div className="factor-empty">先选地主,这里会显示本局 M</div>
      </div>
    )
  }
  return (
    <div className="preview">
      <div className="preview-hero">
        <div className="preview-hero-label">本局倍率</div>
        <div className="preview-hero-value">
          <span className="preview-hero-m">M =</span>
          <span className="preview-hero-num">{totalMultiplier}</span>
        </div>
      </div>
      <div className="preview-factors">
        {factors.length === 0 ? (
          <span className="factor-empty">无加倍</span>
        ) : (
          factors.map((f, i) => (
            <span key={i} className="factor-chip">
              <span className="factor-label">{f.label}</span>
              <span className="factor-num">×{f.factor}</span>
            </span>
          ))
        )}
      </div>
      {scores != null && (
        <>
          <div className="preview-divider" />
          <div className="preview-list">
            {scores.map((s) => {
              const player = players.find((p) => p.id === s.playerId)
              const isLandlord = s.playerId === landlordId
              const sign = s.score > 0 ? 'positive' : s.score < 0 ? 'negative' : ''
              return (
                <div key={s.playerId} className="preview-row">
                  <span className="preview-name">
                    {player?.name ?? s.playerId}
                    {isLandlord && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)' }}>地主</span>}
                  </span>
                  <span className={`preview-score ${sign}`}>
                    {s.score > 0 ? '+' : ''}{s.score}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ===== 最终确认弹窗 =====
function ConfirmRoundDialog({ round, state, totalMultiplier, factors, onConfirm, onCancel }) {
  const [winnerSlot, setWinnerSlot] = useState(round.landlordId ?? 'A')
  const playerName = (id) => state.players.find((p) => p.id === id)?.name ?? id
  const cardsHolderName = round.cardsTo ? playerName(round.cardsTo) : '?'
  const landlordName = round.landlordId ? playerName(round.landlordId) : '?'

  // 春天/反春天强制锁定胜方:
  //   春天 → 地主必胜 → 锁定 landlordId
  //   反春天 → 农民必胜 → 锁定某个非地主玩家
  useEffect(() => {
    if (!round.landlordId) return
    if (round.spring === 'landlord' && winnerSlot !== round.landlordId) {
      setWinnerSlot(round.landlordId)
    } else if (round.spring === 'farmer' && winnerSlot === round.landlordId) {
      const firstFarmer = SLOTS.find((s) => s !== round.landlordId)
      if (firstFarmer) setWinnerSlot(firstFarmer)
    }
  }, [round.spring, round.landlordId]) // winnerSlot 故意不依赖,避免循环

  // 派生:所选玩家是地主 → landlord 赢;否则 farmer 赢
  const winningSide = round.landlordId && winnerSlot === round.landlordId
    ? WINNER.LANDLORD
    : WINNER.FARMER

  // 胜方变化时实时重算各玩家得分
  const scores = useMemo(() => {
    if (!round.landlordId) return []
    return distributeScores({
      winner: winningSide,
      players: state.players,
      landlordId: round.landlordId,
      totalMultiplier,
    })
  }, [winningSide, round.landlordId, state.players, totalMultiplier])

  const factorChips = factors.map((f, i) => (
    <span key={i} className="factor-chip">
      <span className="factor-label">{f.label}</span>
      <span className="factor-num">×{f.factor}</span>
    </span>
  ))

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">最终确认本局</h3>
          <button className="modal-close" onClick={onCancel} aria-label="关闭">✕</button>
        </div>

        <div className="modal-body">
          <div className="confirm-row">
            <span className="confirm-label">拿到地主牌</span>
            <span className="confirm-value">
              <span className={`stats-slot-tag stats-slot-${round.cardsTo.toLowerCase()}`}>{round.cardsTo}</span>
              {cardsHolderName}
            </span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">地主</span>
            <span className="confirm-value">
              <span className={`stats-slot-tag stats-slot-${round.landlordId.toLowerCase()}`}>{round.landlordId}</span>
              {landlordName}
            </span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">抢地主</span>
            <span className="confirm-value">
              {round.grabCount} 次
              {round.grabCount > 0 && <span className="confirm-sub">×{Math.pow(2, round.grabCount)}</span>}
            </span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">炸弹</span>
            <span className="confirm-value">
              {round.bombCount} 个
              {round.bombCount > 0 && <span className="confirm-sub">×{Math.pow(2, round.bombCount)}</span>}
            </span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">王炸</span>
            <span className="confirm-value">{round.rocket ? '✓ ×2' : '—'}</span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">春天</span>
            <span className="confirm-value">
              {round.spring === 'landlord' && '地主春天 ×2'}
              {round.spring === 'farmer' && '反春天 ×2'}
              {round.spring == null && '—'}
            </span>
          </div>

          <div className="confirm-divider" />

          <div className="preview-hero">
            <div className="preview-hero-label">总倍率</div>
            <div className="preview-hero-value">
              <span className="preview-hero-m">M =</span>
              <span className="preview-hero-num">{totalMultiplier}</span>
            </div>
          </div>

          {factorChips.length > 0 && (
            <div className="preview-factors">{factorChips}</div>
          )}

          <div className="confirm-divider" />

          <div className="confirm-section-label">⑤ 谁赢了?</div>
          {round.spring && (
            <p className="confirm-hint confirm-hint-locked">
              🔒 本局勾选「{round.spring === 'landlord' ? '地主春天' : '反春天'}」,
              {winningSide === WINNER.LANDLORD ? '地主必胜' : '农民必胜'} — 胜方已锁定。
            </p>
          )}
          <div className="radio-group confirm-winner">
            {SLOTS.map((s) => {
              const p = state.players.find((x) => x.id === s)
              const isLandlord = s === round.landlordId
              const lockedOut =
                (round.spring === 'landlord' && !isLandlord) ||
                (round.spring === 'farmer' && isLandlord)
              return (
                <label
                  key={s}
                  className={`radio-option${winnerSlot === s ? ' checked' : ''}${lockedOut ? ' radio-option-locked' : ''}`}
                >
                  <input
                    type="radio"
                    name="confirm-winner"
                    checked={winnerSlot === s}
                    disabled={lockedOut}
                    onChange={() => setWinnerSlot(s)}
                  />
                  <span className={`stats-slot-tag stats-slot-${s.toLowerCase()}`}>{s}</span>
                  {p?.name ?? s}
                  {isLandlord && <span className="confirm-winner-role">地主</span>}
                </label>
              )
            })}
          </div>
          {!round.spring && (
            <p className="confirm-hint">
              {winningSide === WINNER.LANDLORD
                ? `→ 地主(${landlordName})赢,两位农民各输 ${totalMultiplier} 分`
                : `→ 农民赢,两位农民各赢 ${totalMultiplier} 分,地主输 ${totalMultiplier * 2} 分`}
            </p>
          )}

          <div className="confirm-divider" />

          <div className="confirm-section-label">⑥ 各玩家得分(根据当前胜方 + M)</div>
          <div className="confirm-scores">
            {scores.map((s) => {
              const player = state.players.find((p) => p.id === s.playerId)
              const isLandlord = s.playerId === round.landlordId
              const sign = s.score > 0 ? 'positive' : s.score < 0 ? 'negative' : ''
              return (
                <div key={s.playerId} className="confirm-score-row">
                  <span className="confirm-score-name">
                    <span className={`stats-slot-tag stats-slot-${s.playerId.toLowerCase()}`}>{s.playerId}</span>
                    {player?.name ?? s.playerId}
                    {isLandlord && <span className="confirm-score-role">地主</span>}
                  </span>
                  <span className={`confirm-score-num ${sign}`}>
                    {s.score > 0 ? '+' : ''}{s.score}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>返回修改</button>
          <button className="btn btn-primary" onClick={() => onConfirm(winningSide, scores)}>最终确认提交</button>
        </div>
      </div>
    </div>
  )
}