from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.user import User

settings = get_settings()
PREFIX = settings.API_V1_PREFIX

# Must never appear in a response about someone else.
PRIVATE_FIELDS = ("password_hash", "failed_login_count", "locked_until", "is_active")


class TestReadProfile:
    async def test_me_returns_own_profile_with_email(self, client, registered, auth_headers):
        resp = await client.get(f"{PREFIX}/users/me", headers=auth_headers)

        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == registered["user"]["id"]
        assert body["email"] == registered["credentials"]["email"]
        assert body["is_self"] is True

    async def test_me_requires_authentication(self, client):
        assert (await client.get(f"{PREFIX}/users/me")).status_code == 401

    async def test_other_profile_omits_email(self, client, auth_headers, other_user):
        """The public profile model has no email field at all, so it cannot leak."""
        other, _ = other_user

        resp = await client.get(f"{PREFIX}/users/{other['user']['id']}", headers=auth_headers)

        assert resp.status_code == 200
        body = resp.json()
        assert "email" not in body, "another user's email is exposed"
        assert body["username"] == other["user"]["username"]
        assert body["is_self"] is False

    async def test_no_private_fields_in_any_profile_response(
        self, client, auth_headers, other_user
    ):
        other, _ = other_user

        for path in ("/users/me", f"/users/{other['user']['id']}"):
            body = (await client.get(f"{PREFIX}{path}", headers=auth_headers)).json()
            for field in PRIVATE_FIELDS:
                assert field not in body, f"{path} exposed {field}"
            assert "$argon2" not in str(body)

    async def test_lookup_by_username(self, client, auth_headers, other_user):
        other, _ = other_user

        resp = await client.get(
            f"{PREFIX}/users/by-username/{other['user']['username']}", headers=auth_headers
        )

        assert resp.status_code == 200
        assert resp.json()["id"] == other["user"]["id"]

    async def test_unknown_user_returns_404(self, client, auth_headers):
        resp = await client.get(
            f"{PREFIX}/users/00000000-0000-0000-0000-000000000000", headers=auth_headers
        )

        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "not_found"


class TestUpdateProfile:
    async def test_update_own_profile(self, client, auth_headers):
        resp = await client.patch(
            f"{PREFIX}/users/me",
            headers=auth_headers,
            json={
                "display_name": "Portal Crafter",
                "bio": "building things",
                "pronouns": "they/them",
                "gender": "non-binary",
            },
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["display_name"] == "Portal Crafter"
        assert body["bio"] == "building things"
        assert body["pronouns"] == "they/them"

    async def test_partial_update_leaves_other_fields_alone(self, client, auth_headers):
        await client.patch(
            f"{PREFIX}/users/me",
            headers=auth_headers,
            json={"display_name": "Original", "bio": "Original bio"},
        )

        await client.patch(f"{PREFIX}/users/me", headers=auth_headers, json={"bio": "New bio"})

        body = (await client.get(f"{PREFIX}/users/me", headers=auth_headers)).json()
        assert body["bio"] == "New bio"
        assert body["display_name"] == "Original", "an omitted field was overwritten"

    async def test_explicit_null_clears_a_field(self, client, auth_headers):
        await client.patch(f"{PREFIX}/users/me", headers=auth_headers, json={"bio": "something"})

        await client.patch(f"{PREFIX}/users/me", headers=auth_headers, json={"bio": None})

        assert (await client.get(f"{PREFIX}/users/me", headers=auth_headers)).json()["bio"] is None

    async def test_links_round_trip(self, client, auth_headers):
        resp = await client.patch(
            f"{PREFIX}/users/me",
            headers=auth_headers,
            json={"links": [{"title": "Site", "url": "https://example.com"}]},
        )

        assert resp.status_code == 200
        links = resp.json()["links"]
        assert len(links) == 1
        assert links[0]["title"] == "Site"
        assert links[0]["url"].startswith("https://example.com")

    async def test_non_http_link_rejected(self, client, auth_headers):
        """A link is rendered tappable on someone else's profile."""
        resp = await client.patch(
            f"{PREFIX}/users/me",
            headers=auth_headers,
            json={"links": [{"title": "Bad", "url": "javascript:alert(1)"}]},
        )

        assert resp.status_code == 422

    async def test_unknown_field_rejected(self, client, auth_headers):
        """extra='forbid' stops a client setting columns it should not."""
        resp = await client.patch(
            f"{PREFIX}/users/me", headers=auth_headers, json={"followers_count": 99999}
        )

        assert resp.status_code == 422

    async def test_username_change_rejects_a_taken_name(self, client, auth_headers, other_user):
        other, _ = other_user

        resp = await client.patch(
            f"{PREFIX}/users/me",
            headers=auth_headers,
            json={"username": other["user"]["username"]},
        )

        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "username_taken"

    async def test_update_response_has_no_hash(self, client, auth_headers):
        body = (
            await client.patch(f"{PREFIX}/users/me", headers=auth_headers, json={"bio": "hi"})
        ).json()

        assert "password_hash" not in body
        assert "$argon2" not in str(body)


class TestOwnershipEnforcement:
    async def test_cannot_edit_another_users_profile(self, client, auth_headers, other_user):
        """The IDOR case. Being authenticated is not the same as owning the row."""
        other, _ = other_user

        resp = await client.patch(
            f"{PREFIX}/users/{other['user']['id']}",
            headers=auth_headers,
            json={"bio": "I edited your profile"},
        )

        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "permission_denied"

    async def test_the_target_profile_is_unchanged_after_a_denied_edit(
        self, client, auth_headers, other_user
    ):
        """A 403 must also mean nothing was written."""
        other, other_headers = other_user
        await client.patch(f"{PREFIX}/users/me", headers=other_headers, json={"bio": "my own bio"})

        await client.patch(
            f"{PREFIX}/users/{other['user']['id']}",
            headers=auth_headers,
            json={"bio": "vandalised"},
        )

        after = (await client.get(f"{PREFIX}/users/me", headers=other_headers)).json()
        assert after["bio"] == "my own bio"

    async def test_editing_own_profile_by_id_is_allowed(self, client, registered, auth_headers):
        resp = await client.patch(
            f"{PREFIX}/users/{registered['user']['id']}",
            headers=auth_headers,
            json={"bio": "my own id works"},
        )

        assert resp.status_code == 200

    async def test_unauthenticated_update_rejected(self, client, registered):
        resp = await client.patch(
            f"{PREFIX}/users/{registered['user']['id']}", json={"bio": "anonymous edit"}
        )

        assert resp.status_code == 401


class TestProfileCache:
    async def test_edit_is_visible_immediately(self, client, auth_headers, other_user):
        """A cached profile must not survive its own update."""
        other, other_headers = other_user
        other_id = other["user"]["id"]

        # Populate the cache from our viewer's perspective.
        first = await client.get(f"{PREFIX}/users/{other_id}", headers=auth_headers)
        assert first.json()["bio"] is None

        await client.patch(
            f"{PREFIX}/users/me", headers=other_headers, json={"bio": "freshly written"}
        )

        second = await client.get(f"{PREFIX}/users/{other_id}", headers=auth_headers)
        assert second.json()["bio"] == "freshly written", "stale profile served after a write"

    async def test_username_is_stored_lowercase(self, client, auth_headers):
        await client.patch(f"{PREFIX}/users/me", headers=auth_headers, json={"username": "MiXeD"})

        async with SessionLocal() as session:
            user = await session.scalar(select(User).where(User.username == "mixed"))
            assert user is not None
