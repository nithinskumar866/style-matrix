import re

# Classifier output ranges for each outfit slot (the model predicts 0-49)
SLOT_RANGES = {
    "top": (0, 19),
    "bottom": (20, 35),
    "full": (36, 49),
}

FULL_BODY_KEYWORDS = ["dress", "jumpsuit", "romper", "onesie", "kaftan", "sundress"]
FULL_BODY_PATTERN = re.compile(r"\b(" + "|".join(FULL_BODY_KEYWORDS) + r")(es|s)?\b")


def slots_for_prompt(prompt: str) -> list[str]:
    if FULL_BODY_PATTERN.search(prompt.lower()):
        return ["full"]
    return ["top", "bottom"]
