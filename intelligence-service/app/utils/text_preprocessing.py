import re
import unicodedata
from typing import Iterable


_MARKDOWN = re.compile(r"[*_`~>]+")
_WHITESPACE = re.compile(r"\s+")


def normalize_text(value: object) -> str:
    if value is None:
        return ""
    text = unicodedata.normalize("NFKC", str(value)).casefold()
    text = _MARKDOWN.sub(" ", text)
    return _WHITESPACE.sub(" ", text).strip()


def normalize_list(values: Iterable[object] | None) -> set[str]:
    if values is None:
        return set()
    return {normalized for value in values if (normalized := normalize_text(value))}
