# -*- coding: utf-8 -*-
"""Quick check for shop fact extraction (mirrors shop-consultant logic)."""
CUISINE = "重庆老火锅|老火锅|川菜|火锅|烧烤|奶茶|咖啡|日料|西餐|面馆|快餐|海鲜|甜品|烤肉|自助|中餐|粤菜|湘菜|鲁菜|东北菜|江浙菜|家常菜|小龙虾|冒菜|麻辣烫|烤鱼|串串|茶饮|烘焙|面包"

def pick_shop_type(text: str):
    for c in sorted(CUISINE.split("|"), key=len, reverse=True):
        if c in text:
            return c
    return None

samples = [
    "我是做重庆老火锅的，客单价大概120，主要客群是附近白领和情侣，想做周末引流。",
    "开了一家奶茶店，人均28元",
    "经营粤菜馆，风格偏轻奢",
]
for s in samples:
    print(s)
    print("  shopType=", pick_shop_type(s))
