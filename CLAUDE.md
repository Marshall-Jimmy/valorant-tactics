# CLAUDE.md — Valorant Tactics 项目上下文

> 本文件为 AI 助手（Claude / Cursor / Copilot 等）提供项目全景上下文。
> 每次开启新对话时，请将此文件作为 System Prompt 的附件上传。

---

## 1. 项目概述

**Valorant Tactics**（内部代号 `jimaVaroTactics`）是一个面向《无畏契约》(Valorant) 玩家的战术规划与点位学习工具。

- **Web 在线版**：https://varotactics.netlify.app
- **桌面客户端**：Electron 打包（Windows/Mac/Linux）
- **资源加速**：阿里云 OSS（华北 2 北京）

### 核心功能

| 模式 | 说明 |
|------|------|
| **点位模式 (Lineup)** | 12 张地图 × 15+ 特工的完整点位库，支持图片/视频教学、筛选、收藏 |
| **战略模式 (Strategy)** | 在地图上自由绘制战术路线、放置特工/技能图标、Undo/Redo |

---

## 2. 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16.2.6 (App Router) |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS 4 + PostCSS |
| UI 组件 | Radix UI (Dialog, Dropdown, Select, Slider, Tabs) |
| 状态管理 | Zustand 5 |
| 国际化 | i18next + react-i18next |
| 截图 | html2canvas |
| 校验 | Zod 4 |
| 桌面端 | Electron 42 + electron-builder |
| 部署 | 静态导出 → Vercel / Netlify / 阿里云 OSS |

### 重要约束

- **静态导出**：`next.config.ts` 中设置了 `output: 'export'`，**不能使用 SSR/ISR/API Routes**
- **图片无优化**：`images.unoptimized: true`（静态导出必需）
- **资源走 OSS**：生产环境所有图片通过 `NEXT_PUBLIC_OSS_BASE_URL` 加载
- **TypeScript 忽略构建错误**：`ignoreBuildErrors: true`（开发时允许类型错误）
- **可复用组件规范**：所有表单控件使用 Radix UI 封装组件（`CustomSelect` / `CustomSlider` / `ToggleSwitch`），**禁止使用原生 `<select>` / `<input type="range">`**

---

## 3. 目录结构

```
valorant-tactics/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 根布局：dark 模式、字体、I18nProvider
│   │   ├── page.tsx            # 首页：双模式切换、侧边栏、工具栏
│   │   └── globals.css         # 全局样式 + Tailwind v4 导入
│   ├── components/             # React 组件（见下方详细列表）
│   │   ├── CustomSelect.tsx    # Radix UI 自定义下拉选择器
│   │   ├── CustomSlider.tsx    # Radix UI 自定义滑块
│   │   └── ToggleSwitch.tsx    # 通用开关组件
│   ├── data/                   # 静态数据（agents.ts, maps.ts, lineups.ts, mapCallouts.ts）
│   ├── store/                  # Zustand 状态（tacticsStore.ts, settingsStore.ts）
│   ├── types/                  # TypeScript 类型定义
│   ├── schemas/                # Zod 校验 Schema
│   ├── hooks/                  # 自定义 Hooks
│   ├── i18n/                   # 国际化配置 + 翻译文件
│   └── utils/                  # 工具函数
│       ├── fileIO.ts           # JSON 下载/导入工具函数
│       └── image.ts            # 图片本地优先+OSS降级加载
├── public/                     # 静态资源（地图 SVG、特工头像、技能图标）
│   ├── abilities/
│   ├── agents/
│   ├── lineups/
│   │   ├── data2/              # 结构化点位 JSON（主要数据源）
│   │   └── images/             # 点位详情图片（生产环境走 OSS）
│   └── maps/                   # 地图 SVG 文件
├── electron/
│   └── main.js                 # Electron 主进程入口
├── scripts/                    # 工具脚本（OSS 上传、部署、生成文档）
├── scrapers/                   # 数据爬虫（Python，见 README.md）
├── doc/                        # 参赛/宣传文档
└── lineups/                    # 点位数据原始文件 + 爬虫脚本
```

### 关键组件

| 组件 | 职责 |
|------|------|
| `MapCanvas.tsx` | **核心画布**：SVG 地图渲染、缩放/平移、元素拖拽、绘制、截图 |
| `LineupPanel.tsx` | 点位模式侧边栏：特工/技能选择、点位列表、筛选、编辑、Lightbox |
| `Sidebar.tsx` | 战略模式侧边栏：特工/技能/绘制工具选择 |
| `StrategyPanel.tsx` | 策略管理弹窗：保存/加载/导入/导出 |
| `SettingsPanel.tsx` | 设置面板：语言、快捷键、网格、图层 |
| `CustomSelect.tsx` | Radix UI 自定义下拉选择器，替代原生 `<select>` |
| `CustomSlider.tsx` | Radix UI 自定义滑块，替代原生 `<input type="range">` |
| `ToggleSwitch.tsx` | 通用开关组件，用于布尔值切换 |
| `tacticsStore.ts` | 全局状态：地图/工具/元素/策略/UndoRedo/点位编辑器 |

