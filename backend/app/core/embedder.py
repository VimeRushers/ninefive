"""
Embedding service singleton for multilingual-e5-large (1024-dim).
Prefixes:
  'query: ' for search queries
  'passage: ' for documents/passages/descriptions
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import math
from typing import Any, Sequence

from app.core.config import settings

EMBEDDING_DIM = 1024
logger = logging.getLogger(__name__)


class Embedder:
    _instance: Embedder | None = None
    _model: Any = None
    _model_loaded: bool = False

    def __init__(self) -> None:
        self.model_name = settings.embed_model

    @classmethod
    def get_instance(cls) -> Embedder:
        if cls._instance is None:
            cls._instance = Embedder()
        return cls._instance

    def _load_model(self) -> None:
        if self._model_loaded:
            return
        try:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(self.model_name)
        except Exception as exc:
            if not settings.embed_allow_fallback:
                raise RuntimeError(
                    f"Could not load embedding model '{self.model_name}' and "
                    "EMBED_ALLOW_FALLBACK is disabled"
                ) from exc
            logger.warning(
                "sentence-transformers unavailable (%s). Falling back to deterministic "
                "hash embeddings — semantic search results will not be meaningful.",
                exc,
            )
            self._model = None
        self._model_loaded = True

    def _fallback_embed(self, text: str) -> list[float]:
        """Generate a deterministic 1024-dim unit vector from text hash."""
        vec = [0.0] * EMBEDDING_DIM
        hash_bytes = hashlib.sha256(text.encode("utf-8")).digest()
        for i in range(EMBEDDING_DIM):
            byte_val = hash_bytes[i % len(hash_bytes)]
            # Deterministic float based on position and character
            vec[i] = math.sin((i + 1) * (byte_val + 1))
        # Normalize to unit length
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    def embed_sync(
        self, texts: Sequence[str], is_query: bool = False
    ) -> list[list[float]]:
        if not texts:
            return []

        prefix = "query: " if is_query else "passage: "
        prefixed_texts = [
            t
            if t.startswith("query: ") or t.startswith("passage: ")
            else f"{prefix}{t}"
            for t in texts
        ]

        self._load_model()
        if self._model is not None:
            try:
                embeddings = self._model.encode(
                    prefixed_texts, normalize_embeddings=True
                )
                return [e.tolist() for e in embeddings]
            except Exception:
                pass

        return [self._fallback_embed(t) for t in prefixed_texts]

    async def embed_texts(
        self, texts: Sequence[str], is_query: bool = False
    ) -> list[list[float]]:
        return await asyncio.to_thread(self.embed_sync, texts, is_query=is_query)


embedder = Embedder.get_instance()


async def embed_texts(
    texts: Sequence[str], is_query: bool = False
) -> list[list[float]]:
    """Helper function to embed a list of texts."""
    return await embedder.embed_texts(texts, is_query=is_query)
