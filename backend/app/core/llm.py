"""
Shared DeepSeek client (OpenAI-compatible).

Usage:
    from app.core.llm import llm, settings

    response = await llm.chat.completions.create(
        model=settings.deepseek_model,
        messages=[{"role": "user", "content": "..."}],
        response_format={"type": "json_object"},
    )
"""

from openai import AsyncOpenAI

from app.core.config import settings

llm = AsyncOpenAI(
    api_key=settings.deepseek_api_key,
    base_url=settings.deepseek_base_url,
)
