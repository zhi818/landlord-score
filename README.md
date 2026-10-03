# 斗地主计分 ♠

一个本地化的斗地主计分前端应用,基于 React + Vite。

## 功能

- 🎯 **精确计分**:支持 **底分 × 抢地主 × 炸弹 × 王炸 × 春天** 的倍率叠加
- 👑 **每局换地主**:地主由每局开始前指定,支持 A→B→C 轮庄
- 📊 **累计总分**:三张玩家卡片实时显示,正负分配色清晰,领先者自动加冕
- 📈 **趋势图**:折线(累计)+ 柱状(单局)组合图,鼠标悬停查看任意局详情
- 💾 **本地保存**:数据存于 localStorage,刷新不丢
- 🌓 **明暗主题**:跟随系统或手动切换,主题独立持久化

## 启动

```bash
npm install
npm run dev
```

默认打开 http://localhost:5173

## 计分规则

```
最终倍率 M = 底分 × 2^抢地主 × 2^炸弹数 × 2^(王炸?) × 2^(春天?)

地主胜: 地主 +2M, 两位农民各 -M
农民胜: 两位农民各 +M, 地主 -2M
```

> 底分在**创建游戏时**指定(1/2/3),所有局共用;其余倍率按每局实际情况勾选。

## 技术栈

- React 18 + Vite 4(适配 Node 16)
- Recharts(图表)
- 原生 CSS + CSS 变量(主题)
- localStorage(持久化,含 schema 迁移)

## 目录结构

```
src/
├── lib/
│   ├── scoring.js     # 计分纯函数
│   └── storage.js     # localStorage 封装 + 迁移
├── context/
│   └── GameContext.jsx # 状态层
├── components/
│   ├── Header.jsx
│   ├── GameSetup.jsx      # 录入玩家 + 选择底分
│   ├── Scoreboard.jsx     # 三玩家总分卡(颜色按玩家绑定)
│   ├── AddRoundForm.jsx   # 每局表单(本局地主 / 倍率)
│   ├── TrendsChart.jsx    # 折线 + 柱状组合图
│   ├── RoundHistory.jsx   # 历史局列表
│   └── ConfirmDialog.jsx
├── constants.js
└── styles.css
```

## 配色校验

图表使用的 3 色调色板通过 dataviz 脚本校验:

| 模式 | 颜色 | 检查结果 |
|---|---|---|
| Light | `#4f46e5, #0891b2, #d97706` | ALL CHECKS PASS |
| Dark | `#6366f1, #0891b2, #d97706` | ALL CHECKS PASS |

校验项:亮度带、色度下限、色盲色差(protan/deutan)、正常视觉下限、对比度 ≥ 3:1。

## 测试

计分核心函数覆盖 16 个场景(无加倍 / 抢 0–3 / 炸弹 / 王炸 / 春天 / 切换地主 等),全部通过。
