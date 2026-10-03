// 入口模式选择:线上(多设备) vs 线下(单设备本机)
export default function ModePicker() {
  function pick(mode) {
    const url = new URL(window.location.href)
    url.searchParams.set('mode', mode)
    window.history.replaceState({}, '', url.toString())
    // 触发一次 popstate 让 App 重新计算
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div className="mode-picker">
      <header className="mode-picker-header">
        <h1>♠ 斗地主计分</h1>
        <p className="mode-picker-sub">选择使用方式</p>
      </header>

      <div className="mode-cards">
        <button className="mode-card" onClick={() => pick('online')}>
          <div className="mode-icon">📡</div>
          <div className="mode-title">线上模式</div>
          <div className="mode-desc">
            PC 开房 + 房间码/二维码,3 位玩家用各自手机操作。<br/>
            适合真机多人一起玩。
          </div>
          <div className="mode-cta">进入线上 →</div>
        </button>

        <button className="mode-card" onClick={() => pick('local')}>
          <div className="mode-icon">🖥️</div>
          <div className="mode-title">线下模式</div>
          <div className="mode-desc">
            单设备本机操作:输入 3 个玩家 + 底分,每局手动选地主、记倍率。<br/>
            适合 1 个人代记账,或同屏演示。
          </div>
          <div className="mode-cta">进入线下 →</div>
        </button>
      </div>
    </div>
  )
}