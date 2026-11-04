"""Test setup.

Needs a real PostgreSQL database with pgvector, set through DATABASE_URL, that
has been migrated with `alembic upgrade head`. Its clothing and user tables are
emptied between tests, so never point this at a database you care about.

The AI models and Supabase login are replaced with stubs, so the tests run
quickly and without downloading anything.
"""
import os
import sys
import types

from fastapi import Header
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import text

SUPABASE_URL = "https://project.supabase.test"
os.environ["SUPABASE_URL"] = SUPABASE_URL


def fake_current_user(x_test_user: str = Header()):
    return x_test_user


services = types.ModuleType("app.services")
services.get_current_user = fake_current_user
services.recommend_calls = []


def fake_suggest(**kwargs):
    services.recommend_calls.append(kwargs)
    return []


services.suggest_outfit_from_text = fake_suggest
sys.modules["app.services"] = services

util = types.ModuleType("app.util")
util.predict_category = lambda image: 17
util.get_clip_embedding = lambda image: [1.0] + [0.0] * 511
sys.modules["app.util"] = util

from app.database import engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def client():
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE wear_events, saved_outfits, clothing_items, feedback, users RESTART IDENTITY CASCADE"))
    return TestClient(app)


def as_user(name):
    return {"X-Test-User": name}


@pytest.fixture
def add_item():
    def _add_item(owner, category="17"):
        with engine.begin() as connection:
            user_id = connection.execute(
                text(
                    "INSERT INTO users (user_id) VALUES (:owner) "
                    "ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id RETURNING id"
                ),
                {"owner": owner},
            ).scalar_one()
            return connection.execute(
                text(
                    "INSERT INTO clothing_items (user_id, category, image_url) "
                    "VALUES (:user_id, :category, 'https://example.test/item.png') RETURNING id"
                ),
                {"user_id": user_id, "category": category},
            ).scalar_one()

    return _add_item


@pytest.fixture
def last_worn():
    def _last_worn(item_id):
        with engine.connect() as connection:
            return connection.execute(
                text("SELECT last_worn_date FROM clothing_items WHERE id = :id"), {"id": item_id}
            ).scalar_one()

    return _last_worn


@pytest.fixture
def item_count():
    def _item_count():
        with engine.connect() as connection:
            return connection.execute(text("SELECT count(*) FROM clothing_items")).scalar_one()

    return _item_count
