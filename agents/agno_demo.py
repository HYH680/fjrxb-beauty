"""Agno example: a restaurant-marketing agent with memory + tools,
wired through the New API gateway.

Run:
    agents/.venv/Scripts/python.exe agents/agno_demo.py "帮我给火锅店想个情人节活动"
"""
import sys

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools.decorator import tool

from config import GATEWAY_BASE_URL, GATEWAY_API_KEY, DEFAULT_MODEL


def build_agent():
    model = OpenAIChat(
        id=DEFAULT_MODEL,
        api_key=GATEWAY_API_KEY,
        base_url=GATEWAY_BASE_URL,
        role_map={"system": "system", "user": "user", "assistant": "assistant", "tool": "tool", "model": "assistant"},
    )

    @tool
    def write_post_copy(topic: str) -> str:
        """根据主题生成一条朋友圈/小红书营销文案草稿。"""
        return f"✨ 【{topic}】限时活动来啦！进店有礼，约上 TA 一起打卡～（草稿，可按店铺调整）"

    @tool
    def plan_event(goal: str) -> str:
        """根据活动目标给出一个简短活动方案（步骤+预算）。"""
        return f"方案【{goal}】：1) 主题包装 2) 满赠引流 3) 朋友圈扩散。预算约 500 元。"

    agent = Agent(
        model=model,
        tools=[write_post_copy, plan_event],
        instructions=(
            "你是亲切的餐饮营销顾问，像真人一样先了解店铺类型和目标，"
            "再用工具产出方案和文案，不要冷冰冰模板回复。"
        ),
        num_history_messages=8,
    )
    return agent


def main():
    agent = build_agent()
    user_input = sys.argv[1] if len(sys.argv) > 1 else "帮我给火锅店想个情人节活动"
    response = agent.run(user_input)
    text = response.content if response and response.content else "(no content)"
    sys.stdout.buffer.write(text.encode("utf-8", "replace"))
    sys.stdout.buffer.write(b"\n")


if __name__ == "__main__":
    main()