---

## 4. 数据体系

### 4.1 点位数据来源

| 数据源 | 文件 | 说明 |
|--------|------|------|
| val.isoox.cn | `lineups/data2/isoox_structured_*.json` | 主要数据源，15+ 特工 |
| 原有数据 | `public/lineups/fade.json` | 老 Fade 数据 |
| 自定义 | `lineups/diylineups/coordinate-overrides-*.json` | 用户坐标覆盖 |

### 4.2 数据结构（结构化 JSON）

```typescript
{
  metadata: { agent, agent_cn, source, last_updated, total_lineups, maps_count },
  maps: {
    [mapKey]: {
      name_cn, name_en, lineup_count,
      abilities: {
        [abilityNum]: {
          key, name_cn, name_en, type,
          lineups: [
            {
              id, title, description, side, side_cn,
              coordinates: { start, end },
              coverage_area: [],
              media: { stand_image, detail_images[], video: { bilibili } },
              steps, view_count, fav_count, rating_score, heat_score,
              source_url
            }
          ]
        }
      }
    }
  }
}
```

### 4.3 坐标系统

- **Normalized**：`[0, 1]` 范围，存储在 JSON 中
- **World**：`[0, 1777.78]`（16:9 比例，基于高度）
- **Screen**：基于容器高度的像素坐标
- 转换函数在 `src/data/lineups.ts` 中

#### 4.3.1 仿射变换规则（核心，禁止修改）

点位坐标从 Normalized `[0,1]` 到 World 的转换使用**仿射变换**（基于 Icebox 4 个参考点推导），**不是简单的线性映射**。所有坐标渲染（主应用画布、Overlay 预览）必须使用同一套系数：

```typescript
// 常量
const NORMALIZED_HEIGHT = 1000;
const WORLD_ASPECT_RATIO = 16 / 9;
const WORLD_WIDTH = NORMALIZED_HEIGHT * WORLD_ASPECT_RATIO; // 1777.78
const MAP_SVG_WIDTH = 416;
const MAP_SVG_HEIGHT = 474;
const MAP_DISPLAY_WIDTH = 1240;
const MAP_DISPLAY_HEIGHT = 1000;
const MAP_PADDING_X = (WORLD_WIDTH - MAP_DISPLAY_WIDTH) / 2; // ~268.89

// Normalized → World（仿射变换）
function normalizedToWorld(nx: number, ny: number, flip = false): { x: number; y: number } {
  let x = -24.8055 * nx + 917.7683 * ny + 441.5591;
  let y = -940.7984 * nx + -6.6050 * ny + 969.9544;
  if (flip) {
    x = WORLD_WIDTH - x;
    y = NORMALIZED_HEIGHT - y;
  }
  return { x, y };
}

// World → 地图图片百分比 [0,100]（用于 Overlay 等小预览容器）
function worldToMapPercent(wx: number, wy: number): { x: number; y: number } {
  return {
    x: ((wx - MAP_PADDING_X) / MAP_DISPLAY_WIDTH) * 100,
    y: (wy / MAP_DISPLAY_HEIGHT) * 100,
  };
}

// Normalized → 地图图片百分比（一步到位，Overlay 专用）
function normalizedToMapPercent(nx: number, ny: number): { x: number; y: number } {
  const w = normalizedToWorld(nx, ny);
  return worldToMapPercent(w.x, w.y);
}
```

**禁止行为**：
- 禁止用 `x * 100` / `(1 - x) * 100` 等简单映射替代仿射变换
- 禁止修改仿射变换系数（`-24.8055` / `917.7683` / `441.5591` / `-940.7984` / `-6.6050` / `969.9544`）
- Overlay 中的坐标预览必须与主应用 `LineupMarkers` 渲染位置完全一致

---

## 5. 开发规范

### 5.1 代码风格

- TypeScript 严格模式（但构建时忽略错误）
- 组件使用 `'use client'` 指令（Next.js App Router 需要）
- 样式使用 Tailwind CSS 工具类
- 状态使用 Zustand，避免 prop drilling

### 5.1b 双 Store 同步机制

项目使用 `tacticsStore`（运行时状态）和 `settingsStore`（持久化设置）两个 Zustand store。为了避免手动同步导致的不一致，**绘图画布的运行时设置**（网格显示、图层可见性、绘图工具等）遵循以下规范：

