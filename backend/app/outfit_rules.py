import re

# How many days clothes stay in the wash after being worn
WASH_DAYS = 5

# Classifier output for each outfit slot. The ResNet predicts 0-49, and the
# FashionCLIP check in util.py adds shoes and accessories, which it has no class for.
SHOES_CATEGORY = 50
ACCESSORY_CATEGORY = 51
MAX_CATEGORY = ACCESSORY_CATEGORY

SLOT_CATEGORIES = {
    "top": [2, 4, 6, 7, 8, 9, 11, 15, 16, 17, 18, 19],
    "outer": [0, 1, 3, 5, 10, 12, 13, 14, 37, 38],
    "bottom": list(range(20, 36)),
    "full": [36, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49],
    "shoes": [SHOES_CATEGORY],
    "accessory": [ACCESSORY_CATEGORY],
}

FULL_BODY_KEYWORDS = ["dress", "jumpsuit", "romper", "onesie", "kaftan", "sundress"]
FULL_BODY_PATTERN = re.compile(r"\b(" + "|".join(FULL_BODY_KEYWORDS) + r")(es|s)?\b")

LAYER_KEYWORDS = ["cold", "chilly", "winter", "layer", "layered", "jacket", "coat", "blazer", "formal", "interview", "business"]
LAYER_PATTERN = re.compile(r"\b(" + "|".join(LAYER_KEYWORDS) + r")s?\b")
# Below this temperature in Celsius an outfit gets an outer layer
LAYER_BELOW_CELSIUS = 15
HOT_ABOVE_CELSIUS = 27

GENDER_HINTS = {"male": "menswear", "female": "womenswear"}
BODY_TYPE_HINTS = {
    "slim": "flattering for a slim body",
    "athletic": "flattering for an athletic body",
    "average": "flattering for an average body",
    "curvy": "flattering for a curvy body",
    "plus-size": "flattering for a plus size body",
}
SKIN_TONE_HINTS = {
    "fair": "colors that suit fair skin",
    "light": "colors that suit light skin",
    "medium": "colors that suit medium skin",
    "tan": "colors that suit tan skin",
    "deep": "colors that suit deep skin",
}
PETITE_BELOW_CM = 160
TALL_ABOVE_CM = 185

# How much a reaction moves an outfit's score
EXACT_FEEDBACK_WEIGHT = 0.2
ITEM_FEEDBACK_WEIGHT = 0.1


def slots_for_prompt(prompt: str) -> list[str]:
    if FULL_BODY_PATTERN.search(prompt.lower()):
        return ["full"]
    return ["top", "bottom"]


def slot_for_category(category) -> str | None:
    try:
        value = int(category)
    except (TypeError, ValueError):
        return None
    return next((slot for slot, values in SLOT_CATEGORIES.items() if value in values), None)


def wants_outer_layer(prompt: str, weather: dict | None = None) -> bool:
    if LAYER_PATTERN.search(prompt.lower()):
        return True
    if not weather:
        return False
    temperature = weather.get("temperature")
    if temperature is not None and temperature < LAYER_BELOW_CELSIUS:
        return True
    return weather.get("condition") in ("rain", "snow")


def style_context(weather: dict | None = None, profile: dict | None = None) -> str:
    """Words describing the weather and the person, kept apart from the prompt so
    they nudge the search instead of drowning out what was asked for."""
    hints = []
    if weather:
        temperature = weather.get("temperature")
        if temperature is not None:
            if temperature < LAYER_BELOW_CELSIUS:
                hints.append("warm clothes for cold weather")
            elif temperature > HOT_ABOVE_CELSIUS:
                hints.append("light clothes for hot weather")
        if weather.get("condition") == "rain":
            hints.append("clothes for rainy weather")
        elif weather.get("condition") == "snow":
            hints.append("clothes for snowy weather")
    if profile:
        for hints_by_value, value in (
            (GENDER_HINTS, profile.get("gender")),
            (BODY_TYPE_HINTS, profile.get("body_type")),
            (SKIN_TONE_HINTS, profile.get("skin_tone")),
        ):
            if value in hints_by_value:
                hints.append(hints_by_value[value])
        height = profile.get("height")
        if height is not None:
            if height < PETITE_BELOW_CM:
                hints.append("petite fit")
            elif height > TALL_ABOVE_CM:
                hints.append("tall fit")
    return ", ".join(hints)


def feedback_adjustment(item_ids, feedback) -> float:
    """Score change from past reactions. `feedback` is a list of (item_ids, reward).

    `item_ids` are the outfit's main pieces. A reaction also covers the shoes and
    accessory shown with them, so it counts as the same outfit if it includes them all.
    """
    if not feedback:
        return 0.0
    outfit = set(item_ids)

    exact = next((reward for items, reward in feedback if outfit <= set(items)), None)
    if exact is not None:
        return exact * EXACT_FEEDBACK_WEIGHT

    # A new combination still leans on how its pieces were received elsewhere
    item_rewards = [
        [reward for items, reward in feedback if item_id in items]
        for item_id in outfit
    ]
    seen = [sum(rewards) / len(rewards) for rewards in item_rewards if rewards]
    if not seen:
        return 0.0
    return (sum(seen) / len(outfit)) * ITEM_FEEDBACK_WEIGHT
