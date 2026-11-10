from functools import lru_cache
from threading import Lock
from typing import Any

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

_model: Any = None
_model_lock = Lock()


def get_embedding_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer

                _model = SentenceTransformer(MODEL_NAME)
    return _model


@lru_cache(maxsize=4096)
def get_text_embedding(text: str):
    return get_embedding_model().encode(text, normalize_embeddings=True)
