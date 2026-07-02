"""
猎枭(Sova)全地图点位数据爬虫 - lkval.com
支持增量爬取和断点续传
"""
import requests
import json
import os
import time
import argparse
import sys

# ============ 配置 ============
BASE_URL = "https://lkval.com"
API_LINEUP_LIST = f"{BASE_URL}/api/blogs/get_lineup_list"
API_DISCUSS_DETAIL = f"{BASE_URL}/api/blogs/get_discuss_detail"
IMG_BASE_URL = "https://img.lkval.com/userupload"

# 输出目录
OUTPUT_DIR = r"d:\WorkingSpace\sova-lineup\lineups"
DATA_DIR = os.path.join(OUTPUT_DIR, "data")
IMG_DIR = os.path.join(OUTPUT_DIR, "images")

# 全部目标地图
ALL_MAPS = [
    "haven", "bind", "ascent",
    "icebox", "breeze", "sunset", "abyss",
    "lotus", "pearl", "corrode",
    "split", "fracture"
]

# Sova 技能编号（1234 = CQEX）
ABILITY_MAP = {
    1: "C-无人机 - Owl Drone",
    2: "Q-雷击箭 - Shock Bolt",
    3: "E-寻敌箭 - Recon Bolt",
    4: "X-狂猎之怒 - Hunter's Fury"
}

# 地图中文名
MAP_CN = {
    "haven": "隐士修所(Haven)",
    "bind": "源工重镇(Bind)",
    "ascent": "亚海悬城(Ascent)",
    "icebox": "极寒冻土(Icebox)",
    "breeze": "微风岛屿(Breeze)",
    "sunset": "日落之城(Sunset)",
    "abyss": "幽邃地窟(Abyss)",
    "lotus": "莲华古城(Lotus)",
    "pearl": "深海明珠(Pearl)",
    "split": "霓虹町(Split)",
    "fracture": "裂变峡谷(Fracture)",
    "corrode": "盐海矿镇(Corrode)"
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://lkval.com/",
    "Accept": "application/json, text/plain, */*",
}

# ============ 工具函数 ============
def ensure_dirs():
    for d in [DATA_DIR, IMG_DIR]:
        os.makedirs(d, exist_ok=True)

def download_image(url, save_path, retries=3):
    if os.path.exists(save_path) and os.path.getsize(save_path) > 100:
        return True  # 已存在则跳过
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

def get_lineup_list(map_name, ability, side=0):
    user_select = json.dumps({
        "val": {"map": map_name, "agent": "sova", "ability": ability, "side": side},
        "cs2": {"map": "dust2", "agent": "", "side": 0, "ability": 1},
        "df": {"map": "htjd", "agent": "luna", "side": 0, "ability": 0}
    })
    params = {"game": "val", "userSelect": user_select}
    try:
        resp = requests.get(API_LINEUP_LIST, params=params, headers=HEADERS, timeout=15)
        data = resp.json()
        if data.get("code") == 0:
            return data.get("list", [])
        return []
    except Exception as e:
        print(f"  请求失败: {e}")
        return []

def get_discuss_detail(blog_id, lineup_id):
    params = {"blog_id": blog_id, "lineup_id": lineup_id}
    try:
        resp = requests.get(API_DISCUSS_DETAIL, params=params, headers=HEADERS, timeout=15)
        data = resp.json()
        if data.get("code") == 0:
            return data.get("detail", {})
        return {}
    except:
        return {}

def load_existing():
    """加载已有数据"""
    path = os.path.join(DATA_DIR, "sova_lineups_raw.json")
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def get_existing_map_ids(existing_data):
    """获取已有数据中每张地图的点位ID集合"""
    result = {}
    for item in existing_data:
        m = item.get("地图标识", "")
        iid = item.get("id")
        if m and iid:
            if m not in result:
                result[m] = set()
            result[m].add(iid)
    return result

