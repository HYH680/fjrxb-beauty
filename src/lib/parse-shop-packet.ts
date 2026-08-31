import { defaultPlatform } from "@/lib/service-briefs";
import { platformFromHost, resolvePlatform } from "@/lib/platforms";

const LOGIN_PASSWORD =
  /登录密码|账号密码|开店宝密码|商家密码|app\s*登录密|点评密码|美团密码|饿了么密码|千牛密码|拼多多密码|京东密码|淘宝密码/i;

function firstLine(value: string) {
  return value.split(/\r?\n/)[0].trim().replace(/^["'`]+|["'`]+$/g, "");
}

function labeled(text: string, labels: string[]) {
  for (const label of labels) {
    const match = text.match(
      new RegExp(`${label}\\s*[:：=]\\s*(.+)`, "i")
    );
    if (match?.[1]) return firstLine(match[1]);
  }
  return "";
}

function allUrls(text: string) {
  return [...text.matchAll(/https?:\/\/[^\s"'<>]+/gi)].map((item) =>
    item[0].replace(/[),.;，。]+$/, "")
  );
}

function looksLikeLoginPhone(value: string) {
  return /^1[3-9]\d{9}$/.test(value.trim());
}

export function parseShopPageUrl(url: string): { platform: string; shopId: string } | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const platform = platformFromHost(host);
    const poi =
      parsed.searchParams.get("poi_id") ||
      parsed.searchParams.get("poiid") ||
      parsed.searchParams.get("poiId") ||
      parsed.searchParams.get("shopId") ||
      parsed.searchParams.get("shop_id") ||
      parsed.searchParams.get("restaurant_id") ||
      parsed.searchParams.get("user_number_id") ||
      "";

    if (host.includes("dianping.com")) {
      const shop = parsed.pathname.match(/\/shop\/([A-Za-z0-9]+)/);
      const shopId = shop?.[1] || poi;
      return { platform: "dianping", shopId: shopId || "" };
    }
    if (host.includes("meituan.com")) {
      const meishi = parsed.pathname.match(/\/meishi\/(\d+)/);
      const pathId = parsed.pathname.match(/\/(\d{6,})\/?$/);
      return { platform: "meituan", shopId: meishi?.[1] || poi || pathId?.[1] || "" };
    }
    if (host.includes("ele.me") || host.includes("eleme")) {
      return { platform: "eleme", shopId: poi || "" };
    }
    if (host.includes("jd.com")) {
      const mall = parsed.pathname.match(/index-(\d+)/);
      const shop = parsed.pathname.match(/\/(\d+)\.html/);
      return { platform: "jd", shopId: mall?.[1] || shop?.[1] || poi || "" };
    }
    if (host.includes("taobao.com") || host.includes("tmall.com")) {
      const shopHost = host.match(/^shop(\d+)\./);
      return { platform: "taobao", shopId: shopHost?.[1] || poi || "" };
    }
    if (platform) return { platform, shopId: poi };
  } catch {
    return null;
  }
  return null;
}

function isShopPageUrl(url: string) {
  return Boolean(parseShopPageUrl(url));
}

function isOpenApiUrl(url: string) {
  if (isShopPageUrl(url)) return false;
  return /openapi|open\.|\/api\/|\/v1\/|\/v2\//i.test(url);
}

function classifyUrl(url: string, nearby: string) {
  const hay = `${nearby} ${url}`.toLowerCase();
  if (parseShopPageUrl(url)?.shopId) return "";
  if (/reply|comment\/add|addcomment|回复|回评|消息发送/i.test(hay)) return "reply";
  if (/pull|query|list|search|comment|review|评价|拉取|查询/.test(hay)) {
    return "pull";
  }
  return "";
}

function extractLabeledShopId(text: string) {
  return labeled(text, [
    "店铺ID",
    "店铺id",
    "门店ID",
    "门店id",
    "门店编号",
    "店铺编号",
    "商家号",
    "商户号",
    "美团号",
    "点评号",
    "饿了么号",
    "京东号",
    "淘宝号",
    "shopId",
    "shop_id",
    "poi_id",
    "poiId",
    "POI",
  ]);
}

function looksLikeBareShopId(value: string) {
  const id = value.trim();
  if (!id || looksLikeLoginPhone(id)) return false;
  return /^\d{6,16}$/.test(id) || /^G\d{5,18}$/i.test(id);
}

export function looksLikeShopRef(text: string) {
  const value = text.trim();
  if (!value) return false;
  if (
    /商家号|商户号|门店号|门店编号|店铺编号|美团号|点评号|饿了么号|京东号|淘宝号|poi[_\s-]?id|shopid/i.test(
      value
    )
  ) {
    return true;
  }
  if (looksLikeBareShopId(value)) return true;
  return allUrls(value).some((url) => isShopPageUrl(url) || /dpurl\.cn|\bdp\.st\b/i.test(url));
}

export type ParsedReview = {
  rating: number;
  content: string;
  author: string;
  platform?: string;
};

export type PlatformShopSlice = {
  platform: string;
  shopName: string;
  shopId: string;
  appKey: string;
  appSecret: string;
  pullUrl: string;
  replyUrl: string;
};

export type ShopPacket = {
  refused?: string;
  notice?: string;
  platform: string;
  shopName: string;
  shopId: string;
  appKey: string;
  appSecret: string;
  pullUrl: string;
  replyUrl: string;
  extraPrompt: string;
  tone: string;
  addressAs: string;
  mustInclude: string;
  neverSay: string;
  goodReviewHint: string;
  badReviewHint: string;
  autoSendGood: boolean;
  reviews: ParsedReview[];
  shops: PlatformShopSlice[];
};

function detectPlatform(text: string, productId?: string) {
  return resolvePlatform(text) || defaultPlatform(productId || "");
}

function emptySlice(platform: string): PlatformShopSlice {
  return {
    platform,
    shopName: "",
    shopId: "",
    appKey: "",
    appSecret: "",
    pullUrl: "",
    replyUrl: "",
  };
}

function sliceHasWork(slice: PlatformShopSlice) {
  return Boolean(slice.shopId || slice.appKey || slice.appSecret || slice.pullUrl || slice.replyUrl);
}

function parseSliceFromText(text: string, platformHint: string, productId?: string): PlatformShopSlice {
  const slice = emptySlice(platformHint || detectPlatform(text, productId));
  slice.shopName = labeled(text, ["店铺名称", "门店名称", "店名", "shopName", "shop_name"]);
  slice.shopId = extractLabeledShopId(text);
  if (!slice.shopId && looksLikeBareShopId(text)) slice.shopId = text.trim();
  slice.appKey = labeled(text, [
    "AppKey",
    "app_key",
    "appkey",
    "API Key",
    "api_key",
    "apiKey",
    "client_id",
    "ClientId",
  ]);
  slice.appSecret = labeled(text, ["AppSecret", "app_secret", "appsecret", "client_secret", "Secret"]);

  const urls = allUrls(text);
  const apiUrls: string[] = [];
  for (const url of urls) {
    const page = parseShopPageUrl(url);
    if (page) {
      if (page.platform) slice.platform = page.platform;
      if (page.shopId && !slice.shopId) slice.shopId = page.shopId;
      continue;
    }
    if (isOpenApiUrl(url) || classifyUrl(url, text)) apiUrls.push(url);
    const index = text.indexOf(url);
    const nearby = text.slice(Math.max(0, index - 24), index + url.length + 12);
    const kind = classifyUrl(url, nearby);
    if (kind === "reply" && !slice.replyUrl) slice.replyUrl = url;
    else if (kind === "pull" && !slice.pullUrl) slice.pullUrl = url;
  }
  if (!slice.pullUrl && apiUrls[0]) slice.pullUrl = apiUrls[0];
  if (!slice.replyUrl && apiUrls[1]) slice.replyUrl = apiUrls[1];
  return slice;
}

function sliceFromJson(raw: Record<string, unknown>, fallbackPlatform: string): PlatformShopSlice {
  const platform =
    resolvePlatform(String(raw.platform || raw.name || raw.label || "")) || fallbackPlatform;
  return {
    platform,
    shopName: String(raw.shopName || raw.shop_name || "").trim(),
    shopId: String(raw.shopId || raw.shop_id || raw.poiId || "").trim(),
    appKey: String(raw.appKey || raw.app_key || raw.client_id || "").trim(),
    appSecret: String(raw.appSecret || raw.app_secret || raw.client_secret || "").trim(),
    pullUrl: String(raw.pullUrl || raw.pull_url || raw.queryUrl || "").trim(),
    replyUrl: String(raw.replyUrl || raw.reply_url || "").trim(),
  };
}

function splitPlatformBlocks(text: string) {
  const re = /(?:^|\n)\s*【\s*([^】]+)\s*】/g;
  const matches = [...text.matchAll(re)];
  if (matches.length === 0) return null;
  const prefix = text.slice(0, matches[0].index ?? 0).trim();
  const blocks = matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? text.length : text.length;
    return {
      heading: match[1].trim(),
      body: text.slice(start, end).trim(),
    };
  });
  return { prefix, blocks };
}

