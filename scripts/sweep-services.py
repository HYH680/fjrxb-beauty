# -*- coding: utf-8 -*-
"""Sweep all subscribed services for user1 with recommended models."""
import json
import urllib.request
import urllib.error
import http.cookiejar
import sqlite3
from pathlib import Path

BASE = "http://localhost:3000"
EMAIL = "2028391318@qq.com"
PASSWORD = "hyhzuishuai723"
DB = Path(r"C:\Users\ZhuanZ(无密码)\Projects\ai-supermarket\prisma\dev.db")
OUT = Path(r"C:\Users\ZhuanZ(无密码)\Projects\ai-supermarket\scripts\service-sweep-result.json")

# Industry prompts per product (or category fallback)
PROMPTS = {
    "restaurant-cs": "差评说「等位40分钟还上错菜」，帮我起草一条美团/点评可直接发的诚恳回复，语气像老板本人。",
    "retail-marketing": "重庆老火锅周末引流，客单120，白领情侣客群，给我一版朋友圈文案+活动机制（满赠/限时）。",
    "menu-optimize": "火锅菜单：毛肚38、鸭血18、黄喉32、牛肉卷48。按毛利和点单率给排菜与套餐建议。",
    "inventory-forecast": "周末翻台率预计×1.8，毛肚日耗20斤、鸭血12份，给周五到周日备货清单和安全库存。",
    "shop-cs": "顾客问「能不能改地址、今晚能送到吗」，给电商客服三条标准话术（可改地址/不可改/催物流）。",
    "shop-review": "买家秀差评：快递慢、包装破损。写一条店铺评价回复，先致歉再给补救。",
    "shop-listing": "给「不锈钢保温杯500ml」写详情页卖点五条+标题，突出保温与便携。",
    "cross-border-listing": "把这条中文标题译成英文亚马逊标题并给三个bullet：便携榨汁杯，USB充电，清洗方便。",
    "cross-border-cs": "海外买家问 delivery time to Germany and return policy，用英文客服语气回复。",
    "invoice-photo": "没有图。请用行业话告诉我拍发票要注意哪些字段，才能做进项核对。",
    "shop-photo-audit": "没有图。列主图/详情页合规检查清单（夸大宣传、缺规格、错别字）。",
    "contract-photo-review": "没有图。用合同审阅术语列拍照页优先顺序：付款、违约金、自动续费、管辖。",
    "deepseek-chat": "用函数写一个防抖 debounce(fn, wait)，TypeScript，带简单注释。",
    "cursor-pro": "Next.js App Router 里客户端组件调服务端API要注意什么？给三条实践建议。",
    "langchain-pro": "解释 RAG 里 chunking 与 top-k 对召回的影响，用项目实施口吻。",
    "gpt-5.6-sol": "给一个「库存缺货导致差评」的根因分析框架（5Why），输出可执行对策。",
    "openai-assistants": "设计一个多步骤助手：收集门店信息→生成活动→审合规，说明每步工具。",
    "claude-sonnet": "用法律审阅口吻指出餐饮加盟合同里「自动续约+高额违约金」的风险点。",
    "capcut-auto": "30秒探店短视频分镜：火锅、毛肚特写、氛围、CTA，给口播稿。",
    "ai-subtitle": "把这句做成双语字幕时间轴草稿：今晚八点，毛肚买一送一。",
    "smart-clip-select": "从2小时直播里筛选高光：下单高峰、差评回应、新品试吃，给剪辑优先级。",
    "digital-human": "数字人探店口播：开场、招牌、优惠、结尾关注，口语化。",
    "course-notes": "把「火锅供应链管理」一节课整理成要点笔记+记忆卡片。",
    "homework-grade": "没有图。说明批改作业照片时要看步骤分还是结果分，给教师话术。",
    "enroll-copy": "少儿编程春季班招生文案，突出试听转化。",
    "resume-screen": "筛选餐饮店长简历：看重什么指标？给评分维度。",
    "interview-questions": "招门店店长，给8道行为面试题（含追问）。",
    "hr-qa-bot": "员工问年假怎么算，用HR口径简答并提示看制度。",
    "smart-bookkeeping": "没有图。列报销票入账核对字段清单。",
    "business-report": "用经营分析口径写周报提纲：翻台率、客单、差评率、毛利。",
    "contract-reminder": "加盟合同到期提前提醒话术+要核对的条款清单。",
    "qwen-plus": "用中文写一条节假日促销短信，餐饮可用。",
    "doubao-seed": "给社区团购群发一条火锅到店优惠短文案。",
    "dall-e-3": "描述一张火锅店主图的出图prompt（构图、光线、主体）。",
    "stable-diffusion-xl": "给菜单背景图写SD提示词（中式、食欲、干净）。",
    "midjourney-api": "写一条MJ风格探店氛围图prompt。",
    "whisper-api": "说明门店录音转写后怎么做差评关键词提取流程。",
    "elevenlabs-tts": "给探店口播写适合TTS的短稿（标停顿）。",
    "runway-gen3": "描述3秒锅底翻滚短视频分镜与运镜。",
    "pinecone": "用向量库术语说明门店FAQ入库字段设计。",
    "weaviate-cloud": "对比关键词检索与向量检索在客服场景的取舍。",
    "cohere-embed": "说明评价文本embedding后如何做相似差评聚类。",
    "replicate-api": "说明用第三方模型API做菜单图背景替换的步骤风险。",
    "gemini-pro": "多模态：只有文字时，如何指导商家补图才能做视觉质检。",
}


