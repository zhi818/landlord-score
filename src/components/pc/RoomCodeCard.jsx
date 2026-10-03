import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildRoomUrl } from '../../lib/device';

export default function RoomCodeCard({ roomCode }) {
  const [qrUrl, setQrUrl] = useState('');
  const shareUrl = buildRoomUrl(roomCode);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(shareUrl, { width: 220, margin: 1 }).then(setQrUrl).catch(() => setQrUrl(''));
  }, [shareUrl]);

  function copy() {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="room-code-card">
      <div className="qr-wrap">
        {qrUrl ? (
          <img src={qrUrl} alt="房间二维码" />
        ) : (
          <div className="qr-placeholder">生成中…</div>
        )}
      </div>
      <div className="room-code-info">
        <p className="room-code-label">房间码</p>
        <p className="room-code">{roomCode}</p>
        <p className="room-code-hint">
          玩家用微信/浏览器扫一扫,或手动输入房间码 <strong>{roomCode}</strong> 加入。
        </p>
        <button className={`room-code-link${copied ? ' copied' : ''}`} onClick={copy}>
          {copied ? '✓ 已复制邀请链接' : '复制邀请链接'}
        </button>
      </div>
    </div>
  );
}