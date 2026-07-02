"""
val.isoox.cn 全特工批量爬虫 v3
- 遍历所有有数据的特工，爬取全地图全技能点位
- 按特工分类存储到 data2/ 文件夹
- 支持断点续爬（跳过已完成的特工）
- 命名规则: isoox_raw_{agent_key}.json / isoox_structured_{agent_key}.json
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time
import os
import sys
from datetime import datetime
from collections import defaultdict

sys.stdout.reconfigure(line_buffering=True)

# ============ 配置 ============
BASE_URL = "https://val.isoox.cn"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "lineups", "data2")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Connection": "keep-alive",
}

REQUEST_DELAY = 1.5
MAX_RETRIES = 3

MAPS = {
    1: {"id": "ascent", "cn": "亚海悬城", "en": "Ascent"},
    2: {"id": "split", "cn": "霓虹町", "en": "Split"},
    3: {"id": "fracture", "cn": "裂变峡谷", "en": "Fracture"},
    4: {"id": "bind", "cn": "源工重镇", "en": "Bind"},
    5: {"id": "breeze", "cn": "微风岛屿", "en": "Breeze"},
    6: {"id": "abyss", "cn": "幽邃地窟", "en": "Abyss"},
    7: {"id": "lotus", "cn": "莲华古城", "en": "Lotus"},
    8: {"id": "sunset", "cn": "日落之城", "en": "Sunset"},
    9: {"id": "pearl", "cn": "深海明珠", "en": "Pearl"},
    10: {"id": "icebox", "cn": "森寒冬港", "en": "Icebox"},
}

# 特工英文名映射（用于文件命名）
AGENT_EN_NAMES = {
    1: "gekko", 2: "deadlock", 4: "lock", 8: "kayo",
    11: "sova", 13: "killjoy", 15: "vyse", 16: "viper",
    17: "phoenix", 20: "brimstone", 23: "neon", 24: "fade", 26: "sage",
}

# 有数据的特工列表（探测结果）
ACTIVE_AGENTS = {
    1: "盖可", 2: "黑梦", 4: "钢锁", 8: "K/O",
    11: "猎枭", 13: "奇乐", 15: "维斯", 16: "蝰蛇",
    17: "不死鸟", 20: "炼狱", 23: "霓虹", 24: "夜露", 26: "贤者",
}

SIDE_MAP = {1: "进攻", 2: "防守"}

# 攻防方推断关键词
ATTACK_KW = ["进攻", "开局", "抢", "下包", "进", "前压", "清理", "前点", "入",
             "打A", "打B", "打C", "压制", "远控", "支援", "骗"]
DEFEND_KW = ["防守", "回防", "防拆", "断后", "后点", "守", "防", "防rush"]


# ============ 工具函数 ============

def safe_request(url, params=None):
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(url, headers=HEADERS, params=params, timeout=15)
            resp.encoding = "utf-8"
            if resp.status_code == 200:
                return resp.text
            if resp.status_code == 429:
                wait = 10 * (attempt + 1)
                print(f"    [限流] 等待 {wait}s...")
                time.sleep(wait)
                continue
            return None
        except Exception as e:
            print(f"    [ERR] 尝试{attempt+1}: {e}")
            time.sleep(3)
    return None


def extract_rsc_records(html):
    pattern = r'self\.__next_f\.push\(\[1,"(.*?)"\]\)'
    matches = re.findall(pattern, html)
    if not matches:
        return []
    combined = ""
    for m in matches:
        decoded = m.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
        combined += decoded
    rec_start = combined.find('"records":[')
    if rec_start < 0:
        return []
    bracket_start = combined.index('[', rec_start)
    depth = 0
    for i in range(bracket_start, len(combined)):
        if combined[i] == '[': depth += 1
        elif combined[i] == ']':
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(combined[bracket_start:i+1])
                except json.JSONDecodeError:
                    return []
    return []


def extract_detail_steps(html):
    soup = BeautifulSoup(html, "html.parser")
    steps = []
    step_articles = soup.find_all("article", class_=re.compile(r"step$"))
    if not step_articles:
        step_indices = soup.find_all("span", class_=re.compile(r"stepIndex$"))
        step_articles = [si.find_parent("article") for si in step_indices if si.find_parent("article")]
    for article in step_articles:
        step = {"index": "", "text": "", "image_url": ""}
        idx = article.find("span", class_=re.compile(r"stepIndex$"))
        if idx: step["index"] = idx.get_text(strip=True)
        text_p = article.find("p", class_=re.compile(r"stepText$"))
        if text_p: step["text"] = text_p.get_text(strip=True)
        img = article.find("img", class_=re.compile(r"stepImage")) or article.find("img")
        if img: step["image_url"] = img.get("src") or img.get("data-src") or ""
        steps.append(step)
    return steps


def infer_side(title, side_name):
    if side_name == "进攻": return "attack", "进攻方"
    if side_name == "防守": return "defense", "防守方"
    for kw in ATTACK_KW:
        if kw in title: return "attack", "进攻方"
    for kw in DEFEND_KW:
        if kw in title: return "defense", "防守方"
    return "unknown", "通用"


# ============ 核心爬取 ============

def scrape_agent_lists(agent_id, agent_name):
    """爬取某个特工全地图列表"""
    all_lineups = []
    seen_ids = set()

    for map_id, map_info in MAPS.items():
        for side_id, side_name in SIDE_MAP.items():
            html = safe_request(BASE_URL + "/", params={"mapId": map_id, "agentId": agent_id, "side": side_id})
            if not html:
                continue
            records = extract_rsc_records(html)
            if not records:
                continue

            for item in records:
                pid = item.get("id")
                if not pid or pid in seen_ids:
                    continue
                seen_ids.add(pid)
                all_lineups.append({
                    "id": pid,
                    "title": item.get("title", ""),
                    "map_id": map_id, "map_cn": map_info["cn"], "map_en": map_info["en"],
                    "map_key": map_info["id"],
                    "agent_id": agent_id, "agent_name": agent_name,
                    "side_id": item.get("side", side_id), "side_name": item.get("sideName", side_name),
                    "ability_id": item.get("abilityId", ""), "ability_name": item.get("abilityName", ""),
                    "description": item.get("description", ""),
                    "cover_image": item.get("coverImage", ""),
                    "view_count": item.get("viewCount", 0), "fav_count": item.get("favCount", 0),
                    "rating_score": item.get("ratingScore", 0), "heat_score": item.get("heatScore", 0),
                    "tags": item.get("tags", []),
                    "source_url": f"{BASE_URL}/posts/{pid}",
                    "steps": [],
                })
            time.sleep(REQUEST_DELAY)

    return all_lineups


def scrape_details(lineups):
    """批量爬取详情页"""
    for i, lineup in enumerate(lineups):
        pid = lineup["id"]
        print(f"    [{i+1}/{len(lineups)}] {lineup['title']} (ID:{pid})")
        html = safe_request(f"{BASE_URL}/posts/{pid}")
        if html:
            lineup["steps"] = extract_detail_steps(html)
        time.sleep(REQUEST_DELAY)
    return lineups


def convert_to_structured(raw_data, agent_key, agent_cn):
    """转换为结构化格式"""
    grouped = defaultdict(lambda: defaultdict(list))
    for item in raw_data:
        grouped[item.get("map_key", "")][item.get("ability_id", 0)].append(item)

    maps = {}
    total = 0
    for map_key in sorted(grouped.keys()):
        first = list(grouped[map_key].values())[0]
        map_cn = first[0].get("map_cn", map_key) if first else map_key
        map_en = first[0].get("map_en", map_key) if first else map_key
        abilities = {}
        map_total = 0
        for ability_id in sorted(grouped[map_key].keys()):
            info = grouped[map_key][ability_id][0]
            lineups = []
            for item in grouped[map_key][ability_id]:
                side_en, side_cn = infer_side(item.get("title", ""), item.get("side_name", ""))
                detail_images = []
                cover = item.get("cover_image", "")
                if cover:
                    detail_images.append({"url": cover, "local": "", "label": "封面图"})
                for step in item.get("steps", []):
                    img_url = step.get("image_url", "")
                    if img_url:
                        label = step.get("text", "") or f"步骤{step.get('index', '')}"
                        detail_images.append({"url": img_url, "local": "", "label": label})
                lineups.append({
                    "id": item.get("id"),
                    "title": item.get("title", ""),
                    "description": item.get("description", ""),
                    "side": side_en, "side_cn": side_cn,
                    "coordinates": {"start": {"raw": None, "normalized": None}, "end": {"raw": None, "normalized": None}},
                    "coverage_area": [],
                    "media": {"stand_image": {"url": "", "local": ""}, "detail_images": detail_images,
                              "video": {"bilibili": "", "timestamp": "", "cut_video": ""}},
                    "steps": item.get("steps", []),
                    "view_count": item.get("view_count", 0), "fav_count": item.get("fav_count", 0),
                    "rating_score": item.get("rating_score", 0), "heat_score": item.get("heat_score", 0),
                    "created_at": "", "source_url": item.get("source_url", ""),
                })
            abilities[str(ability_id)] = {
                "key": "?", "name_cn": info.get("ability_name", "未知"), "name_en": "", "type": "",
                "lineups": lineups,
            }
            map_total += len(lineups)
        maps[map_key] = {"name_cn": map_cn, "name_en": map_en, "lineup_count": map_total, "abilities": abilities}
        total += map_total

    return {
        "metadata": {
            "agent": agent_key, "agent_cn": agent_cn, "source": "val.isoox.cn",
            "coordinate_system": {"type": "pixel", "width": 2000, "height": 2000, "normalized_range": [0, 1]},
            "last_updated": datetime.now().strftime("%Y-%m-%d"),
            "total_lineups": total, "maps_count": len(maps),
        },
        "maps": maps,
    }


# ============ 主函数 ============

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 检查已完成的特工（断点续爬）
    done_agents = set()
    for f in os.listdir(OUTPUT_DIR):
        if f.startswith("isoox_structured_") and f.endswith(".json"):
            agent_key = f.replace("isoox_structured_", "").replace(".json", "")
            done_agents.add(agent_key)
    print(f"已完成特工: {done_agents}")

    # 按ID排序，先爬数据量大的
    sorted_agents = sorted(ACTIVE_AGENTS.items(), key=lambda x: -(
        {1:4, 2:9, 4:4, 8:8, 11:12, 13:12, 15:1, 16:12, 17:2, 20:12, 23:2, 24:12, 26:12}.get(x[0], 0)
    ))

    total_all = 0
    agent_stats = []

    for agent_id, agent_name in sorted_agents:
        agent_key = AGENT_EN_NAMES.get(agent_id, f"agent_{agent_id}")

        # 跳过已完成
        if agent_key in done_agents:
            print(f"\n[SKIP] {agent_name}({agent_key}) - 已完成")
            # 读取已有统计
            struct_file = os.path.join(OUTPUT_DIR, f"isoox_structured_{agent_key}.json")
            if os.path.exists(struct_file):
                with open(struct_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                total_all += data["metadata"]["total_lineups"]
                agent_stats.append((agent_name, agent_key, data["metadata"]["total_lineups"], data["metadata"]["maps_count"]))
            continue

        print(f"\n{'='*60}")
        print(f"[AGENT] {agent_name} (ID:{agent_id}, key:{agent_key})")
        print(f"{'='*60}")

        # 阶段1: 列表
        print(f"  [1/3] 爬取列表...")
        raw = scrape_agent_lists(agent_id, agent_name)
        if not raw:
            print(f"  [SKIP] 无数据")
            continue
        print(f"  -> 列表: {len(raw)} 条")

        # 保存原始列表
        raw_file = os.path.join(OUTPUT_DIR, f"isoox_raw_{agent_key}.json")
        with open(raw_file, "w", encoding="utf-8") as f:
            json.dump(raw, f, ensure_ascii=False, indent=2)

        # 阶段2: 详情
        print(f"  [2/3] 爬取详情页 ({len(raw)} 条)...")
        raw = scrape_details(raw)

        # 保存含详情原始数据
        raw_detail_file = os.path.join(OUTPUT_DIR, f"isoox_raw_{agent_key}_with_details.json")
        with open(raw_detail_file, "w", encoding="utf-8") as f:
            json.dump(raw, f, ensure_ascii=False, indent=2)

        # 阶段3: 转换
        print(f"  [3/3] 转换结构化格式...")
        structured = convert_to_structured(raw, agent_key, agent_name)

        struct_file = os.path.join(OUTPUT_DIR, f"isoox_structured_{agent_key}.json")
        with open(struct_file, "w", encoding="utf-8") as f:
            json.dump(structured, f, ensure_ascii=False, indent=2)

        count = structured["metadata"]["total_lineups"]
        maps_count = structured["metadata"]["maps_count"]
        total_all += count
        agent_stats.append((agent_name, agent_key, count, maps_count))
        print(f"  -> 完成: {count} 个点位, {maps_count} 张地图")

    # ============ 总报告 ============
    print(f"\n{'='*60}")
    print(f"[REPORT] 全特工爬取总报告")
    print(f"{'='*60}")
    print(f"  特工数: {len(agent_stats)}")
    print(f"  总点位: {total_all}")
    print()
    for name, key, count, maps in agent_stats:
        print(f"  {name:6s} ({key:10s}): {count:4d} 个点位, {maps} 张地图")

    # 生成汇总索引
    index = {
        "source": "val.isoox.cn",
        "last_updated": datetime.now().strftime("%Y-%m-%d"),
        "total_agents": len(agent_stats),
        "total_lineups": total_all,
        "agents": [
            {"name_cn": name, "key": key, "lineup_count": count, "maps_count": maps}
            for name, key, count, maps in agent_stats
        ],
    }
    index_file = os.path.join(OUTPUT_DIR, "_index.json")
    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    print(f"\n[SAVE] 汇总索引: {index_file}")
    print(f"[DONE] 全部完成!")


if __name__ == "__main__":
    main()
