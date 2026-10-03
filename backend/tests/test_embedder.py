import sys

import pytest

from app.core.config import settings
from app.core.embedder import EMBEDDING_DIM, Embedder


def _break_sentence_transformers(monkeypatch):
    monkeypatch.setitem(sys.modules, "sentence_transformers", None)


def test_fallback_embeddings_when_model_missing(monkeypatch):
    monkeypatch.setattr(settings, "embed_allow_fallback", True)
    _break_sentence_transformers(monkeypatch)

    vectors = Embedder().embed_sync(["hello"])

    assert len(vectors) == 1
    assert len(vectors[0]) == EMBEDDING_DIM


def test_raises_when_fallback_disabled(monkeypatch):
    monkeypatch.setattr(settings, "embed_allow_fallback", False)
    _break_sentence_transformers(monkeypatch)

    with pytest.raises(RuntimeError):
        Embedder().embed_sync(["hello"])
