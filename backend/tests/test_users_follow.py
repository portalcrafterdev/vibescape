import asyncio
import uuid

from app.core.config import get_settings

settings = get_settings()
PREFIX = settings.API_V1_PREFIX


async def make_user_via(client) -> tuple[dict, dict[str, str]]:
    """Register a throwaway account without needing the fixture."""
    suffix = uuid.uuid4().hex[:10]
    resp = await client.post(
        f"{PREFIX}/auth/register",
        json={
            "username": f"user_{suffix}",
            "email": f"user_{suffix}@example.com",
            "password": "correct horse battery staple",
        },
    )
    body = resp.json()
    return body, {"Authorization": f"Bearer {body['tokens']['access_token']}"}


class TestFollow:
    async def test_follow_updates_counts_on_both_sides(
        self, client, registered, auth_headers, other_user
    ):
        other, other_headers = other_user

        resp = await client.post(
            f"{PREFIX}/users/{other['user']['id']}/follow", headers=auth_headers
        )

        assert resp.status_code == 200
        assert resp.json() == {"following": True, "followers_count": 1}

        # The target gained a follower...
        target = (await client.get(f"{PREFIX}/users/me", headers=other_headers)).json()
        assert target["followers_count"] == 1
        assert target["following_count"] == 0

        # ...and the follower gained a following.
        me = (await client.get(f"{PREFIX}/users/me", headers=auth_headers)).json()
        assert me["following_count"] == 1
        assert me["followers_count"] == 0

    async def test_is_following_reflects_the_viewer(self, client, auth_headers, other_user):
        other, other_headers = other_user
        other_id = other["user"]["id"]

        before = await client.get(f"{PREFIX}/users/{other_id}", headers=auth_headers)
        assert before.json()["is_following"] is False

        await client.post(f"{PREFIX}/users/{other_id}/follow", headers=auth_headers)

        after = await client.get(f"{PREFIX}/users/{other_id}", headers=auth_headers)
        assert after.json()["is_following"] is True

    async def test_follow_is_idempotent(self, client, auth_headers, other_user):
        """Following twice must not double-count."""
        other, other_headers = other_user
        other_id = other["user"]["id"]

        await client.post(f"{PREFIX}/users/{other_id}/follow", headers=auth_headers)
        second = await client.post(f"{PREFIX}/users/{other_id}/follow", headers=auth_headers)

        assert second.status_code == 200
        assert second.json()["followers_count"] == 1

        target = (await client.get(f"{PREFIX}/users/me", headers=other_headers)).json()
        assert target["followers_count"] == 1

    async def test_concurrent_follows_count_once(self, client, auth_headers, other_user):
        """The unique constraint is what keeps the counter honest under a race."""
        other, other_headers = other_user
        other_id = other["user"]["id"]

        await asyncio.gather(
            *[
                client.post(f"{PREFIX}/users/{other_id}/follow", headers=auth_headers)
                for _ in range(4)
            ],
            return_exceptions=True,
        )

        target = (await client.get(f"{PREFIX}/users/me", headers=other_headers)).json()
        assert target["followers_count"] == 1, "counter double-counted a concurrent follow"

    async def test_cannot_follow_self(self, client, registered, auth_headers):
        resp = await client.post(
            f"{PREFIX}/users/{registered['user']['id']}/follow", headers=auth_headers
        )

        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "cannot_follow_self"

    async def test_follow_unknown_user_returns_404(self, client, auth_headers):
        resp = await client.post(
            f"{PREFIX}/users/00000000-0000-0000-0000-000000000000/follow", headers=auth_headers
        )

        assert resp.status_code == 404

    async def test_follow_requires_authentication(self, client, other_user):
        other, _ = other_user

        resp = await client.post(f"{PREFIX}/users/{other['user']['id']}/follow")

        assert resp.status_code == 401