function applySlice(packet: ShopPacket, slice: PlatformShopSlice) {
  if (!sliceHasWork(slice) && !slice.shopName) return;
  const existing = packet.shops.find((item) => item.platform === slice.platform);
  if (!existing) {
    packet.shops.push(slice);
    return;
  }
  existing.shopName = existing.shopName || slice.shopName;
  existing.shopId = existing.shopId || slice.shopId;
  existing.appKey = existing.appKey || slice.appKey;
  existing.appSecret = existing.appSecret || slice.appSecret;
  existing.pullUrl = existing.pullUrl || slice.pullUrl;
  existing.replyUrl = existing.replyUrl || slice.replyUrl;
}

function flattenPacket(packet: ShopPacket, productId?: string) {
  const first = packet.shops[0];
  packet.platform = first?.platform || packet.platform || defaultPlatform(productId || "");
  packet.shopName = first?.shopName || packet.shopName;
  packet.shopId = first?.shopId || packet.shopId;
  packet.appKey = first?.appKey || packet.appKey;
  packet.appSecret = first?.appSecret || packet.appSecret;
  packet.pullUrl = first?.pullUrl || packet.pullUrl;
  packet.replyUrl = first?.replyUrl || packet.replyUrl;
}

export function looksLikeCustomerPacket(text: string) {
  const value = text.trim();
  if (value.length < 6) return false;
  if (LOGIN_PASSWORD.test(value)) return true;
  if (looksLikeShopRef(value)) return true;
  if (/【\s*(美团|饿了么|京东|淘宝|天猫|点评|拼多多)/.test(value)) return true;
  if (
    /app\s*key|appkey|app_key|appsecret|api\s*key|shopid|店铺id|门店id|开放平台|提示词|口吻|人设|回复规范|回评接口|拉取|退货政策|物流时效/i.test(
      value
    )
  ) {
    return true;
  }
  if (
    /https?:\/\//.test(value) &&
    /美团|点评|饿了么|评价|店铺|淘宝|京东|拼多多|amazon/i.test(value)
  ) {
    return true;
  }
  if (/[1-5]\s*星/.test(value) && value.length > 12) return true;
  return false;
}

