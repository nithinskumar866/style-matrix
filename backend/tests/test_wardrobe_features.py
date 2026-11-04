from datetime import datetime, timedelta, timezone

from PIL import Image
import pytest
from sqlalchemy import text

from app.database import engine
from app.routes import wardrobe_routes
from app import services
from conftest import as_user


def items(client, user="alice", **params):
    return client.get("/api/wardrobe/items", params=params, headers=as_user(user)).json()


def wear(client, item_ids, user="alice"):
    return client.post("/api/wardrobe/wear-today", json={"item_ids": item_ids}, headers=as_user(user))


def set_last_worn(item_id, days_ago):
    with engine.begin() as connection:
        connection.execute(
            text("UPDATE clothing_items SET last_worn_date = :worn WHERE id = :id"),
            {"worn": datetime.now(timezone.utc) - timedelta(days=days_ago), "id": item_id},
        )


def test_delete_removes_only_your_item(client, add_item, item_count):
    item = add_item("alice")
    assert client.delete(f"/api/wardrobe/items/{item}", headers=as_user("bob")).status_code == 404
    assert item_count() == 1
    assert client.delete(f"/api/wardrobe/items/{item}", headers=as_user("alice")).status_code == 200
    assert item_count() == 0


def test_deleting_a_worn_item_also_removes_its_history(client, add_item):
    item = add_item("alice")
    wear(client, [item])
    assert client.delete(f"/api/wardrobe/items/{item}", headers=as_user("alice")).status_code == 200
    history = client.get("/api/wardrobe/history", headers=as_user("alice")).json()
    assert history["results"] == []


def test_update_changes_category_and_price(client, add_item):
    item = add_item("alice")
    response = client.patch(f"/api/wardrobe/items/{item}", json={"category": 25, "price": 40}, headers=as_user("alice"))
    assert response.status_code == 200
    saved = items(client)["results"][0]
    assert (saved["category"], saved["price"]) == ("25", 40)


def test_update_leaves_fields_that_were_not_sent(client, add_item):
    item = add_item("alice", category="17")
    client.patch(f"/api/wardrobe/items/{item}", json={"price": 10}, headers=as_user("alice"))
    assert items(client)["results"][0]["category"] == "17"


def test_price_can_be_cleared(client, add_item):
    item = add_item("alice")
    client.patch(f"/api/wardrobe/items/{item}", json={"price": 10}, headers=as_user("alice"))
    client.patch(f"/api/wardrobe/items/{item}", json={"price": None}, headers=as_user("alice"))
    assert items(client)["results"][0]["price"] is None


@pytest.mark.parametrize("body", [{"category": 52}, {"category": -1}, {"category": None}, {"price": -1}])
def test_update_rejects_bad_values(client, add_item, body):
    item = add_item("alice", category="17")
    assert client.patch(f"/api/wardrobe/items/{item}", json=body, headers=as_user("alice")).status_code in (400, 422)
    assert items(client)["results"][0]["category"] == "17"


def test_cannot_update_another_users_item(client, add_item):
    item = add_item("alice")
    assert client.patch(f"/api/wardrobe/items/{item}", json={"price": 1}, headers=as_user("bob")).status_code == 404


def test_wash_makes_an_item_available_again(client, add_item, last_worn):
    item = add_item("alice")
    wear(client, [item])
    assert items(client, status="laundry")["total"] == 1
    assert client.post("/api/wardrobe/wash", json={"item_ids": [item]}, headers=as_user("alice")).status_code == 200
    assert last_worn(item) is None
    assert items(client, status="available")["total"] == 1


def test_cannot_wash_another_users_item(client, add_item, last_worn):
    item = add_item("alice")
    wear(client, [item])
    assert client.post("/api/wardrobe/wash", json={"item_ids": [item]}, headers=as_user("bob")).status_code == 404
    assert last_worn(item) is not None


def test_undo_restores_the_earlier_date(client, add_item, last_worn):
    item = add_item("alice")
    set_last_worn(item, 10)
    before = last_worn(item)
    key = wear(client, [item]).json()["outfit_key"]
    assert last_worn(item) != before
    assert client.post("/api/wardrobe/undo-wear", json={"outfit_key": key}, headers=as_user("alice")).status_code == 200
    assert last_worn(item) == before
    assert client.get("/api/wardrobe/history", headers=as_user("alice")).json()["results"] == []


def test_undo_does_not_bring_back_a_washed_item(client, add_item, last_worn):
    item = add_item("alice")
    set_last_worn(item, 2)
    key = wear(client, [item]).json()["outfit_key"]
    client.post("/api/wardrobe/wash", json={"item_ids": [item]}, headers=as_user("alice"))
    client.post("/api/wardrobe/undo-wear", json={"outfit_key": key}, headers=as_user("alice"))
    assert last_worn(item) is None


