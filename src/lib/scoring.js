// 斗地主计分纯函数
// 这是计分规则的"单一来源",所有 UI 与持久化都从这里派生
import { WINNER } from '../constants';

/**
 * 计算最终倍率 M = baseScore × 2^(所有翻倍因子)
 *
 * 翻倍因子(各自 ×2,乘法叠加):
 * - bombCount:炸弹数
 * - rocket:王炸
 * - landlordSpring:地主春天
 * - farmerSpring:农民春天(反春天,与 landlordSpring 互斥)
 * - grabCount:抢地主次数(0 表示无人抢地主,初始叫地主不算)
 *
 * @returns {number} M
 */
export function calculateTotalMultiplier({
  baseScore,
  bombCount,
  rocket,
  landlordSpring,
  farmerSpring,
  grabCount = 0,
}) {
  if (!Number.isFinite(baseScore) || baseScore < 1) {
    throw new Error('底分必须 ≥ 1');
  }
  if (!Number.isInteger(bombCount) || bombCount < 0) {
    throw new Error('炸弹数必须是非负整数');
  }
  if (!Number.isInteger(grabCount) || grabCount < 0) {
    throw new Error('抢地主次数必须是非负整数');
  }
  if (landlordSpring && farmerSpring) {
    throw new Error('地主春天与农民春天互斥');
  }
  let multiplier = 1;
  multiplier *= Math.pow(2, bombCount);
  if (rocket) multiplier *= 2;
  if (landlordSpring) multiplier *= 2;
  if (farmerSpring) multiplier *= 2;
  if (grabCount > 0) multiplier *= Math.pow(2, grabCount);
  return Math.round(baseScore * multiplier);
}

/**
 * 根据胜方与 M 给每玩家结算
 * - 地主胜:地主 +2M,每位农民 -M
 * - 农民胜:每位农民 +M,地主 -2M
 *
 * @param {Object} params
 * @param {'landlord'|'farmer'} params.winner
 * @param {Array<{id:string}>} params.players
 * @param {string} params.landlordId - 本局地主 id
 * @param {number} params.totalMultiplier - 即 M
 */
export function distributeScores({ winner, players, landlordId, totalMultiplier }) {
  if (![WINNER.LANDLORD, WINNER.FARMER].includes(winner)) {
    throw new Error('winner 必须是 landlord 或 farmer');
  }
  if (!Number.isFinite(totalMultiplier) || totalMultiplier < 1) {
    throw new Error('totalMultiplier 必须 ≥ 1');
  }
  if (!landlordId || !players.find((p) => p.id === landlordId)) {
    throw new Error('必须指定本局地主');
  }
  const gain = totalMultiplier * 2;
  const loss = totalMultiplier;
  return players.map((p) => {
    if (winner === WINNER.LANDLORD) {
      return { playerId: p.id, score: p.id === landlordId ? gain : -loss };
    }
    return { playerId: p.id, score: p.id === landlordId ? -gain : loss };
  });
}

/**
 * 高层接口:从一轮输入直接得到结算结果
 */
export function settleRound({
  winner,
  players,
  landlordId,
  baseScore,
  bombCount,
  rocket,
  landlordSpring,
  farmerSpring,
  grabCount,
}) {
  const totalMultiplier = calculateTotalMultiplier({
    baseScore,
    bombCount,
    rocket,
    landlordSpring,
    farmerSpring,
    grabCount,
  });
  const scores = distributeScores({
    winner,
    players,
    landlordId,
    totalMultiplier,
  });
  return { totalMultiplier, scores };
}

/**
 * 倍率明细描述(用于历史局展示)
 */
export function describeMultipliers({
  bombCount,
  rocket,
  landlordSpring,
  farmerSpring,
  grabCount,
}) {
  const parts = [];
  if (grabCount > 0) parts.push(`抢地主×${grabCount} ${Math.pow(2, grabCount)}倍`);
  if (bombCount > 0) parts.push(`${bombCount} 炸弹 ×${Math.pow(2, bombCount)}`);
  if (rocket) parts.push('王炸 ×2');
  if (landlordSpring) parts.push('春天 ×2');
  if (farmerSpring) parts.push('反春天 ×2');
  return parts.length ? parts.join(' · ') : '无加倍';
}

/**
 * 倍率拆解(用于结算预览):
 * 把 M 拆成"底分 × 2^a × 2^b × ..."的形式,返回数组便于渲染为 chip
 * @returns {Array<{label: string, factor: number}>}
 */
export function breakdownMultiplier({
  baseScore,
  bombCount,
  rocket,
  landlordSpring,
  farmerSpring,
  grabCount,
}) {
  const factors = [{ label: `底分 ${baseScore}`, factor: baseScore }];
  if (grabCount > 0) factors.push({ label: `抢 ${grabCount} 次`, factor: Math.pow(2, grabCount) });
  if (bombCount > 0) factors.push({ label: `${bombCount} 炸弹`, factor: Math.pow(2, bombCount) });
  if (rocket) factors.push({ label: '王炸', factor: 2 });
  if (landlordSpring) factors.push({ label: '春天', factor: 2 });
  if (farmerSpring) factors.push({ label: '反春天', factor: 2 });
  return factors;
}
