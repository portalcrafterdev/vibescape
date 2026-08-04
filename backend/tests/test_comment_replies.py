"""Threaded comments: replies, mentions inside them, and the counters."""

from app.core.config import get_settings

PREFIX = get_settings().API_V1_PREFIX

IMAGE = "https://picsum.photos/500/500"


async def create_post(client, headers, caption="hello") -> dict:
    resp = await client.post(
        f"{PREFIX}/posts", headers=headers, json={"image_url": IMAGE, "caption": caption}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def add_comment(client, headers, post_id, body="nice one", parent_id=None) -> dict:
    payload = {"body": body}
    if parent_id:
        payload["parent_id"] = parent_id

    resp = await client.post(f"{PREFIX}/posts/{post_id}/comments", headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def add_reply(client, headers, comment_id, body="replying") -> dict:
    resp = await client.post(
        f"{PREFIX}/comments/{comment_id}/replies", headers=headers, json={"body": body}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestReplies:
    async def test_reply_via_the_dedicated_route(self, client, auth_headers):
        post = await create_post(client, auth_headers)
        parent = await add_comment(client, auth_headers, post["id"])

        reply = await add_reply(client, auth_headers, parent["id"], "I agree")

        assert reply["parent_id"] == parent["id"]
        assert reply["post_id"] == post["id"]
        assert reply["body"] == "I agree"

    async def test_reply_via_parent_id_on_the_post_route(self, client, auth_headers):
        post = await create_post(client, auth_headers)
        parent = await add_comment(client, auth_headers, post["id"])

        reply = await add_comment(
            client, auth_headers, post["id"], "same thing", parent_id=parent["id"]
        )
        assert reply["parent_id"] == parent["id"]

    async def test_top_level_list_excludes_replies(self, client, auth_headers):
        """One busy thread must not push every other comment off the first page."""
        post = await create_post(client, auth_headers)
        parent = await add_comment(client, auth_headers, post["id"], "top")
        await add_reply(client, auth_headers, parent["id"])
        await add_reply(client, auth_headers, parent["id"], "another")

        resp = await client.get(f"{PREFIX}/posts/{post['id']}/comments", headers=auth_headers)
        items = resp.json()["items"]

        assert [i["id"] for i in items] == [parent["id"]]
        assert items[0]["replies_count"] == 2

    async def test_replies_list(self, client, auth_headers):
        post = await create_post(client, auth_headers)
        parent = await add_comment(client, auth_headers, post["id"])
        first = await add_reply(client, auth_headers, parent["id"], "one")
        second = await add_reply(client, auth_headers, parent["id"], "two")

        resp = await client.get(f"{PREFIX}/comments/{parent['id']}/replies", headers=auth_headers)
        assert resp.status_code == 200
        assert [i["id"] for i in resp.json()["items"]] == [first["id"], second["id"]]

    async def test_threads_stay_one_level_deep(self, client, auth_headers):
        """Replying to a reply attaches to the same top-level comment."""
        post = await create_post(client, auth_headers)
        parent = await add_comment(client, auth_headers, post["id"])
        reply = await add_reply(client, auth_headers, parent["id"])

        nested = await add_reply(client, auth_headers, reply["id"], "deeper")

        assert nested["parent_id"] == parent["id"]

        thread = (
            await client.get(f"{PREFIX}/comments/{parent['id']}/replies", headers=auth_headers)
        ).json()
        assert len(thread["items"]) == 2

    async def test_replies_count_only_on_the_parent(self, client, auth_headers):
        post = await create_post(client, auth_headers)
        parent = await add_comment(client, auth_headers, post["id"])
        reply = await add_reply(client, auth_headers, parent["id"])

        assert reply["replies_count"] == 0

    async def test_reply_to_a_missing_comment_is_404(self, client, auth_headers):
        import uuid

        resp = await client.post(
            f"{PREFIX}/comments/{uuid.uuid4()}/replies",
            headers=auth_headers,
            json={"body": "hello"},
        )
        assert resp.status_code == 404

    async def test_parent_from_another_post_is_404(self, client, auth_headers):
        """A parent_id belonging to a different post must not silently attach."""
        first = await create_post(client, auth_headers, caption="one")
        second = await create_post(client, auth_headers, caption="two")
        parent = await add_comment(client, auth_headers, first["id"])

        resp = await client.post(
            f"{PREFIX}/posts/{second['id']}/comments",
            headers=auth_headers,
            json={"body": "misplaced", "parent_id": parent["id"]},
        )
        assert resp.status_code == 404

    async def test_replies_require_auth(self, client, auth_headers):
        post = await create_post(client, auth_headers)
        parent = await add_comment(client, auth_headers, post["id"])

        resp = await client.get(f"{PREFIX}/comments/{parent['id']}/replies")
        assert resp.status_code == 401


class TestCounters:
    async def test_replies_count_towards_the_post_total(self, client, auth_headers):
        """The card says "View all N comments"; opening it must show N."""
        post = await create_post(client, auth_headers)
        parent = await add_comment(client, auth_headers, post["id"])
        await add_reply(client, auth_headers, parent["id"])
        await add_reply(client, auth_headers, parent["id"], "two")

        fresh = (await client.get(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)).json()
        assert fresh["comments_count"] == 3

    async def test_deleting_a_reply_decrements_both(self, client, auth_headers):
        post = await create_post(client, auth_headers)
        parent = await add_comment(client, auth_headers, post["id"])
        reply = await add_reply(client, auth_headers, parent["id"])

        resp = await client.delete(f"{PREFIX}/comments/{reply['id']}", headers=auth_headers)
        assert resp.status_code == 204

        fresh = (await client.get(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)).json()
        assert fresh["comments_count"] == 1

        items = (
            await client.get(f"{PREFIX}/posts/{post['id']}/comments", headers=auth_headers)
        ).json()["items"]
        assert items[0]["replies_count"] == 0

    async def test_deleting_a_parent_takes_the_whole_thread(self, client, auth_headers):
        """The cascade removes the replies; the counter has to follow."""
        post = await create_post(client, auth_headers)
        parent = await add_comment(client, auth_headers, post["id"])
        await add_reply(client, auth_headers, parent["id"])
        await add_reply(client, auth_headers, parent["id"], "two")
        other = await add_comment(client, auth_headers, post["id"], "unrelated")

        await client.delete(f"{PREFIX}/comments/{parent['id']}", headers=auth_headers)

        fresh = (await client.get(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)).json()
        assert fresh["comments_count"] == 1

        items = (
            await client.get(f"{PREFIX}/posts/{post['id']}/comments", headers=auth_headers)
        ).json()["items"]
        assert [i["id"] for i in items] == [other["id"]]

    async def test_count_never_goes_negative(self, client, auth_headers):
        post = await create_post(client, auth_headers)
        parent = await add_comment(client, auth_headers, post["id"])
        await add_reply(client, auth_headers, parent["id"])

        await client.delete(f"{PREFIX}/comments/{parent['id']}", headers=auth_headers)

        fresh = (await client.get(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)).json()
        assert fresh["comments_count"] == 0


class TestMentionsInComments:
    async def test_mention_resolves(self, client, auth_headers, other_user):
        other, _ = other_user
        username = other["user"]["username"]
        post = await create_post(client, auth_headers)

        comment = await add_comment(client, auth_headers, post["id"], f"ask @{username}")

        assert [m["username"] for m in comment["mentions"]] == [username]

    async def test_mention_in_a_reply_resolves(self, client, auth_headers, other_user):
        other, _ = other_user
        username = other["user"]["username"]
        post = await create_post(client, auth_headers)
        parent = await add_comment(client, auth_headers, post["id"])

        reply = await add_reply(client, auth_headers, parent["id"], f"cc @{username}")

        assert [m["username"] for m in reply["mentions"]] == [username]

    async def test_unknown_handle_is_not_stored(self, client, auth_headers):
        post = await create_post(client, auth_headers)
        comment = await add_comment(client, auth_headers, post["id"], "hi @nobody_here_at_all")
        assert comment["mentions"] == []

    async def test_mentions_survive_a_reread(self, client, auth_headers, other_user):
        other, _ = other_user
        username = other["user"]["username"]
        post = await create_post(client, auth_headers)
        await add_comment(client, auth_headers, post["id"], f"@{username} look")

        items = (
            await client.get(f"{PREFIX}/posts/{post['id']}/comments", headers=auth_headers)
        ).json()["items"]
        assert [m["username"] for m in items[0]["mentions"]] == [username]


class TestReplyAuthorisation:
    async def test_post_owner_can_delete_a_reply(self, client, auth_headers, other_user):
        """Moderation: abuse left on your post must be removable."""
        _, other_headers = other_user
        post = await create_post(client, auth_headers)
        parent = await add_comment(client, auth_headers, post["id"])
        reply = await add_reply(client, other_headers, parent["id"], "rude")

        resp = await client.delete(f"{PREFIX}/comments/{reply['id']}", headers=auth_headers)
        assert resp.status_code == 204

    async def test_a_stranger_cannot_delete_a_reply(self, client, auth_headers, make_user):
        _, author_headers = await make_user()
        _, stranger_headers = await make_user()

        post = await create_post(client, auth_headers)
        parent = await add_comment(client, auth_headers, post["id"])
        reply = await add_reply(client, author_headers, parent["id"])

        resp = await client.delete(f"{PREFIX}/comments/{reply['id']}", headers=stranger_headers)
        assert resp.status_code == 403
