import asyncio

from app.core.config import get_settings

settings = get_settings()
PREFIX = settings.API_V1_PREFIX


async def start_dm(client, headers, other_id) -> dict:
    resp = await client.post(f"{PREFIX}/conversations", headers=headers, json={"user_id": other_id})
    assert resp.status_code == 201, resp.text
    return resp.json()


async def send(client, headers, conversation_id, body="hello") -> dict:
    resp = await client.post(
        f"{PREFIX}/conversations/{conversation_id}/messages",
        headers=headers,
        json={"body": body},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestConversations:
    async def test_start_a_dm(self, client, auth_headers, other_user):
        other, _ = other_user

        convo = await start_dm(client, auth_headers, other["user"]["id"])

        assert len(convo["participants"]) == 2

    async def test_opening_twice_reuses_the_same_thread(self, client, auth_headers, other_user):
        """Otherwise every tap on a profile creates another empty conversation."""
        other, _ = other_user

        first = await start_dm(client, auth_headers, other["user"]["id"])
        second = await start_dm(client, auth_headers, other["user"]["id"])

        assert first["id"] == second["id"]

    async def test_either_side_opens_the_same_thread(self, client, auth_headers, other_user):
        """The dm key is sorted, so (a,b) and (b,a) are one conversation. Without
        that each person would message into their own private thread."""
        other, other_headers = other_user
        me_id = (await client.get(f"{PREFIX}/users/me", headers=auth_headers)).json()["id"]

        mine = await start_dm(client, auth_headers, other["user"]["id"])
        theirs = await start_dm(client, other_headers, me_id)

        assert mine["id"] == theirs["id"]

    async def test_cannot_message_yourself(self, client, registered, auth_headers):
        resp = await client.post(
            f"{PREFIX}/conversations",
            headers=auth_headers,
            json={"user_id": registered["user"]["id"]},
        )

        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "cannot_message_self"

    async def test_conversation_row_matches_the_client_shape(
        self, client, auth_headers, other_user
    ):
        other, other_headers = other_user
        convo = await start_dm(client, auth_headers, other["user"]["id"])
        await send(client, other_headers, convo["id"], "hey there")

        rows = (await client.get(f"{PREFIX}/conversations", headers=auth_headers)).json()

        row = rows[0]
        assert row["other"]["username"] == other["user"]["username"]
        assert row["last_message"] == "hey there"
        assert row["unread_count"] == 1
        assert "online" in row

    async def test_conversation_list_excludes_other_peoples_threads(
        self, client, auth_headers, other_user, make_user
    ):
        other, other_headers = other_user
        third, third_headers = await make_user()
        await start_dm(client, other_headers, third["user"]["id"])

        rows = (await client.get(f"{PREFIX}/conversations", headers=auth_headers)).json()

        assert rows == [], "a conversation the viewer is not in appeared in their list"


class TestAuthorisation:
    async def test_outsider_cannot_read_history(self, client, auth_headers, other_user, make_user):
        """The core property of this phase."""
        other, other_headers = other_user
        _, outsider_headers = await make_user()

        me_id = (await client.get(f"{PREFIX}/users/me", headers=auth_headers)).json()["id"]
        convo = await start_dm(client, other_headers, me_id)
        await send(client, other_headers, convo["id"], "private")

        resp = await client.get(
            f"{PREFIX}/conversations/{convo['id']}/messages", headers=outsider_headers
        )

        assert resp.status_code == 404

    async def test_outsider_gets_404_not_403(self, client, auth_headers, other_user, make_user):
        """403 would confirm the thread exists, which is itself information about
        other people's conversations."""
        other, other_headers = other_user
        _, outsider_headers = await make_user()
        me_id = (await client.get(f"{PREFIX}/users/me", headers=auth_headers)).json()["id"]
        convo = await start_dm(client, other_headers, me_id)

        resp = await client.get(
            f"{PREFIX}/conversations/{convo['id']}/messages", headers=outsider_headers
        )

        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "not_found"

    async def test_outsider_cannot_send(self, client, auth_headers, other_user, make_user):
        other, other_headers = other_user
        _, outsider_headers = await make_user()
        me_id = (await client.get(f"{PREFIX}/users/me", headers=auth_headers)).json()["id"]
        convo = await start_dm(client, other_headers, me_id)

        resp = await client.post(
            f"{PREFIX}/conversations/{convo['id']}/messages",
            headers=outsider_headers,
            json={"body": "intruding"},
        )

        assert resp.status_code == 404

    async def test_outsider_cannot_mark_read(self, client, auth_headers, other_user, make_user):
        other, other_headers = other_user
        _, outsider_headers = await make_user()
        me_id = (await client.get(f"{PREFIX}/users/me", headers=auth_headers)).json()["id"]
        convo = await start_dm(client, other_headers, me_id)

        resp = await client.post(
            f"{PREFIX}/conversations/{convo['id']}/read", headers=outsider_headers
        )

        assert resp.status_code == 404

    async def test_unauthenticated_is_refused(self, client):
        assert (await client.get(f"{PREFIX}/conversations")).status_code == 401


class TestMessages:
    async def test_send_and_read_back(self, client, auth_headers, other_user):
        other, other_headers = other_user
        convo = await start_dm(client, auth_headers, other["user"]["id"])

        await send(client, auth_headers, convo["id"], "first")
        await send(client, other_headers, convo["id"], "second")

        page = (
            await client.get(f"{PREFIX}/conversations/{convo['id']}/messages", headers=auth_headers)
        ).json()

        # Newest first, so the first page is what opens on screen.
        assert [m["body"] for m in page["items"]] == ["second", "first"]

    async def test_is_mine_is_per_viewer(self, client, auth_headers, other_user):
        other, other_headers = other_user
        convo = await start_dm(client, auth_headers, other["user"]["id"])
        await send(client, auth_headers, convo["id"], "from me")

        mine = (
            await client.get(f"{PREFIX}/conversations/{convo['id']}/messages", headers=auth_headers)
        ).json()
        theirs = (
            await client.get(
                f"{PREFIX}/conversations/{convo['id']}/messages", headers=other_headers
            )
        ).json()

        assert mine["items"][0]["is_mine"] is True
        assert theirs["items"][0]["is_mine"] is False

    async def test_blank_message_rejected(self, client, auth_headers, other_user):
        other, _ = other_user
        convo = await start_dm(client, auth_headers, other["user"]["id"])

        resp = await client.post(
            f"{PREFIX}/conversations/{convo['id']}/messages",
            headers=auth_headers,
            json={"body": "   "},
        )

        assert resp.status_code == 422

    async def test_pagination_does_not_overlap(self, client, auth_headers, other_user):
        other, _ = other_user
        convo = await start_dm(client, auth_headers, other["user"]["id"])
        for i in range(5):
            await send(client, auth_headers, convo["id"], f"m{i}")

        seen: list[str] = []
        cursor = None
        for _ in range(5):
            url = f"{PREFIX}/conversations/{convo['id']}/messages?limit=2" + (
                f"&cursor={cursor}" if cursor else ""
            )
            page = (await client.get(url, headers=auth_headers)).json()
            seen.extend(m["body"] for m in page["items"])
            cursor = page["next_cursor"]
            if not page["has_more"]:
                break

        assert len(seen) == 5
        assert len(set(seen)) == 5, "a message appeared on two pages"

    async def test_concurrent_sends_all_persist(self, client, auth_headers, other_user):
        other, _ = other_user
        convo = await start_dm(client, auth_headers, other["user"]["id"])

        await asyncio.gather(
            *[
                client.post(
                    f"{PREFIX}/conversations/{convo['id']}/messages",
                    headers=auth_headers,
                    json={"body": f"burst-{i}"},
                )
                for i in range(5)
            ],
            return_exceptions=True,
        )

        page = (
            await client.get(
                f"{PREFIX}/conversations/{convo['id']}/messages?limit=50", headers=auth_headers
            )
        ).json()
        assert len(page["items"]) == 5


class TestUnread:
    async def test_unread_counts_only_the_other_persons_messages(
        self, client, auth_headers, other_user
    ):
        other, other_headers = other_user
        convo = await start_dm(client, auth_headers, other["user"]["id"])

        await send(client, auth_headers, convo["id"], "mine 1")
        await send(client, auth_headers, convo["id"], "mine 2")
        await send(client, other_headers, convo["id"], "theirs")

        rows = (await client.get(f"{PREFIX}/conversations", headers=auth_headers)).json()
        assert rows[0]["unread_count"] == 1, "own messages counted as unread"

    async def test_marking_read_clears_it(self, client, auth_headers, other_user):
        other, other_headers = other_user
        convo = await start_dm(client, auth_headers, other["user"]["id"])
        await send(client, other_headers, convo["id"], "unread")

        await client.post(f"{PREFIX}/conversations/{convo['id']}/read", headers=auth_headers)

        rows = (await client.get(f"{PREFIX}/conversations", headers=auth_headers)).json()
        assert rows[0]["unread_count"] == 0

    async def test_new_message_after_reading_counts_again(self, client, auth_headers, other_user):
        """Unread is derived from a read cursor, not a counter, so it recomputes
        correctly rather than needing to be incremented."""
        other, other_headers = other_user
        convo = await start_dm(client, auth_headers, other["user"]["id"])
        await send(client, other_headers, convo["id"], "one")
        await client.post(f"{PREFIX}/conversations/{convo['id']}/read", headers=auth_headers)

        await send(client, other_headers, convo["id"], "two")

        rows = (await client.get(f"{PREFIX}/conversations", headers=auth_headers)).json()
        assert rows[0]["unread_count"] == 1

    async def test_unread_survives_recomputation(self, client, auth_headers, other_user):
        """Reading the count repeatedly must not change it — the failure mode of a
        stored counter that is decremented on read."""
        other, other_headers = other_user
        convo = await start_dm(client, auth_headers, other["user"]["id"])
        await send(client, other_headers, convo["id"], "a")
        await send(client, other_headers, convo["id"], "b")

        counts = [
            (await client.get(f"{PREFIX}/conversations", headers=auth_headers)).json()[0][
                "unread_count"
            ]
            for _ in range(3)
        ]

        assert counts == [2, 2, 2]

    async def test_total_unread_across_threads(self, client, auth_headers, other_user, make_user):
        other, other_headers = other_user
        third, third_headers = await make_user()
        me_id = (await client.get(f"{PREFIX}/users/me", headers=auth_headers)).json()["id"]

        c1 = await start_dm(client, other_headers, me_id)
        c2 = await start_dm(client, third_headers, me_id)
        await send(client, other_headers, c1["id"], "x")
        await send(client, third_headers, c2["id"], "y")
        await send(client, third_headers, c2["id"], "z")

        total = (await client.get(f"{PREFIX}/conversations/unread", headers=auth_headers)).json()

        assert total["unread_total"] == 3
