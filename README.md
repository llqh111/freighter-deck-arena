<div align="center">

# 运输船 · 甲板交锋 | DECKFIRE

**浏览器里的硬核第一人称团队竞技**  
24 × 51 米经典货轮甲板 · 三线短交火 · 6 把可把玩近战武器 · 准星工坊 · 局域网 1v1 联机

[![Three.js](https://img.shields.io/badge/Engine-Three.js-black?logo=threedotjs)](https://threejs.org/)
[![ES Modules](https://img.shields.io/badge/Stack-Pure%20ES%20Modules-F7DF1E?logo=javascript&logoColor=black)](#快速开始)
[![Zero Build](https://img.shields.io/badge/Dev-Zero%20Build-2ea44f)](#快速开始)
[![Offline HTML](https://img.shields.io/badge/Distribution-Single%20HTML%20Offline-0969da)](#单文件离线版)
[![LAN 1v1](https://img.shields.io/badge/Multiplayer-WebSocket%201v1-8957e5)](#局域网-1v1-好友房)

</div>

---

**DECKFIRE（运输船 · 甲板交锋）** 是一款基于 **Three.js + 原生 ES Modules** 开发的浏览器第一人称射击游戏，无需前端框架或复杂构建即可直接运行，并支持一键打包为单文件离线版 `transport-ship.html`。

游戏围绕「**手感诚实、三线短交火、武器可把玩**」三条核心原则打造：准星开合由真实弹道扩散公式实时驱动，融合 CS / CF / VALORANT 风格的枪感、击杀反馈与近战检视系统。

---

## 核心特性

- **经典货轮三线竞技场**  
  24 × 51 米运输船甲板，涵盖中央货柜区、高台架点与舷侧管道；支持**白天 / 黄昏**光照切换与三档画质（流畅 / 均衡 / 极致）。
- **诚实的弹道与听觉反馈**  
  `gunplay.js` 实时计算静止精度、移动惩罚、蹲姿/开镜收益、连发扩散（bloom）与后坐爬升，并直接驱动准星开合；配备距离衰减与左右声像的合成音效、48 发对象池曳光弹、抛壳、弹孔血迹、受击方位指示与 CF 风格连杀徽章。
- **三大对局模式 + 局域网 1v1 联机**
  - **团队竞技（TDM）**：支持 3v3 / 4v4 / 6v6 / 8v8 人机对抗，四档 AI 难度（简单 / 普通 / 困难 / 地狱），目标击杀 30 / 50 / 100 可选。
  - **3v3 刀战（Knife）**：纯近战快节奏甲板对决，目标击杀 15 / 25 / 30。
  - **1v1 单挑（Duel）**：支持人机镜像/随机配枪单挑，或通过内置 Node WebSocket 服务端开启**局域网好友房**（服务端 60Hz 权威模拟）。
- **6 把独立手感近战武器 & 涂装系统**  
  包含制式军刀、尼泊尔军刀、马来剑、**CS 战术蝴蝶刀**（冷钢 / 紫黑·潮汐涂装，`F`/`R` 无限转刀）、**爪刀 Karambit**（GLB 模型 + 四元数骨骼动作，支持 `Y`/`F` 翻面循环与 `R` 反向双转）、**M9 刺刀 · 舰卫**（GLB 模型 + Fade 渐变 & Doppler 蓝深海 / 绿翡翠 / 红绯晶着色器涂装 + 双面检视）。
- **准星工坊（Crosshair Studio）**  
  采用 **1:1 物理像素 DPR 画布渲染**与视口像素对齐，在任意 DPI 缩放下零偏心；内置 4 套常用预设，支持 **VALORANT 准星代码**双向导入与导出。
- **多端即开即玩**  
  原生支持键鼠操作与触屏设备（自动显示虚拟摇杆与开火/下蹲/切枪/瞄准按键）；提供单文件离线版，双击 HTML 即可游玩。

---

## 快速开始

### 1. 本地运行（完整功能，含 1v1 好友房联机）

需要 [Node.js](https://nodejs.org/)（用于静态服务与 WebSocket 联机服务）：

```bash
git clone https://github.com/llqh111/freighter-deck-arena.git
cd freighter-deck-arena
npm install          # 仅安装 ws（好友房联机）与 esbuild（离线打包）
npm start            # 启动服务 → http://localhost:8787
```

在浏览器打开 `http://localhost:8787` 即可开打。

### 2. 局域网 1v1 好友房

1. 房主运行 `npm start`（可通过 `PORT=8787` 自定义端口）。
2. 同局域网内的对手在浏览器访问 `http://<房主内网IP>:8787`（服务端提供 `GET /duel-server.json` 返回本机可用局域网 IP 列表）。
3. 双方进入「单挑 1v1」即可通过 WebSocket 创建/加入房间对战。

### 3. 单文件离线版

仓库已内置同步打包好的 [`transport-ship.html`](./transport-ship.html)（内联全部 JS/CSS、天空盒、音频与 GLB 模型），下载后**双击即可在浏览器离线运行**（`file://` 协议下会自动隐藏联机入口）。

修改源码后重新构建离线版：

```bash
npm run build:offline
# 若环境中全局安装了 esbuild，也可用 ESBUILD_PATH 指定路径
```

### 4. 数值体检工具

修改 `arsenal.js` 中的武器数值后，运行校验脚本可直接按运行时同一套护甲与衰减公式输出击杀枪数、TTK 与距离衰减是否生效：

```bash
node tools/ttk.mjs
```

---

## 操作指南

| 类别 | 动作 | 按键 |
| --- | --- | --- |
| **移动** | 前后左右 / 静步 / 冲刺 | `W` `A` `S` `D` / `Shift` / `X` |
| **身法** | 下蹲 / 跳跃 / 空中转向 | `C` / `Space` / `A`/`D` + 同向移动鼠标 |
| **战斗** | 射击（近战轻击） / 开镜瞄准（近战重击） | 鼠标左键 / 鼠标右键 |
| **装备** | 切换武器槽（主/副/近战/手雷） / 快切上把武器 / 换弹 | `1`–`4` / `Q` / `R` |
| **滚轮** | 快捷切刀或顺序循环（可在设置中切换） | 鼠标滚轮 |
| **把玩** | 武器检视 / 蝴蝶刀 & 爪刀无限连转 | `Y` 或 `F` / `R` 连按 |
| **界面** | 战局中换装 / 查看战绩表 / 暂停菜单 | `B` / `Tab` / `Esc` |

> 触屏设备访问时会自动启用底部虚拟摇杆与右侧战术按键。

---

## 武器库与数值一览

> 以下数据由 `node tools/ttk.mjs` 直接从 [`arsenal.js`](./arsenal.js) 实时计算（满血 `100 HP` + 满甲 `100 Armor`，护甲按 `1 - 穿甲系数` 吸收伤害）。

### 主武器与副武器（满甲躯干命中）

| 武器 | 定位 | 弹匣 / 备弹 | 5m TTK | 20m TTK | 30m TTK | 满甲爆头 | 射速间隔 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **AK-47** | 高伤步枪 · 一击定音 | 30 / 90 | 4 枪 / 0.32s | 4 枪 / 0.32s | 4 枪 / 0.32s | **1 枪 (128.0)** | 0.11s |
| **M4A1** | 稳定步枪 · 控枪连发 | 30 / 90 | 4 枪 / 0.30s | 4 枪 / 0.30s | 4 枪 / 0.30s | 2 枪 (91.8) | 0.10s |
| **AWM** | 双倍率重型狙击 | 5 / 20 | **1 枪 / 0.00s** | 1 枪 / 0.00s | 1 枪 / 0.00s | **1 枪 (245.4)** | 1.43s |
| **MP5** | 高移速近距冲锋枪 | 30 / 120 | 6 枪 / 0.38s | 7 枪 / 0.45s | 8 枪 / 0.53s | 2 枪 (63.7) | 0.07s |
| **沙漠之鹰** | 高威力副武器 | 7 / 35 | 3 枪 / 0.46s | 3 枪 / 0.46s | 3 枪 / 0.46s | **1 枪 (164.2)** | 0.23s |

- **AK-47 vs M4A1**：躯干 TTK 仅差 20ms，核心分工落在「满甲能否一枪爆头」与后坐力稳定性上（无甲状态下 M4A1 仍可一枪爆头 122.4）。
- **距离衰减**：步枪与 AWM 全图无衰减；MP5 在 14–26m 线性衰减至 72%（有效压制区在近中距离）。

### 近战武器（正面满甲）

| 武器 | 风格与特色 | 轻击（满甲） | 重击（满甲） | 轻 / 重 CD | 轻 / 重距离 | 拔刀 |
| --- | --- | --- | --- | --- | --- | --- |
| **军刀** | 经典均衡 · 轻快切刀 | 45.4（3 刀） | **100.8（1 刀死）** | 0.37s / 0.86s | 2.05 / 2.10 | 0.10s |
| **尼泊尔军刀** | 反曲弯刀 · 甩刀高伤 | 61.2（2 刀） | **121.5（1 刀死）** | 0.43s / 0.90s | 2.20 / 2.26 | 0.11s |
| **马来剑** | 波浪短剑 · 极速轻击超远刺 | 45.8（3 刀） | **103.8（1 刀死）** | 0.29s / 0.80s | 2.35 / 2.38 | 0.10s |
| **蝴蝶刀** | CS 战术蝶刀 · 双涂装 · 无限转刀 | 50.7（2 刀） | **101.5（1 刀死）** | 0.38s / 0.82s | 2.10 / 2.14 | 0.20s |
| **爪刀 (Karambit)** | 反握快切 · 翻面循环 & 反向双转 | 50.5（2 刀） | **101.8（1 刀死）** | 0.39s / 0.86s | 2.08 / 2.12 | 0.16s |
| **M9 · 舰卫** | 锯背固定刃 · Fade & Doppler 涂装 | 51.0（2 刀） | **103.7（1 刀死）** | 0.39s / 0.86s | 2.08 / 2.16 | 0.20s |

> 所有近战均具备 **背刺 ×1.8** 与 **爆头 ×1.3** 倍率。

---

## 项目结构

```text
freighter-deck-arena/
├── index.html / ui.css           # 单页入口、菜单、HUD 与对话框样式
├── main.js                       # 应用装配、输入处理、HUD 同步与准星扩散驱动
├── world.js                      # 运输船甲板几何、货柜/管道/高台、天空与海面着色器
├── match.js                      # 对局状态机、命中判定、伤害与护甲、AI 战术与雷达
├── match-rules.js                # 模式规则、默认人数、目标击杀与对局时长
├── gunplay.js                    # 弹道扩散锥 (firingCone) 与连发后坐/恢复模型
├── arsenal.js                    # 武器数值表、距离衰减、装备配置与 AI 难度参数
├── lobby.js                      # 武器图标 SVG、选装卡片、设置项与战绩表模板
├── crosshair.js                  # 1:1 DPR 物理像素准星渲染与 VALORANT 代码编解码
├── viewmodel.js                  # 第一人称持枪/切枪/后坐/开镜与手部装配
├── armory-models.js              # 枪械与基础近战程序化 3D 模型
├── classic-blades*.js            # 经典近战（军刀/尼泊尔/马来剑）动作与音效
├── butterfly-motion.js           # 蝴蝶刀三段动作曲线与连转逻辑
├── karambit-model.js / motion.js # 爪刀 GLB 加载、手部绑定与四元数动作曲线
├── bayonet-*.js / m9-finish.js   # M9 刺刀 GLB 加载、Doppler 涂装着色器、动作与音效
├── deck-audio.js                 # Web Audio 合成枪声、命中/爆头反馈与空间衰减
├── deck-effects.js               # 弹孔、血迹、枪口焰、曳光弹与弹壳粒子
├── server.mjs                    # 静态文件服务器与 WebSocket 升级入口
├── duel-server.mjs / client.js / room.js  # 1v1 好友房服务端权威模拟与客户端同步
├── assets/                       # GLB 近战模型、蝴蝶刀 Foley 采样与第三方声明
├── tools/
│   ├── ttk.mjs                   # 武器 TTK / 爆头 / 衰减数值体检脚本
│   └── build-offline.mjs         # esbuild 单文件离线 HTML 构建脚本
└── transport-ship.html           # 预构建的单文件离线版
```

---

<details>
<summary><strong>设计笔记与待优化方向（Roadmap）</strong></summary>

- **反馈补强**：为 M4A1 满甲爆头（91.8 伤害）补充明确的护甲火星与金属格挡音效，让未击杀的原因一目了然。
- **数值与近战微调**：清理沙漠之鹰无效的距离衰减区间（当前 18m 与 36m 均为 3 枪）；统一近战重击前摇与玩家/AI 判定对称性。
- **AI 与对局节奏**：优化地狱难度 AI 的视野与瞄头曲线（先控信息再提准度），并让团队竞技的倒计时在快节奏交火中具备实际战术价值。
- **联机手感**：为 1v1 好友房加入客户端移动预测与插值平滑，进一步降低局域网高延迟下的操作粘滞感。

</details>

---

## 致谢与许可

- **3D 引擎**：[Three.js](https://threejs.org/)（MIT License，见 [`THREE-LICENSE.txt`](./THREE-LICENSE.txt)）
- **全景天空**：Kloofendal 48d Partly Cloudy，来自 [Poly Haven](https://polyhaven.com/a/kloofendal_48d_partly_cloudy)（CC0）
- **蝴蝶刀音效采样**：[Wyzowl SFX Kit](https://github.com/wyzowl/sfx-kit)（CC0 1.0，见 [`assets/butterfly/NOTICE.txt`](./assets/butterfly/NOTICE.txt)）
- **爪刀模型**：[LOW POLY KARAMBİT BIÇAĞI](https://sketchfab.com/3d-models/low-poly-karambit-bicagi-9f48d6ee01584347ad54df3526170bd9) by OldTÜRK34（CC-BY 4.0，见 [`assets/karambit/NOTICE.txt`](./assets/karambit/NOTICE.txt)）
- **玩法与美术参考**：经典《运输船》团队竞技地图、CS / CF / VALORANT 战斗反馈；参考原作 [transport-ship](https://claude-opus-5-5-cf-transport-ship.pages.dev/)