class TestUnfollow:
    async def test_unfollow_reverses_the_counts(self, client, auth_headers, other_user):
        other, other_headers = other_user
        other_id = other["user"]["id"]

        await client.post(f"{PREFIX}/users/{other_id}/follow", headers=auth_headers)
        resp = await client.delete(f"{PREFIX}/users/{other_id}/follow", headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json() == {"following": False, "followers_count": 0}

        me = (await client.get(f"{PREFIX}/users/me", headers=auth_headers)).json()
        assert me["following_count"] == 0

    async def test_unfollow_is_idempotent_and_never_goes_negative(
        self, client, auth_headers, other_user
    ):
        other, other_headers = other_user
        other_id = other["user"]["id"]

        for _ in range(3):
            resp = await client.delete(f"{PREFIX}/users/{other_id}/follow", headers=auth_headers)
            assert resp.status_code == 200

        target = (await client.get(f"{PREFIX}/users/me", headers=other_headers)).json()
        assert target["followers_count"] == 0, "counter went negative"

        me = (await client.get(f"{PREFIX}/users/me", headers=auth_headers)).json()
        assert me["following_count"] == 0


class TestFollowLists:
    async def test_followers_and_following_lists(self, client, registered, auth_headers, make_user):
        a, a_headers = await make_user()
        b, b_headers = await make_user()

        # Both follow us.
        await client.post(f"{PREFIX}/users/{registered['user']['id']}/follow", headers=a_headers)
        await client.post(f"{PREFIX}/users/{registered['user']['id']}/follow", headers=b_headers)

        followers = await client.get(
            f"{PREFIX}/users/{registered['user']['id']}/followers", headers=auth_headers
        )
        assert followers.status_code == 200
        usernames = {item["username"] for item in followers.json()["items"]}
        assert usernames == {a["user"]["username"], b["user"]["username"]}

        following = await client.get(
            f"{PREFIX}/users/{a['user']['id']}/following", headers=a_headers
        )
        assert {item["username"] for item in following.json()["items"]} == {
            registered["user"]["username"]
        }

    async def test_follower_list_omits_private_fields(
        self, client, registered, auth_headers, other_user
    ):
        other, other_headers = other_user
        await client.post(
            f"{PREFIX}/users/{registered['user']['id']}/follow", headers=other_headers
        )

        body = (
            await client.get(
                f"{PREFIX}/users/{registered['user']['id']}/followers", headers=auth_headers
            )
        ).json()

        assert body["items"]
        for item in body["items"]:
            assert "email" not in item
            assert "password_hash" not in item

    async def test_pagination_reports_more_and_returns_a_cursor(
        self, client, registered, auth_headers, make_user
    ):
        for _ in range(3):
            _, headers = await make_user()
            await client.post(f"{PREFIX}/users/{registered['user']['id']}/follow", headers=headers)

        first = await client.get(
            f"{PREFIX}/users/{registered['user']['id']}/followers?limit=2", headers=auth_headers
        )
        body = first.json()

        assert len(body["items"]) == 2
        assert body["has_more"] is True
        assert body["next_cursor"]

        second = await client.get(
            f"{PREFIX}/users/{registered['user']['id']}/followers"
            f"?limit=2&cursor={body['next_cursor']}",
            headers=auth_headers,
        )
        rest = second.json()
        assert len(rest["items"]) == 1
        assert rest["has_more"] is False

        # No row appears on both pages.
        first_ids = {i["id"] for i in body["items"]}
        assert first_ids.isdisjoint({i["id"] for i in rest["items"]})

    async def test_cursor_survives_a_url_round_trip(self, client, registered, auth_headers):
        """Regression: a raw ISO cursor carries "+00:00", and "+" decodes as a space
        in a query string, so every second page 400'd. Cursors must be URL-safe."""
        for _ in range(2):
            _, headers = await make_user_via(client)
            await client.post(f"{PREFIX}/users/{registered['user']['id']}/follow", headers=headers)

        first = (
            await client.get(
                f"{PREFIX}/users/{registered['user']['id']}/followers?limit=1",
                headers=auth_headers,
            )
        ).json()

        cursor = first["next_cursor"]
        assert cursor
        assert "+" not in cursor and ":" not in cursor, "cursor is not URL-safe"

        second = await client.get(
            f"{PREFIX}/users/{registered['user']['id']}/followers?limit=1&cursor={cursor}",
            headers=auth_headers,
        )
        assert second.status_code == 200

    async def test_invalid_cursor_is_rejected(self, client, registered, auth_headers):
        resp = await client.get(
            f"{PREFIX}/users/{registered['user']['id']}/followers?cursor=not-a-date",
            headers=auth_headers,
        )

        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "invalid_cursor"


class TestSearch:
    async def test_search_finds_by_username(self, client, auth_headers, other_user):
        other, _ = other_user
        term = other["user"]["username"][:8]

        resp = await client.get(f"{PREFIX}/users/search?q={term}", headers=auth_headers)

        assert resp.status_code == 200
        assert other["user"]["username"] in {u["username"] for u in resp.json()}

    async def test_search_annotates_follow_state(self, client, auth_headers, other_user):
        other, _ = other_user
        await client.post(f"{PREFIX}/users/{other['user']['id']}/follow", headers=auth_headers)

        results = (
            await client.get(
                f"{PREFIX}/users/search?q={other['user']['username'][:8]}", headers=auth_headers
            )
        ).json()

        match = next(u for u in results if u["id"] == other["user"]["id"])
        assert match["is_following"] is True

    async def test_wildcard_query_does_not_match_everyone(self, client, auth_headers, other_user):
        """LIKE wildcards in user input must be escaped, not interpreted."""
        resp = await client.get(f"{PREFIX}/users/search?q=%25", headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json() == [], "a '%' query returned users — wildcards are not escaped"

    async def test_search_results_omit_private_fields(self, client, auth_headers, other_user):
        other, _ = other_user

        results = (
            await client.get(
                f"{PREFIX}/users/search?q={other['user']['username'][:8]}", headers=auth_headers
            )
        ).json()

        for user in results:
            assert "email" not in user
            assert "password_hash" not in user

    async def test_search_requires_authentication(self, client):
        assert (await client.get(f"{PREFIX}/users/search?q=anyone")).status_code == 401
