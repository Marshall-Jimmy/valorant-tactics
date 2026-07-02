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
| UI 组件 | Radix UI (Dialog, Dropdown, Slider, Tabs) |
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
│   ├── data/                   # 静态数据（agents.ts, maps.ts, lineups.ts, mapCallouts.ts）
│   ├── store/                  # Zustand 状态（tacticsStore.ts, settingsStore.ts）
│   ├── types/                  # TypeScript 类型定义
│   ├── schemas/                # Zod 校验 Schema
│   ├── hooks/                  # 自定义 Hooks
│   ├── i18n/                   # 国际化配置 + 翻译文件
│   └── utils/                  # 工具函数
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

---

## 5. 开发规范

### 5.1 代码风格

- TypeScript 严格模式（但构建时忽略错误）
- 组件使用 `'use client'` 指令（Next.js App Router 需要）
- 样式使用 Tailwind CSS 工具类
- 状态使用 Zustand，避免 prop drilling

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
