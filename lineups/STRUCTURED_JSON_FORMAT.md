# sova_lineups_structured.json 格式说明文档

> 本文档描述 `data/sova_lineups_structured.json` 的完整数据结构，供前端开发和后续维护参考。

---

## 1. 文件概述

| 属性 | 值 |
|------|-----|
| 文件路径 | `lineups/data/sova_lineups_structured.json` |
| 编码 | UTF-8 |
| 数据来源 | [lkval.com](https://lkval.com/) 爬取 |
| 生成脚本 | `lineups/transform.py` |
| 总点位数 | 261 |
| 覆盖地图 | 10 张 |

---

## 2. 顶层结构

```jsonc
{
  "metadata": { ... },   // 元数据（只读，由脚本生成）
  "maps": { ... }        // 按地图分组的点位数据（核心数据）
}
```

---

## 3. metadata（元数据）

```jsonc
{
  "agent": "sova",                    // 特工英文标识
  "agent_cn": "猎枭",                 // 特工中文名
  "source": "lkval.com",              // 数据来源网站
  "coordinate_system": {              // 坐标系说明
    "type": "pixel",                  // 坐标类型：像素
    "width": 2000,                    // 地图宽度（像素）
    "height": 2000,                   // 地图高度（像素）
    "normalized_range": [0, 1]        // 归一化坐标范围
  },
  "last_updated": "2026-05-19",       // 数据最后更新日期
  "total_lineups": 261,               // 总点位数
  "maps_count": 10                    // 地图数量
}
```

---

## 4. maps（地图数据）

`maps` 是一个对象，**键为地图英文标识**，值为该地图的点位数据。

### 4.1 地图对象结构

```jsonc
{
  "name_cn": "幽邃地窟",              // 地图中文名
  "name_en": "Abyss",                 // 地图英文名
  "lineup_count": 21,                 // 该地图点位总数
  "abilities": { ... }                // 按技能分组的点位数组
}
```

### 4.2 地图标识对照表

| 标识 (key) | 中文名 | 英文名 |
|------------|--------|--------|
| `haven` | 隐士修所 | Haven |
| `bind` | 源工重镇 | Bind |
| `ascent` | 亚海悬城 | Ascent |
| `icebox` | 极寒冻土 | Icebox |
| `breeze` | 微风岛屿 | Breeze |
| `sunset` | 日落之城 | Sunset |
| `abyss` | 幽邃地窟 | Abyss |
| `lotus` | 莲华古城 | Lotus |
| `pearl` | 深海明珠 | Pearl |
| `corrode` | 盐海矿镇 | Corrode |

---

## 5. abilities（技能分组）

`abilities` 是一个对象，**键为技能编号（字符串）**，值为该技能的点位列表。

### 5.1 技能对象结构

```jsonc
{
  "key": "Q",                         // 游戏内快捷键
  "name_cn": "雷击箭",                // 技能中文名
  "name_en": "Shock Bolt",            // 技能英文名
  "type": "伤害",                     // 技能分类：侦察 / 伤害 / 信息 / 大招
  "lineups": [ ... ]                  // 点位数组
}
```

### 5.2 技能编号对照表

| 编号 (key) | 快捷键 | 中文名 | 英文名 | 分类 |
|------------|--------|--------|--------|------|
| `"1"` | C | 无人机 | Owl Drone | 侦察 |
| `"2"` | Q | 雷击箭 | Shock Bolt | 伤害 |
| `"3"` | E | 寻敌箭 | Recon Bolt | 信息 |
| `"4"` | X | 狂猎之怒 | Hunter's Fury | 大招 |

---

## 6. lineup（单个点位）

`lineups` 数组中的每个对象代表一个点位。

### 6.1 完整字段说明

```jsonc
{
  "id": 892,                          // 点位唯一 ID（整数，来自 lkval.com）
  "title": "清理断后拌线",             // 点位名称（中文）
  "side": "attack",                   // 攻防方（英文枚举）
  "side_cn": "进攻方",                 // 攻防方（中文）
  "coordinates": { ... },             // 坐标信息
  "coverage_area": [ ... ],           // 覆盖区域多边形坐标
  "media": { ... },                   // 媒体资源（图片、视频）
  "created_at": "2024-09-04 13:32:18",// 点位创建时间
  "source_url": "https://lkval.com/discuss/1295"  // 原始来源链接
}
```

### 6.2 字段详细说明

#### id
- 类型：`integer`
- 说明：点位在 lkval.com 的唯一标识，可用于关联详情页

#### title
- 类型：`string`
- 说明：点位中文名称，如 `"A包点探测箭"`、`"回防秒杀箭"`

#### side
- 类型：`string`，枚举值
- 可选值：

| 值 | 含义 |
|----|------|
| `"attack"` | 进攻方 |
| `"defense"` | 防守方 |
| `"unknown"` | 通用/无法判断 |

- 说明：根据点位标题关键词自动推断，可能不完全准确

#### side_cn
- 类型：`string`
- 说明：`side` 的中文显示名

#### coordinates
- 类型：`object`
- 结构：

```jsonc
{
  "start": {                          // 站位坐标（放箭位置）
    "raw": [1308, 1894],              // 原始像素坐标 [x, y]
    "normalized": [0.654, 0.947]      // 归一化坐标 [x, y]，范围 0~1
  },
  "end": {                            // 瞄点坐标（箭矢落点）
    "raw": [374, 1322],
    "normalized": [0.187, 0.661]
  }
}
```

- **raw**：基于 2000×2000 像素坐标系，原点在左上角
- **normalized**：`raw / 2000`，保留 4 位小数，前端可直接用于 CSS 百分比定位
- 可能为 `null`（如无人机类型无固定站位坐标）

#### coverage_area
- 类型：`array`，元素为 `[x, y]` 坐标数组
- 说明：覆盖区域的多边形顶点坐标（原始像素坐标），用于在地图上绘制覆盖范围
- 可能为空数组 `[]`（无覆盖区域数据）

#### media
- 类型：`object`
- 结构：

```jsonc
{
  "stand_image": {                    // 独立站位图（部分点位有）
    "url": "",                        // CDN 完整 URL
    "local": ""                       // 本地文件名（相对于 images/ 目录）
  },
  "detail_images": [                  // 详情图片列表
    {
      "url": "https://img.lkval.com/userupload/xxx.webp",
      "local": "abyss_2_892_detail_0.webp",
      "label": "站位图"               // 图片用途标签
    },
    {
      "url": "https://img.lkval.com/userupload/yyy.webp",
      "local": "abyss_2_892_detail_1.webp",
      "label": "瞄点图"
    }
  ],
  "video": {
    "bilibili": "https://www.bilibili.com/video/BV1xx",  // B站教学视频链接
    "timestamp": "0分54秒",                             // 视频空降时间点
    "cut_video": ""                                      // 裁剪短视频文件名（仅无人机有）
  }
}
```

**detail_images 的 label 取值**：

| label | 含义 |
|-------|------|
| `"站位图"` | 第 1 张图，展示放箭时的站位和视角 |
| `"瞄点图"` | 第 2 张图，展示瞄准的参照物位置 |
| `"补充图1"` / `"补充图2"` / ... | 额外补充图（覆盖区域、飞行轨迹等） |

**图片本地文件命名规则**：`{地图}_{技能编号}_{点位ID}_detail_{序号}.{扩展名}`

例如：`abyss_2_892_detail_0.webp` = 幽邃地窟 + Q雷击箭 + ID=892 + 第0张图

#### created_at
- 类型：`string`，格式 `YYYY-MM-DD HH:MM:SS`
- 说明：点位在 lkval.com 上创建的时间

#### source_url
- 类型：`string`，URL
- 说明：点位在 lkval.com 的详情页链接，格式为 `https://lkval.com/discuss/{blog_id}`

---

## 7. 完整示例（单点位）

```json
{
  "id": 892,
  "title": "清理断后拌线",
  "side": "attack",
  "side_cn": "进攻方",
  "coordinates": {
    "start": {
      "raw": [1308, 1894],
      "normalized": [0.654, 0.947]
    },
    "end": {
      "raw": [374, 1322],
      "normalized": [0.187, 0.661]
    }
  },
  "coverage_area": [],
  "media": {
    "stand_image": { "url": "", "local": "" },
    "detail_images": [
      {
        "url": "https://img.lkval.com/userupload/k6Dc5io9kXUMA3C2QaHJC.webp",
        "local": "abyss_2_892_detail_0.webp",
        "label": "站位图"
      },
      {
        "url": "https://img.lkval.com/userupload/PHEhx3FhVuXrcXm_0IEl2.webp",
        "local": "abyss_2_892_detail_1.webp",
        "label": "瞄点图"
      }
    ],
    "video": {
      "bilibili": "https://www.bilibili.com/video/BV1cdHreAEAj",
      "timestamp": "0分0秒",
      "cut_video": ""
    }
  },
  "created_at": "2024-09-04 13:32:18",
  "source_url": "https://lkval.com/discuss/1295"
}
```

---

## 8. 数据路径速查

| 需求 | JSON 路径 |
|------|-----------|
| 获取所有地图列表 | `Object.keys(data.maps)` |
| 获取某地图所有点位 | `data.maps["haven"]` → 遍历 `abilities` 下的 `lineups` |
| 获取某地图某技能的点位 | `data.maps["haven"].abilities["4"].lineups` |
| 获取某点位的坐标 | `lineup.coordinates.end.normalized` |
| 获取某点位的站位图 | `lineup.media.detail_images[0].url` |
| 获取某点位的瞄点图 | `lineup.media.detail_images[1].url` |
| 获取某点位的视频 | `lineup.media.video.bilibili` |
| 按攻防方筛选 | `lineups.filter(l => l.side === "attack")` |

---

## 9. 添加新点位

在对应地图和技能的 `lineups` 数组中追加对象即可：

```jsonc
// data.maps["haven"].abilities["4"].lineups 中追加：
{
  "id": 9999,
  "title": "自定义点位名称",
  "side": "attack",
  "side_cn": "进攻方",
  "coordinates": {
    "start": { "raw": [1000, 1500], "normalized": [0.5, 0.75] },
    "end": { "raw": [800, 600], "normalized": [0.4, 0.3] }
  },
  "coverage_area": [],
  "media": {
    "stand_image": { "url": "", "local": "" },
    "detail_images": [],
    "video": { "bilibili": "", "timestamp": "", "cut_video": "" }
  },
  "created_at": "",
  "source_url": ""
}
```

> 添加后需同步更新 `lineup_count` 和 `metadata.total_lineups`。
