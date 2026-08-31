"""Shared config for agent frameworks -> New API gateway.

All agent frameworks (LangGraph / Agno / Letta) talk to the LLM through the
New API gateway so token usage stays tracked centrally.
"""
import os

GATEWAY_BASE_URL = os.getenv("LLM_GATEWAY_BASE_URL", "http://localhost:3001/v1")
GATEWAY_API_KEY = os.getenv("LLM_GATEWAY_API_KEY", "sk-ExM05peB9wbEhauBcycN4K4IPSY5LtjitDsQMnWf9z0STDIi")

# Flagship models wired in the picker; pick a cheap-but-strong default.
DEFAULT_MODEL = os.getenv("AGENT_MODEL", "deepseek-v4-pro")
VISION_MODEL = os.getenv("AGENT_VISION_MODEL", "glm-5.2")
