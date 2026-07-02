"""
val.isoox.cn 全量爬虫 v2
- 爬取全部特工、全部地图、全部技能的点位数据
- 输出原始数据（JSON）+ 结构化数据（兼容现有 sova.json 格式）
- 请求间隔 1.5s，模拟浏览器 UA
- 使用 RSC payload 提取列表数据，DOM 解析提取详情页步骤
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time
import os
import sys
from datetime import datetime
from collections import defaultdict, Counter

# 强制 unbuffered 输出
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

REQUEST_DELAY = 1.5  # 请求间隔（秒）
MAX_RETRIES = 3      # 最大重试次数

# ============ ID 映射表 ============
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

# 已知的特工列表（从站点分析获得，后续可通过首页动态获取）
KNOWN_AGENTS = {
    11: "猎枭",
}

# 猎枭技能映射
SOVA_ABILITIES = {
    41: {"key": "C", "cn": "枭型无人机", "en": "Owl Drone", "type": "侦察", "num": 1},
    42: {"key": "Q", "cn": "雷击箭", "en": "Shock Bolt", "type": "伤害", "num": 2},
    43: {"key": "E", "cn": "寻敌箭", "en": "Recon Bolt", "type": "信息", "num": 3},
    44: {"key": "X", "cn": "狂猎之怒", "en": "Hunter's Fury", "type": "大招", "num": 4},
}

SIDE_MAP = {1: "进攻", 2: "防守"}


# ============ 工具函数 ============

def safe_request(url, params=None):
    """安全请求，带重试"""
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(url, headers=HEADERS, params=params, timeout=15)
            resp.encoding = "utf-8"
            if resp.status_code == 200:
                return resp.text
            else:
                print(f"  [WARN] HTTP {resp.status_code}: {url}")
                if resp.status_code == 429:
                    wait = 10 * (attempt + 1)
                    print(f"  [WAIT] 触发限流，等待 {wait}s...")
                    time.sleep(wait)
                    continue
                return None
        except Exception as e:
            print(f"  [WARN] 请求异常 (尝试 {attempt+1}/{MAX_RETRIES}): {e}")
            time.sleep(3)
    return None


def extract_rsc_records(html):
    """
    从 Next.js RSC payload 中提取 postsPage.records 数组
    使用括号匹配确保完整提取 JSON 数组
    """
    pattern = r'self\.__next_f\.push\(\[1,"(.*?)"\]\)'
    matches = re.findall(pattern, html)
    if not matches:
        return []

    # 拼接所有 RSC 数据块
    combined = ""
    for m in matches:
        decoded = m.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
        combined += decoded

    # 查找 "records":[ 的位置
    rec_start = combined.find('"records":[')
    if rec_start < 0:
        return []

    # 使用括号匹配提取完整数组
    bracket_start = combined.index('[', rec_start)
    depth = 0
    bracket_end = bracket_start
    for i in range(bracket_start, len(combined)):
        if combined[i] == '[':
            depth += 1
        elif combined[i] == ']':
            depth -= 1
            if depth == 0:
                bracket_end = i + 1
                break

    try:
        records = json.loads(combined[bracket_start:bracket_end])
        return records
    except json.JSONDecodeError as e:
        print(f"  [WARN] JSON 解析失败: {e}")
        return []


def extract_detail_steps(html):
    """从详情页提取步骤数据（文字说明 + 图片URL）"""
    soup = BeautifulSoup(html, "html.parser")
    steps = []

    # 使用 CSS Modules 后缀匹配步骤容器
    step_articles = soup.find_all("article", class_=re.compile(r"step$"))
    if not step_articles:
        step_indices = soup.find_all("span", class_=re.compile(r"stepIndex$"))
        step_articles = [si.find_parent("article") for si in step_indices if si.find_parent("article")]

    for article in step_articles:
        step = {"index": "", "text": "", "image_url": ""}

        idx = article.find("span", class_=re.compile(r"stepIndex$"))
        if idx:
            step["index"] = idx.get_text(strip=True)

        text_p = article.find("p", class_=re.compile(r"stepText$"))
        if text_p:
            step["text"] = text_p.get_text(strip=True)

        img = article.find("img", class_=re.compile(r"stepImage"))
        if not img:
            img = article.find("img")
        if img:
            src = img.get("src") or img.get("data-src") or ""
            step["image_url"] = src

        steps.append(step)

    return steps


def extract_json_ld_article(html):
    """从 JSON-LD 中提取 Article 数据"""
    soup = BeautifulSoup(html, "html.parser")
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)
            items = data if isinstance(data, list) else [data]
            for item in items:
                if item.get("@type") == "Article":
                    return item
        except (json.JSONDecodeError, TypeError):
            continue
    return None


# ============ 核心爬取逻辑 ============

def scrape_list_page(map_id, agent_id, side=None):
    """爬取列表页，从 RSC payload 提取点位列表"""
    params = {"mapId": map_id, "agentId": agent_id}
    if side is not None:
        params["side"] = side

    html = safe_request(BASE_URL + "/", params=params)
    if not html:
        return []

    records = extract_rsc_records(html)
    if records:
        print(f"  [OK] RSC 提取到 {len(records)} 条点位")
    else:
        print(f"  [WARN] 未提取到数据")

    return records


def scrape_detail_page(post_id):
    """爬取详情页，获取步骤数据"""
    url = f"{BASE_URL}/posts/{post_id}"
    html = safe_request(url)
    if not html:
        return None

    result = {"id": post_id, "steps": []}

    # JSON-LD
    json_ld = extract_json_ld_article(html)
    if json_ld:
        result["headline"] = json_ld.get("headline", "")
        result["description"] = json_ld.get("description", "")
        result["about"] = json_ld.get("about", [])
        result["cover_images"] = json_ld.get("image", [])

    # 步骤
    result["steps"] = extract_detail_steps(html)

    return result


def discover_agents():
    """从首页发现所有可用特工"""
    print("\n[DISCOVER] 正在发现可用特工...")
    html = safe_request(BASE_URL + "/")
    if not html:
        return KNOWN_AGENTS

    # 从 RSC payload 中提取 agents 数据
    pattern = r'self\.__next_f\.push\(\[1,"(.*?)"\]\)'
    matches = re.findall(pattern, html)
    combined = ""
    for m in matches:
        decoded = m.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
        combined += decoded

    # 查找 agents 数据
    agents_start = combined.find('"agents"')
    if agents_start < 0:
        print("  [WARN] 未找到 agents 数据，使用已知列表")
        return KNOWN_AGENTS

    # 尝试提取 agents 数组
    arr_start = combined.find('[', agents_start)
    if arr_start < 0:
        return KNOWN_AGENTS

    depth = 0
    arr_end = arr_start
    for i in range(arr_start, min(arr_start + 50000, len(combined))):
        if combined[i] == '[':
            depth += 1
        elif combined[i] == ']':
            depth -= 1
            if depth == 0:
                arr_end = i + 1
                break

    try:
        agents = json.loads(combined[arr_start:arr_end])
        agent_map = {}
        for a in agents:
            if isinstance(a, dict) and "id" in a and "name" in a:
                agent_map[a["id"]] = a["name"]
        if agent_map:
            print(f"  [OK] 发现 {len(agent_map)} 个特工: {dict(agent_map)}")
            return agent_map
    except json.JSONDecodeError:
        pass

    print("  [WARN] agents 解析失败，使用已知列表")
    return KNOWN_AGENTS


def scrape_all_for_agent(agent_id, agent_name):
    """爬取某个特工在所有地图上的全部点位列表"""
    all_lineups = []
    seen_ids = set()  # 去重

    for map_id, map_info in MAPS.items():
        for side_id, side_name in SIDE_MAP.items():
            print(f"\n  {agent_name} | {map_info['cn']}({map_info['en']}) | {side_name}")

            records = scrape_list_page(map_id, agent_id, side=side_id)
            if not records:
                continue

            for item in records:
                post_id = item.get("id")
                if not post_id or post_id in seen_ids:
                    continue
                seen_ids.add(post_id)

                lineup = {
                    "id": post_id,
                    "title": item.get("title", ""),
                    "map_id": map_id,
                    "map_cn": map_info["cn"],
                    "map_en": map_info["en"],
                    "map_key": map_info["id"],
                    "agent_id": agent_id,
                    "agent_name": agent_name,
                    "side_id": item.get("side", side_id),
                    "side_name": item.get("sideName", side_name),
                    "ability_id": item.get("abilityId", ""),
                    "ability_name": item.get("abilityName", ""),
                    "description": item.get("description", ""),
                    "cover_image": item.get("coverImage", ""),
                    "agent_icon": item.get("agentIcon", ""),
                    "view_count": item.get("viewCount", 0),
                    "fav_count": item.get("favCount", 0),
                    "rating_score": item.get("ratingScore", 0),
                    "rating_count": item.get("ratingCount", 0),
                    "heat_score": item.get("heatScore", 0),
                    "tags": item.get("tags", []),
                    "source_url": f"{BASE_URL}/posts/{post_id}",
                    "steps": [],
                }
                all_lineups.append(lineup)

            time.sleep(REQUEST_DELAY)

    return all_lineups


def scrape_details_batch(lineups, start=0, count=None):
    """批量爬取详情页"""
    if count is None:
        count = len(lineups)
    end = min(start + count, len(lineups))

    print(f"\n[DETAILS] 爬取详情页 [{start+1}..{end}] / {len(lineups)}")

    for i in range(start, end):
        lineup = lineups[i]
        post_id = lineup["id"]
        print(f"  [{i+1}/{end}] {lineup['title']} (ID:{post_id})")

        detail = scrape_detail_page(post_id)
        if detail:
            lineup["steps"] = detail.get("steps", [])
            if not lineup.get("description") and detail.get("description"):
                lineup["description"] = detail["description"]

        time.sleep(REQUEST_DELAY)

    return lineups


# ============ 数据转换 ============

def convert_to_structured(raw_data, agent_key, agent_cn):
    """将原始数据转换为与现有 sova.json 兼容的结构化格式"""

    # 技能映射
    if agent_key == "sova":
        ability_map = SOVA_ABILITIES
    else:
        ability_map = {}
        for item in raw_data:
            aid = item.get("ability_id")
            if aid and aid not in ability_map:
                ability_map[aid] = {
                    "key": "?",
                    "cn": item.get("ability_name", f"技能{aid}"),
                    "en": "",
                    "type": "",
                    "num": aid,
                }

    # 攻防方推断
    ATTACK_KW = ["进攻", "开局", "抢", "下包", "进", "前压", "清理", "前点", "入",
                 "打A", "打B", "打C", "压制", "远控", "支援", "骗"]
    DEFEND_KW = ["防守", "回防", "防拆", "断后", "后点", "守", "防", "防rush"]

    def infer_side(title, side_name):
        if side_name == "进攻":
            return "attack", "进攻方"
        if side_name == "防守":
            return "defense", "防守方"
        for kw in ATTACK_KW:
            if kw in title:
                return "attack", "进攻方"
        for kw in DEFEND_KW:
            if kw in title:
                return "defense", "防守方"
        return "unknown", "通用"

    # 按 map -> ability 分组
    grouped = defaultdict(lambda: defaultdict(list))
    for item in raw_data:
        map_key = item.get("map_key", "")
        ability_id = item.get("ability_id", 0)
        grouped[map_key][ability_id].append(item)

    maps = {}
    total = 0

    for map_key in sorted(grouped.keys()):
        first_items = list(grouped[map_key].values())[0]
        map_cn = first_items[0].get("map_cn", map_key) if first_items else map_key
        map_en = first_items[0].get("map_en", map_key) if first_items else map_key

        abilities = {}
        map_total = 0

        for ability_id in sorted(grouped[map_key].keys()):
            info = ability_map.get(ability_id, {
                "key": "?", "cn": "未知", "en": "Unknown", "type": "", "num": ability_id
            })
            lineups = []

            for item in grouped[map_key][ability_id]:
                side_en, side_cn = infer_side(item.get("title", ""), item.get("side_name", ""))

                # 构建图片列表
                detail_images = []
                cover = item.get("cover_image", "")
                if cover:
                    detail_images.append({"url": cover, "local": "", "label": "封面图"})

                for step in item.get("steps", []):
                    img_url = step.get("image_url", "")
                    if img_url:
                        label = step.get("text", "") or f"步骤{step.get('index', '')}"
                        detail_images.append({"url": img_url, "local": "", "label": label})

                lineup = {
                    "id": item.get("id"),
                    "title": item.get("title", ""),
                    "description": item.get("description", ""),
                    "side": side_en,
                    "side_cn": side_cn,
                    "coordinates": {
                        "start": {"raw": None, "normalized": None},
                        "end": {"raw": None, "normalized": None},
                    },
                    "coverage_area": [],
                    "media": {
                        "stand_image": {"url": "", "local": ""},
                        "detail_images": detail_images,
                        "video": {"bilibili": "", "timestamp": "", "cut_video": ""},
                    },
                    "steps": item.get("steps", []),
                    "view_count": item.get("view_count", 0),
                    "fav_count": item.get("fav_count", 0),
                    "rating_score": item.get("rating_score", 0),
                    "heat_score": item.get("heat_score", 0),
                    "created_at": "",
                    "source_url": item.get("source_url", ""),
                }
                lineups.append(lineup)

            abilities[str(info.get("num", ability_id))] = {
                "key": info.get("key", "?"),
                "name_cn": info.get("cn", "未知"),
                "name_en": info.get("en", "Unknown"),
                "type": info.get("type", ""),
                "lineups": lineups,
            }
            map_total += len(lineups)

        maps[map_key] = {
            "name_cn": map_cn,
            "name_en": map_en,
            "lineup_count": map_total,
            "abilities": abilities,
        }
        total += map_total

    return {
        "metadata": {
            "agent": agent_key,
            "agent_cn": agent_cn,
            "source": "val.isoox.cn",
            "coordinate_system": {
                "type": "pixel",
                "width": 2000,
                "height": 2000,
                "normalized_range": [0, 1],
            },
            "last_updated": datetime.now().strftime("%Y-%m-%d"),
            "total_lineups": total,
            "maps_count": len(maps),
        },
        "maps": maps,
    }


def print_stats(structured, label=""):
    """打印统计报告"""
    print(f"\n{'='*60}")
    print(f"[STATS] {label} 数据统计")
    print(f"{'='*60}")
    meta = structured["metadata"]
    print(f"  特工: {meta['agent_cn']}({meta['agent']})")
    print(f"  来源: {meta['source']}")
    print(f"  总点位: {meta['total_lineups']}")
    print(f"  地图数: {meta['maps_count']}")

    for map_key, map_data in sorted(structured["maps"].items()):
        print(f"\n  {map_data['name_cn']}({map_data['name_en']}): {map_data['lineup_count']} 个")
        for ab_key, ab_data in map_data["abilities"].items():
            print(f"    {ab_data['key']} {ab_data['name_cn']}: {len(ab_data['lineups'])} 个")


# ============ 主函数 ============

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("=" * 60)
    print("  val.isoox.cn 全量爬虫 v2")
    print(f"  输出目录: {OUTPUT_DIR}")
    print("=" * 60)

    # ===== 阶段0: 发现特工 =====
    agents = discover_agents()

    # ===== 阶段1: 爬取猎枭列表数据 =====
    agent_id = 11
    agent_name = agents.get(agent_id, "猎枭")

    print(f"\n{'='*60}")
    print(f"[PHASE 1] 爬取 {agent_name}(ID:{agent_id}) 全地图列表")
    print(f"{'='*60}")

    sova_raw = scrape_all_for_agent(agent_id, agent_name)

    # 保存原始列表数据
    raw_file = os.path.join(OUTPUT_DIR, "isoox_raw_sova.json")
    with open(raw_file, "w", encoding="utf-8") as f:
        json.dump(sova_raw, f, ensure_ascii=False, indent=2)
    print(f"\n[SAVE] 原始列表数据: {raw_file} ({len(sova_raw)} 条)")

    # ===== 阶段2: 爬取详情页 =====
    print(f"\n{'='*60}")
    print(f"[PHASE 2] 爬取详情页步骤数据")
    print(f"{'='*60}")

    sova_with_details = scrape_details_batch(sova_raw)

    # 保存含详情的原始数据
    raw_detail_file = os.path.join(OUTPUT_DIR, "isoox_raw_sova_with_details.json")
    with open(raw_detail_file, "w", encoding="utf-8") as f:
        json.dump(sova_with_details, f, ensure_ascii=False, indent=2)
    print(f"\n[SAVE] 含详情原始数据: {raw_detail_file}")

    # ===== 阶段3: 转换为结构化格式 =====
    print(f"\n{'='*60}")
    print(f"[PHASE 3] 转换为结构化格式")
    print(f"{'='*60}")

    structured = convert_to_structured(sova_with_details, "sova", "猎枭")

    struct_file = os.path.join(OUTPUT_DIR, "isoox_structured_sova.json")
    with open(struct_file, "w", encoding="utf-8") as f:
        json.dump(structured, f, ensure_ascii=False, indent=2)
    print(f"[SAVE] 结构化数据: {struct_file}")

    # ===== 统计报告 =====
    print_stats(structured, f"isoox.cn {agent_name}")

    # ===== 对比现有数据 =====
    print(f"\n{'='*60}")
    print(f"[COMPARE] 与现有 lkval.com 数据对比")
    print(f"{'='*60}")

    existing_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                  "public", "lineups", "sova.json")
    if os.path.exists(existing_file):
        with open(existing_file, "r", encoding="utf-8") as f:
            existing = json.load(f)

        ex_total = existing["metadata"]["total_lineups"]
        ex_maps = existing["metadata"]["maps_count"]
        new_total = structured["metadata"]["total_lineups"]
        new_maps = structured["metadata"]["maps_count"]

        print(f"  现有数据 (lkval.com): {ex_total} 个点位, {ex_maps} 张地图")
        print(f"  新数据 (isoox.cn):   {new_total} 个点位, {new_maps} 张地图")
        print(f"  差异: +{max(0, new_total - ex_total)} 个点位")

        # 按地图对比
        print(f"\n  按地图对比:")
        ex_map_keys = set(existing["maps"].keys())
        new_map_keys = set(structured["maps"].keys())
        common_maps = ex_map_keys & new_map_keys
        only_existing = ex_map_keys - new_map_keys
        only_new = new_map_keys - ex_map_keys

        for mk in sorted(common_maps):
            ex_count = existing["maps"][mk]["lineup_count"]
            new_count = structured["maps"][mk]["lineup_count"]
            diff = new_count - ex_count
            sign = "+" if diff > 0 else ""
            print(f"    {mk}: 现有={ex_count}, 新={new_count} ({sign}{diff})")

        if only_existing:
            print(f"  仅现有数据有: {only_existing}")
        if only_new:
            print(f"  仅新数据有: {only_new}")
    else:
        print(f"  未找到现有数据文件: {existing_file}")

    print(f"\n{'='*60}")
    print("[DONE] 全部完成!")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
