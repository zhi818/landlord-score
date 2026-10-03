// 跨设备共享状态客户端 / 本地内存(双模式)
//
// 用法:
//   import { db } from './db';
//   db.set('rooms/ABCD', { ... });
//
// 模式选择(优先级从高到低):
//   1. URL 参数    ?db=local  或  ?db=shared  (单次会话)
//   2. 环境变量    VITE_DB_MODE=local|shared   (写入 .env.local)
//   3. 默认        shared(跨设备,Vite dev server 中间件需启用 sharedStatePlugin)
//
// "shared" 模式:
//   - 状态保存在 Vite dev server 进程内存里
//   - 客户端通过 SSE(/api/events)接收推送
//   - 客户端通过 POST(/api/op)提交写操作
//   - 多设备共享同一份状态
//
// "local" 模式(纯本地、无后端):
//   - 状态保存在当前 tab 的内存里
//   - 通过 BroadcastChannel 在同浏览器多 tab 间同步
//   - 不同设备 / 不同浏览器之间看不到彼此的数据

const CHANNEL_NAME = 'poker_score_db'

function emptyState() {
  return { rooms: {} }
}

// ===== local =====
class LocalDB {
  constructor() {
    this.state = emptyState()
    this.listeners = new Set()
    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.onmessage = (e) => {
        if (e.data?.type === 'sync' && e.data.state) {
          this.state = e.data.state
          this.emit()
        }
      }
    } catch {
      this.channel = null
    }
  }
  get(path) {
    if (!path) return this.state
    return path.split('/').reduce((acc, key) => (acc == null ? acc : acc[key]), this.state)
  }
  set(path, value) {
    const parts = path.split('/')
    const last = parts.pop()
    const target = parts.reduce((acc, key) => {
      acc[key] = acc[key] || {}
      return acc[key]
    }, this.state)
    target[last] = value
    this.broadcast()
  }
  update(path, updates) {
    const current = this.get(path)
    if (current == null || typeof current !== 'object') {
      this.set(path, updates)
    } else {
      this.set(path, { ...current, ...updates })
    }
  }
  transaction(path, updateFn) {
    const current = this.get(path)
    const next = updateFn(current)
    if (next === undefined) return current
    this.set(path, next)
    return next
  }
  increment(path, delta = 1) {
    return this.transaction(path, (n) => (typeof n === 'number' ? n + delta : delta))
  }
  push(path, value) {
    const list = this.get(path) || []
    const key = String(Date.now()) + '_' + Math.random().toString(36).slice(2, 8)
    const next = Array.isArray(list) ? [...list, { _key: key, ...value }] : [value]
    this.set(path, next)
    return key
  }
  subscribe(callback) {
    this.listeners.add(callback)
    callback(this.state)
    return () => this.listeners.delete(callback)
  }
  reset() {
    this.state = emptyState()
    this.broadcast()
  }
  emit() {
    this.listeners.forEach((cb) => {
      try { cb(this.state) } catch (e) { console.error(e) }
    })
  }
  broadcast() {
    this.emit()
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'sync', state: this.state })
      } catch {
        // 序列化失败等异常 — 不打断主流程
      }
    }
  }
}

// ===== shared =====
const EVENT_PATH = '/api/events'
const OP_PATH = '/api/op'

class SharedDB {
  constructor() {
    this.state = emptyState()
    this.listeners = new Set()
    this.connected = false
    if (typeof window !== 'undefined') this.connect()
  }
  connect() {
    if (typeof EventSource === 'undefined') return
    try {
      this.sse = new EventSource(EVENT_PATH)
      this.sse.onopen = () => {
        this.connected = true
      }
      this.sse.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data)
          if (payload?.state) {
            this.state = payload.state
            this.emit()
          }
        } catch {
          // 忽略非 JSON 消息
        }
      }
      this.sse.onerror = () => {
        this.connected = false
      }
    } catch {
      // EventSource 不可用
    }
  }
  get(path) {
    if (!path) return this.state
    return path.split('/').reduce((acc, key) => (acc == null ? acc : acc[key]), this.state)
  }
  set(path, value) {
    this.post({ op: 'set', path, value })
  }
  update(path, updates) {
    this.post({ op: 'update', path, updates })
  }
  transaction(path, updateFn) {
    const current = this.get(path)
    const next = updateFn(current)
    if (next === undefined) return current
    this.set(path, next)
    return next
  }
  increment(path, delta = 1) {
    const current = this.get(path)
    const next = typeof current === 'number' ? current + delta : delta
    this.set(path, next)
    return next
  }
  push(path, value) {
    const list = this.get(path) || []
    const key = String(Date.now()) + '_' + Math.random().toString(36).slice(2, 8)
    const next = Array.isArray(list) ? [...list, { _key: key, ...value }] : [value]
    this.set(path, next)
    return key
  }
  subscribe(callback) {
    this.listeners.add(callback)
    callback(this.state)
    return () => this.listeners.delete(callback)
  }
  reset() {
    if (typeof fetch === 'undefined') return
    fetch('/api/reset', { method: 'POST' }).catch(() => {})
  }
  emit() {
    this.listeners.forEach((cb) => {
      try { cb(this.state) } catch (e) { console.error(e) }
    })
  }
  post(op) {
    if (typeof fetch === 'undefined') return
    fetch(OP_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(op),
      keepalive: true,
    }).catch((e) => {
      console.error('db post 失败:', e)
    })
  }
}

// ===== 模式选择 =====
function resolveMode() {
  if (typeof window !== 'undefined') {
    const urlMode = new URLSearchParams(window.location.search).get('db')
    if (urlMode === 'local' || urlMode === 'shared') return urlMode
  }
  try {
    const envMode = import.meta.env?.VITE_DB_MODE
    if (envMode === 'local' || envMode === 'shared') return envMode
  } catch {
    // import.meta.env 在某些环境抛错,忽略
  }
  return 'shared'
}

const mode = resolveMode()
export const DB_MODE = mode

export const db = mode === 'local' ? new LocalDB() : new SharedDB()