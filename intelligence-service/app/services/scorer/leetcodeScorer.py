"""LeetCode scorer. Turns a student's public LeetCode data into a 0-100 preparation score.

The weights and formulas below are design choices made for this project.
They are not validated against real placement outcomes.
"""
import json
import math
import sys
import time
from typing import Any, Optional
from urllib.parse import quote

import requests

from app.config import leetcode_settings

SCORING_VERSION = "1.0.0"

REQUEST_TIMEOUT = (5, 45)

# How much each component counts towards the final score
WEIGHTS = {
    "problem_solving": 0.35,
    "contest": 0.30,
    "consistency": 0.15,
    "progress": 0.10,
    "topic_coverage": 0.10,
}

POINTS_PER_PROBLEM = {"easy": 1, "medium": 3, "hard": 5}
POINTS_SCALE = 600  

MIN_RATING = 1200
MAX_RATING = 2200
TARGET_CONTESTS = 10                # attended contests needed for full participation credit
RATING_SHARE = 0.7                  # contest score = 70% rating + 30% participation

WEEK = 7 * 24 * 60 * 60             # consistency: look at the last 52 weeks, 30 active weeks gives full marks
WINDOW_WEEKS = 52
TARGET_ACTIVE_WEEKS = 30

                
MIN_CONTESTS_FOR_PROGRESS = 5       # Progress: needs enough contests, and a +/-200 rating change maps to 100 / 0
PROGRESS_SWING = 200


class LeetCodeAPIError(Exception):
    """Raised when LeetCode data cannot be fetched or cannot be used."""


def _number(value: Any) -> Optional[float]:
    '''return only finite numbers, or None for anything else'''
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _whole(value: Any) -> Optional[int]:
    """return value as a whole number >= 0, or None."""
    number = _number(value)
    if number is None or number < 0 or number != int(number):
        return None
    return int(number)


def _limit(score: float) -> float:
    '''0.0 <= score <= 100.0'''
    return max(0.0, min(100.0, score))


