"""Pins the query count on the feed.

Hashtags, tagged people and mentions are each fetched for a whole page in one
query. Done per post instead, a 50-post page would cost 150 extra round trips —
and nothing about the response would look wrong, so only a counting test catches
the regression.
"""

from contextlib import contextmanager

from sqlalchemy import event

from app.core.config import get_settings
from app.db.session import engine

PREFIX = get_settings().API_V1_PREFIX

IMAGE = "https://picsum.photos/500/500"


@contextmanager
def count_queries():
    """Count statements issued against the engine inside the block."""
    counter = {"n": 0}
    sync_engine = engine.sync_engine

    def _before(*_args, **_kwargs):
        counter["n"] += 1

    event.listen(sync_engine, "before_cursor_execute", _before)
    try:
        yield counter
    finally:
        event.remove(sync_engine, "before_cursor_execute", _before)


async def create_post(client, headers, **body) -> dict:
    resp = await client.post(f"{PREFIX}/posts", headers=headers, json={"image_url": IMAGE, **body})
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestFeedQueryCount:
    async def test_feed_cost_does_not_grow_with_page_size(self, client, auth_headers, other_user):
        """Three posts and ten posts must cost the same number of queries."""
        other, _ = other_user
        username = other["user"]["username"]

        for i in range(10):
            await create_post(
                client,
                auth_headers,
                caption=f"#tag{i} #shared with @{username}",
                tagged_users=[{"user_id": other["user"]["id"]}],
            )

        # Cache-Control is no-store, but the feed is still cached per viewer in
        # Redis — a second call would be served from there and count nothing.
        with count_queries() as small:
            resp = await client.get(f"{PREFIX}/feed", headers=auth_headers, params={"limit": 3})
            assert resp.status_code == 200
            assert len(resp.json()["items"]) == 3

        with count_queries() as large:
            resp = await client.get(f"{PREFIX}/feed", headers=auth_headers, params={"limit": 10})
            assert resp.status_code == 200
            assert len(resp.json()["items"]) == 10

        assert large["n"] == small["n"], (
            f"feed queries grew with page size: {small['n']} for 3 posts, "
            f"{large['n']} for 10 — something is querying per post"
        )

    async def test_comment_list_cost_does_not_grow(self, client, auth_headers, other_user):
        """Same guarantee for mentions across a page of comments."""
        other, _ = other_user
        username = other["user"]["username"]
        post = await create_post(client, auth_headers)

        for i in range(10):
            resp = await client.post(
                f"{PREFIX}/posts/{post['id']}/comments",
                headers=auth_headers,
                json={"body": f"@{username} number {i}"},
            )
            assert resp.status_code == 201

        url = f"{PREFIX}/posts/{post['id']}/comments"

        with count_queries() as small:
            assert (
                await client.get(url, headers=auth_headers, params={"limit": 3})
            ).status_code == 200

        with count_queries() as large:
            assert (
                await client.get(url, headers=auth_headers, params={"limit": 10})
            ).status_code == 200

        assert large["n"] == small["n"]
