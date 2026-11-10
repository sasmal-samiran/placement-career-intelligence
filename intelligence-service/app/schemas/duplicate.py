from datetime import date
from enum import Enum
from typing import Any, Union

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DuplicateRecordType(str, Enum):
    PROJECT = "project"
    CERTIFICATION = "certification"
    ACHIEVEMENT = "achievement"
    INTERNSHIP = "internship"


class RecordFields(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProjectFields(RecordFields):
    name: str | None = Field(default=None, max_length=300)
    description: str | None = Field(default=None, max_length=10_000)
    technologies: list[str] | None = Field(default=None, max_length=100)


class CertificationFields(RecordFields):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    name: str | None = Field(default=None, max_length=300)
    issuer: str | None = Field(default=None, max_length=300)
    issue_date: date | None = Field(default=None, alias="issueDate")
    year: int | None = Field(default=None, ge=1900, le=2100)


class AchievementFields(RecordFields):
    title: str | None = Field(default=None, max_length=300)
    description: str | None = Field(default=None, max_length=10_000)
    year: int | None = Field(default=None, ge=1900, le=2100)


class InternshipFields(RecordFields):
    company: str | None = Field(default=None, max_length=300)
    role: str | None = Field(default=None, max_length=300)
    description: str | None = Field(default=None, max_length=10_000)
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def validate_date_range(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("start_date must be on or before end_date")
        return self


FIELD_MODELS: dict[DuplicateRecordType, type[RecordFields]] = {
    DuplicateRecordType.PROJECT: ProjectFields,
    DuplicateRecordType.CERTIFICATION: CertificationFields,
    DuplicateRecordType.ACHIEVEMENT: AchievementFields,
    DuplicateRecordType.INTERNSHIP: InternshipFields,
}


class DuplicateCheckRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    student_id: str = Field(
        min_length=1,
        max_length=128,
        strip_whitespace=True,
        description="Request context only; this API does not authenticate or query by student ID.",
    )
    type: DuplicateRecordType = Field(description="Record type being checked.")
    data: Union[
        ProjectFields,
        CertificationFields,
        AchievementFields,
        InternshipFields,
    ] = Field(description="New record fields. The supported fields depend on `type`.")
    existing_records: list[dict[str, Any]] = Field(
        default_factory=list,
        max_length=250,
        description="Optional comparison records supplied by the caller; no database lookup is performed.",
    )

    @model_validator(mode="after")
    def validate_record_data(self):
        model = FIELD_MODELS[self.type]
        validated_data = model.model_validate(
            self.data.model_dump(exclude_unset=True)
        )
        if not any(
            (
                isinstance(value, str)
                and value.strip()
                or isinstance(value, list)
                and any(isinstance(item, str) and item.strip() for item in value)
                or isinstance(value, int)
                or isinstance(value, date)
            )
            for value in validated_data.model_dump().values()
        ):
            raise ValueError("data must include at least one non-empty supported field")
        self.data = validated_data

        supported_fields = set(model.model_fields)
        supported_fields.update(
            field.alias for field in model.model_fields.values() if field.alias
        )
        validated_records: list[dict[str, Any]] = []
        for index, record in enumerate(self.existing_records):
            unknown_fields = set(record) - supported_fields - {"id", "_id"}
            if unknown_fields:
                raise ValueError(
                    f"existing_records[{index}] contains unsupported fields: "
                    f"{', '.join(sorted(unknown_fields))}"
                )
            for key in ("id", "_id"):
                value = record.get(key)
                if value is not None and type(value) not in {str, int}:
                    raise ValueError(
                        f"existing_records[{index}].{key} must be a string or integer"
                    )
            fields = {
                key: value for key, value in record.items() if key not in {"id", "_id"}
            }
            validated_record = model.model_validate(fields).model_dump(exclude_none=True)
            for key in ("id", "_id"):
                if key in record:
                    validated_record[key] = record[key]
            validated_records.append(validated_record)
        self.existing_records = validated_records
        return self


class DuplicateCheckResponse(BaseModel):
    success: bool = True
    is_duplicate: bool
    similarity: float = Field(ge=0, le=100)
