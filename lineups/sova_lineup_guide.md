# 猎枭(Sova)全地图点位数据指南

> **数据来源**：lkval.com（原 val.isoox.cn 已301重定向至 lkval.com）
> **爬取日期**：2026-05-19
> **覆盖地图**：隐士修所(Haven)、源工重镇(Bind)、亚海悬城(Ascent)
> **总计点位**：155个（Haven 59 + Bind 18 + Ascent 78）

---

## 目录

- [一、工具准备](#一工具准备)
- [二、数据爬取指南](#二数据爬取指南)
  - [2.1 网站结构分析](#21-网站结构分析)
  - [2.2 完整爬虫代码](#22-完整爬虫代码)
  - [2.3 反爬注意事项](#23-反爬注意事项)
  - [2.4 数据清洗与标准化](#24-数据清洗与标准化)
- [三、全地图核心点位速查表](#三全地图核心点位速查表)
  - [3.1 隐士修所 (Haven)](#31-隐士修所-haven)
  - [3.2 源工重镇 (Bind)](#32-源工重镇-bind)
  - [3.3 亚海悬城 (Ascent)](#33-亚海悬城-ascent)
- [四、快速上手与练习建议](#四快速上手与练习建议)

---

## 一、工具准备

### Python 环境

- **Python 版本**：3.8+（推荐 3.10+）
- **依赖库**：

```bash
pip install requests beautifulsoup4
```

> **说明**：lkval.com 是 SPA 单页应用，数据通过 API 接口以 JSON 格式返回，因此实际上只需要 `requests` 库即可完成数据爬取。`beautifulsoup4` 可用于辅助分析页面结构。

### 文件结构

```
lineups/
├── scraper.py              # 爬虫主程序
├── data/
│   ├── sova_lineups_raw.json    # 原始爬取数据
│   └── sova_lineups_cleaned.json # 清洗后数据
├── images/                 # 点位图片（站位图、瞄点图）
│   ├── haven_2_330_detail_0.webp
│   ├── haven_2_330_detail_1.webp
│   └── ...
└── sova_lineup_guide.md    # 本文档
```

### 图片命名规则与对应关系

图片文件命名格式：`{地图}_{ability编号}_{点位ID}_detail_{序号}.{扩展名}`

**示例**：`haven_4_5_detail_0.webp`
- `haven`：地图标识（隐士修所）
- `4`：ability 编号，对应 **E-寻敌箭**
- `5`：点位 ID
- `detail_0`：第一张图（站位图）

**图片序号含义**：

| 序号 | 含义 | 说明 |
|------|------|------|
| `detail_0` | **站位图** | 展示放箭时的站位位置和视角 |
| `detail_1` | **瞄点图** | 展示瞄准的具体位置（通常是天空/墙面上的参照物） |
| `detail_2` | 补充图 | 可能包含覆盖区域、飞行轨迹等额外信息 |
| `detail_3+` | 更多补充 | 部分复杂点位有多张补充图 |

**ability 编号与技能对应**（重要！）：

| ability 编号 | 游戏键位 | 技能名称 |
|-------------|---------|---------|
| 1 | C | 枭型无人机 |
| 2 | Q | 雷击箭 |
| 3 | E | 寻敌箭 |
| 4 | X | 狂猎之怒（大招） |

> **注意**：lkval.com 的 ability 编号与游戏键位**不是按顺序对应**的！例如 `haven_4_5` 表示的是 E-寻敌箭，而不是 X-大招。

---

## 二、数据爬取指南

### 2.1 网站结构分析

#### 重要发现：域名迁移

`val.isoox.cn` 已 **301重定向** 到 `https://lkval.com/`，两者是同一个网站。所有后续操作均使用 `lkval.com`。

#### 技术栈

| 组件 | 技术 |
|------|------|
| 前端框架 | Vue 2.7 + Vuex + Vue Router |
| UI组件库 | Element UI |
| 地图引擎 | Leaflet.js（交互式地图） |
| HTTP客户端 | Axios |
| 图片CDN | img.lkval.com |

#### 网站架构特点

- **SPA 单页应用**：所有内容通过前端路由切换，URL 不随筛选条件变化
- **无独立英雄页**：猎枭点位通过左侧筛选器（地图→英雄→技能→攻防方）在主页展示
- **数据存储在后端 API**：通过 Axios 发起 XHR 请求获取 JSON 数据
- **交互式地图**：使用 Leaflet.js 在 2000×2000 像素坐标系上渲染点位

#### 核心 API 接口

| API 端点 | 方法 | 说明 |
|---------|------|------|
| `/api/blogs/get_lineup_list` | GET | **核心接口** - 获取点位列表 |
| `/api/blogs/get_discuss_detail` | GET | 获取点位详情（含图片列表、视频链接） |
| `/api/blogs/get_lineup_count` | GET | 获取点位数量统计 |

#### 点位列表 API 详解

**请求格式**：
```
GET /api/blogs/get_lineup_list?game=val&userSelect={"val":{"map":"haven","agent":"sova","ability":4,"side":0},"cs2":{...},"df":{...}}
```

**参数说明**：

| 参数 | 取值 | 说明 |
|------|------|------|
| `game` | `val` | 游戏类型（无畏契约） |
| `map` | `haven`/`bind`/`ascent` 等 | 地图标识 |
| `agent` | `sova` | 英雄标识 |
| `ability` | `1`/`2`/`3`/`4` | 技能编号（见下表） |
| `side` | `0`/`1`/`2` | 攻防方（0=全部, 1=进攻, 2=防守） |

**猎枭技能编号对照**：

| 编号 | 游戏键位 | 官方名称 | 常用俗称 | 核心定位 | 关键参数 |
|------|---------|---------|---------|---------|---------|
| 1 | **C** | 枭型无人机 | 鸟、无人机 | 主动侦察+单点标记 | 400游戏币/回合，1次使用；飞行8.5秒，100血量；标记持续8秒 |
| 2 | **Q** | 雷击箭 | 电箭、震荡箭 | 范围伤害+逼走位 | 150游戏币/发，每回合2发；伤害23-75（中心最高）；最多2次反弹 |
| 3 | **E** | 寻敌箭 | 侦察箭、扫描箭 | 核心信息获取（招牌技能） | 每回合免费1发，冷却60秒；持续3.2秒，脉冲3次；20血量，可被摧毁 |
| 4 | **X** | 狂猎之怒 | 大招、贯穿箭 | 穿墙输出+大范围侦察 | 8点终极能量；6秒内可发射3发；每发80伤害，可穿透所有墙体 |

> **注意**：lkval.com 的 ability 编号与游戏键位不是按顺序对应的，请务必按上表正确映射。

#### 返回数据结构

```json
{
  "code": 0,
  "list": [
    {
      "id": 5,
      "map_name": "haven",
      "ability": 4,
      "blog_id": 5,
      "lineup_title": "A包点探测箭",
      "agent_name": "sova",
      "start_image": "",
      "leaflet_params": {
        "startPoint": [420, 1308],
        "endPoint": [1383, 1795],
        "polygonList": [[[1360, 1568], [1360, 1899], ...]]
      }
    }
  ]
}
```

**关键字段**：

| 字段 | 说明 |
|------|------|
| `id` | 点位唯一ID |
| `blog_id` | 关联详情页ID |
| `lineup_title` | 点位名称（如"A包点探测箭"） |
| `leaflet_params.startPoint` | 站位坐标 [x, y]（2000×2000坐标系） |
| `leaflet_params.endPoint` | 瞄点/落点坐标 [x, y] |
| `leaflet_params.polygonList` | 覆盖区域多边形坐标数组 |

#### 点位详情 API

```
GET /api/blogs/get_discuss_detail?blog_id=5&lineup_id=5
```

返回包含 `images`（图片文件名数组）、`bili_link`（B站视频链接）、`bili_start_minute`/`bili_start_second`（视频空降时间）等字段。

#### 图片资源 URL 格式

| 类型 | URL 格式 |
|------|---------|
| 用户上传图片 | `https://img.lkval.com/userupload/{filename}` |
| 地图雷达图 | `https://img.lkval.com/static/assets/val/map/{mapName}Radar.svg` |
| 英雄头像 | `https://img.lkval.com/static/assets/val/agent/{agentName}.png` |
| 技能图标 | `https://img.lkval.com/static/assets/val/agent/{agentName}/{abilityNum}.svg` |

### 2.2 完整爬虫代码

> 完整可运行的爬虫代码已保存在 `lineups/scraper.py`，以下是核心代码：

```python
"""
猎枭(Sova)点位数据爬虫 - lkval.com
爬取 Haven/Bind/Ascent 三张地图的全部点位数据和图片
"""
import requests
import json
import os
import time

# ============ 配置 ============
BASE_URL = "https://lkval.com"
API_LINEUP_LIST = f"{BASE_URL}/api/blogs/get_lineup_list"
API_DISCUSS_DETAIL = f"{BASE_URL}/api/blogs/get_discuss_detail"
IMG_BASE_URL = "https://img.lkval.com/userupload"

# 目标地图
TARGET_MAPS = ["haven", "bind", "ascent"]

# Sova 技能编号（注意：lkval.com的编号与游戏键位不是按顺序对应）
ABILITY_MAP = {
    1: "C-无人机 - Owl Drone",
    2: "Q-雷击箭 - Shock Bolt",
    3: "X-狂猎之怒 - Hunter's Fury",
    4: "E-寻敌箭 - Recon Bolt"
}

# 地图中文名
MAP_CN = {
    "haven": "隐士修所(Haven)",
    "bind": "源工重镇(Bind)",
    "ascent": "亚海悬城(Ascent)"
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://lkval.com/",
    "Accept": "application/json, text/plain, */*",
}

def get_lineup_list(map_name, ability, side=0):
    """获取点位列表"""
    user_select = json.dumps({
        "val": {"map": map_name, "agent": "sova",
                "ability": ability, "side": side},
        "cs2": {"map": "dust2", "agent": "", "side": 0, "ability": 1},
        "df": {"map": "htjd", "agent": "luna", "side": 0, "ability": 0}
    })
    params = {"game": "val", "userSelect": user_select}
    resp = requests.get(API_LINEUP_LIST, params=params,
                        headers=HEADERS, timeout=15)
    data = resp.json()
    return data.get("list", []) if data.get("code") == 0 else []

def get_discuss_detail(blog_id, lineup_id):
    """获取点位详情（含图片列表）"""
    params = {"blog_id": blog_id, "lineup_id": lineup_id}
    resp = requests.get(API_DISCUSS_DETAIL, params=params,
                        headers=HEADERS, timeout=15)
    data = resp.json()
    return data.get("detail", {}) if data.get("code") == 0 else {}

def download_image(url, save_path, retries=3):
    """下载图片（带重试）"""
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code == 200 and len(resp.content) > 100:
                with open(save_path, 'wb') as f:
                    f.write(resp.content)
                return True
        except Exception as e:
            print(f"  [重试 {attempt+1}/{retries}] {e}")
            time.sleep(1)
    return False

def main():
    # 创建输出目录
    data_dir = "data"
    img_dir = "images"
    for d in [data_dir, img_dir]:
        os.makedirs(d, exist_ok=True)

    all_lineups = []

    for map_name in TARGET_MAPS:
        print(f"\n{'='*60}")
        print(f"正在爬取: {MAP_CN[map_name]} ({map_name})")

        for ability_num, ability_name in ABILITY_MAP.items():
            print(f"\n--- {ability_name} ---")
            lineups = get_lineup_list(map_name, ability_num)
            print(f"  获取到 {len(lineups)} 个点位")

            for idx, item in enumerate(lineups):
                lineup_id = item.get("id")
                blog_id = item.get("blog_id")
                title = item.get("lineup_title", "未知点位")
                print(f"  [{idx+1}/{len(lineups)}] {title}")

                # 获取详情
                detail = get_discuss_detail(blog_id, lineup_id)

                # 下载详情图片
                images = detail.get("images", [])
                for img_idx, img_name in enumerate(images):
                    if img_name:
                        img_url = f"{IMG_BASE_URL}/{img_name}"
                        ext = img_name.rsplit('.', 1)[-1] \
                              if '.' in img_name else 'webp'
                        img_filename = (f"{map_name}_{ability_num}_"
                                        f"{lineup_id}_detail_{img_idx}.{ext}")
                        img_path = os.path.join(img_dir, img_filename)
                        if download_image(img_url, img_path):
                            print(f"    ✓ {img_filename}")

                all_lineups.append({
                    "点位名称": title,
                    "地图": MAP_CN[map_name],
                    "箭类型": ability_name,
                    "站位坐标": item.get("leaflet_params", {})
                                       .get("startPoint", []),
                    "瞄点坐标": item.get("leaflet_params", {})
                                      .get("endPoint", []),
                    "覆盖区域": item.get("leaflet_params", {})
                                      .get("polygonList", []),
                    "B站视频": detail.get("bili_link", ""),
                })
                time.sleep(0.3)  # 礼貌延迟

            time.sleep(0.5)

    # 保存数据
    with open(os.path.join(data_dir, "sova_lineups.json"),
              'w', encoding='utf-8') as f:
        json.dump(all_lineups, f, ensure_ascii=False, indent=2)

    print(f"\n爬取完成! 总计 {len(all_lineups)} 个点位")

if __name__ == "__main__":
    main()
```

**运行方式**：
```bash
cd lineups
python scraper.py
```

### 2.3 反爬注意事项

| 检查项 | 状态 | 说明 |
|--------|------|------|
| API 鉴权 | 无需 | 所有数据接口无需登录即可访问 |
| 验证码 | 无 | 未发现任何验证码机制 |
| 频率限制 | 未检测到 | 但建议控制请求频率 |
| User-Agent 检测 | 无 | 标准 UA 即可 |
| IP 封禁 | 未发现 | 无明显 IP 限制 |
| 数据加密 | 无 | 明文 JSON 返回 |

**建议**：
- 请求间隔保持 **0.3~0.5秒**，避免给服务器造成压力
- 设置合理的 `timeout`（建议 15 秒）
- 图片下载失败时自动重试 3 次
- 虽然无反爬机制，但仍建议添加随机 User-Agent 和请求头

### 2.4 数据清洗与标准化

#### 字段统一格式规则

由于 lkval.com 的数据模型较为简洁，部分字段（蓄力、反弹、评分、热度）在原始数据中不存在，需要通过标题关键词推断或标注为"未标注"。

| 字段 | 原始来源 | 标准化规则 | 可选值 |
|------|---------|-----------|--------|
| **点位名称** | `lineup_title` | 直接使用原文 | 如"A包点探测箭" |
| **箭类型** | `ability` 编号 | 映射为中文+键位 | C-无人机 / Q-雷击箭 / X-狂猎之怒 / E-寻敌箭 |
| **所属地图** | `map_name` | 映射为中文+英文 | 隐士修所(Haven) / 源工重镇(Bind) / 亚海悬城(Ascent) |
| **攻防方** | 无直接字段 | 从标题关键词推断 | 进攻方 / 防守方 / 通用 |
| **站位** | `leaflet_params.startPoint` | 坐标 + 图片 | [x, y] 坐标 + 站位截图 |
| **瞄点** | `leaflet_params.endPoint` | 坐标 + 图片 | [x, y] 坐标 + 瞄点截图 |
| **蓄力** | 无直接字段 | 从标题推断 | 半格 / 一格 / 一格半 / 满格 / 未标注 |
| **反弹** | 无直接字段 | 从标题推断 | 0次（直射）/ 1次 / 2次 / 有反弹 |
| **覆盖区域** | `polygonList` | 判断是否为空 | 有 / 无 |
| **评分** | 无此字段 | 网站无评分系统 | - |
| **热度** | 无此字段 | 网站无热度字段 | - |

#### 攻防方推断规则

| 类别 | 关键词 |
|------|--------|
| 进攻方 | 进攻、开局、A大、B大、C大、入、打A、打B、打C、压制、前点、清、骗、远控、支援 |
| 防守方 | 防守、回防、防拆、断后、后点、守、防 |

---

## 三、全地图核心点位速查表

> 以下数据均从 lkval.com 实际爬取，包含站位图和瞄点图。点击"视频"链接可跳转至 B站教学视频。

### 3.1 隐士修所 (Haven)

共 59 个点位（数据来源：lkval.com 实际爬取）

#### 进攻方

| # | 点位名称 | 箭类型 | 站位 | 瞄点 | 蓄力 | 反弹 | 覆盖区域 | 教学视频 |
|---|---------|--------|------|------|------|------|---------|---------|
| 1 | 开局侦查A大的飞机 | C-无人机 | 见视频 | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1YvPYzGE1z) |
| 2 | 下包位箭 | Q-雷击箭 | ![](images/haven_2_330_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 3 | 下包位 | Q-雷击箭 | ![](images/haven_2_337_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 4 | 下包位 | Q-雷击箭 | ![](images/haven_2_338_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 5 | 清C点拌线 | Q-雷击箭 | ![](images/haven_2_760_detail_0.webp) | ![](images/haven_2_760_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1o3ggerEir) |
| 6 | 清B点拌线 | Q-雷击箭 | ![](images/haven_2_761_detail_0.webp) | ![](images/haven_2_761_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1o3ggerEir) |
| 7 | 清A点拌线 | Q-雷击箭 | ![](images/haven_2_762_detail_0.webp) | ![](images/haven_2_762_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1o3ggerEir) |
| 8 | 清理C点断后拌线 | Q-雷击箭 | ![](images/haven_2_895_detail_0.webp) | ![](images/haven_2_895_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1G9WpezEfn) |
| 9 | 清理A点断后拌线 | Q-雷击箭 | ![](images/haven_2_896_detail_0.webp) | ![](images/haven_2_896_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1G9WpezEfn) |
| 10 | C大包 防拆雷击箭 | Q-雷击箭 | ![](images/haven_2_1087_detail_0.webp) | ![](images/haven_2_1087_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1TT421Y73Q) |
| 11 | A大压制雷击箭② | Q-雷击箭 | ![](images/haven_2_1091_detail_0.webp) | ![](images/haven_2_1091_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1XS421R7kj) |
| 12 | A大压制雷击箭① | Q-雷击箭 | ![](images/haven_2_1092_detail_0.webp) | ![](images/haven_2_1092_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1XS421R7kj) |
| 13 | A大秒杀箭 | X-狂猎之怒 | ![](images/haven_3_324_detail_0.webp) | ![](images/haven_3_324_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 14 | 入口右侧秒杀箭 | X-狂猎之怒 | ![](images/haven_3_325_detail_0.webp) | ![](images/haven_3_325_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 15 | 包点后秒杀箭 | X-狂猎之怒 | ![](images/haven_3_326_detail_0.webp) | ![](images/haven_3_326_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 16 | 包点后右侧秒杀箭 | X-狂猎之怒 | ![](images/haven_3_327_detail_0.webp) | ![](images/haven_3_327_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 17 | 开局秒杀箭 | X-狂猎之怒 | ![](images/haven_3_329_detail_0.webp) | ![](images/haven_3_329_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 18 | B下包位 | X-狂猎之怒 | ![](images/haven_3_336_detail_0.webp) | ![](images/haven_3_336_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 19 | 开局C点箭 | X-狂猎之怒 | ![](images/haven_3_339_detail_0.webp) | ![](images/haven_3_339_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 20 | 点后箭 | X-狂猎之怒 | ![](images/haven_3_340_detail_0.webp) | ![](images/haven_3_340_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 21 | 点后箭 | X-狂猎之怒 | ![](images/haven_3_341_detail_0.webp) | ![](images/haven_3_341_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 22 | 吃球位箭 | X-狂猎之怒 | ![](images/haven_3_343_detail_0.webp) | ![](images/haven_3_343_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 23 | 抽奖箭 | X-狂猎之怒 | ![](images/haven_3_344_detail_0.webp) | ![](images/haven_3_344_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 24 | 下包位箭 | X-狂猎之怒 | ![](images/haven_3_345_detail_0.webp) | ![](images/haven_3_345_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 25 | 防守A大探测箭 | E-寻敌箭 | ![](images/haven_4_16_detail_0.webp) | ![](images/haven_4_16_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 26 | A大探测箭 | E-寻敌箭 | ![](images/haven_4_356_detail_0.webp) | ![](images/haven_4_356_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Vk4y1e7q1) |
| 27 | A点支援C点 | E-寻敌箭 | ![](images/haven_4_844_detail_0.webp) | ![](images/haven_4_844_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 28 | A大探测箭(速度快 容错稍低) | E-寻敌箭 | ![](images/haven_4_1085_detail_0.webp) | ![](images/haven_4_1085_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 29 | A包点探测箭 | E-寻敌箭 | ![](images/haven_4_5_detail_0.webp) | ![](images/haven_4_5_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 30 | A小探测箭 | E-寻敌箭 | ![](images/haven_4_6_detail_0.webp) | ![](images/haven_4_6_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 31 | B包点探测箭 | E-寻敌箭 | ![](images/haven_4_9_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 32 | b包点门探测箭 | E-寻敌箭 | ![](images/haven_4_10_detail_0.webp) | ![](images/haven_4_10_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 33 | C包点探测箭 | E-寻敌箭 | ![](images/haven_4_12_detail_0.webp) | ![](images/haven_4_12_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 34 | B点探测A外 | E-寻敌箭 | ![](images/haven_4_18_detail_0.webp) | ![](images/haven_4_18_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 35 | 车库外探测箭 | E-寻敌箭 | ![](images/haven_4_21_detail_0.webp) | ![](images/haven_4_21_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 36 | 车库内探测箭 | E-寻敌箭 | ![](images/haven_4_22_detail_0.webp) | ![](images/haven_4_22_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 37 | A点探测箭 | E-寻敌箭 | ![](images/haven_4_141_detail_0.webp) | ![](images/haven_4_141_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1Qo4y1t7R7) |
| 38 | 车库信息箭 | E-寻敌箭 | ![](images/haven_4_346_detail_0.webp) | ![](images/haven_4_346_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 39 | A包点探测箭 | E-寻敌箭 | ![](images/haven_4_355_detail_0.webp) | ![](images/haven_4_355_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Fg4y1u7bm) |
| 40 | 中路外探测箭 | E-寻敌箭 | ![](images/haven_4_357_detail_0.webp) | ![](images/haven_4_357_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Vk4y1e7q1) |
| 41 | 窗口探测箭 | E-寻敌箭 | ![](images/haven_4_358_detail_0.webp) | ![](images/haven_4_358_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Vk4y1e7q1) |
| 42 | A外探测箭 | E-寻敌箭 | ![](images/haven_4_845_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 43 | A小门框探测箭 | E-寻敌箭 | ![](images/haven_4_1086_detail_0.webp) | ![](images/haven_4_1086_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 44 | 落点在A入口 | E-寻敌箭 | ![](images/haven_4_1084_detail_0.webp) | ![](images/haven_4_1084_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Qo4y1t7R7) |
| 45 | 可探测整个角落 | E-寻敌箭 | ![](images/haven_4_1136_detail_0.webp) | ![](images/haven_4_1136_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Qo4y1t7R7) |
| 46 | A大探测箭 | E-寻敌箭 | ![](images/haven_4_1979_detail_0.webp) | ![](images/haven_4_1979_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1vcPjzhEko) |
| 47 | A小探测箭 | E-寻敌箭 | ![](images/haven_4_8_detail_0.webp) | ![](images/haven_4_8_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1vcPjzhEko) |
| 48 | C包点探测箭 | E-寻敌箭 | ![](images/haven_4_13_detail_0.webp) | ![](images/haven_4_13_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 49 | C包点探测箭 | E-寻敌箭 | ![](images/haven_4_14_detail_0.webp) | ![](images/haven_4_14_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 50 | C包点探测箭 | E-寻敌箭 | ![](images/haven_4_15_detail_0.webp) | ![](images/haven_4_15_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 51 | B点探测A外 | E-寻敌箭 | ![](images/haven_4_19_detail_0.webp) | ![](images/haven_4_19_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |

#### 防守方

| # | 点位名称 | 箭类型 | 站位 | 瞄点 | 蓄力 | 反弹 | 覆盖区域 | 教学视频 |
|---|---------|--------|------|------|------|------|---------|---------|
| 1 | 防拆包秒杀箭 | X-狂猎之怒 | ![](images/haven_3_328_detail_0.webp) | ![](images/haven_3_328_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 2 | 回防下包位箭 | X-狂猎之怒 | ![](images/haven_3_334_detail_0.webp) | ![](images/haven_3_334_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 3 | 回防下包位箭 | X-狂猎之怒 | 见视频 | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 4 | 防拆包箭 | X-狂猎之怒 | ![](images/haven_3_342_detail_0.webp) | ![](images/haven_3_342_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 5 | 防守C点探测箭 | E-寻敌箭 | ![](images/haven_4_23_detail_0.webp) | ![](images/haven_4_23_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1724y1A7xz) |
| 6 | 回防信息箭 | E-寻敌箭 | 见视频 | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ad4y1A7dp) |
| 7 | 无敌回防探测箭 | E-寻敌箭 | ![](images/haven_4_935_detail_0.webp) | ![](images/haven_4_935_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Vy411i7Z3) |
| 8 | 防rush探测箭 | E-寻敌箭 | ![](images/haven_4_2038_detail_0.webp) | ![](images/haven_4_2038_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1hsXnB3EQn) |

---

### 3.2 源工重镇 (Bind)

共 18 个点位（数据来源：lkval.com 实际爬取）

> Bind 地图的猎枭点位全部为 E-寻敌箭，这是因为 Bind 的传送门机制使得侦测箭的价值极高。

#### 进攻方

| # | 点位名称 | 箭类型 | 站位 | 瞄点 | 蓄力 | 反弹 | 覆盖区域 | 教学视频 |
|---|---------|--------|------|------|------|------|---------|---------|
| 1 | B支援A | E-寻敌箭 | ![](images/bind_4_558_detail_0.webp) | ![](images/bind_4_558_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |
| 2 | 进攻B长探测箭 | E-寻敌箭 | ![](images/bind_4_563_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |
| 3 | 传送门箭 实用性不高 | E-寻敌箭 | 见视频 | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |
| 4 | 传送门箭 | E-寻敌箭 | ![](images/bind_4_551_detail_0.webp) | ![](images/bind_4_551_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |
| 5 | 包点箭 | E-寻敌箭 | ![](images/bind_4_555_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |
| 6 | B包点探测神箭 | E-寻敌箭 | ![](images/bind_4_564_detail_0.webp) | ![](images/bind_4_564_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |
| 7 | A包点探测神箭 | E-寻敌箭 | ![](images/bind_4_565_detail_0.webp) | ![](images/bind_4_565_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |
| 8 | A包点探测箭 适合新手 | E-寻敌箭 | ![](images/bind_4_566_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |
| 9 | 浴室探测神箭 | E-寻敌箭 | ![](images/bind_4_567_detail_0.webp) | ![](images/bind_4_567_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |
| 10 | 浴室探测箭 适合新手 | E-寻敌箭 | ![](images/bind_4_568_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |

#### 防守方

| # | 点位名称 | 箭类型 | 站位 | 瞄点 | 蓄力 | 反弹 | 覆盖区域 | 教学视频 |
|---|---------|--------|------|------|------|------|---------|---------|
| 1 | 回防B包点神箭 | E-寻敌箭 | ![](images/bind_4_553_detail_0.webp) | ![](images/bind_4_553_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |
| 2 | 防守B包点 | E-寻敌箭 | ![](images/bind_4_554_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |
| 3 | 防守B长适合新手 | E-寻敌箭 | ![](images/bind_4_556_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |
| 4 | 防守中路 | E-寻敌箭 | ![](images/bind_4_557_detail_0.webp) | ![](images/bind_4_557_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |
| 5 | 防守A点箭 | E-寻敌箭 | ![](images/bind_4_559_detail_0.webp) | ![](images/bind_4_559_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |
| 6 | 防守A点箭 适合新手 | E-寻敌箭 | ![](images/bind_4_560_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |
| 7 | 防守浴室神箭 | E-寻敌箭 | ![](images/bind_4_561_detail_0.webp) | ![](images/bind_4_561_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |
| 8 | 防守浴室探测箭 | E-寻敌箭 | ![](images/bind_4_562_detail_0.webp) | ![](images/bind_4_562_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV17M4y1E7Jj) |

---

### 3.3 亚海悬城 (Ascent)

共 78 个点位（数据来源：lkval.com 实际爬取）

#### 进攻方

| # | 点位名称 | 箭类型 | 站位 | 瞄点 | 蓄力 | 反弹 | 覆盖区域 | 教学视频 |
|---|---------|--------|------|------|------|------|---------|---------|
| 1 | 电B小开飞机的位置 | Q-雷击箭 | ![](images/ascent_2_642_detail_0.webp) | ![](images/ascent_2_642_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 2 | 电B外道具 | Q-雷击箭 | ![](images/ascent_2_643_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 3 | 二楼下电箭 | Q-雷击箭 | ![](images/ascent_2_650_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 4 | 常规包位电箭 | Q-雷击箭 | ![](images/ascent_2_651_detail_0.webp) | ![](images/ascent_2_651_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 5 | 清A门口拌线 | Q-雷击箭 | ![](images/ascent_2_662_detail_0.webp) | ![](images/ascent_2_662_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1ZJ4m1c7Bp) |
| 6 | 清B门口绊线 | Q-雷击箭 | ![](images/ascent_2_663_detail_0.webp) | ![](images/ascent_2_663_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV13M4m1k7pf) |
| 7 | 清中路道具 | Q-雷击箭 | ![](images/ascent_2_667_detail_0.webp) | ![](images/ascent_2_667_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1ZLvveGEr5) |
| 8 | 清理中路道具 | Q-雷击箭 | ![](images/ascent_2_668_detail_0.webp) | ![](images/ascent_2_668_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 9 | 清中路道具 | Q-雷击箭 | ![](images/ascent_2_669_detail_0.webp) | ![](images/ascent_2_669_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1ZLvveGEr5) |
| 10 | 中路反绊线电箭 | Q-雷击箭 | ![](images/ascent_2_902_detail_0.webp) | ![](images/ascent_2_902_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1yH4y1n7Ai) |
| 11 | 清保安绊线 | Q-雷击箭 | ![](images/ascent_2_905_detail_0.webp) | ![](images/ascent_2_905_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Ez4y1A7yn) |
| 12 | 铁箱包雷击箭 | Q-雷击箭 | ![](images/ascent_2_933_detail_0.webp) | ![](images/ascent_2_933_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1SW421R7AS) |
| 13 | A前顶秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_115_detail_0.webp) | ![](images/ascent_3_115_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV11k4y1e7Ra) |
| 14 | 双箱秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_116_detail_0.webp) | ![](images/ascent_3_116_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV11k4y1e7Ra) |
| 15 | 铁箱秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_117_detail_0.webp) | ![](images/ascent_3_117_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV11k4y1e7Ra) |
| 16 | 二楼架点位秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_118_detail_0.webp) | ![](images/ascent_3_118_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV11k4y1e7Ra) |
| 17 | A小秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_119_detail_0.webp) | ![](images/ascent_3_119_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV11k4y1e7Ra) |
| 18 | A小秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_120_detail_0.webp) | ![](images/ascent_3_120_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Y84y1u74Z) |
| 19 | 中路市场秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_121_detail_0.webp) | ![](images/ascent_3_121_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Y84y1u74Z) |
| 20 | 台阶秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_123_detail_0.webp) | ![](images/ascent_3_123_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Y84y1u74Z) |
| 21 | 奥丁位秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_124_detail_0.webp) | ![](images/ascent_3_124_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Y84y1u74Z) |
| 22 | 市场下老六位 | X-狂猎之怒 | ![](images/ascent_3_125_detail_0.webp) | ![](images/ascent_3_125_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Y84y1u74Z) |
| 23 | 警家常架位秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_126_detail_0.webp) | ![](images/ascent_3_126_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Y84y1u74Z) |
| 24 | B门对枪位秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_127_detail_0.webp) | ![](images/ascent_3_127_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Tk4y1v75P) |
| 25 | 中远对枪位秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_128_detail_0.webp) | ![](images/ascent_3_128_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Tk4y1v75P) |
| 26 | A大门秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_130_detail_0.webp) | ![](images/ascent_3_130_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Tk4y1v75P) |
| 27 | 常规包点秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_131_detail_0.webp) | ![](images/ascent_3_131_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Tk4y1v75P) |
| 28 | 双箱秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_132_detail_0.webp) | ![](images/ascent_3_132_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Tk4y1v75P) |
| 29 | B门对枪位秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_134_detail_0.webp) | ![](images/ascent_3_134_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1124y157Yc) |
| 30 | A大门秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_135_detail_0.webp) | ![](images/ascent_3_135_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1124y157Yc) |
| 31 | B吸球点秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_138_detail_0.webp) | ![](images/ascent_3_138_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1124y157Yc) |
| 32 | 三箱秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_139_detail_0.webp) | ![](images/ascent_3_139_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1124y157Yc) |
| 33 | 三箱秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_140_detail_0.webp) | ![](images/ascent_3_140_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1124y157Yc) |
| 34 | A大入口秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_934_detail_0.webp) | ![](images/ascent_3_934_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Tk4y1v75P) |
| 35 | B入口秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_1120_detail_0.webp) | ![](images/ascent_3_1120_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1124y157Yc) |
| 36 | B入口秒杀箭 | X-狂猎之怒 | 见视频 | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1124y157Yc) |
| 37 | 中路进攻侦察箭 | E-寻敌箭 | ![](images/ascent_4_187_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV16e411M7bb) |
| 38 | A大探测箭 | E-寻敌箭 | ![](images/ascent_4_193_detail_0.webp) | ![](images/ascent_4_193_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1uX4y1C7fh) |
| 39 | A大探测箭 | E-寻敌箭 | ![](images/ascent_4_194_detail_0.webp) | ![](images/ascent_4_194_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1uX4y1C7fh) |
| 40 | 中远控中路 | E-寻敌箭 | ![](images/ascent_4_629_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 41 | 在B支援A | E-寻敌箭 | ![](images/ascent_4_645_detail_0.webp) | ![](images/ascent_4_645_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 42 | 可探酒窖的前点箭 | E-寻敌箭 | ![](images/ascent_4_647_detail_0.webp) | ![](images/ascent_4_647_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 43 | 市场进攻探测箭 | E-寻敌箭 | ![](images/ascent_4_670_detail_0.webp) | ![](images/ascent_4_670_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1fVvveCEav) |
| 44 | 打B骗A的箭(不推荐) | E-寻敌箭 | ![](images/ascent_4_849_detail_0.webp) | ![](images/ascent_4_849_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 45 | 骗B真A的箭 | E-寻敌箭 | ![](images/ascent_4_851_detail_0.webp) | ![](images/ascent_4_851_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 46 | A大远程探测箭(可探酒窖) | E-寻敌箭 | ![](images/ascent_4_900_detail_0.webp) | ![](images/ascent_4_900_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1mE4m1R7Zd) |
| 47 | A大刁钻探测箭(容错低) | E-寻敌箭 | ![](images/ascent_4_901_detail_0.webp) | ![](images/ascent_4_901_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1tT421v7kq) |
| 48 | A前点箭(配合大招使用) | E-寻敌箭 | ![](images/ascent_4_1135_detail_0.webp) | ![](images/ascent_4_1135_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 49 | B链侦察箭 | E-寻敌箭 | ![](images/ascent_4_185_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV16e411M7bb) |
| 50 | A点内探测箭 | E-寻敌箭 | ![](images/ascent_4_189_detail_0.webp) | ![](images/ascent_4_189_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1uX4y1C7fh) |
| 51 | A小探测箭 | E-寻敌箭 | ![](images/ascent_4_192_detail_0.webp) | ![](images/ascent_4_192_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1uX4y1C7fh) |
| 52 | 树位探测箭 | E-寻敌箭 | ![](images/ascent_4_199_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1uX4y1C7fh) |
| 53 | B点探测箭 | E-寻敌箭 | ![](images/ascent_4_200_detail_0.webp) | ![](images/ascent_4_200_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1uX4y1C7fh) |
| 54 | A外侦察箭 | E-寻敌箭 | ![](images/ascent_4_248_detail_0.webp) | ![](images/ascent_4_248_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV1Tz4y1q7a6) |
| 55 | 中路探测箭 | E-寻敌箭 | ![](images/ascent_4_348_detail_0.webp) | ![](images/ascent_4_348_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Tz4y1q7a6) |
| 56 | B外探测箭 | E-寻敌箭 | ![](images/ascent_4_350_detail_0.webp) | ![](images/ascent_4_350_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Tz4y1q7a6) |
| 57 | 包点箭 | E-寻敌箭 | ![](images/ascent_4_631_detail_0.webp) | ![](images/ascent_4_631_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 58 | 包点箭 | E-寻敌箭 | ![](images/ascent_4_632_detail_0.webp) | ![](images/ascent_4_632_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 59 | A小探测箭 | E-寻敌箭 | ![](images/ascent_4_633_detail_0.webp) | ![](images/ascent_4_633_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 60 | 中路探测箭 | E-寻敌箭 | ![](images/ascent_4_635_detail_0.webp) | ![](images/ascent_4_635_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 61 | B点探测箭 | E-寻敌箭 | ![](images/ascent_4_636_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 62 | B点探测箭 | E-寻敌箭 | ![](images/ascent_4_637_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 63 | A点探测箭(飞行轨迹隐蔽) | E-寻敌箭 | ![](images/ascent_4_653_detail_0.webp) | ![](images/ascent_4_653_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Qr421W7Ap) |
| 64 | A点探测箭 | E-寻敌箭 | ![](images/ascent_4_850_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1uX4y1C7fh) |
| 65 | 100T eeiu藏树箭(反制上A小) | E-寻敌箭 | ![](images/ascent_4_883_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV13s42137yo) |
| 66 | B探测箭 | E-寻敌箭 | ![](images/ascent_4_354_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1wW4y1R7ct) |
| 67 | 中路探测箭 | E-寻敌箭 | ![](images/ascent_4_349_detail_0.webp) | ![](images/ascent_4_349_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Tz4y1q7a6) |
| 68 | B链侦察箭 | E-寻敌箭 | ![](images/ascent_4_186_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV16e411M7bb) |
| 69 | A大探测箭 | E-寻敌箭 | ![](images/ascent_4_144_detail_0.webp) | ![](images/ascent_4_144_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV16e411M7bb) |

#### 防守方

| # | 点位名称 | 箭类型 | 站位 | 瞄点 | 蓄力 | 反弹 | 覆盖区域 | 教学视频 |
|---|---------|--------|------|------|------|------|---------|---------|
| 1 | 回防三箱秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_133_detail_0.webp) | ![](images/ascent_3_133_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Tk4y1v75P) |
| 2 | 回防秒杀箭 | X-狂猎之怒 | ![](images/ascent_3_648_detail_0.webp) | ![](images/ascent_3_648_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 3 | B防守侦察箭 | E-寻敌箭 | ![](images/ascent_4_144_detail_0.webp) | ![](images/ascent_4_144_detail_1.webp) | 未标注 | 0次（直射） | 有 | [视频](https://www.bilibili.com/video/BV16e411M7bb) |
| 4 | 防守探测箭 | E-寻敌箭 | ![](images/ascent_4_640_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 5 | 防守探测箭 | E-寻敌箭 | ![](images/ascent_4_641_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 6 | 回防探测箭 | E-寻敌箭 | ![](images/ascent_4_652_detail_0.webp) | ![](images/ascent_4_652_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 7 | 回防A探测箭 | E-寻敌箭 | ![](images/ascent_4_848_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1rN411G7KZ) |
| 8 | 回防 探测二楼下 | E-寻敌箭 | ![](images/ascent_4_1081_detail_0.webp) | 见视频 | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1uX4y1C7fh) |
| 9 | 防守侦察箭 | E-寻敌箭 | ![](images/ascent_4_1082_detail_0.webp) | ![](images/ascent_4_1082_detail_1.webp) | 未标注 | 0次（直射） | 无 | [视频](https://www.bilibili.com/video/BV1Jc41137EZ) |

---

## 四、快速上手与练习建议

### 4.1 新手点位优先级排序

#### 地图优先级（从高到低）

| 优先级 | 地图 | 理由 |
|--------|------|------|
| ★★★★★ | **隐士修所 (Haven)** | 三包点地图，猎枭最强图。三个包点均可从外部侦测，信息价值极高 |
| ★★★★☆ | **亚海悬城 (Ascent)** | 开阔地图，寻敌箭覆盖面广。中路控制是关键 |
| ★★★☆☆ | **源工重镇 (Bind)** | 传送门机制使寻敌箭价值翻倍，但点位较少且以寻敌箭为主 |

#### 箭类型优先级（从高到低）

| 优先级 | 技能 | 学习理由 |
|--------|------|---------|
| ★★★★★ | **E - 寻敌箭 (Recon Bolt)** | 猎枭核心技能（招牌技能），提供团队视野信息。新手最应优先掌握 |
| ★★★★☆ | **X - 狂猎之怒 (Hunter's Fury)** | 穿墙伤害，清点/击杀利器。容错率较高 |
| ★★★☆☆ | **Q - 雷击箭 (Shock Bolt)** | 清除绊线/道具，辅助进攻。实用但非核心 |
| ★★☆☆☆ | **C - 无人机 (Owl Drone)** | 侦察无人机，操作简单但容易被击落 |

### 4.2 三张核心地图点位记忆口诀

#### 隐士修所 (Haven)

```
Haven 三点要记牢：
A大探测最重要，包点门框不能少
B点车库内外扫，C点断后清绊线
开局秒杀练手感，回防防拆保炸弹
```

**核心记忆点**：
- **进攻**：A大探测箭 → A包点探测箭 → C包点探测箭（三包点全覆盖）
- **防守**：防拆包秒杀箭 → 回防探测箭 → 防rush探测箭
- **清线**：清A/B/C点绊线（E箭，开局必学）

#### 源工重镇 (Bind)

```
Bind 传门是关键：
A包神箭新手练，浴室探测防偷人
B长进攻先侦察，回防包点定乾坤
```

**核心记忆点**：
- **进攻**：A包点探测箭（新手友好）→ B包点探测神箭 → 浴室探测箭
- **防守**：防守A点箭 → 防守浴室神箭 → 回防B包点神箭
- **特色**：传送门箭（利用传送门机制跨区域侦测）

#### 亚海悬城 (Ascent)

```
Ascent 中路是王道：
A大探测看酒窖，B点包点要记牢
市场秒杀清老六，中路控制不能少
```

**核心记忆点**：
- **进攻**：A大探测箭 → A点内探测箭 → B点探测箭 → 中路探测箭
- **秒杀**：双箱秒杀箭 → A小秒杀箭 → 常规包点秒杀箭
- **防守**：回防探测箭 → 回防三箱秒杀箭 → B防守侦察箭

### 4.3 自定义模式练习方法

#### 第一阶段：基础站位记忆（1-2天）

1. **进入自定义模式**：选择目标地图，设置为无Bot/无敌人
2. **打开本指南的点位表**：对照站位图和瞄点图
3. **逐个练习**：每个点位练习 5-10 次，直到能不看图片盲放
4. **建议顺序**：
   - Day 1：Haven 的 A包点探测箭 × 3 + B包点探测箭 × 2
   - Day 2：Haven 的 C包点探测箭 × 3 + Ascent 的 A大探测箭 × 3

#### 第二阶段：实战模拟（3-5天）

1. **加入Bot**：设置简单Bot，练习在压力下放箭
2. **计时练习**：每个点位在 3 秒内完成站位+放箭
3. **组合练习**：模拟实战回合流程：
   - 开局 → 放置寻敌箭获取信息 → 根据信息选择进攻方向
   - 进攻前 → 雷击箭清绊线 → 寻敌箭扫包点 → 狂猎之怒清人

#### 第三阶段：实战应用（持续）

1. **排位中主动使用**：每局至少使用 2-3 个点位
2. **录像回看**：分析自己放箭的时机和位置是否合理
3. **关注职业比赛**：学习职业选手的猎枭使用时机和点位选择
4. **持续更新**：关注 lkval.com 的新增点位，定期更新点位库

#### 练习检查清单

- [ ] Haven A包点探测箭（至少掌握 2 个不同站位）
- [ ] Haven B包点探测箭
- [ ] Haven C包点探测箭（至少掌握 2 个不同站位）
- [ ] Haven 清A/B/C点绊线（E箭）
- [ ] Bind A包点探测箭（新手版）
- [ ] Bind 浴室探测箭
- [ ] Ascent A大探测箭
- [ ] Ascent B点探测箭
- [ ] Ascent 中路探测箭
- [ ] 至少掌握 3 个狂猎之怒秒杀点位

---

## 附录

### A. 爬取数据统计

| 地图 | C-无人机 | Q-雷击箭 | X-狂猎之怒 | E-寻敌箭 | 合计 |
|------|---------|---------|-----------|---------|------|
| 隐士修所(Haven) | 1 | 11 | 16 | 31 | **59** |
| 源工重镇(Bind) | 0 | 0 | 0 | 18 | **18** |
| 亚海悬城(Ascent) | 0 | 12 | 26 | 40 | **78** |
| **合计** | **1** | **23** | **42** | **89** | **155** |

### B. 文件清单

| 文件 | 说明 |
|------|------|
| `sova_lineup_guide.md` | 本指南文档 |
| `scraper.py` | 完整爬虫代码 |
| `data/sova_lineups_raw.json` | 原始爬取数据（155条） |
| `data/sova_lineups_cleaned.json` | 清洗后数据（含攻防方推断） |
| `images/` | 点位图片目录（200+ 张站位图/瞄点图） |

### C. 参考链接

- [LKVAL 猎枭点位页](https://lkval.com/)（选择 Sova 查看）
- [点位详情页示例](https://lkval.com/discuss/5)
- [API 接口测试](https://lkval.com/api/blogs/get_lineup_list?game=val&userSelect=%7B%22val%22%3A%7B%22map%22%3A%22haven%22%2C%22agent%22%3A%22sova%22%2C%22ability%22%3A4%2C%22side%22%3A0%7D%7D)
