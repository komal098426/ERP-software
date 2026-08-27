import re

from rapidfuzz import fuzz

PARTY_SIMILARITY_THRESHOLD = 0.6
EMPLOYEE_NAME_SIMILARITY_THRESHOLD = 0.85

_PUNCTUATION_RE = re.compile(r"[^\w\s]")
_WHITESPACE_RE = re.compile(r"\s+")


def normalize_name(name: str) -> str:
    """Lowercase, replace punctuation with spaces, collapse whitespace.

    Used for both party duplicate detection (SRD §9) and employee name similarity (SRD §8),
    kept as one function so "AL HABIB KNITTWEAR" and "Al-Habib Knittwear" normalize identically.
    Punctuation is replaced with a space (not deleted) so "Al-Habib" doesn't collapse into the
    single word "Alhabib" and drift away from the space-separated "Al Habib".
    """
    lowered = name.strip().lower()
    spaced = _PUNCTUATION_RE.sub(" ", lowered)
    return _WHITESPACE_RE.sub(" ", spaced).strip()


def normalize_contact_value(value: str) -> str:
    """Strip spaces/dashes for national_id/phone comparison, lowercase for email."""
    stripped = re.sub(r"[\s\-]", "", value.strip())
    return stripped.lower()


def similarity(name_a: str, name_b: str) -> float:
    """Trigram-equivalent similarity score in [0, 1], computed in Python (rapidfuzz) so it behaves
    identically on SQLite (dev) and Postgres (prod) without relying on the pg_trgm extension."""
    normalized_a, normalized_b = normalize_name(name_a), normalize_name(name_b)
    if not normalized_a or not normalized_b:
        return 0.0
    return fuzz.token_sort_ratio(normalized_a, normalized_b) / 100.0


def find_similar(name: str, candidates: list[tuple[str, str]], threshold: float) -> list[tuple[str, float]]:
    """candidates: list of (candidate_id_as_str, candidate_name). Returns [(candidate_id, score), ...]
    for every candidate scoring >= threshold, sorted by score descending."""
    scored = [(candidate_id, similarity(name, candidate_name)) for candidate_id, candidate_name in candidates]
    matches = [(candidate_id, score) for candidate_id, score in scored if score >= threshold]
    matches.sort(key=lambda pair: pair[1], reverse=True)
    return matches
