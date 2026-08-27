from app.services.duplicate_detection import find_similar, normalize_name, similarity


def test_normalize_name_strips_punctuation_and_case():
    assert normalize_name("Al-Habib Knittwear") == normalize_name("AL HABIB KNITTWEAR")


def test_similarity_exact_match_is_one():
    assert similarity("Al Habib Knittwear", "Al Habib Knittwear") == 1.0


def test_similarity_unrelated_names_below_threshold():
    assert similarity("Al Habib Knittwear", "Zephyr Logistics Co") < 0.6


def test_find_similar_returns_matches_at_or_above_threshold():
    candidates = [
        ("1", "Al Habib Knittwear"),
        ("2", "Al-Habib Knitwear"),  # near-duplicate, one typo
        ("3", "Completely Different Vendor"),
    ]
    matches = find_similar("Al Habib Knittwear", candidates, threshold=0.6)
    matched_ids = {candidate_id for candidate_id, _ in matches}
    assert "1" in matched_ids
    assert "2" in matched_ids
    assert "3" not in matched_ids


def test_find_similar_sorted_descending_by_score():
    candidates = [("close", "Al Habib Knitwear"), ("exact", "Al Habib Knittwear")]
    matches = find_similar("Al Habib Knittwear", candidates, threshold=0.5)
    assert matches[0][0] == "exact"
