// 设备检测

export function isMobile() {
  if (typeof window === 'undefined') return false;
  // 主:屏幕宽度
  if (window.innerWidth < 768) return true;
  // 次:UA 残骸穮
  return /Android|fiOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  );
}

// 从 URL 解析参数
export function getUrlParams() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    room: params.get('room')?.toUpperCase() ?? null,
    player: params.get('player')?.toUpperCase() ?? null,
  };
}

// 开发环境(LAN 调试)专用:获取本机局域网 IP
// 只在浏览器内、且需要时调用。生产环境返回 null。
export function getLanHost() {
  if (typeof window === 'undefined') return null;
  // 仅开发环境:location.hostname 是 localhost 或 127.0.0.1 时才走 LAN 路径
  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return null;

  // 让用户在 URL 参数里手动指定覆盖(便于多网卡场景)
  const override = new URLSearchParams(window.location.search).get('lan');
  if (override) return override;

  // 浏览器无法直接读取本地 IP。用 hardcoded 探测 — dev script 启动时
  // 写入 window.__APP_LAN_HOST__(见 main.jsx)。
  if (typeof window.__APP_LAN_HOST__ === 'string' && window.__APP_LAN_HOST__) {
    return window.__APP_LAN_HOST__;
  }
  return null;
}

// 构建房间分享链接(给手机扫)
// 在 dev 模式下:如果当前页面是 localhost/127.0.0.1 且检测到 LAN host,
// 则用 LAN host 生成链接,便于手机扫描访问。
function resolveOrigin() {
  if (typeof window === 'undefined') return '';
  const { protocol, port } = window.location;
  const host = window.location.hostname;
  const lan = getLanHost();
  if (lan) return `${protocol}//${lan}${port ? `:${port}` : ''}`;
  return window.location.origin;
}

// 构建房间分享链接(给手机扫)
export function buildRoomUrl(roomCode, playerSlot = null) {
  const params = new URLSearchParams();
  params.set('room', roomCode);
  if (playerSlot) params.set('player', playerSlot);
  return `${resolveOrigin()}${window.location.pathname}?${params.toString()}`;
}