def test_cannot_undo_another_users_wear(client, add_item, last_worn):
    item = add_item("alice")
    key = wear(client, [item]).json()["outfit_key"]
    assert client.post("/api/wardrobe/undo-wear", json={"outfit_key": key}, headers=as_user("bob")).status_code == 404
    assert last_worn(item) is not None


def test_items_page_through_with_a_full_total(client, add_item):
    created = [add_item("alice") for _ in range(5)]
    first = items(client, limit=2, offset=0)
    second = items(client, limit=2, offset=2)
    assert first["total"] == 5
    assert [i["id"] for i in first["results"]] == [created[4], created[3]]
    assert [i["id"] for i in second["results"]] == [created[2], created[1]]


@pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 101}, {"offset": -1}, {"status": "nope"}])
def test_items_rejects_bad_paging(client, params):
    assert client.get("/api/wardrobe/items", params=params, headers=as_user("alice")).status_code == 422


def test_items_rejects_unknown_slot(client):
    assert client.get("/api/wardrobe/items", params={"slot": "nope"}, headers=as_user("alice")).status_code == 400


def test_items_filter_by_status_and_slot(client, add_item):
    tee = add_item("alice", category="17")
    jeans = add_item("alice", category="25")
    worn = add_item("alice", category="17")
    wear(client, [worn])

    tops = items(client, slot="top", status="available")
    assert [i["id"] for i in tops["results"]] == [tee]
    assert tops["counts"] == {"available": 1, "laundry": 1}

    laundry = items(client, status="laundry")
    assert [i["id"] for i in laundry["results"]] == [worn]
    assert laundry["results"][0]["in_wash"] is True
    assert items(client, slot="bottom")["results"][0]["id"] == jeans


def test_items_leave_the_wash_after_five_days(client, add_item):
    fresh, old = add_item("alice"), add_item("alice")
    set_last_worn(fresh, 4)
    set_last_worn(old, 6)
    assert [i["id"] for i in items(client, status="laundry")["results"]] == [fresh]
    assert [i["id"] for i in items(client, status="available")["results"]] == [old]


def test_history_groups_an_outfit_and_is_private(client, add_item):
    top, bottom = add_item("alice", category="17"), add_item("alice", category="25")
    key = wear(client, [bottom, top]).json()["outfit_key"]

    results = client.get("/api/wardrobe/history", headers=as_user("alice")).json()["results"]
    assert len(results) == 1
    assert results[0]["outfit_key"] == key
    # Pieces stay in the order they were sent, which is how the outfit was laid out
    assert [i["id"] for i in results[0]["items"]] == [bottom, top]
    assert client.get("/api/wardrobe/history", headers=as_user("bob")).json()["results"] == []


def test_history_can_be_limited_to_a_date_range(client, add_item):
    wear(client, [add_item("alice")])
    now = datetime.now(timezone.utc)

    def between(start, end):
        response = client.get(
            "/api/wardrobe/history",
            params={"start": start.isoformat(), "end": end.isoformat()},
            headers=as_user("alice"),
        )
        return response.json()["results"]

    assert len(between(now - timedelta(days=1), now + timedelta(days=1))) == 1
    assert between(now + timedelta(days=1), now + timedelta(days=2)) == []


def test_saved_outfits_lifecycle(client, add_item):
    top, bottom = add_item("alice", category="17"), add_item("alice", category="25")
    saved = client.post("/api/wardrobe/saved-outfits", json={"name": "Office", "item_ids": [top, bottom]}, headers=as_user("alice"))
    assert saved.status_code == 200

    results = client.get("/api/wardrobe/saved-outfits", headers=as_user("alice")).json()["results"]
    assert results[0]["name"] == "Office"
    assert [i["id"] for i in results[0]["items"]] == [top, bottom]

    # Another user neither sees nor deletes it
    assert client.get("/api/wardrobe/saved-outfits", headers=as_user("bob")).json()["results"] == []
    outfit_id = saved.json()["id"]
    assert client.delete(f"/api/wardrobe/saved-outfits/{outfit_id}", headers=as_user("bob")).status_code == 404
    assert client.delete(f"/api/wardrobe/saved-outfits/{outfit_id}", headers=as_user("alice")).status_code == 200
    assert client.get("/api/wardrobe/saved-outfits", headers=as_user("alice")).json()["results"] == []


def test_cannot_save_another_users_item(client, add_item):
    item = add_item("alice")
    response = client.post("/api/wardrobe/saved-outfits", json={"name": "Mine", "item_ids": [item]}, headers=as_user("bob"))
    assert response.status_code == 404


def test_saved_outfit_drops_deleted_items(client, add_item):
    top, bottom = add_item("alice"), add_item("alice")
    client.post("/api/wardrobe/saved-outfits", json={"name": "Both", "item_ids": [top, bottom]}, headers=as_user("alice"))

    client.delete(f"/api/wardrobe/items/{top}", headers=as_user("alice"))
    results = client.get("/api/wardrobe/saved-outfits", headers=as_user("alice")).json()["results"]
    assert [i["id"] for i in results[0]["items"]] == [bottom]

    client.delete(f"/api/wardrobe/items/{bottom}", headers=as_user("alice"))
    assert client.get("/api/wardrobe/saved-outfits", headers=as_user("alice")).json()["results"] == []


