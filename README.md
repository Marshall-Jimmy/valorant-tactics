# Valorant Tactics (jimaVaroTactics)

面向《无畏契约》(Valorant) 玩家的战术规划与点位学习工具。

**在线版**: [varotactics.netlify.app](https://varotactics.netlify.app)

## 功能

| 模式 | 说明 |
|------|------|
| **点位模式 (Lineup)** | 12+ 张地图 x 15+ 特工的完整点位库，支持图片/视频教学、筛选、收藏 |
| **战略模式 (Strategy)** | 在地图上自由绘制战术路线、放置特工/技能图标、Undo/Redo |

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router, 静态导出) |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS 4 |
| UI | Radix UI |
| 状态管理 | Zustand 5 |
| 国际化 | i18next |
| 校验 | Zod 4 |
| 桌面端 | Electron 42 |

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 构建
npm run build

# Electron 开发模式
npm run electron:dev
```

## 项目结构

```
src/
├── app/            # Next.js App Router
├── components/     # React 组件
│   ├── CustomSelect.tsx   # Radix UI 自定义下拉选择器
│   ├── CustomSlider.tsx   # Radix UI 自定义滑块
│   └── ToggleSwitch.tsx   # 通用开关组件
├── data/           # 静态数据 (agents, maps, lineups)
├── store/          # Zustand 状态管理
├── types/          # TypeScript 类型
├── schemas/        # Zod 校验
├── hooks/          # 自定义 Hooks
├── i18n/           # 国际化配置
└── utils/          # 工具函数
    ├── fileIO.ts         # JSON 下载/导入工具函数
    └── image.ts          # 图片本地优先+OSS降级加载
public/
├── maps/           # 地图 SVG 资源
├── agents/         # 特工头像
├── abilities/      # 技能图标
└── lineups/        # 点位数据 + 图片
scrapers/           # 数据爬虫脚本
scripts/            # 部署脚本
```

## 数据来源

| 数据类型 | 来源 |
|----------|------|
| 点位数据 | [val.isoox.cn](https://val.isoox.cn), [lkval.com](https://lkval.com) |
| 地图 SVG | [SunkenInTime/icarus](https://github.com/SunkenInTime/icarus) |
| 地图元数据 | [valorant-api.com](https://valorant-api.com) |

## License

MIT
