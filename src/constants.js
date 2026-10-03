// 全局常量与枚举

// 玩家角色
export const ROLE = {
  LANDLORD: 'landlord',
  FARMER: 'farmer',
};

export const ROLE_LABEL = {
  [ROLE.LANDLORD]: '地主',
  [ROLE.FARMER]: '农民',
};

// 胜方
export const WINNER = {
  LANDLORD: 'landlord',
  FARMER: 'farmer',
};

export const WINNER_LABEL = {
  [WINNER.LANDLORD]: '地主胜',
  [WINNER.FARMER]: '农民胜',
};

// 底分选项(地主叫分)
export const BASE_SCORE_OPTIONS = [1, 2, 3];
export const DEFAULT_BASE_SCORE = 1;

// 主题
export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
};

// localStorage key
export const STORAGE_KEYS = {
  GAME_STATE: 'poker_score:state',
  THEME: 'poker_score:theme',
};

// 炸弹次数上限(防御性)
export const MAX_BOMB_COUNT = 10;
// 抢地主次数上限(标准玩法一般 0-3,放宽到 5 以兼容变体)
export const MAX_GRAB_COUNT = 5;
