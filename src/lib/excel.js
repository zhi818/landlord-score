// 导入 / 导出:用纯 CSV(Excel 能直接打开)
//
// 文件结构(分块,块之间空行):
//
//   游戏信息
//   baseScore,1
//   exportedAt,2026-10-03T10:30:00.000Z
//
//   玩家
//   slot,name
//   A,Alice
//   B,Bob
//   C,Carol
//
//   历史局
//   roundNumber,winner,landlordId,grabCount,bombCount,rocket,landlordSpring,farmerSpring,baseScore,totalMultiplier,scoreA,scoreB,scoreC,createdAt,completedAt
//   1,landlord,A,0,0,false,false,false,1,2,2,-1,-1,1700000000000,1700000000000
//
// 块名识别第一个非空字段(中文标题);数据行紧跟其后。

import { BASE_SCORE_OPTIONS, DEFAULT_BASE_SCORE, WINNER } from '../constants.js'

const SECTION_GAME = '游戏信息'
const SECTION_PLAYERS = '玩家'
const SECTION_ROUNDS = '历史局'

const PLAYER_SLOTS = ['A', 'B', 'C']

// ===== 工具:CSV 字段转义 =====
function csvEscape(v) {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function csvLine(arr) {
  return arr.map(csvEscape).join(',')
}

function csvUnescape(s) {
  // 简化版:只处理标准双引号转义;不处理换行在字段内的情况
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    return s.slice(1, -1).replace(/""/g, '"')
  }
  return s
}

// ===== 解析 CSV 文本为 section -> rows[] =====
function parseCsvSections(text) {
  const lines = text.split(/\r?\n/)
  const sections = {}
  let current = null
  for (const raw of lines) {
    const line = raw.trim()
    if (line === '') {
      current = null
      continue
    }
    const cells = parseLine(raw)
    const first = cells[0]
    if (first === SECTION_GAME || first === SECTION_PLAYERS || first === SECTION_ROUNDS) {
      current = first
      sections[current] = []
      continue
    }
    if (current == null) continue
    sections[current].push(cells)
  }
  return sections
}

function parseLine(raw) {
  // 简化 CSV 解析,支持引号转义
  const out = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (inQ) {
      if (ch === '"' && raw[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQ = false
      } else {
        cur += ch
      }
    } else {
      if (ch === ',') {
        out.push(cur)
        cur = ''
      } else if (ch === '"' && cur === '') {
        inQ = true
      } else {
        cur += ch
      }
    }
  }
  out.push(cur)
  return out.map(csvUnescape)
}

const ROUND_HEADER = [
  'roundNumber',
  'winner',
  'landlordId',
  'grabCount',
  'bombCount',
  'rocket',
  'landlordSpring',
  'farmerSpring',
  'baseScore',
  'totalMultiplier',
  'scoreA',
  'scoreB',
  'scoreC',
  'createdAt',
  'completedAt',
]

