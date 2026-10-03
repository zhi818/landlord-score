// 智能分析:从 rounds 数组派生统计指标
//
// 所有函数都是纯函数(rounds 是历史局数组,正序)

const PLAYER_SLOTS = ['A', 'B', 'C']

/**
 * 单局是否属于「胜方」
 * - 角色胜方是 landlord → landlordId 那个玩家算赢
 * - 角色胜方是 farmer → 另外两个玩家都算赢
 */
function isRoundWinnerFor(round, slot) {
  if (round.winner === 'landlord') return round.landlordId === slot
  // farmer
  return round.landlordId !== slot
}

/**
 * 计算所有玩家(A/B/C)的连胜统计
 * @returns {{[slot]: {wins, currentStreak, maxStreak, landlordWins, farmerWins, asLandlord, asFarmer}}}
 */
export function computeStreaks(rounds) {
  const result = {}
  for (const slot of PLAYER_SLOTS) {
    let wins = 0
    let currentStreak = 0
    let maxStreak = 0
    let landlordWins = 0
    let farmerWins = 0
    let asLandlord = 0
    let asFarmer = 0

    let runningStreak = 0
    for (const r of rounds) {
      if (r.landlordId === slot) {
        asLandlord += 1
        if (r.winner === 'landlord') landlordWins += 1
      } else {
        asFarmer += 1
        if (r.winner === 'farmer') farmerWins += 1
      }
      const won = isRoundWinnerFor(r, slot)
      if (won) {
        wins += 1
        runningStreak += 1
        if (runningStreak > maxStreak) maxStreak = runningStreak
      } else {
        runningStreak = 0
      }
    }

    // 最后一轮若是赢,从末尾往前数 currentStreak
    currentStreak = 0
    for (let i = rounds.length - 1; i >= 0; i--) {
      if (isRoundWinnerFor(rounds[i], slot)) currentStreak += 1
      else break
    }

    result[slot] = { wins, currentStreak, maxStreak, landlordWins, farmerWins, asLandlord, asFarmer }
  }
  return result
}

/**
 * 倍率统计
 */
export function computeMultiplierStats(rounds) {
  if (rounds.length === 0) {
    return {
      totalRounds: 0,
      avgMultiplier: 0,
      maxMultiplier: 0,
      maxMultiplierRound: null,
      bombCount: 0,
      rocketCount: 0,
      landlordSpringCount: 0,
      farmerSpringCount: 0,
      landlordWinCount: 0,
      farmerWinCount: 0,
    }
  }

  let max = rounds[0].totalMultiplier
  let maxRound = rounds[0]
  let total = 0
  let bombs = 0
  let rockets = 0
  let lSpring = 0
  let fSpring = 0
  let landlordWins = 0
  let farmerWins = 0

  for (const r of rounds) {
    total += r.totalMultiplier
    if (r.totalMultiplier > max) {
      max = r.totalMultiplier
      maxRound = r
    }
    bombs += r.bombCount ?? 0
    if (r.rocket) rockets += 1
    if (r.landlordSpring) lSpring += 1
    if (r.farmerSpring) fSpring += 1
    if (r.winner === 'landlord') landlordWins += 1
    else farmerWins += 1
  }

  return {
    totalRounds: rounds.length,
    avgMultiplier: Math.round((total / rounds.length) * 10) / 10,
    maxMultiplier: max,
    maxMultiplierRound: maxRound,
    bombCount: bombs,
    rocketCount: rockets,
    landlordSpringCount: lSpring,
    farmerSpringCount: fSpring,
    landlordWinCount: landlordWins,
    farmerWinCount: farmerWins,
  }
}

/**
 * 每位玩家的单局最高/最低得分
 */
export function computePlayerScoreExtremes(rounds) {
  const result = {}
  for (const slot of PLAYER_SLOTS) {
    let max = null
    let min = null
    let maxRound = null
    let minRound = null
    for (const r of rounds) {
      const s = r.scores.find((x) => x.playerId === slot)
      if (!s) continue
      if (max == null || s.score > max) {
        max = s.score
        maxRound = r
      }
      if (min == null || s.score < min) {
        min = s.score
        minRound = r
      }
    }
    result[slot] = { max, min, maxRound, minRound }
  }
  return result
}

/**
 * 一次性汇总
 */
export function computeStats(rounds) {
  return {
    multiplier: computeMultiplierStats(rounds),
    streaks: computeStreaks(rounds),
    extremes: computePlayerScoreExtremes(rounds),
  }
}