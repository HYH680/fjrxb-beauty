"""LangGraph example: a restaurant-marketing agent that reasons + calls tools,
wired through the New API gateway.

Run:
    agents/.venv/Scripts/python.exe agents/langgraph_demo.py "帮我给川菜馆写一条周末满减朋友圈文案"
"""
import sys
from typing import Annotated

from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent
from langgraph.graph.message import Messages

from config import GATEWAY_BASE_URL, GATEWAY_API_KEY, DEFAULT_MODEL


def build_agent():
    llm = ChatOpenAI(
        model=DEFAULT_MODEL,
        api_key=GATEWAY_API_KEY,
        base_url=GATEWAY_BASE_URL,
        temperature=0.7,
    )

    def write_wechat_copy(topic: Annotated[str, "文案主题，如'周末满减'"]) -> str:
        """生成一条朋友圈营销文案草稿（中文，带 emoji，200 字内）。"""
        return f"🔥 【{topic}】周末限定！进店即享满减福利，约上好友来一顿热乎的～\n（草稿，可按店铺口味调整）"

    def suggest_discount(dish: Annotated[str, "菜品名"]) -> str:
        """给一道菜建议一个折扣力度。"""
        return f"建议 {dish} 周末 8.8 折，引流 + 不亏本。"

    agent = create_react_agent(
        llm,
        tools=[write_wechat_copy, suggest_discount],
        checkpointer=MemorySaver(),
        prompt=(
            "你是资深餐饮营销顾问，语气亲切、像真人，会先追问店铺类型和目标客群，"
            "再用工具产出文案/折扣建议。回答要基于用户店铺的真实情况，不要空话。"
        ),
    )
    return agent


def main():
    agent = build_agent()
    user_input = sys.argv[1] if len(sys.argv) > 1 else "帮我给川菜馆写一条周末满减朋友圈文案"
    config = {"configurable": {"thread_id": "demo-1"}}
    for chunk in agent.stream({"messages": [{"role": "user", "content": user_input}]}, config, stream_mode="values"):
        last = chunk["messages"][-1]
        print(f"[{last.type}] {last.content}\n")


if __name__ == "__main__":
    main()
