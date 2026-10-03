import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'node:os'

function networkAddresses() {
  const list = []
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        list.push({ name, address: iface.address })
      }
    }
  }
  return list
}

function pickLanHost() {
  const list = networkAddresses()
  if (list.length === 0) return null
  const en0 = list.find((i) => i.name === 'en0')
  if (en0) return en0.address
  const lan = list.find((i) => !i.address.startsWith('10.'))
  if (lan) return lan.address
  return list[0].address
}

function lanHostInjectPlugin() {
  return {
    name: 'lan-host-inject',
    apply: 'serve',
    transformIndexHtml() {
      const host = pickLanHost()
      const payload = `window.__APP_LAN_HOST__ = ${JSON.stringify(host)};`
      return [
        {
          tag: 'script',
          attrs: { type: 'text/javascript' },
          children: payload,
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

// ===== 跨设备共享状态 =====
// PC 和手机访问同一个 Vite dev server,所有房间状态都存在这里的服务端内存里。
// 客户端通过 SSE(/api/events)实时接收服务端推送,
// 通过 POST(/api/op)提交写操作。
// Node 单线程事件循环让每个请求处理器跑完才切换,所以多客户端的写操作天然串行、无竞态。
function sharedStatePlugin() {
  const state = { rooms: {} }
  const sseClients = new Set()

  function broadcast() {
    const payload = `data: ${JSON.stringify({ state })}\n\n`
    for (const res of sseClients) {
      try { res.write(payload) } catch {}
    }
  }

  function applySet(target, parts, value) {
    const last = parts.pop()
    const obj = parts.reduce((acc, key) => {
      if (acc[key] == null || typeof acc[key] !== 'object') acc[key] = {}
      return acc[key]
    }, target)
    obj[last] = value
  }

  function pathGet(target, parts) {
    return parts.reduce((acc, key) => (acc == null ? acc : acc[key]), target)
  }

  function applyOp(op) {
    const parts = op.path.split('/').filter(Boolean)
    if (op.op === 'set') {
      applySet(state, parts, op.value)
    } else if (op.op === 'update') {
      const cur = pathGet(state, parts)
      if (cur && typeof cur === 'object') applySet(state, parts, { ...cur, ...op.updates })
      else applySet(state, parts, op.updates)
    } else if (op.op === 'tx') {
      // transaction 已由客户端基于"最新服务端状态"计算成新值,直接 set
      applySet(state, parts, op.value)
    } else {
      throw new Error(`未知 op: ${op.op}`)
    }
  }

  function readJsonBody(req) {
    return new Promise((resolve, reject) => {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        try { resolve(body ? JSON.parse(body) : {}) } catch (e) { reject(e) }
      })
      req.on('error', reject)
    })
  }

  return {
    name: 'shared-state-api',
    configureServer(server) {
      server.middlewares.use('/api/events', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no')
        res.write(`data: ${JSON.stringify({ state })}\n\n`)
        sseClients.add(res)
        req.on('close', () => sseClients.delete(res))
      })

      server.middlewares.use('/api/op', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        try {
          const op = await readJsonBody(req)
          applyOp(op)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
          broadcast()
        } catch (e) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: String(e?.message ?? e) }))
        }
      })

      server.middlewares.use('/api/reset', (req, res) => {
        for (const k of Object.keys(state.rooms)) delete state.rooms[k]
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
        broadcast()
      })

      server.middlewares.use('/api/state', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ state }))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), lanHostInjectPlugin(), sharedStatePlugin()],
  server: {
    host: true,
  },
})