import asyncio
import uuid

from app.core.config import get_settings

settings = get_settings()
PREFIX = settings.API_V1_PREFIX

IMAGE = "https://picsum.photos/500/500"


async def make_user_via(client) -> tuple[dict, dict[str, str]]:
    suffix = uuid.uuid4().hex[:10]
    body = (
        await client.post(
            f"{PREFIX}/auth/register",
            json={
                "username": f"user_{suffix}",
                "email": f"user_{suffix}@example.com",
                "password": "correct horse battery staple",
            },
        )
    ).json()
    return body, {"Authorization": f"Bearer {body['tokens']['access_token']}"}


async def create_post(client, headers, caption="hello") -> dict:
    resp = await client.post(
        f"{PREFIX}/posts", headers=headers, json={"image_url": IMAGE, "caption": caption}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestCreateAndRead:
    async def test_create_returns_the_post(self, client, registered, auth_headers):
        post = await create_post(client, auth_headers, "my first post")

        assert post["caption"] == "my first post"
        assert post["image_url"] == IMAGE
        assert post["likes_count"] == 0
        assert post["is_mine"] is True
        assert post["author"]["username"] == registered["user"]["username"]

    async def test_created_at_is_iso_not_a_relative_string(self, client, auth_headers):
        """The mock stored "2 hours ago"; a cached relative string is wrong the moment
        it is read, so the API returns ISO-8601 and the client formats it."""
        post = await create_post(client, auth_headers)

        from datetime import datetime

        datetime.fromisoformat(post["created_at"])

    async def test_counts_are_numbers(self, client, auth_headers):
        post = await create_post(client, auth_headers)

        assert isinstance(post["likes_count"], int)
        assert isinstance(post["comments_count"], int)

    async def test_create_increments_posts_count(self, client, auth_headers):
        await create_post(client, auth_headers)
        await create_post(client, auth_headers)

        me = (await client.get(f"{PREFIX}/users/me", headers=auth_headers)).json()
        assert me["posts_count"] == 2

    async def test_non_http_image_rejected(self, client, auth_headers):
        resp = await client.post(
            f"{PREFIX}/posts", headers=auth_headers, json={"image_url": "javascript:alert(1)"}
        )

        assert resp.status_code == 422

    async def test_unknown_field_rejected(self, client, auth_headers):
        resp = await client.post(
            f"{PREFIX}/posts",
            headers=auth_headers,
            json={"image_url": IMAGE, "likes_count": 9999},
        )

        assert resp.status_code == 422

    async def test_create_requires_authentication(self, client):
        resp = await client.post(f"{PREFIX}/posts", json={"image_url": IMAGE})

        assert resp.status_code == 401


class TestOwnership:
    async def test_cannot_delete_another_users_post(self, client, auth_headers, other_user):
        _, other_headers = other_user
        post = await create_post(client, other_headers, "not yours")

        resp = await client.delete(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)

        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "permission_denied"

    async def test_the_post_survives_a_denied_delete(self, client, auth_headers, other_user):
        _, other_headers = other_user
        post = await create_post(client, other_headers, "still here")

        await client.delete(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)

        still = await client.get(f"{PREFIX}/posts/{post['id']}", headers=other_headers)
        assert still.status_code == 200

    async def test_cannot_edit_another_users_post(self, client, auth_headers, other_user):
        _, other_headers = other_user
        post = await create_post(client, other_headers)

        resp = await client.patch(
            f"{PREFIX}/posts/{post['id']}", headers=auth_headers, json={"caption": "vandalised"}
        )

        assert resp.status_code == 403

    async def test_can_delete_own_post(self, client, auth_headers):
        post = await create_post(client, auth_headers)

        resp = await client.delete(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)
        assert resp.status_code == 204

        assert (
            await client.get(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)
        ).status_code == 404

    async def test_delete_decrements_posts_count(self, client, auth_headers):
        post = await create_post(client, auth_headers)

        await client.delete(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)

        me = (await client.get(f"{PREFIX}/users/me", headers=auth_headers)).json()
        assert me["posts_count"] == 0


class TestLikes:
    async def test_like_and_unlike(self, client, auth_headers, other_user):
        _, other_headers = other_user
        post = await create_post(client, other_headers)

        liked = await client.post(f"{PREFIX}/posts/{post['id']}/like", headers=auth_headers)
        assert liked.json() == {"liked": True, "likes_count": 1}

        unliked = await client.delete(f"{PREFIX}/posts/{post['id']}/like", headers=auth_headers)
        assert unliked.json() == {"liked": False, "likes_count": 0}

    async def test_like_is_idempotent(self, client, auth_headers, other_user):
        _, other_headers = other_user
        post = await create_post(client, other_headers)

        await client.post(f"{PREFIX}/posts/{post['id']}/like", headers=auth_headers)
        second = await client.post(f"{PREFIX}/posts/{post['id']}/like", headers=auth_headers)

        assert second.json()["likes_count"] == 1

    async def test_repeated_toggling_stays_accurate(self, client, auth_headers, other_user):
        _, other_headers = other_user
        post = await create_post(client, other_headers)

        for _ in range(5):
            await client.post(f"{PREFIX}/posts/{post['id']}/like", headers=auth_headers)
            await client.delete(f"{PREFIX}/posts/{post['id']}/like", headers=auth_headers)

        final = await client.post(f"{PREFIX}/posts/{post['id']}/like", headers=auth_headers)
        assert final.json()["likes_count"] == 1

    async def test_unlike_never_goes_negative(self, client, auth_headers, other_user):
        _, other_headers = other_user
        post = await create_post(client, other_headers)

        for _ in range(3):
            resp = await client.delete(f"{PREFIX}/posts/{post['id']}/like", headers=auth_headers)
            assert resp.json()["likes_count"] == 0

    async def test_concurrent_likes_count_once(self, client, auth_headers, other_user):
        """The unique constraint is what stops a race double-counting."""
        _, other_headers = other_user
        post = await create_post(client, other_headers)

        await asyncio.gather(
            *[
                client.post(f"{PREFIX}/posts/{post['id']}/like", headers=auth_headers)
                for _ in range(4)
            ],
            return_exceptions=True,
        )

        fresh = await client.get(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)
        assert fresh.json()["likes_count"] == 1

    async def test_is_liked_reflects_the_viewer(self, client, auth_headers, other_user):
        _, other_headers = other_user
        post = await create_post(client, other_headers)
        await client.post(f"{PREFIX}/posts/{post['id']}/like", headers=auth_headers)

        mine = (await client.get(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)).json()
        theirs = (await client.get(f"{PREFIX}/posts/{post['id']}", headers=other_headers)).json()

        assert mine["is_liked"] is True
        assert theirs["is_liked"] is False, "one viewer's like leaked to another"


class TestFeed:
    async def test_feed_includes_own_posts(self, client, auth_headers):
        await create_post(client, auth_headers, "mine")

        feed = (await client.get(f"{PREFIX}/feed", headers=auth_headers)).json()

        assert [p["caption"] for p in feed["items"]] == ["mine"]

    async def test_feed_includes_followed_users(self, client, auth_headers, other_user):
        other, other_headers = other_user
        await create_post(client, other_headers, "theirs")

        before = (await client.get(f"{PREFIX}/feed", headers=auth_headers)).json()
        assert before["items"] == []

        await client.post(f"{PREFIX}/users/{other['user']['id']}/follow", headers=auth_headers)

        after = (await client.get(f"{PREFIX}/feed", headers=auth_headers)).json()
        assert [p["caption"] for p in after["items"]] == ["theirs"]

    async def test_feed_excludes_strangers(self, client, auth_headers, other_user):
        _, other_headers = other_user
        await create_post(client, other_headers, "not followed")

        feed = (await client.get(f"{PREFIX}/feed", headers=auth_headers)).json()

        assert feed["items"] == []

    async def test_two_users_get_different_feeds_while_cached(
        self, client, auth_headers, other_user
    ):
        """The cross-user cache leak. A feed key without the viewer would serve one
        person's timeline to everyone (PRD 6B)."""
        other, other_headers = other_user
        await create_post(client, auth_headers, "mine only")
        await create_post(client, other_headers, "theirs only")

        # Populate both caches, then read both again.
        mine_first = (await client.get(f"{PREFIX}/feed", headers=auth_headers)).json()
        theirs_first = (await client.get(f"{PREFIX}/feed", headers=other_headers)).json()
        mine_again = (await client.get(f"{PREFIX}/feed", headers=auth_headers)).json()
        theirs_again = (await client.get(f"{PREFIX}/feed", headers=other_headers)).json()

        assert [p["caption"] for p in mine_first["items"]] == ["mine only"]
        assert [p["caption"] for p in theirs_first["items"]] == ["theirs only"]
        assert [p["caption"] for p in mine_again["items"]] == ["mine only"], (
            "cache served the wrong feed"
        )
        assert [p["caption"] for p in theirs_again["items"]] == ["theirs only"], (
            "cache served the wrong feed"
        )

    async def test_own_new_post_appears_immediately_despite_the_cache(self, client, auth_headers):
        await create_post(client, auth_headers, "first")
        first = (await client.get(f"{PREFIX}/feed", headers=auth_headers)).json()
        assert len(first["items"]) == 1

        await create_post(client, auth_headers, "second")

        second = (await client.get(f"{PREFIX}/feed", headers=auth_headers)).json()
        assert len(second["items"]) == 2, "own post hidden behind a stale feed cache"

    async def test_deleting_a_post_removes_it_from_the_feed(self, client, auth_headers):
        post = await create_post(client, auth_headers)
        await client.get(f"{PREFIX}/feed", headers=auth_headers)

        await client.delete(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)

        feed = (await client.get(f"{PREFIX}/feed", headers=auth_headers)).json()
        assert feed["items"] == []

    async def test_feed_is_newest_first(self, client, auth_headers):
        for caption in ("oldest", "middle", "newest"):
            await create_post(client, auth_headers, caption)

        feed = (await client.get(f"{PREFIX}/feed", headers=auth_headers)).json()

        assert [p["caption"] for p in feed["items"]] == ["newest", "middle", "oldest"]

    async def test_feed_response_is_not_stored_by_intermediaries(self, client, auth_headers):
        resp = await client.get(f"{PREFIX}/feed", headers=auth_headers)

        assert "no-store" in resp.headers.get("cache-control", "")

    async def test_feed_requires_authentication(self, client):
        assert (await client.get(f"{PREFIX}/feed")).status_code == 401


class TestFeedPagination:
    async def test_pages_do_not_overlap_or_skip(self, client, auth_headers):
        for i in range(5):
            await create_post(client, auth_headers, f"post-{i}")

        seen: list[str] = []
        cursor = None
        for _ in range(5):
            url = f"{PREFIX}/feed?limit=2" + (f"&cursor={cursor}" if cursor else "")
            page = (await client.get(url, headers=auth_headers)).json()
            seen.extend(p["caption"] for p in page["items"])
            cursor = page["next_cursor"]
            if not page["has_more"]:
                break

        assert len(seen) == 5, f"paged over {len(seen)} of 5"
        assert len(set(seen)) == 5, "a post appeared on two pages"

    async def test_insert_during_paging_does_not_duplicate_earlier_rows(self, client, auth_headers):
        """Keyset, not offset: a new post must not shift rows onto a later page."""
        for i in range(4):
            await create_post(client, auth_headers, f"original-{i}")

        first = (await client.get(f"{PREFIX}/feed?limit=2", headers=auth_headers)).json()
        first_ids = {p["id"] for p in first["items"]}

        await create_post(client, auth_headers, "inserted mid-scroll")

        second = (
            await client.get(
                f"{PREFIX}/feed?limit=2&cursor={first['next_cursor']}", headers=auth_headers
            )
        ).json()

        assert first_ids.isdisjoint({p["id"] for p in second["items"]})

    async def test_invalid_cursor_rejected(self, client, auth_headers):
        resp = await client.get(f"{PREFIX}/feed?cursor=nonsense", headers=auth_headers)

        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "invalid_cursor"

    async def test_cursor_is_url_safe(self, client, auth_headers):
        for i in range(3):
            await create_post(client, auth_headers, f"p{i}")

        page = (await client.get(f"{PREFIX}/feed?limit=1", headers=auth_headers)).json()

        assert page["next_cursor"]
        assert "+" not in page["next_cursor"] and ":" not in page["next_cursor"]


class TestProfileGrid:
    async def test_grid_returns_the_compact_projection(self, client, registered, auth_headers):
        await create_post(client, auth_headers)

        grid = (
            await client.get(
                f"{PREFIX}/users/{registered['user']['id']}/posts", headers=auth_headers
            )
        ).json()

        item = grid["items"][0]
        assert set(item) == {"id", "image_url", "pinned", "likes_count", "comments_count"}

    async def test_pinned_posts_come_first(self, client, registered, auth_headers):
        first = await create_post(client, auth_headers, "oldest")
        await create_post(client, auth_headers, "newest")

        await client.patch(
            f"{PREFIX}/posts/{first['id']}", headers=auth_headers, json={"pinned": True}
        )

        grid = (
            await client.get(
                f"{PREFIX}/users/{registered['user']['id']}/posts", headers=auth_headers
            )
        ).json()

        assert grid["items"][0]["id"] == first["id"]
        assert grid["items"][0]["pinned"] is True

    async def test_grid_of_unknown_user_is_404(self, client, auth_headers):
        resp = await client.get(
            f"{PREFIX}/users/00000000-0000-0000-0000-000000000000/posts", headers=auth_headers
        )

        assert resp.status_code == 404