class LeetCodeScorer:
    """Scores one LeetCode user. The API is called once and the data is reused."""

    def __init__(self, user_name: str, now: Optional[float] = None) -> None:
        user_name = (user_name or "").strip()
        if not user_name:
            raise ValueError("user_name must not be empty")
        self.user_name = user_name
        self._now = now  
        self._profile: Optional[dict] = None
        self._contest_data: Any = None
        self._contest_error: Optional[str] = None

    def _get_json(self, endpoint: str) -> Any:
        base_url = leetcode_settings.LEETCODE_API_BASE_URL.rstrip("/")
        url = f"{base_url}/{quote(self.user_name, safe='')}/{endpoint}"
        try:
            response = requests.get(url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return response.json()
        except requests.HTTPError as error:
            status = error.response.status_code if error.response is not None else "unknown"
            note = " (rate limited, try again later)" if status == 429 else ""
            raise LeetCodeAPIError(f"{endpoint} request failed: HTTP {status}{note}") from error
        except ValueError as error:
            raise LeetCodeAPIError(f"{endpoint} returned malformed JSON") from error
        except requests.RequestException as error:
            raise LeetCodeAPIError(f"{endpoint} request failed: {error}") from error

    def _load_data(self) -> None:
        '''fetch profile and contest data once'''
        if self._profile is not None:
            return

        profile = self._get_json("profile")
        if not isinstance(profile, dict):
            raise LeetCodeAPIError("Unexpected profile response format")
        if profile.get("errors"):
            raise LeetCodeAPIError(f"LeetCode API returned an error: {profile['errors']}")
        if not any(key in profile for key in ("totalSolved", "easySolved", "submissionCalendar")):
            raise LeetCodeAPIError("Profile response does not contain the expected fields")
        self._profile = profile

        try:
            self._contest_data = self._get_json("contest")
        except LeetCodeAPIError as error:
            self._contest_error = str(error)

    def _score_problems(self, warnings: list) -> tuple:
        """Score from unique solved problems, weighted by difficulty."""
        solved = {}
        for level in POINTS_PER_PROBLEM:
            count = _whole(self._profile.get(f"{level}Solved"))
            if count is None:
                warnings.append(f"{level}Solved is missing or invalid, so problem solving was not scored.")
                return None, {}

            name = f"total{level.capitalize()}"
            available = _whole(self._profile.get(name))
            if available and count > available:
                warnings.append(f"{level}Solved ({count}) is more than {name} ({available}), so it was reduced.")
                count = available
            solved[level] = count

        total = sum(solved.values())
        reported_total = _whole(self._profile.get("totalSolved"))
        if reported_total is not None and reported_total != total:
            warnings.append(f"totalSolved ({reported_total}) does not match Easy+Medium+Hard ({total}); using {total}.")

        points = sum(POINTS_PER_PROBLEM[level] * n for level, n in solved.items())
        score = 100 * (1 - math.exp(-points / POINTS_SCALE))
        metrics = {
            "easy_solved": solved["easy"],
            "medium_solved": solved["medium"],
            "hard_solved": solved["hard"],
            "total_solved": total,
            "weighted_points": points,
        }
        return score, metrics

    def _read_contests(self, warnings: list) -> list:
        '''return the contests the student really attended, oldest first'''
        data = self._contest_data
        records = data.get("contestParticipation") if isinstance(data, dict) else None
        if not isinstance(records, list):
            warnings.append("Contest response has no usable contestParticipation list.")
            return []

        contests = []
        skipped = 0
        for record in records:
            # LeetCode also lists contests the student did not take part in; ignore those.
            if not isinstance(record, dict) or record.get("attended") is not True:
                continue

            info = record.get("contest")
            start = _number(info.get("startTime")) if isinstance(info, dict) else None
            rating = _number(record.get("rating")) or 0
            ranking = _number(record.get("ranking")) or 0

            # An attended contest with ranking 0 looks like placeholder data.
            if start is None or rating <= 0 or ranking <= 0:
                skipped += 1
                continue
            contests.append({"start": start, "rating": rating})

        if skipped:
            warnings.append(f"Ignored {skipped} attended contest record(s) with zero ranking or invalid fields.")
        return sorted(contests, key=lambda c: c["start"])

    def _score_contests(self, contests: list) -> tuple:
        '''score from the latest rating and the number of contests attended.'''
        if not contests:
            return None, {"contests_attended": 0, "contest_rating": None}

        rating = contests[-1]["rating"]
        rating_score = _limit(100 * (rating - MIN_RATING) / (MAX_RATING - MIN_RATING))
        participation_score = _limit(100 * len(contests) / TARGET_CONTESTS)
        score = RATING_SHARE * rating_score + (1 - RATING_SHARE) * participation_score
        return score, {"contests_attended": len(contests), "contest_rating": round(rating, 2)}

    def _score_progress(self, contests: list) -> tuple:
        '''score from how much the rating changed between the first and latest contest.'''
        if len(contests) < MIN_CONTESTS_FOR_PROGRESS:
            return None, {"rating_change": None}

        change = contests[-1]["rating"] - contests[0]["rating"]
        score = _limit(50 + 50 * change / PROGRESS_SWING)  # no change = 50
        return score, {"rating_change": round(change, 2)}

    def _read_calendar(self) -> Optional[dict]:
        '''Return {timestamp: submissions}, or None if the calendar is missing/broken.'''
        raw = self._profile.get("submissionCalendar")
        if isinstance(raw, str):  
            try:
                raw = json.loads(raw)
            except ValueError:
                return None
        if not isinstance(raw, dict):
            return None

        calendar = {}
        for timestamp, submissions in raw.items():
            timestamp = _number(timestamp)
            submissions = _whole(submissions)
            if timestamp is not None and submissions is not None:
                calendar[int(timestamp)] = submissions

        if raw and not calendar:
            return None
        return calendar

    def _score_consistency(self, calendar: dict, now: float) -> tuple:
        '''Score from how many of the last 52 weeks had at least one submission.'''
        active_weeks = set()
        active_days = 0
        for timestamp, submissions in calendar.items():
            age = now - timestamp
            if submissions > 0 and 0 <= age < WINDOW_WEEKS * WEEK:
                active_weeks.add(int(age // WEEK))
                active_days += 1

        score = _limit(100 * len(active_weeks) / TARGET_ACTIVE_WEEKS)
        metrics = {
            "active_days_last_52_weeks": active_days,
            "active_weeks_last_52_weeks": len(active_weeks),
        }
        return score, metrics


    # public method 
    def get_score(self) -> dict:
        '''return the final score, its components and the data behind them. Raises LeetCodeAPIError if the profile cannot be fetched.
        '''
        self._load_data()
        now = self._now if self._now is not None else time.time()
        warnings = []

        problem_score, problem_metrics = self._score_problems(warnings)

        contests = []
        if self._contest_error:
            warnings.append(f"Contest data unavailable: {self._contest_error}")
        else:
            contests = self._read_contests(warnings)
            if not contests:
                warnings.append("No valid attended contests; contest score not computed.")
        contest_score, contest_metrics = self._score_contests(contests)

        progress_score, progress_metrics = self._score_progress(contests)
        if progress_score is None:
            warnings.append(f"Progress needs at least {MIN_CONTESTS_FOR_PROGRESS} valid contests; not computed.")

        consistency_score, consistency_metrics = None, {}
        calendar = self._read_calendar()
        if calendar is None:
            warnings.append("submissionCalendar missing or invalid; consistency not computed.")
        else:
            consistency_score, consistency_metrics = self._score_consistency(calendar, now)

        # The endpoints we use have no topic-wise data, so we do not guess it.
        warnings.append("Topic-wise statistics are not available from the API; topic coverage not computed.")

        components = {
            "problem_solving": problem_score,
            "contest": contest_score,
            "consistency": consistency_score,
            "progress": progress_score,
            "topic_coverage": None,
        }

        # Final score only uses the components we actually have.
        available = {name: score for name, score in components.items() if score is not None}
        available_weight = sum(WEIGHTS[name] for name in available)
        if available_weight > 0:
            final_score = sum(WEIGHTS[name] * score for name, score in available.items()) / available_weight
            final_score = round(_limit(final_score), 2)
        else:
            final_score = None
        coverage = round(100 * available_weight, 2)

        metrics = {**problem_metrics, **contest_metrics, **progress_metrics, **consistency_metrics}
        metrics["global_ranking"] = _whole(self._profile.get("ranking")) or None  # shown only, not scored

        return {
            "username": self.user_name,
            "final_score": final_score,
            "data_coverage_percent": coverage,
            "components": {name: None if score is None else round(score, 2) for name, score in components.items()},
            "metrics": metrics,
            "warnings": warnings,
            "scoring_version": SCORING_VERSION,
        }


if __name__ == "__main__":
    # Run from intelligence-service/:  python -m app.services.scorer.leetcodeScorer <username>
    name = str(input("LeetCode username: "))
    try:
        print(json.dumps(LeetCodeScorer(name).get_score(), indent=2))
    except LeetCodeAPIError as error:
        print(f"Could not score {name}: {error}")
