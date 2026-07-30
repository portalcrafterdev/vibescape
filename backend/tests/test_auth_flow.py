from app.core.config import get_settings

PREFIX = get_settings().API_V1_PREFIX


class TestRegistration:
    async def test_register_returns_user_and_tokens(self, client, credentials):
        resp = await client.post(f"{PREFIX}/auth/register", json=credentials)

        assert resp.status_code == 201
        body = resp.json()
        assert body["user"]["username"] == credentials["username"]
        assert body["user"]["email"] == credentials["email"]
        assert body["tokens"]["access_token"]
        assert body["tokens"]["refresh_token"]
        assert body["tokens"]["token_type"] == "bearer"
        assert body["tokens"]["expires_in"] > 0

    async def test_duplicate_username_rejected(self, client, credentials):
        await client.post(f"{PREFIX}/auth/register", json=credentials)
        clash = dict(credentials, email="other@example.com")

        resp = await client.post(f"{PREFIX}/auth/register", json=clash)

        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "username_taken"

    async def test_duplicate_email_rejected(self, client, credentials):
        await client.post(f"{PREFIX}/auth/register", json=credentials)
        clash = dict(credentials, username="someoneelse")

        resp = await client.post(f"{PREFIX}/auth/register", json=clash)

        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "email_taken"

    async def test_username_is_normalised(self, client, credentials):
        payload = dict(credentials, username=credentials["username"].upper())

        resp = await client.post(f"{PREFIX}/auth/register", json=payload)

        assert resp.status_code == 201
        assert resp.json()["user"]["username"] == credentials["username"].lower()

    async def test_short_password_rejected(self, client, credentials):
        resp = await client.post(f"{PREFIX}/auth/register", json=dict(credentials, password="abc"))

        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "validation_error"

    async def test_invalid_username_characters_rejected(self, client, credentials):
        resp = await client.post(
            f"{PREFIX}/auth/register", json=dict(credentials, username="bad name!")
        )

        assert resp.status_code == 422


class TestLogin:
    async def test_login_with_username(self, client, registered):
        resp = await client.post(
            f"{PREFIX}/auth/login",
            json={
                "identifier": registered["credentials"]["username"],
                "password": registered["credentials"]["password"],
            },
        )

        assert resp.status_code == 200
        assert resp.json()["tokens"]["access_token"]

    async def test_login_with_email(self, client, registered):
        resp = await client.post(
            f"{PREFIX}/auth/login",
            json={
                "identifier": registered["credentials"]["email"],
                "password": registered["credentials"]["password"],
            },
        )

        assert resp.status_code == 200

    async def test_wrong_password_rejected(self, client, registered):
        resp = await client.post(
            f"{PREFIX}/auth/login",
            json={
                "identifier": registered["credentials"]["username"],
                "password": "not the password",
            },
        )

        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "invalid_credentials"


