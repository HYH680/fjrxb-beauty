export type ShopPlatform = {
  id: string;
  label: string;
  aliases: string[];
  openPlatform: string;
  hosts: string[];
};

export const SHOP_PLATFORMS: ShopPlatform[] = [
  {
    id: "meituan",
    label: "美团",
    aliases: ["美团外卖", "美团商家", "mt"],
    openPlatform: "美团开放平台",
    hosts: ["meituan.com"],
  },
  {
    id: "eleme",
    label: "饿了么",
    aliases: ["饿了吗", "eleme", "ele.me", "elm"],
    openPlatform: "饿了么开放平台",
    hosts: ["ele.me", "eleme.com", "elemecdn.com"],
  },
  {
    id: "dianping",
    label: "大众点评",
    aliases: ["点评", "dianping", "口碑"],
    openPlatform: "大众点评开放平台",
    hosts: ["dianping.com"],
  },
  {
    id: "jd",
    label: "京东",
    aliases: ["京东商城", "京东到家", "jd"],
    openPlatform: "京东开放平台",
    hosts: ["jd.com", "jd.hk"],
  },
  {
    id: "taobao",
    label: "淘宝",
    aliases: ["天猫", "淘宝网", "tmall", "千牛"],
    openPlatform: "淘宝开放平台",
    hosts: ["taobao.com", "tmall.com", "tmall.hk"],
  },
  {
    id: "pinduoduo",
    label: "拼多多",
    aliases: ["拼夕夕", "pdd", "pinduoduo"],
    openPlatform: "拼多多开放平台",
    hosts: ["pinduoduo.com", "yangkeduo.com"],
  },
];

export function platformLabel(value: string) {
  const found = SHOP_PLATFORMS.find((item) => item.id === value);
  if (found) return found.label;
  const extra: Record<string, string> = {
    douyin: "抖音",
    amazon: "Amazon",
    shopee: "Shopee",
    temu: "Temu",
    openai: "OpenAI",
    qwen: "千问",
    shop: "店铺",
  };
  return extra[value] || value;
}

export function resolvePlatform(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  const lower = value.toLowerCase();
  for (const item of SHOP_PLATFORMS) {
    if (item.id === lower || item.label === value || value.includes(item.label)) {
      return item.id;
    }
    if (
      item.aliases.some((alias) => {
        if (alias.length <= 2 && !/[一-龥]/.test(alias)) return lower === alias.toLowerCase();
        return value.includes(alias) || lower === alias.toLowerCase();
      })
    ) {
      return item.id;
    }
  }
  return "";
}

export function resolveAllPlatforms(text: string): string[] {
  const found: string[] = [];
  for (const item of SHOP_PLATFORMS) {
    if (text.includes(item.label)) {
      found.push(item.id);
      continue;
    }
    if (
      item.aliases.some((alias) => {
        if (alias.length <= 2 && !/[一-龥]/.test(alias)) return false;
        return text.includes(alias);
      })
    ) {
      found.push(item.id);
    }
  }
  return found;
}

export function guidedPlatforms(productId: string) {
  if (productId === "restaurant-cs") {
    return ["meituan", "eleme", "dianping", "jd", "taobao"];
  }
  if (productId === "shop-review" || productId === "shop-cs") {
    return ["taobao", "jd", "pinduoduo", "meituan", "eleme"];
  }
  return ["meituan", "eleme", "jd", "taobao"];
}

export function platformFromHost(hostname: string): string {
  const host = hostname.toLowerCase();
  for (const item of SHOP_PLATFORMS) {
    if (item.hosts.some((entry) => host === entry || host.endsWith(`.${entry}`))) {
      return item.id;
    }
  }
  return "";
}
