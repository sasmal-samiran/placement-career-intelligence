from rapidfuzz import fuzz

from models.embedding_model import get_text_embedding
from utils.text_preprocessing import normalize_list, normalize_text


def semantic_similarity(first: str, second: str) -> float:
    normalized_first = normalize_text(first)
    normalized_second = normalize_text(second)
    if not normalized_first or not normalized_second:
        return 0.0
    if normalized_first == normalized_second:
        return 1.0

    first_embedding = get_text_embedding(normalized_first)
    second_embedding = get_text_embedding(normalized_second)
    cosine_similarity = float(first_embedding @ second_embedding)
    return max(0.0, min(1.0, cosine_similarity))


def fuzzy_similarity(first: str, second: str) -> float:
    normalized_first = normalize_text(first)
    normalized_second = normalize_text(second)
    if not normalized_first or not normalized_second:
        return 0.0
    return fuzz.WRatio(normalized_first, normalized_second) / 100


def jaccard_similarity(first: list[str] | None, second: list[str] | None) -> float:
    first_values = normalize_list(first)
    second_values = normalize_list(second)
    union = first_values | second_values
    if not union:
        return 0.0
    return len(first_values & second_values) / len(union)


def text_similarity(first: str, second: str) -> float:
    normalized_first = normalize_text(first)
    normalized_second = normalize_text(second)
    if not normalized_first or not normalized_second:
        return 0.0
    if normalized_first == normalized_second:
        return 1.0
    return 0.65 * semantic_similarity(normalized_first, normalized_second) + (
        0.35 * fuzzy_similarity(normalized_first, normalized_second)
    )