class TestProtectedRoutes:
    async def test_me_requires_a_token(self, client):
        resp = await client.get(f"{PREFIX}/auth/me")

        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "not_authenticated"

    async def test_me_returns_the_caller(self, client, registered, auth_headers):
        resp = await client.get(f"{PREFIX}/auth/me", headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json()["id"] == registered["user"]["id"]

    async def test_garbage_token_rejected(self, client):
        resp = await client.get(f"{PREFIX}/auth/me", headers={"Authorization": "Bearer not-a-jwt"})

        assert resp.status_code == 401

    async def test_refresh_token_rejected_as_access_token(self, client, registered):
        """Token types must not be interchangeable."""
        resp = await client.get(
            f"{PREFIX}/auth/me",
            headers={"Authorization": f"Bearer {registered['refresh_token']}"},
        )

        assert resp.status_code == 401


class TestRefreshRotation:
    async def test_refresh_returns_a_new_pair(self, client, registered):
        resp = await client.post(
            f"{PREFIX}/auth/refresh", json={"refresh_token": registered["refresh_token"]}
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["refresh_token"] != registered["refresh_token"], "token must rotate"
        assert body["access_token"]

    async def test_rotated_token_cannot_be_reused(self, client, registered):
        first = registered["refresh_token"]
        await client.post(f"{PREFIX}/auth/refresh", json={"refresh_token": first})

        replay = await client.post(f"{PREFIX}/auth/refresh", json={"refresh_token": first})

        assert replay.status_code == 401
        assert replay.json()["error"]["code"] == "invalid_token"

    async def test_replay_revokes_the_entire_family(self, client, registered):
        """A replayed token means the value leaked, so every descendant is killed too.

        The legitimate holder is signed out as well. That is the intended outcome when
        a session is known to be compromised.
        """
        first = registered["refresh_token"]

        second = (
            await client.post(f"{PREFIX}/auth/refresh", json={"refresh_token": first})
        ).json()["refresh_token"]

        # The current, still-valid token works before the replay.
        assert (
            await client.post(f"{PREFIX}/auth/refresh", json={"refresh_token": second})
        ).status_code == 200

        third = (
            await client.post(f"{PREFIX}/auth/refresh", json={"refresh_token": second})
        ).status_code
        assert third == 401, "second is spent after use"

        # Replaying the original now poisons the family.
        await client.post(f"{PREFIX}/auth/refresh", json={"refresh_token": first})

        # Nothing in the family survives.
        for token in (first, second):
            resp = await client.post(f"{PREFIX}/auth/refresh", json={"refresh_token": token})
            assert resp.status_code == 401

    async def test_unknown_refresh_token_rejected(self, client):
        resp = await client.post(
            f"{PREFIX}/auth/refresh", json={"refresh_token": "totally-made-up-token"}
        )

        assert resp.status_code == 401


class TestLogout:
    async def test_logout_denylists_the_access_token(self, client, registered, auth_headers):
        """Access tokens are stateless; without a denylist they outlive logout."""
        assert (await client.get(f"{PREFIX}/auth/me", headers=auth_headers)).status_code == 200

        out = await client.post(
            f"{PREFIX}/auth/logout",
            json={"refresh_token": registered["refresh_token"]},
            headers=auth_headers,
        )
        assert out.status_code == 200

        after = await client.get(f"{PREFIX}/auth/me", headers=auth_headers)
        assert after.status_code == 401, "access token still works after logout"

    async def test_logout_revokes_the_refresh_family(self, client, registered, auth_headers):
        await client.post(
            f"{PREFIX}/auth/logout",
            json={"refresh_token": registered["refresh_token"]},
            headers=auth_headers,
        )

        resp = await client.post(
            f"{PREFIX}/auth/refresh", json={"refresh_token": registered["refresh_token"]}
        )
        assert resp.status_code == 401

    async def test_logout_requires_authentication(self, client):
        resp = await client.post(f"{PREFIX}/auth/logout", json={})

        assert resp.status_code == 401


class TestFullCycle:
    async def test_register_login_refresh_logout(self, client, credentials):
        reg = await client.post(f"{PREFIX}/auth/register", json=credentials)
        assert reg.status_code == 201

        login = await client.post(
            f"{PREFIX}/auth/login",
            json={
                "identifier": credentials["username"],
                "password": credentials["password"],
            },
        )
        assert login.status_code == 200
        tokens = login.json()["tokens"]

        refreshed = await client.post(
            f"{PREFIX}/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
        )
        assert refreshed.status_code == 200
        new_tokens = refreshed.json()

        headers = {"Authorization": f"Bearer {new_tokens['access_token']}"}
        assert (await client.get(f"{PREFIX}/auth/me", headers=headers)).status_code == 200

        out = await client.post(
            f"{PREFIX}/auth/logout",
            json={"refresh_token": new_tokens["refresh_token"]},
            headers=headers,
        )
        assert out.status_code == 200
        assert (await client.get(f"{PREFIX}/auth/me", headers=headers)).status_code == 401
