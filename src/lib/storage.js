// localStorage 读写封装,带基础校验与 schema 迁移
import { STORAGE_KEYS, DEFAULT_BASE_SCORE, BASE_SCORE_OPTIONS } from '../constants';

const SLOT_LETTERS = ['A', 'B', 'C'];

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Schema 迁移:把旧版数据补全为当前 schema
 *
 * 老 schema(被替换的版本):
 *   - players[i].id 是 nanoid() 随机串
 *   - r.landlordId / r.scores[j].playerId 引用上面的随机 id
 *
 * 新 schema(当前):
 *   - players[i].id 固定为 'A' | 'B' | 'C'(槽位字母)
 *   - r.landlordId / r.scores[j].playerId 引用槽位字母
 *
 * 旧数据加载会被自动重映射,保证向后兼容。
 */
function migrate(parsed) {
  if (!parsed || typeof parsed !== 'object') return parsed;

  // players:移除 role 字段,顺便把非 A/B/C 的旧 id 重映射为槽位字母
  if (Array.isArray(parsed.players)) {
    const filtered = parsed.players
      .filter((p) => p && p.name)
      .map(({ role, ...rest }) => rest);

    const needsRemap = filtered.some((p) => !SLOT_LETTERS.includes(p.id));
    if (needsRemap) {
      // 用数组下标对应槽位字母
      const idMap = new Map();
      filtered.forEach((p, i) => {
        if (SLOT_LETTERS[i]) idMap.set(p.id, SLOT_LETTERS[i]);
      });
      parsed.players = filtered.map((p, i) => ({
        ...p,
        id: SLOT_LETTERS[i] ?? p.id,
      }));
      // 同步重映射 rounds 里的引用
      if (Array.isArray(parsed.rounds)) {
        parsed.rounds = parsed.rounds.map((r) => ({
          ...r,
          landlordId: idMap.get(r.landlordId) ?? r.landlordId,
          scores: Array.isArray(r.scores)
            ? r.scores.map((s) => ({
                ...s,
                playerId: idMap.get(s.playerId) ?? s.playerId,
              }))
            : [],
        }));
      }
    } else {
      parsed.players = filtered;
    }
  } else {
    parsed.players = [];
  }

  // rounds:补字段、剥离已废弃的 baseScore
  let inferredBaseScore = null;
  if (Array.isArray(parsed.rounds)) {
    parsed.rounds = parsed.rounds
      .filter((r) => r && r.id && typeof r.roundNumber === 'number' && Array.isArray(r.scores))
      .map((r) => {
        // 收集首个有 baseScore 的轮次,用于推断游戏级底分
        if (
          inferredBaseScore == null &&
          typeof r.baseScore === 'number' &&
          BASE_SCORE_OPTIONS.includes(r.baseScore)
        ) {
          inferredBaseScore = r.baseScore;
        }
        const { baseScore: _drop, ...rest } = r;
        return {
          grabCount: 0,
          landlordId: parsed.players[0]?.id ?? null,
          bombCount: 0,
          rocket: false,
          landlordSpring: false,
          farmerSpring: false,
          ...rest,
        };
      });
  } else {
    parsed.rounds = [];
  }

  // 底分:已有则用;否则用首轮推断值;否则默认 1
  if (
    typeof parsed.baseScore !== 'number' ||
    !BASE_SCORE_OPTIONS.includes(parsed.baseScore)
  ) {
    parsed.baseScore = inferredBaseScore ?? DEFAULT_BASE_SCORE;
  }

  return parsed;
}

export function loadGameState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
    if (!raw) return null;
    const parsed = safeParse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.players) || !Array.isArray(parsed.rounds)) return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}

export function saveGameState(state) {
  try {
    localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(state));
  } catch (e) {
    console.error('保存失败:', e);
  }
}

export function clearGameState() {
  try {
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
  } catch {
    // ignore
  }
}

export function loadTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.THEME);
  } catch {
    return null;
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch {
    // ignore
  }
}
