# Valorant Tactics 爬虫脚本

## 文件说明

| 脚本 | 数据源 | 功能 |
|------|--------|------|
| `isoox_scraper.py` | val.isoox.cn | 全量爬虫 - 爬取单个特工（猎枭）全地图点位数据，含详情页步骤 |
| `isoox_batch_scraper.py` | val.isoox.cn | 批量爬虫 - 遍历所有特工，爬取全地图全技能点位 |
| `lkval_scraper.py` | lkval.com | 猎枭全地图点位数据爬虫（老数据源，带 API） |
| `transform.py` | 本地 JSON | 数据转换脚本 - 将原始数据转换为按地图分组的结构化 JSON |

## 数据流向

```
val.isoox.cn / lkval.com → 原始 JSON → transform.py → 结构化 JSON → 前端加载
```

## 使用方式

```bash
# 需要 Python 3.8+ 和依赖
pip install requests beautifulsoup4

# 爬取单个特工
python isoox_scraper.py

# 批量爬取所有特工
python isoox_batch_scraper.py

# 转换数据格式
python transform.py
```

## 输出目录

爬取的数据保存在 `lineups/data2/` 目录下：
- `isoox_raw_{agent}.json` - 原始列表数据
- `isoox_raw_{agent}_with_details.json` - 含详情页数据
- `isoox_structured_{agent}.json` - 结构化数据（前端使用）