def req(cj, method, path, data=None, timeout=90):
    url = BASE + path
    body = None if data is None else json.dumps(data, ensure_ascii=False).encode("utf-8")
    r = urllib.request.Request(url, data=body, method=method)
    r.add_header("Content-Type", "application/json; charset=utf-8")
    r.add_header("Accept", "application/json")
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    try:
        with opener.open(r, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", "replace")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            payload = json.loads(raw) if raw else {}
        except Exception:
            payload = {"error": raw[:300]}
        return e.code, payload


def main():
    cj = http.cookiejar.CookieJar()
    code, login = req(cj, "POST", "/api/auth/login", {"email": EMAIL, "password": PASSWORD})
    assert code == 200, login
    print("login ok", login.get("user", {}).get("name"))

    code, board = req(cj, "GET", "/api/settings/models")
    assert code == 200, board
    winners = {s["productId"]: s for s in board.get("services", [])}

    con = sqlite3.connect(str(DB))
    subs = [
        r[0]
        for r in con.execute(
            "SELECT productId FROM Subscription WHERE userId=? AND status='active'",
            ("cmsrepmiv0000tpfsithygjg6",),
        )
    ]
    print("subs", len(subs))

    results = []
    for i, pid in enumerate(subs):
        w = winners.get(pid) or {}
        model = (w.get("winner") or {}).get("model") or None
        task = w.get("task") or w.get("taskLabel") or ""
        prompt = PROMPTS.get(pid) or f"你是「{pid}」顾问。用该行业术语，说明开通后第一步该做什么，并问我一个关键信息。"
        body = {"productId": pid, "message": prompt, "history": []}
        if model:
            body["model"] = model
        print(f"[{i+1}/{len(subs)}] {pid} model={model} ...", flush=True)
        code, data = req(cj, "POST", "/api/runtime/chat", body, timeout=120)
        reply = str(data.get("reply") or "")
        err = data.get("error")
        used = data.get("model")
        route = data.get("route")
        ok = code == 200 and bool(reply) and not err
        # crude capability signals
        asks = any(x in reply for x in ["？", "?", "方便", "能否", "哪家", "多少", "什么"])
        concrete = len(reply) >= 80
        gap = []
        if not ok:
            gap.append("llm_or_access")
        else:
            if not concrete:
                gap.append("shallow_reply")
            if pid in ("invoice-photo", "shop-photo-audit", "contract-photo-review", "homework-grade", "smart-bookkeeping") and "图" in prompt:
                if "图" not in reply and "拍" not in reply:
                    gap.append("vision_guidance_weak")
        row = {
            "productId": pid,
            "recommendedModel": model,
            "task": task,
            "http": code,
            "ok": ok,
            "usedModel": used,
            "route": route,
            "error": err,
            "replyLen": len(reply),
            "replyPreview": reply[:220],
            "asksFollowUp": asks,
            "gapHints": gap,
        }
        results.append(row)
        print(f"  -> http={code} ok={ok} used={used} len={len(reply)} gaps={gap}", flush=True)

    # summarize
    fail = [r for r in results if not r["ok"]]
    shallow = [r for r in results if r["ok"] and "shallow_reply" in r["gapHints"]]
    summary = {
        "total": len(results),
        "ok": sum(1 for r in results if r["ok"]),
        "fail": len(fail),
        "failIds": [r["productId"] for r in fail],
        "shallowIds": [r["productId"] for r in shallow],
        "modelsUsed": sorted({r["usedModel"] for r in results if r["usedModel"]}),
    }
    OUT.write_text(json.dumps({"summary": summary, "results": results}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
