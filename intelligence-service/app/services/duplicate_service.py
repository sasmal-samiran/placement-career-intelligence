from typing import Callable

from fastapi import HTTPException

from config import settings
from schemas.duplicate import (
    FIELD_MODELS,
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    DuplicateRecordType,
    RecordFields,
)
from utils.similarity import jaccard_similarity, text_similarity

FieldComparator = Callable[[object, object], float]


def _text_score(first: object, second: object) -> float:
    if not isinstance(first, str) or not isinstance(second, str):
        return 0.0
    return text_similarity(first, second)


def _year_score(first: object, second: object) -> float:
    return float(first == second)


def _date_score(first: object, second: object) -> float:
    return float(first == second)


def _list_score(first: object, second: object) -> float:
    if not isinstance(first, list) or not isinstance(second, list):
        return 0.0
    return jaccard_similarity(first, second)


FIELD_COMPARATORS: dict[
    DuplicateRecordType, dict[str, FieldComparator]
] = {
    DuplicateRecordType.PROJECT: {
        "title": _text_score,
        "description": _text_score,
        "technologies": _list_score,
    },
    DuplicateRecordType.CERTIFICATION: {
        "name": _text_score,
        "issuer": _text_score,
        "issue_date": _date_score,
        "year": _year_score,
    },
    DuplicateRecordType.ACHIEVEMENT: {
        "title": _text_score,
        "description": _text_score,
        "year": _year_score,
    },
    DuplicateRecordType.INTERNSHIP: {
        "company": _text_score,
        "role": _text_score,
        "description": _text_score,
        "start_date": _date_score,
        "end_date": _date_score,
    },
}

FIELD_WEIGHTS: dict[DuplicateRecordType, dict[str, float]] = {
    DuplicateRecordType.PROJECT: {
        "title": settings.DUPLICATE_PROJECT_TITLE_WEIGHT,
        "description": settings.DUPLICATE_PROJECT_DESCRIPTION_WEIGHT,
        "technologies": settings.DUPLICATE_PROJECT_TECHNOLOGIES_WEIGHT,
    },
    DuplicateRecordType.CERTIFICATION: {
        "name": settings.DUPLICATE_CERTIFICATION_NAME_WEIGHT,
        "issuer": settings.DUPLICATE_CERTIFICATION_ISSUER_WEIGHT,
        "issue_date": settings.DUPLICATE_CERTIFICATION_ISSUE_DATE_WEIGHT,
        "year": settings.DUPLICATE_CERTIFICATION_YEAR_WEIGHT,
    },
    DuplicateRecordType.ACHIEVEMENT: {
        "title": settings.DUPLICATE_ACHIEVEMENT_TITLE_WEIGHT,
        "description": settings.DUPLICATE_ACHIEVEMENT_DESCRIPTION_WEIGHT,
        "year": settings.DUPLICATE_ACHIEVEMENT_YEAR_WEIGHT,
    },
    DuplicateRecordType.INTERNSHIP: {
        "company": settings.DUPLICATE_INTERNSHIP_COMPANY_WEIGHT,
        "role": settings.DUPLICATE_INTERNSHIP_ROLE_WEIGHT,
        "description": settings.DUPLICATE_INTERNSHIP_DESCRIPTION_WEIGHT,
        "start_date": settings.DUPLICATE_INTERNSHIP_START_DATE_WEIGHT,
        "end_date": settings.DUPLICATE_INTERNSHIP_END_DATE_WEIGHT,
    },
}


def _present(value: object) -> bool:
    if value is None or value == "":
        return False
    if isinstance(value, list):
        return any(isinstance(item, str) and item.strip() for item in value)
    return True


def _validate_record(
    record_type: DuplicateRecordType, record: dict[str, object]
) -> RecordFields:
    fields = {key: value for key, value in record.items() if key not in {"id", "_id"}}
    return FIELD_MODELS[record_type].model_validate(fields)


def _record_similarity(
    record_type: DuplicateRecordType,
    new_data: RecordFields,
    existing_data: RecordFields,
) -> float:
    left = new_data.model_dump()
    right = existing_data.model_dump()

    weighted_scores: list[tuple[float, float]] = []
    fields_to_compare = tuple(FIELD_COMPARATORS[record_type])
    for field in fields_to_compare:
        comparator = FIELD_COMPARATORS[record_type][field]
        first = left.get(field)
        second = right.get(field)
        weight = FIELD_WEIGHTS[record_type][field]
        if weight <= 0 or not _present(first) or not _present(second):
            continue
        weighted_scores.append((comparator(first, second), weight))

    total_weight = sum(weight for _, weight in weighted_scores)
    if not total_weight:
        return 0.0
    return sum(score * weight for score, weight in weighted_scores) / total_weight


class DuplicateDetectionService:
    @staticmethod
    def check(request: DuplicateCheckRequest) -> DuplicateCheckResponse:
        record_type = request.type
        record_model = FIELD_MODELS[record_type]
        new_data = record_model.model_validate(
            request.data.model_dump(exclude_none=True)
        )
        best_score = 0.0
        best_record: dict[str, object] | None = None

        try:
            for record in request.existing_records:
                existing_data = _validate_record(record_type, record)
                score = _record_similarity(record_type, new_data, existing_data)
                if score > best_score:
                    best_score = score
                    best_record = record
        except (ImportError, OSError, RuntimeError) as exc:
            raise HTTPException(
                status_code=503,
                detail="The semantic similarity model is unavailable. Verify model installation and cache/network access.",
            ) from exc

        similarity_score = best_score * 100
        similarity = round(similarity_score, 1)
        duplicate_threshold = settings.DUPLICATE_THRESHOLD
        review_threshold = settings.DUPLICATE_REVIEW_THRESHOLD

        if similarity_score >= duplicate_threshold:
            return DuplicateCheckResponse(
                is_duplicate=True,
                similarity=similarity,
            )
        if similarity_score >= review_threshold:
            return DuplicateCheckResponse(
                is_duplicate=False,
                similarity=similarity,
            )
        return DuplicateCheckResponse(
            is_duplicate=False,
            similarity=similarity,
        )
