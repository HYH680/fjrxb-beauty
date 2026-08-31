"""Letta (MemGPT) example: long-term memory so the AI remembers each shop
across sessions. Uses the Letta client SDK against a Letta server.

The Letta server needs Postgres+pgvector. Start it once (Docker):
    docker run -d --name letta -p 8283:8283 -e LETTA_PG_URI=... letta/letta:latest
Then run this demo:
    agents/.venv/Scripts/python.exe agents/letta_demo.py "火锅店" "我是做重庆老火锅的，客单价120"
    agents/.venv/Scripts/python.exe agents/letta_demo.py "火锅店" "上次我们做了什么活动？"
"""
import sys

from letta_client import Letta

from config import GATEWAY_BASE_URL, GATEWAY_API_KEY, DEFAULT_MODEL

LETTA_URL = "http://localhost:8283"


def get_or_create_agent(client, label: str):
    agents = client.agents.list()
    for a in agents:
        if a.name == label:
            return a
    # Point the agent's LLM at the New API gateway so usage stays tracked.
    return client.agents.create(
        name=label,
        memory_blocks=[{"label": "human", "value": f"用户经营一家{label}。"}],
        llm_config={
            "model": DEFAULT_MODEL,
            "model_endpoint": f"{GATEWAY_BASE_URL}/chat/completions",
            "model_endpoint_type": "openai",
            "api_key": GATEWAY_API_KEY,
        },
    )


def main():
    label = sys.argv[1] if len(sys.argv) > 1 else "火锅店"
    msg = sys.argv[2] if len(sys.argv) > 2 else "我是做重庆老火锅的，客单价120，主打毛肚"
    client = Letta(base_url=LETTA_URL)
    agent = get_or_create_agent(client, label)
    response = client.agents.messages.create(
        agent_id=agent.id,
        messages=[{"role": "user", "content": msg}],
    )
    for m in response.messages:
        if getattr(m, "content", None):
            sys.stdout.buffer.write(str(m.content).encode("utf-8", "replace"))
            sys.stdout.buffer.write(b"\n")


if __name__ == "__main__":
    main()