export function looksLikeIntake(text: string, hasPlaybook: boolean) {
  if (/[吗麼？?]$/.test(text.trim()) || /是吗|对吗|是不是|能不能|会不会|怎么|为什么|你好|在吗/.test(text)) {
    return false;
  }
  if (looksLikeCustomerPacket(text)) return true;
  if (hasPlaybook) {
    return /回复规范|补充规范|更新规范|补充提示词|更新提示词|口吻改|人设改|【\s*(美团|饿了么|京东|淘宝)/i.test(
      text
    );
  }
  return false;
}

export function parseCustomerPacket(raw: string, productId?: string): ShopPacket {
  const text = raw.trim();
  const packet: ShopPacket = {
    platform: detectPlatform(text, productId),
    shopName: "",
    shopId: "",
    appKey: "",
    appSecret: "",
    pullUrl: "",
    replyUrl: "",
    extraPrompt: "",
    tone: "",
    addressAs: "",
    mustInclude: "",
    neverSay: "",
    goodReviewHint: "",
    badReviewHint: "",
    autoSendGood: /好评自动|自动发好评|autoSendGood/i.test(text),
    reviews: [],
    shops: [],
  };

  if (LOGIN_PASSWORD.test(text)) {
    packet.refused = "不要发商家 App 登录密码。只要各平台开放平台的 AppKey、Secret 和接口地址。";
    return packet;
  }
  if (looksLikeLoginPhone(text) || looksLikeLoginPhone(extractLabeledShopId(text))) {
    packet.refused =
      "这像商家登录手机号。不要发登录账号。请发各平台后台里的门店/店铺编号，或按资料模板一次粘贴。单凭号码查不到店铺。";
    return packet;
  }
  if (/dpurl\.cn|\bdp\.st\b/i.test(text) && allUrls(text).every((url) => /dpurl\.cn|\bdp\.st\b/i.test(url))) {
    packet.notice =
      "短链解析不出门店编号。请发商家后台里的门店 ID，或完整店铺页链接。单凭商家号也查不到店名和评价。";
  }

  const jsonMatch = text.match(/\{[\s\S]{20,}\}/);
  if (jsonMatch) {
    try {
      const json = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      packet.shopName = String(json.shopName || json.shop_name || "").trim();
      packet.extraPrompt = String(json.extraPrompt || json.prompt || json.playbook || "").trim();
      const list = Array.isArray(json.platforms)
        ? json.platforms
        : Array.isArray(json.shops)
          ? json.shops
          : [];
      if (list.length) {
        for (const item of list) {
          if (!item || typeof item !== "object") continue;
          applySlice(packet, sliceFromJson(item as Record<string, unknown>, packet.platform));
        }
      } else {
        applySlice(packet, sliceFromJson(json, packet.platform));
      }
    } catch {
      // keep regex parse
    }
  }

  const split = splitPlatformBlocks(text);
  const sharedText = split?.prefix || (split ? "" : text);

  packet.shopName =
    packet.shopName ||
    labeled(sharedText || text, ["店铺名称", "门店名称", "店名", "shopName", "shop_name"]);
  packet.tone = labeled(sharedText || text, ["口吻", "语气", "tone"]);
  packet.addressAs = labeled(sharedText || text, ["自称", "addressAs"]);
  packet.mustInclude = labeled(sharedText || text, ["必须带上", "必须说", "mustInclude"]);
  packet.neverSay = labeled(sharedText || text, ["绝对不要说", "不要说", "neverSay"]);
  packet.goodReviewHint = labeled(sharedText || text, ["好评", "好评要求", "goodReviewHint"]);
  packet.badReviewHint = labeled(sharedText || text, ["差评", "差评要求", "badReviewHint"]);

  const promptSource = sharedText || text;
  const promptBlock = promptSource.match(
    /(?:提示词|人设|话术|playbook|回复规范|补充规范|更新规范|店铺口吻)\s*[:：]?\s*([\s\S]{20,})/i
  );
  packet.extraPrompt =
    packet.extraPrompt ||
    (promptBlock?.[1] ? promptBlock[1].replace(/\n【[\s\S]*$/, "").trim().slice(0, 4000) : "");

  if (split) {
    for (const block of split.blocks) {
      const platform = resolvePlatform(block.heading) || detectPlatform(block.body, productId);
      applySlice(packet, parseSliceFromText(block.body, platform, productId));
    }
  } else if (packet.shops.length === 0) {
    applySlice(packet, parseSliceFromText(text, packet.platform, productId));
  }

  const reviewBlocks = [
    ...text.matchAll(
      /(?:评价|评论|顾客说)\s*[:：]?\s*([\s\S]{8,400}?)(?:\n\n|$)/gi
    ),
  ];
  for (const block of reviewBlocks) {
    const content = block[1].trim();
    if (/appkey|提示词|http/i.test(content)) continue;
    const ratingMatch = text
      .slice(Math.max(0, (block.index || 0) - 40), (block.index || 0) + 20)
      .match(/([1-5])\s*星/);
    packet.reviews.push({
      rating: ratingMatch ? Number(ratingMatch[1]) : 5,
      content: content.slice(0, 2000),
      author: "顾客",
      platform: packet.platform,
    });
  }

  const starLines = [...text.matchAll(/([1-5])\s*星[:：]?\s*(.{8,400})/g)];
  for (const line of starLines) {
    const content = line[2].trim();
    if (/appkey|http|提示词/i.test(content)) continue;
    if (packet.reviews.some((item) => item.content === content)) continue;
    packet.reviews.push({
      rating: Number(line[1]),
      content: content.slice(0, 2000),
      author: "顾客",
      platform: packet.platform,
    });
  }

  if (
    !packet.extraPrompt &&
    packet.shops.every((item) => !sliceHasWork(item)) &&
    packet.reviews.length === 0 &&
    text.length >= 40 &&
    !/https?:\/\//.test(text) &&
    !split
  ) {
    packet.extraPrompt = text.slice(0, 2000);
  }

  if (!packet.shopName && packet.extraPrompt) {
    packet.shopName = labeled(text, ["我们是", "本店叫"]) || "";
  }
  for (const shop of packet.shops) {
    if (!shop.shopName && packet.shopName) shop.shopName = packet.shopName;
  }

  flattenPacket(packet, productId);
  packet.shops = packet.shops.filter((item) => sliceHasWork(item) || item.shopName);
  if (
    packet.extraPrompt &&
    /各平台共用这一份|写清语气、忌口/.test(packet.extraPrompt) &&
    packet.extraPrompt.length < 120
  ) {
    packet.extraPrompt = "";
  }
  return packet;
}

export function packetHasWork(packet: ShopPacket) {
  return Boolean(
    packet.refused ||
      packet.notice ||
      packet.extraPrompt ||
      packet.reviews.length ||
      packet.shops.some((item) => sliceHasWork(item))
  );
}

export function shopSliceHasWork(slice: PlatformShopSlice) {
  return sliceHasWork(slice);
}
