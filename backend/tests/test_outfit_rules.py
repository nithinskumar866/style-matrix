import pytest

from app.outfit_rules import SLOT_RANGES, slots_for_prompt


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
    classes = [c for low, high in SLOT_RANGES.values() for c in range(low, high + 1)]
    assert sorted(classes) == list(range(50))
