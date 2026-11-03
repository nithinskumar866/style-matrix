from io import BytesIO

import httpx
from PIL import Image
import pytest

from app.routes import wardrobe_routes
from conftest import SUPABASE_URL, as_user

STORAGE = f"{SUPABASE_URL}/storage/v1/object/public/clothes"
GOOD_IMAGE = f"{STORAGE}/good.png"
CORRUPT_IMAGE = f"{STORAGE}/corrupt.png"
MISSING_IMAGE = f"{STORAGE}/missing.png"
UNREACHABLE_IMAGE = f"{STORAGE}/unreachable.png"


def png_bytes():
    buffer = BytesIO()
    Image.new("RGB", (8, 8)).save(buffer, format="PNG")
    return buffer.getvalue()


class FakeAsyncClient:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def get(self, url):
        if url == UNREACHABLE_IMAGE:
            raise httpx.ConnectError("unreachable")
        if url == MISSING_IMAGE:
            return httpx.Response(404)
        if url == CORRUPT_IMAGE:
            return httpx.Response(200, content=b"not an image")
        return httpx.Response(200, content=png_bytes())


@pytest.fixture(autouse=True)
def fake_image_downloads(monkeypatch):
    monkeypatch.setattr(wardrobe_routes.httpx, "AsyncClient", FakeAsyncClient)


def wear(client, item_ids, user):
    return client.post("/api/wardrobe/wear-today", json={"item_ids": item_ids}, headers=as_user(user))


def add(client, urls, user="alice"):
    return client.post("/api/wardrobe/add-clothing", json={"imageUrls": urls}, headers=as_user(user))


def test_owner_can_wear_their_item(client, add_item, last_worn):
    item = add_item("alice")
    assert wear(client, [item], "alice").status_code == 200
    assert last_worn(item) is not None


def test_cannot_wear_another_users_item(client, add_item, last_worn):
    item = add_item("alice")
    assert wear(client, [item], "bob").status_code == 404
    assert last_worn(item) is None


def test_one_foreign_item_rejects_the_whole_request(client, add_item, last_worn):
    mine = add_item("bob")
    theirs = add_item("alice")
    assert wear(client, [mine, theirs], "bob").status_code == 404
    assert last_worn(mine) is None
    assert last_worn(theirs) is None


def test_wear_unknown_item_returns_404(client):
    assert wear(client, [999], "alice").status_code == 404


def test_wear_with_no_items_returns_400(client):
    assert wear(client, [], "alice").status_code == 400


@pytest.mark.parametrize("url", [
    f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json",
    "http://169.254.169.254/latest/meta-data/",
    "http://localhost:8000/openapi.json",
    "file:///etc/passwd",
    GOOD_IMAGE.replace("https://", "http://"),
    f"{STORAGE}/../../../auth/v1/keys",
    f"{STORAGE}/%2e%2e/%2e%2e/auth/v1/keys",
    "https://project.supabase.test.evil.test/storage/v1/object/public/x.png",
    "https://project.supabase.test@evil.test/storage/v1/object/public/x.png",
])
def test_upload_rejects_urls_outside_our_storage(client, url, item_count):
    assert add(client, [url]).status_code == 400
    assert item_count() == 0


def test_upload_rejects_batch_containing_a_blocked_url(client, item_count):
    assert add(client, [GOOD_IMAGE, "http://localhost:8000/x.png"]).status_code == 400
    assert item_count() == 0


def test_upload_saves_a_good_image(client, item_count):
    response = add(client, [GOOD_IMAGE])
    assert response.status_code == 200
    assert (response.json()["added"], response.json()["failed"]) == (1, 0)
    assert item_count() == 1


def test_bad_images_do_not_fail_the_rest_of_the_batch(client, item_count):
    response = add(client, [GOOD_IMAGE, CORRUPT_IMAGE, MISSING_IMAGE, UNREACHABLE_IMAGE])
    assert response.status_code == 200
    assert (response.json()["added"], response.json()["failed"]) == (1, 3)
    assert item_count() == 1


@pytest.mark.parametrize("urls, status", [
    ([], 400),
    ([MISSING_IMAGE], 422),
    ([CORRUPT_IMAGE], 422),
])
def test_upload_with_nothing_to_save_adds_no_blank_row(client, urls, status, item_count):
    assert add(client, urls).status_code == status
    assert item_count() == 0


def test_items_are_only_the_callers_and_exclude_embeddings(client, add_item):
    mine = add_item("alice")
    add_item("bob")
    response = client.get("/api/wardrobe/items", headers=as_user("alice"))
    assert response.status_code == 200
    results = response.json()["results"]
    assert [item["id"] for item in results] == [mine]
    assert "embedding" not in results[0]


def test_profile_does_not_error_for_a_new_user(client):
    assert client.post("/api/user-profile", headers=as_user("alice")).status_code == 200
