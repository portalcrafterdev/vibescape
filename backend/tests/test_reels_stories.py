import asyncio
from datetime import UTC, datetime, timedelta

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.story import Story

settings = get_settings()
PREFIX = settings.API_V1_PREFIX

VIDEO = "https://example.com/clip.mp4"
IMAGE = "https://picsum.photos/500/500"


async def make_reel(client, headers, caption="a reel") -> dict:
    resp = await client.post(
        f"{PREFIX}/reels", headers=headers, json={"video_url": VIDEO, "caption": caption}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def make_story(client, headers) -> dict:
    resp = await client.post(f"{PREFIX}/stories", headers=headers, json={"image_url": IMAGE})
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestReels:
    async def test_create_and_list(self, client, registered, auth_headers):
        await make_reel(client, auth_headers, "first reel")

        page = (await client.get(f"{PREFIX}/reels", headers=auth_headers)).json()

        assert [r["caption"] for r in page["items"]] == ["first reel"]
        assert page["items"][0]["author"]["username"] == registered["user"]["username"]
        assert page["items"][0]["is_mine"] is True

    async def test_counts_are_numbers_not_abbreviated_strings(self, client, auth_headers):
        """The mock stored likes as "12.5K". Abbreviation is the client's job."""
        reel = await make_reel(client, auth_headers)

        assert isinstance(reel["likes_count"], int)
        assert isinstance(reel["views_count"], int)

    async def test_reels_are_not_limited_to_people_you_follow(
        self, client, auth_headers, other_user
    ):
        """A reels tab restricted to your graph would be empty for a new account."""
        _, other_headers = other_user
        await make_reel(client, other_headers, "from a stranger")

        page = (await client.get(f"{PREFIX}/reels", headers=auth_headers)).json()

        assert "from a stranger" in [r["caption"] for r in page["items"]]

    async def test_like_and_unlike(self, client, auth_headers, other_user):
        _, other_headers = other_user
        reel = await make_reel(client, other_headers)

        liked = await client.post(f"{PREFIX}/reels/{reel['id']}/like", headers=auth_headers)
        assert liked.json() == {"liked": True, "likes_count": 1}

        unliked = await client.delete(f"{PREFIX}/reels/{reel['id']}/like", headers=auth_headers)
        assert unliked.json() == {"liked": False, "likes_count": 0}

    async def test_concurrent_likes_count_once(self, client, auth_headers, other_user):
        _, other_headers = other_user
        reel = await make_reel(client, other_headers)

        await asyncio.gather(
            *[
                client.post(f"{PREFIX}/reels/{reel['id']}/like", headers=auth_headers)
                for _ in range(4)
            ],
            return_exceptions=True,
        )

        page = (await client.get(f"{PREFIX}/reels", headers=auth_headers)).json()
        assert page["items"][0]["likes_count"] == 1

    async def test_unlike_never_goes_negative(self, client, auth_headers, other_user):
        _, other_headers = other_user
        reel = await make_reel(client, other_headers)

        for _ in range(3):
            resp = await client.delete(f"{PREFIX}/reels/{reel['id']}/like", headers=auth_headers)
            assert resp.json()["likes_count"] == 0

    async def test_cannot_delete_another_users_reel(self, client, auth_headers, other_user):
        _, other_headers = other_user
        reel = await make_reel(client, other_headers)

        resp = await client.delete(f"{PREFIX}/reels/{reel['id']}", headers=auth_headers)

        assert resp.status_code == 403

    async def test_views_increment(self, client, auth_headers):
        reel = await make_reel(client, auth_headers)

        first = await client.post(f"{PREFIX}/reels/{reel['id']}/view", headers=auth_headers)
        second = await client.post(f"{PREFIX}/reels/{reel['id']}/view", headers=auth_headers)

        assert first.json()["views_count"] == 1
        assert second.json()["views_count"] == 2

    async def test_reel_needs_a_source(self, client, auth_headers):
        resp = await client.post(f"{PREFIX}/reels", headers=auth_headers, json={"caption": "none"})

        assert resp.status_code == 422

    async def test_non_http_video_rejected(self, client, auth_headers):
        resp = await client.post(
            f"{PREFIX}/reels", headers=auth_headers, json={"video_url": "javascript:alert(1)"}
        )

        assert resp.status_code == 422

    async def test_pagination_does_not_overlap(self, client, auth_headers):
        for i in range(5):
            await make_reel(client, auth_headers, f"r{i}")

        seen: list[str] = []
        cursor = None
        for _ in range(5):
            url = f"{PREFIX}/reels?limit=2" + (f"&cursor={cursor}" if cursor else "")
            page = (await client.get(url, headers=auth_headers)).json()
            seen.extend(r["caption"] for r in page["items"])
            cursor = page["next_cursor"]
            if not page["has_more"]:
                break

        assert len(set(seen)) == 5

    async def test_requires_authentication(self, client):
        assert (await client.get(f"{PREFIX}/reels")).status_code == 401


class TestStories:
    async def test_create_sets_a_24h_expiry(self, client, auth_headers):
        story = await make_story(client, auth_headers)

        created = datetime.fromisoformat(story["created_at"])
        expires = datetime.fromisoformat(story["expires_at"])

        assert timedelta(hours=23) < (expires - created) < timedelta(hours=25)

    async def test_own_story_appears_in_the_tray(self, client, registered, auth_headers):
        await make_story(client, auth_headers)

        tray = (await client.get(f"{PREFIX}/stories", headers=auth_headers)).json()

        assert len(tray) == 1
        assert tray[0]["is_mine"] is True
        assert tray[0]["story_count"] == 1

    async def test_expired_stories_disappear(self, client, registered, auth_headers):
        """Expiry is filtered in the query, so it holds whether or not a cleanup job
        has run. Backdating the row is the honest way to prove it."""
        story = await make_story(client, auth_headers)

        async with SessionLocal() as session:
            row = await session.get(Story, story["id"])
            row.expires_at = datetime.now(UTC) - timedelta(seconds=1)
            await session.commit()

        tray = (await client.get(f"{PREFIX}/stories", headers=auth_headers)).json()
        assert tray == [], "an expired story is still visible"

        listing = (
            await client.get(
                f"{PREFIX}/users/{registered['user']['id']}/stories", headers=auth_headers
            )
        ).json()
        assert listing == []

    async def test_tray_includes_followed_authors_only(self, client, auth_headers, other_user):
        other, other_headers = other_user
        await make_story(client, other_headers)

        before = (await client.get(f"{PREFIX}/stories", headers=auth_headers)).json()
        assert before == []

        await client.post(f"{PREFIX}/users/{other['user']['id']}/follow", headers=auth_headers)

        after = (await client.get(f"{PREFIX}/stories", headers=auth_headers)).json()
        assert len(after) == 1
        assert after[0]["is_mine"] is False

    async def test_own_entry_comes_first(self, client, auth_headers, other_user):
        other, other_headers = other_user
        await make_story(client, other_headers)
        await client.post(f"{PREFIX}/users/{other['user']['id']}/follow", headers=auth_headers)
        await make_story(client, auth_headers)

        tray = (await client.get(f"{PREFIX}/stories", headers=auth_headers)).json()

        assert tray[0]["is_mine"] is True, "the viewer's own story should lead the tray"

    async def test_cannot_delete_another_users_story(self, client, auth_headers, other_user):
        _, other_headers = other_user
        story = await make_story(client, other_headers)

        resp = await client.delete(f"{PREFIX}/stories/{story['id']}", headers=auth_headers)

        assert resp.status_code == 403

    async def test_story_needs_a_source(self, client, auth_headers):
        resp = await client.post(f"{PREFIX}/stories", headers=auth_headers, json={})

        assert resp.status_code == 422


class TestHighlights:
    async def test_highlight_outlives_the_story_it_came_from(
        self, client, registered, auth_headers
    ):
        """The whole point of a highlight. Images are copied, not referenced, so an
        expired or deleted story does not empty it."""
        story = await make_story(client, auth_headers)

        highlight = (
            await client.post(
                f"{PREFIX}/highlights",
                headers=auth_headers,
                json={"title": "Trips", "story_ids": [story["id"]]},
            )
        ).json()
        assert highlight["item_count"] == 1

        await client.delete(f"{PREFIX}/stories/{story['id']}", headers=auth_headers)

        items = (
            await client.get(f"{PREFIX}/highlights/{highlight['id']}/items", headers=auth_headers)
        ).json()
        assert len(items) == 1, "highlight emptied when its source story went away"
        assert items[0]["image_url"] == IMAGE

    async def test_highlights_listed_on_a_profile(self, client, registered, auth_headers):
        await client.post(f"{PREFIX}/highlights", headers=auth_headers, json={"title": "Food"})

        listing = (
            await client.get(
                f"{PREFIX}/users/{registered['user']['id']}/highlights", headers=auth_headers
            )
        ).json()

        assert [h["title"] for h in listing] == ["Food"]

    async def test_cannot_highlight_someone_elses_story(self, client, auth_headers, other_user):
        _, other_headers = other_user
        theirs = await make_story(client, other_headers)

        highlight = (
            await client.post(
                f"{PREFIX}/highlights",
                headers=auth_headers,
                json={"title": "Stolen", "story_ids": [theirs["id"]]},
            )
        ).json()

        assert highlight["item_count"] == 0, "another user's story was copied into a highlight"

    async def test_cannot_delete_another_users_highlight(self, client, auth_headers, other_user):
        _, other_headers = other_user
        highlight = (
            await client.post(
                f"{PREFIX}/highlights", headers=other_headers, json={"title": "Theirs"}
            )
        ).json()

        resp = await client.delete(f"{PREFIX}/highlights/{highlight['id']}", headers=auth_headers)

        assert resp.status_code == 403

    async def test_blank_title_rejected(self, client, auth_headers):
        resp = await client.post(
            f"{PREFIX}/highlights", headers=auth_headers, json={"title": "   "}
        )

        assert resp.status_code == 422


class TestExplore:
    async def test_returns_the_searchdata_shape(self, client, auth_headers):
        await make_reel(client, auth_headers)

        body = (await client.get(f"{PREFIX}/explore", headers=auth_headers)).json()

        assert body["items"]
        assert set(body["items"][0]) == {"id", "image_url", "views", "is_video"}

    async def test_carries_no_viewer_specific_state(self, client, auth_headers, other_user):
        """This is what makes a single global cache key safe. If is_liked is ever
        added here, the key must become viewer-scoped or it leaks across users."""
        _, other_headers = other_user
        await make_reel(client, other_headers)

        mine = (await client.get(f"{PREFIX}/explore", headers=auth_headers)).json()
        theirs = (await client.get(f"{PREFIX}/explore", headers=other_headers)).json()

        for body in (mine, theirs):
            for item in body["items"]:
                assert "is_liked" not in item
                assert "is_mine" not in item
                assert "is_following" not in item

        assert mine == theirs, "explore differs per viewer — the global cache key is unsafe"

    async def test_reels_rank_above_posts(self, client, auth_headers):
        await client.post(
            f"{PREFIX}/posts", headers=auth_headers, json={"image_url": IMAGE, "caption": "p"}
        )
        await make_reel(client, auth_headers)

        body = (await client.get(f"{PREFIX}/explore", headers=auth_headers)).json()

        assert body["items"][0]["is_video"] is True

    async def test_requires_authentication(self, client):
        assert (await client.get(f"{PREFIX}/explore")).status_code == 401