- **单写入口**：所有运行时设置的修改通过 `tacticsStore` 的 setter 完成
- **自动同步**：`tacticsStore` 的 setter 内部自动调用 `settingsStore.setState()` 将值持久化
- **禁止反向写入**：不要在 `settingsStore` 中直接修改绘图画布相关的设置，始终通过 `tacticsStore` 修改
- **读取灵活**：组件可以从任一 store 读取设置值，推荐从 `tacticsStore` 读取以保证运行时一致性

### 5.2 添加新特工点位数据

1. 运行爬虫获取原始数据：`python scrapers/isoox_scraper.py`
2. 转换格式：`python scrapers/transform.py`
3. 将结构化 JSON 放入 `public/lineups/data2/`
4. 在 `src/data/lineups.ts` 的 `AGENT_LINEUP_REGISTRY` 中注册
5. 构建并部署

### 5.3 添加新地图

1. 准备地图 SVG 文件（`maps/{mapId}_map.svg`）
2. 准备区域名称 SVG（`maps/{mapId}_call_outs.svg`）
3. 在 `src/data/maps.ts` 中添加地图数据
4. 在 `src/data/mapCallouts.ts` 中添加区域名称坐标
5. 上传 SVG 到 OSS

### 5.4 添加新特工

1. 在 `src/data/agents.ts` 中添加特工数据（含技能几何信息）
2. 添加特工头像到 `public/agents/{agentId}.png`
3. 添加技能图标到 `public/abilities/{agentId}/`
4. 添加 i18n 翻译
5. 爬取点位数据并注册

---

## 6. 部署流程

### 6.1 Web 部署

```bash
# 构建静态导出
npm run build

# 上传到 Vercel
npx vercel --prod

# 或上传到 Netlify
# 拖拽 dist/ 文件夹到 Netlify
```

### 6.2 OSS 部署（国内加速）

```bash
npm run build
node scripts/upload-site-to-oss.js
```

### 6.3 Electron 打包

```bash
npm run electron:build:win   # Windows
npm run electron:build:mac   # macOS
npm run electron:build:linux # Linux
```

**打包输出目录规范**（严格遵守）：
- `package.json` 中 `directories.output` 当前值为 `out-dist`
- 输出目录由 `package.json` 配置决定，**不要在命令行中传 `--config.directories.output=xxx` 覆盖**
- 每次打包前先确认输出目录不存在或未被占用，被占用时换配置值而非命令行参数
- **绝对不要**每次新建文件夹（如 app-v2, app-v3, app-v4, build-exe 等），统一用配置中的目录
- `.gitignore` 已忽略 `/out-dist/`、`/build/`、`/app-build/`、`/app-v*/`、`/release*/`、`/dist-electron/`

---

## 7. 维护注意事项

### 7.1 已知问题

1. **OSS 下载问题**：阿里云 OSS 默认域名可能触发浏览器下载而非预览，需绑定自定义域名解决
2. **Electron 白屏**：首次启动需下载 Electron 二进制文件（约 100MB），国内建议配置镜像源
3. **内存限制**：构建时设置 `NODE_OPTIONS=--max-old-space-size=12288`

### 7.2 依赖更新风险

- **Next.js 17+**：App Router 可能有 breaking changes，升级前需测试
- **React 19**：目前使用 19.2.4，注意 concurrent features 兼容性
- **Tailwind CSS 4**：与 v3 语法不兼容，不要降级

### 7.3 数据备份

- 点位数据 JSON 定期备份到 `lineups/data2/.backups/`
- 自定义点位通过导入/导出功能保存
- 策略数据保存在 localStorage，建议定期导出

### 7.4 Git 与版本控制

**GitHub 仓库**: https://github.com/Marshall-Jimmy/valorant-tactics

**.gitignore 规则要点**（提交代码前必须遵守）：
- `public/lineups/images/` — 点位详情图片（大量 webp，通过 OSS 分发，不入库）
- `public/maps/splash/`、`public/maps/icons/` — 地图装饰图片，不入库
- `scripts/upload-to-oss.js`、`scripts/upload-site-to-oss.js` — 包含阿里云密钥，**严禁入库**
- `lineups/data/`、`lineups/images/` — 原始爬取中间数据，不入库
- `.env*` — 环境变量文件（除 `.env.example`）
- `/doc/`、`/docs/` — 参赛/宣传文档，不入库
- `*.bak` — 数据备份文件

**Commit Message 规范**：
```
feat: 新增功能
fix: 修复 Bug
data: 更新数据
refactor: 重构
docs: 文档更新
init: 初始提交
```

---

## 8. 常用命令速查

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发 |
| `npm run build` | 静态构建 |
| `npm run electron:dev` | Electron 开发模式 |
| `npm run electron:build:win` | 打包 Windows 客户端 |
| `node scripts/upload-to-oss.js` | 上传资源到 OSS |
| `node scripts/upload-site-to-oss.js` | 上传网站到 OSS |
| `python scrapers/isoox_batch_scraper.py` | 批量爬取点位 |

---

*最后更新：2026-07-02*