// ===== 导出 =====
export function stateToCsv(state) {
  const lines = []

  // 游戏信息
  lines.push(SECTION_GAME)
  lines.push(csvLine(['baseScore', state.baseScore]))
  lines.push(csvLine(['exportedAt', new Date().toISOString()]))

  lines.push('')

  // 玩家
  lines.push(SECTION_PLAYERS)
  lines.push(csvLine(['slot', 'name']))
  state.players.forEach((p) => {
    lines.push(csvLine([p.id, p.name]))
  })

  lines.push('')

  // 历史局
  lines.push(SECTION_ROUNDS)
  lines.push(csvLine(ROUND_HEADER))
  state.rounds.forEach((r) => {
    const sA = r.scores.find((s) => s.playerId === 'A')?.score ?? 0
    const sB = r.scores.find((s) => s.playerId === 'B')?.score ?? 0
    const sC = r.scores.find((s) => s.playerId === 'C')?.score ?? 0
    lines.push(
      csvLine([
        r.roundNumber,
        r.winner,
        r.landlordId,
        r.grabCount ?? 0,
        r.bombCount ?? 0,
        r.rocket ? 'true' : 'false',
        r.landlordSpring ? 'true' : 'false',
        r.farmerSpring ? 'true' : 'false',
        r.baseScore,
        r.totalMultiplier,
        sA,
        sB,
        sC,
        r.createdAt ?? '',
        r.completedAt ?? '',
      ])
    )
  })

  // 行尾加换行(让 Excel 友好)
  return lines.join('\n') + '\n'
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob(['﻿' + csvText], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ===== 导入 =====
function strBool(s) {
  if (typeof s !== 'string') return Boolean(s)
  return s === 'true' || s === '1'
}

function numOrNull(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function csvToState(text) {
  const sections = parseCsvSections(text)

  // ----- 游戏信息 -----
  const gameRows = sections[SECTION_GAME] ?? []
  let baseScore = DEFAULT_BASE_SCORE
  for (const cells of gameRows) {
    const [k, v] = cells
    if (k === 'baseScore') {
      const num = Number(v)
      if (BASE_SCORE_OPTIONS.includes(num)) baseScore = num
    }
  }

  // ----- 玩家(第 1 行是表头,跳过) -----
  const playerRaw = sections[SECTION_PLAYERS] ?? []
  if (playerRaw.length < 4) {
    throw new Error(`玩家应为 3 行,实际 ${playerRaw.length - 1} 行(扣除表头)`)
  }
  const playerRows = playerRaw.slice(1)
  const players = []
  for (const cells of playerRows) {
    const [slot, name] = cells
    if (!PLAYER_SLOTS.includes(slot)) {
      throw new Error(`玩家 slot 必须是 A/B/C,发现 "${slot}"`)
    }
    if (!name || !name.trim()) {
      throw new Error('玩家名字不能为空')
    }
    players.push({ id: slot, name: name.trim() })
  }
  if (!PLAYER_SLOTS.every((s) => players.find((p) => p.id === s))) {
    throw new Error('玩家必须包含 A、B、C 三人')
  }

  // ----- 历史局(第 1 行是表头,跳过) -----
  const roundRaw = sections[SECTION_ROUNDS] ?? []
  const roundRows = roundRaw.slice(1)
  const rounds = []
  for (let i = 0; i < roundRows.length; i++) {
    const cells = roundRows[i]
    if (cells.length < 10) {
      throw new Error(`第 ${i + 1} 行历史局字段不足`)
    }
    const [
      roundNumber,
      winner,
      landlordId,
      grabCount,
      bombCount,
      rocket,
      landlordSpring,
      farmerSpring,
      bs,
      totalMultiplier,
      scoreA,
      scoreB,
      scoreC,
      createdAt,
      completedAt,
    ] = cells

    const roundNum = numOrNull(roundNumber)
    if (!roundNum || roundNum < 1) throw new Error(`第 ${i + 1} 行:roundNumber 无效`)

    if (![WINNER.LANDLORD, WINNER.FARMER].includes(winner)) {
      throw new Error(`第 ${i + 1} 行:winner 必须是 landlord 或 farmer`)
    }
    if (!PLAYER_SLOTS.includes(landlordId)) {
      throw new Error(`第 ${i + 1} 行:landlordId 必须是 A/B/C`)
    }

    const baseScoreR = numOrNull(bs) ?? baseScore
    const totalMultR = numOrNull(totalMultiplier) ?? 0
    const sA = numOrNull(scoreA) ?? 0
    const sB = numOrNull(scoreB) ?? 0
    const sC = numOrNull(scoreC) ?? 0

    rounds.push({
      id: `imported_${roundNum}_${Date.now()}_${i}`,
      roundNumber: roundNum,
      winner,
      landlordId,
      grabCount: numOrNull(grabCount) ?? 0,
      bombCount: numOrNull(bombCount) ?? 0,
      rocket: strBool(rocket),
      landlordSpring: strBool(landlordSpring),
      farmerSpring: strBool(farmerSpring),
      baseScore: baseScoreR,
      totalMultiplier: totalMultR,
      scores: [
        { playerId: 'A', score: sA },
        { playerId: 'B', score: sB },
        { playerId: 'C', score: sC },
      ],
      createdAt: numOrNull(createdAt) ?? Date.now(),
      completedAt: numOrNull(completedAt) ?? Date.now(),
    })
  }

  return { baseScore, players, rounds }
}

// 触发文件选择并解析
export function pickAndParseCsv() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,text/csv'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('未选择文件'))
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const text = String(reader.result ?? '')
          resolve(csvToState(text))
        } catch (e) {
          reject(e)
        }
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsText(file, 'utf-8')
    }
    // 点击取消时
    setTimeout(() => {
      // 若 30 秒内未选择,认为取消 — 此处不主动 reject,让 onchange 决定
    }, 0)
    input.click()
  })
}