import pytest

from app.outfit_rules import (
    MAX_CATEGORY,
    SLOT_CATEGORIES,
    feedback_adjustment,
    slot_for_category,
    slots_for_prompt,
    style_context,
    wants_outer_layer,
)


@pytest.mark.parametrize("prompt", [
    "summer dress",
    "Dresses for a party",
    "a floral sundress",
    "jumpsuit for work",
])
def test_full_body_prompts_use_the_full_slot(prompt):
    assert slots_for_prompt(prompt) == ["full"]


@pytest.mark.parametrize("prompt", [
    "well dressed for the office",
    "casual weekend",
    "",
])
def test_other_prompts_use_top_and_bottom(prompt):
    assert slots_for_prompt(prompt) == ["top", "bottom"]


def test_every_class_belongs_to_exactly_one_slot():
    classes = [c for values in SLOT_CATEGORIES.values() for c in values]
    assert sorted(classes) == list(range(MAX_CATEGORY + 1))


@pytest.mark.parametrize("category, slot", [
    ("17", "top"),      # Tee
    ("1", "outer"),     # Blazer
    ("25", "bottom"),   # Jeans
    ("40", "full"),     # Dress
    ("38", "outer"),    # Coat
    ("50", "shoes"),
    ("51", "accessory"),
    ("not a number", None),
    (None, None),
])
def test_slot_for_category(category, slot):
    assert slot_for_category(category) == slot


@pytest.mark.parametrize("prompt, weather, expected", [
    ("casual weekend", None, False),
    ("Formal wear for an interview", None, True),
    ("something with a jacket", None, True),
    ("casual weekend", {"temperature": 8, "condition": "clear"}, True),
    ("casual weekend", {"temperature": 30, "condition": "rain"}, True),
    ("casual weekend", {"temperature": 30, "condition": "clear"}, False),
    ("casual weekend", {"temperature": None, "condition": None}, False),
])
def test_wants_outer_layer(prompt, weather, expected):
    assert wants_outer_layer(prompt, weather) is expected


def test_style_context_is_empty_without_information():
    assert style_context() == ""
    assert style_context({"temperature": 20, "condition": "clear"}, {"gender": None}) == ""


def test_style_context_ignores_unknown_profile_values():
    assert style_context(profile={"gender": "ignore this", "body_type": "<script>", "skin_tone": "x"}) == ""


def test_style_context_combines_weather_and_profile():
    context = style_context(
        {"temperature": 5, "condition": "snow"},
        {"gender": "female", "body_type": "curvy", "skin_tone": "deep", "height": 150},
    )
    for hint in ("cold weather", "snowy", "womenswear", "curvy", "deep skin", "petite"):
        assert hint in context


def test_no_feedback_changes_nothing():
    assert feedback_adjustment([1, 2], []) == 0
    assert feedback_adjustment([1, 2], None) == 0
    assert feedback_adjustment([1, 2], [([3, 4], 1.0)]) == 0


def test_reaction_to_the_same_outfit_counts_most():
    assert feedback_adjustment([2, 1], [([1, 2], -1.0)]) == pytest.approx(-0.2)
    assert feedback_adjustment([1, 2], [([1, 2], 1.0)]) == pytest.approx(0.2)


def test_reaction_including_shoes_counts_for_the_main_pieces():
    assert feedback_adjustment([1, 2], [([1, 2, 7, 8], -1.0)]) == pytest.approx(-0.2)


def test_reactions_to_single_pieces_carry_over_more_gently():
    # Item 1 was liked in another outfit, and item 2 has never been seen
    assert feedback_adjustment([1, 2], [([1, 3], 1.0)]) == pytest.approx(0.05)