def test_insights_counts_and_cost_per_wear(client, add_item):
    tee = add_item("alice", category="17")
    jeans = add_item("alice", category="25")
    add_item("alice", category="50")
    add_item("bob", category="17")
    client.patch(f"/api/wardrobe/items/{tee}", json={"price": 30}, headers=as_user("alice"))
    wear(client, [tee, jeans])
    wear(client, [tee])
    wear(client, [tee])

    data = client.get("/api/wardrobe/insights", headers=as_user("alice")).json()
    assert data["total_items"] == 3
    assert data["in_wash"] == 2
    assert data["total_wears"] == 4
    assert data["by_slot"]["top"] == 1
    assert data["by_slot"]["shoes"] == 1
    assert data["most_worn"][0]["id"] == tee
    assert data["most_worn"][0]["wear_count"] == 3
    assert data["never_worn_count"] == 1
    assert data["best_value"][0]["cost_per_wear"] == 10


def test_insights_for_an_empty_wardrobe(client):
    data = client.get("/api/wardrobe/insights", headers=as_user("alice")).json()
    assert data["total_items"] == 0
    assert data["most_worn"] == []


def feedback_rows():
    with engine.connect() as connection:
        return connection.execute(text("SELECT items, interaction_type, reward FROM feedback")).fetchall()


def test_feedback_is_saved_and_a_new_reaction_replaces_the_old(client, add_item):
    top, bottom = add_item("alice"), add_item("alice")
    body = {"item_ids": [bottom, top], "liked": True, "occasion": "brunch", "predicted_score": 0.5}
    assert client.post("/api/feedback/", json=body, headers=as_user("alice")).status_code == 200
    assert feedback_rows()[0].reward == 1.0

    client.post("/api/feedback/", json={**body, "liked": False}, headers=as_user("alice"))
    rows = feedback_rows()
    assert len(rows) == 1
    assert (rows[0].items, rows[0].interaction_type, rows[0].reward) == ([top, bottom], "dislike", -1.0)


def test_cannot_react_to_another_users_item(client, add_item):
    item = add_item("alice")
    response = client.post("/api/feedback/", json={"item_ids": [item], "liked": True}, headers=as_user("bob"))
    assert response.status_code == 404
    assert feedback_rows() == []


def test_recommend_passes_weather_and_profile_in_the_body(client):
    services.recommend_calls.clear()
    response = client.post(
        "/api/recommendation/recommend",
        json={"prompt": "brunch", "weather": {"temperature": 8, "condition": "rain"}, "profile": {"gender": "female"}},
        headers=as_user("alice"),
    )
    assert response.status_code == 200
    call = services.recommend_calls[0]
    assert call["prompt"] == "brunch"
    assert call["weather"]["temperature"] == 8
    assert call["profile"]["gender"] == "female"


def test_transparent_images_are_analysed_on_white():
    image = Image.new("RGBA", (2, 1), (0, 0, 0, 0))
    image.putpixel((1, 0), (200, 10, 10, 255))
    flattened = wardrobe_routes.flatten_on_white(image)
    assert flattened.mode == "RGB"
    assert flattened.getpixel((0, 0)) == (255, 255, 255)
    assert flattened.getpixel((1, 0)) == (200, 10, 10)


def test_remove_background_returns_a_png(client, monkeypatch):
    monkeypatch.setattr(wardrobe_routes, "remove_background", lambda data: b"png:" + data)
    response = client.post("/api/wardrobe/remove-background", content=b"photo", headers=as_user("alice"))
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content == b"png:photo"


def test_remove_background_rejects_empty_and_oversized_bodies(client, monkeypatch):
    monkeypatch.setattr(wardrobe_routes, "MAX_UPLOAD_BYTES", 4)
    assert client.post("/api/wardrobe/remove-background", content=b"", headers=as_user("alice")).status_code == 400
    assert client.post("/api/wardrobe/remove-background", content=b"12345", headers=as_user("alice")).status_code == 413


def test_remove_background_rejects_something_that_is_not_an_image(client):
    response = client.post("/api/wardrobe/remove-background", content=b"not an image", headers=as_user("alice"))
    assert response.status_code == 422


def test_a_new_users_first_requests_can_arrive_together(client):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier

    from app.crud import get_user
    from app.database import SessionLocal

    # Each round is a brand new user, because only the first insert can collide
    for round_number in range(10):
        name = f"new-user-{round_number}"
        barrier = Barrier(6)

        def first_request(_):
            db = SessionLocal()
            try:
                barrier.wait()
                return get_user(db, name).id
            finally:
                db.close()

        with ThreadPoolExecutor(max_workers=6) as pool:
            ids = list(pool.map(first_request, range(6)))
        assert len(set(ids)) == 1