def save_progress(data):
    """保存进度"""
    path = os.path.join(DATA_DIR, "sova_lineups_raw_progress.json")
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ============ 主流程 ============
def main():
    parser = argparse.ArgumentParser(description="猎枭全地图点位爬虫")
    parser.add_argument("--maps", nargs="*", default=None, help="指定地图列表，默认全部")
    parser.add_argument("--skip-existing", action="store_true", help="跳过已有数据的地图")
    parser.add_argument("--force", action="store_true", help="强制重新爬取所有地图")
    args = parser.parse_args()

    ensure_dirs()

    # 确定目标地图
    if args.maps:
        target_maps = args.maps
    else:
        target_maps = ALL_MAPS

    # 加载已有数据
    existing_data = load_existing()
    existing_map_ids = get_existing_map_ids(existing_data)

    if args.skip_existing and not args.force:
        skip_maps = [m for m in target_maps if m in existing_map_ids and len(existing_map_ids[m]) > 0]
        print(f"跳过已有数据的地图: {skip_maps}")
        target_maps = [m for m in target_maps if m not in skip_maps]

    print(f"目标地图: {target_maps}")
    print(f"已有数据: {len(existing_data)} 条")

    all_lineups = list(existing_data)  # 复制已有数据
    new_count = 0

    for map_name in target_maps:
        print(f"\n{'='*60}")
        print(f"正在爬取: {MAP_CN.get(map_name, map_name)} ({map_name})")
        print(f"{'='*60}")

        map_new = 0
        for ability_num, ability_name in ABILITY_MAP.items():
            lineups = get_lineup_list(map_name, ability_num)

            if not lineups:
                continue

            print(f"\n--- {ability_name}: {len(lineups)} 个点位 ---")

            for idx, item in enumerate(lineups):
                lineup_id = item.get("id")
                blog_id = item.get("blog_id")
                title = item.get("lineup_title", "未知点位")

                # 增量：跳过已存在的点位
                if not args.force and lineup_id in existing_map_ids.get(map_name, set()):
                    continue

                print(f"  [{idx+1}/{len(lineups)}] {title} (id={lineup_id})")

                detail = get_discuss_detail(blog_id, lineup_id)

                record = {
                    "id": lineup_id,
                    "blog_id": blog_id,
                    "点位名称": title,
                    "地图": MAP_CN.get(map_name, map_name),
                    "地图标识": map_name,
                    "箭类型": ability_name,
                    "技能编号": ability_num,
                    "攻防方": "未知",
                    "站位坐标": item.get("leaflet_params", {}).get("startPoint", []),
                    "瞄点坐标": item.get("leaflet_params", {}).get("endPoint", []),
                    "覆盖区域": item.get("leaflet_params", {}).get("polygonList", []),
                    "B站视频": detail.get("bili_link", ""),
                    "视频空降": f"{detail.get('bili_start_minute', 0)}分{detail.get('bili_start_second', 0)}秒",
                    "创建时间": detail.get("create_time", ""),
                    "站位图": item.get("start_image", ""),
                    "详情图片": detail.get("images", []),
                    "截取视频": detail.get("cut_video", ""),
                }

                # 下载站位图
                start_img = item.get("start_image", "")
                if start_img:
                    img_url = f"{IMG_BASE_URL}/{start_img}"
                    ext = start_img.rsplit('.', 1)[-1] if '.' in start_img else 'webp'
                    img_filename = f"{map_name}_{ability_num}_{lineup_id}_stand.{ext}"
                    img_path = os.path.join(IMG_DIR, img_filename)
                    if download_image(img_url, img_path):
                        record["站位图本地"] = img_filename
                    else:
                        record["站位图本地"] = ""

                # 下载详情图片
                images = detail.get("images", [])
                downloaded = []
                for img_idx, img_name in enumerate(images):
                    if img_name:
                        img_url = f"{IMG_BASE_URL}/{img_name}"
                        ext = img_name.rsplit('.', 1)[-1] if '.' in img_name else 'webp'
                        img_filename = f"{map_name}_{ability_num}_{lineup_id}_detail_{img_idx}.{ext}"
                        img_path = os.path.join(IMG_DIR, img_filename)
                        if download_image(img_url, img_path):
                            downloaded.append(img_filename)
                record["详情图本地"] = downloaded

                all_lineups.append(record)
                new_count += 1
                map_new += 1

                # 每10个点位保存一次进度
                if new_count % 10 == 0:
                    save_progress(all_lineups)

                time.sleep(0.3)

            time.sleep(0.5)

        if map_new == 0:
            print(f"  {map_name}: 无新增点位")

    # 保存最终数据
    data_file = os.path.join(DATA_DIR, "sova_lineups_raw.json")
    with open(data_file, 'w', encoding='utf-8') as f:
        json.dump(all_lineups, f, ensure_ascii=False, indent=2)

    # 清理进度文件
    progress_file = os.path.join(DATA_DIR, "sova_lineups_raw_progress.json")
    if os.path.exists(progress_file):
        os.remove(progress_file)

    print(f"\n{'='*60}")
    print(f"爬取完成!")
    print(f"新增: {new_count} 个点位")
    print(f"总计: {len(all_lineups)} 个点位")
    print(f"数据文件: {data_file}")

    # 统计
    from collections import Counter
    map_dist = Counter()
    for item in all_lineups:
        map_dist[item["地图标识"]] += 1
    print(f"\n各地图点位数:")
    for m, c in map_dist.most_common():
        print(f"  {MAP_CN.get(m, m)}: {c}")

if __name__ == "__main__":
    main()
