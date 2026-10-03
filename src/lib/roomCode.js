// 4 位房间码生成:去掉 0/O/1/I/L 等视觉易混字符
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

// 输入校验:必须是大写的 4 位房间码字符集
export function isValidRoomCode(code) {
  return typeof code === 'string' && /^[A-Z2-9]{4}$/.test(code);
}

// 用户输入的房间码转大写以便比对
export function normalizeRoomCode(code) {
  return (code ?? '').toUpperCase().trim();
}
