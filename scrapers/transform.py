"""
数据转换脚本：将原始爬取数据转换为按地图分组的结构化 JSON
输出格式便于前端按地图/技能筛选，也便于手动添加新点位
"""
import json
import os
from datetime import datetime
from collections import defaultdict

# ============ 配置 ============
INPUT_FILE = r"d:\WorkingSpace\sova-lineup\lineups\data\sova_lineups_raw.json"
OUTPUT_FILE = r"d:\WorkingSpace\sova-lineup\lineups\data\sova_lineups_structured.json"
IMG_CDN_BASE = "https://img.lkval.com/userupload"
IMG_LOCAL_BASE = "images"

# 技能映射
ABILITY_INFO = {
    1: {"key": "C", "name_cn": "无人机", "name_en": "Owl Drone", "type": "侦察"},
    2: {"key": "Q", "name_cn": "雷击箭", "name_en": "Shock Bolt", "type": "伤害"},
    3: {"key": "E", "name_cn": "寻敌箭", "name_en": "Recon Bolt", "type": "信息"},
    4: {"key": "X", "name_cn": "狂猎之怒", "name_en": "Hunter's Fury", "type": "大招"},
}

# 地图中英文名
MAP_NAMES = {
    "haven": {"cn": "隐士修所", "en": "Haven"},
    "bind": {"cn": "源工重镇", "en": "Bind"},
    "ascent": {"cn": "亚海悬城", "en": "Ascent"},
    "icebox": {"cn": "极寒冻土", "en": "Icebox"},
    "breeze": {"cn": "微风岛屿", "en": "Breeze"},
    "sunset": {"cn": "日落之城", "en": "Sunset"},
    "abyss": {"cn": "幽邃地窟", "en": "Abyss"},
    "lotus": {"cn": "莲华古城", "en": "Lotus"},
    "pearl": {"cn": "深海明珠", "en": "Pearl"},
    "corrode": {"cn": "盐海矿镇", "en": "Corrode"},
}

# 攻防方推断
ATTACK_KW = ["进攻", "开局", "抢", "下包", "进", "前压", "清理", "前点", "入", "打A", "打B", "打C", "压制", "远控", "支援", "骗"]
DEFEND_KW = ["防守", "回防", "防拆", "断后", "后点", "守", "防", "防rush"]

def infer_side(title):
    for kw in ATTACK_KW:
        if kw in title:
            return "attack", "进攻方"
    for kw in DEFEND_KW:
        if kw in title:
            return "defense", "防守方"
    return "unknown", "通用"

def normalize_coord(raw):
    """2000x2000 坐标归一化为 0-1"""
    if not raw or len(raw) < 2:
        return None
    return [round(raw[0] / 2000, 4), round(raw[1] / 2000, 4)]

def build_image_url(filename):
    if not filename:
        return ""
    return f"{IMG_CDN_BASE}/{filename}"

def transform_lineup(item):
    """转换单个点位"""
    ability_num = item.get("技能编号", 0)
    ability = ABILITY_INFO.get(ability_num, {})
    map_key = item.get("地图标识", "")
    side_en, side_cn = infer_side(item.get("点位名称", ""))

    start_raw = item.get("站位坐标", [])
    end_raw = item.get("瞄点坐标", [])

    # 站位图
    stand_img_file = item.get("站位图", "")
    stand_img_local = item.get("站位图本地", "")

    # 详情图片
    detail_img_files = item.get("详情图片", [])
    detail_img_locals = item.get("详情图本地", [])

    detail_images = []
    for i, (f, l) in enumerate(zip(detail_img_files, detail_img_locals)):
        detail_images.append({
            "url": build_image_url(f),
            "local": l,
            "label": "站位图" if i == 0 else "瞄点图" if i == 1 else f"补充图{i-1}"
        })

    return {
        "id": item.get("id"),
        "title": item.get("点位名称", ""),
        "side": side_en,
        "side_cn": side_cn,
        "coordinates": {
            "start": {
                "raw": start_raw if start_raw else None,
                "normalized": normalize_coord(start_raw)
            },
            "end": {
                "raw": end_raw if end_raw else None,
                "normalized": normalize_coord(end_raw)
            }
        },
        "coverage_area": item.get("覆盖区域", []),
        "media": {
            "stand_image": {
                "url": build_image_url(stand_img_file),
                "local": stand_img_local
            },
            "detail_images": detail_images,
            "video": {
                "bilibili": item.get("B站视频", ""),
                "timestamp": item.get("视频空降", ""),
                "cut_video": item.get("截取视频", "")
            }
        },
        "created_at": item.get("创建时间", ""),
        "source_url": f"https://lkval.com/discuss/{item.get('blog_id', '')}"
    }

def main():
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)

    print(f"读取原始数据: {len(raw_data)} 条")

    # 按 map -> ability 分组
    grouped = defaultdict(lambda: defaultdict(list))
    for item in raw_data:
        map_key = item.get("地图标识", "")
        ability_num = item.get("技能编号", 0)
        grouped[map_key][ability_num].append(item)

    # 构建结构化输出
    maps = {}
    total = 0

    for map_key in sorted(grouped.keys()):
        if map_key not in MAP_NAMES:
            print(f"  跳过未知地图: {map_key}")
            continue

        abilities = {}
        map_total = 0
        for ability_num in sorted(grouped[map_key].keys()):
            info = ABILITY_INFO.get(ability_num, {})
            lineups = [transform_lineup(item) for item in grouped[map_key][ability_num]]
            abilities[str(ability_num)] = {
                "key": info.get("key", "?"),
                "name_cn": info.get("name_cn", "未知"),
                "name_en": info.get("name_en", "Unknown"),
                "type": info.get("type", ""),
                "lineups": lineups
            }
            map_total += len(lineups)

        maps[map_key] = {
            "name_cn": MAP_NAMES[map_key]["cn"],
            "name_en": MAP_NAMES[map_key]["en"],
            "lineup_count": map_total,
            "abilities": abilities
        }
        total += map_total

    output = {
        "metadata": {
            "agent": "sova",
            "agent_cn": "猎枭",
            "source": "lkval.com",
            "coordinate_system": {
                "type": "pixel",
                "width": 2000,
                "height": 2000,
                "normalized_range": [0, 1]
            },
            "last_updated": datetime.now().strftime("%Y-%m-%d"),
            "total_lineups": total,
            "maps_count": len(maps)
        },
        "maps": maps
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n转换完成!")
    print(f"总计: {total} 个点位, {len(maps)} 张地图")
    print(f"输出: {OUTPUT_FILE}")

    # 统计
    print(f"\n各地图点位数:")
    for mk, mv in sorted(maps.items(), key=lambda x: -x[1]["lineup_count"]):
        print(f"  {mv['name_cn']}({mv['name_en']}): {mv['lineup_count']}")

if __name__ == "__main__":
    main()
