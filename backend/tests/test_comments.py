import asyncio

from sqlalchemy import func, select

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.comment import Comment

settings = get_settings()
PREFIX = settings.API_V1_PREFIX

IMAGE = "https://picsum.photos/500/500"


async def create_post(client, headers, caption="hello") -> dict:
    resp = await client.post(
        f"{PREFIX}/posts", headers=headers, json={"image_url": IMAGE, "caption": caption}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def add_comment(client, headers, post_id, body="nice one") -> dict:
    resp = await client.post(
        f"{PREFIX}/posts/{post_id}/comments", headers=headers, json={"body": body}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestCreate:
    async def test_create_returns_the_comment(self, client, registered, auth_headers):
        post = await create_post(client, auth_headers)

        comment = await add_comment(client, auth_headers, post["id"], "first!")

        assert comment["body"] == "first!"
        assert comment["post_id"] == post["id"]
        assert comment["author"]["username"] == registered["user"]["username"]
        assert comment["can_delete"] is True

    async def test_comment_makes_the_count_real(self, client, auth_headers):
        """comments_count was a permanently-zero field before this existed."""
        post = await create_post(client, auth_headers)
        assert post["comments_count"] == 0

        await add_comment(client, auth_headers, post["id"])
        await add_comment(client, auth_headers, post["id"], "second")

        fresh = (await client.get(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)).json()
        assert fresh["comments_count"] == 2

    async def test_can_comment_on_another_users_post(self, client, auth_headers, other_user):
        _, other_headers = other_user
        post = await create_post(client, other_headers)

        comment = await add_comment(client, auth_headers, post["id"], "from a stranger")

        assert comment["body"] == "from a stranger"

    async def test_blank_comment_rejected(self, client, auth_headers):
        post = await create_post(client, auth_headers)

        resp = await client.post(
            f"{PREFIX}/posts/{post['id']}/comments", headers=auth_headers, json={"body": "   "}
        )

        assert resp.status_code == 422

    async def test_body_is_trimmed(self, client, auth_headers):
        post = await create_post(client, auth_headers)

        comment = await add_comment(client, auth_headers, post["id"], "  padded  ")

        assert comment["body"] == "padded"

    async def test_unknown_field_rejected(self, client, auth_headers):
        post = await create_post(client, auth_headers)

        resp = await client.post(
            f"{PREFIX}/posts/{post['id']}/comments",
            headers=auth_headers,
            json={"body": "hi", "author_id": "00000000-0000-0000-0000-000000000000"},
        )

        assert resp.status_code == 422

    async def test_comment_on_unknown_post_is_404(self, client, auth_headers):
        resp = await client.post(
            f"{PREFIX}/posts/00000000-0000-0000-0000-000000000000/comments",
            headers=auth_headers,
            json={"body": "hi"},
        )

        assert resp.status_code == 404

    async def test_requires_authentication(self, client, auth_headers):
        post = await create_post(client, auth_headers)

        resp = await client.post(f"{PREFIX}/posts/{post['id']}/comments", json={"body": "hi"})

        assert resp.status_code == 401

    async def test_concurrent_comments_all_counted(self, client, auth_headers):
        """Unlike likes there is no unique constraint — every comment is distinct, so
        the counter must survive concurrent increments on its own."""
        post = await create_post(client, auth_headers)

        await asyncio.gather(
            *[
                client.post(
                    f"{PREFIX}/posts/{post['id']}/comments",
                    headers=auth_headers,
                    json={"body": f"comment {i}"},
                )
                for i in range(5)
            ],
            return_exceptions=True,
        )

        fresh = (await client.get(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)).json()

        async with SessionLocal() as session:
            actual = await session.scalar(
                select(func.count()).select_from(Comment).where(Comment.post_id == post["id"])
            )

        assert fresh["comments_count"] == actual, "counter drifted from the real row count"


class TestList:
    async def test_oldest_first(self, client, auth_headers):
        post = await create_post(client, auth_headers)
        for body in ("first", "second", "third"):
            await add_comment(client, auth_headers, post["id"], body)

        page = (
            await client.get(f"{PREFIX}/posts/{post['id']}/comments", headers=auth_headers)
        ).json()

        assert [c["body"] for c in page["items"]] == ["first", "second", "third"]

    async def test_pagination_does_not_overlap(self, client, auth_headers):
        post = await create_post(client, auth_headers)
        for i in range(5):
            await add_comment(client, auth_headers, post["id"], f"c{i}")

        seen: list[str] = []
        cursor = None
        for _ in range(5):
            url = f"{PREFIX}/posts/{post['id']}/comments?limit=2" + (
                f"&cursor={cursor}" if cursor else ""
            )
            page = (await client.get(url, headers=auth_headers)).json()
            seen.extend(c["body"] for c in page["items"])
            cursor = page["next_cursor"]
            if not page["has_more"]:
                break

        assert len(seen) == 5
        assert len(set(seen)) == 5, "a comment appeared on two pages"

    async def test_new_comment_midscroll_does_not_shift_pages(self, client, auth_headers):
        post = await create_post(client, auth_headers)
        for i in range(4):
            await add_comment(client, auth_headers, post["id"], f"original-{i}")

        first = (
            await client.get(f"{PREFIX}/posts/{post['id']}/comments?limit=2", headers=auth_headers)
        ).json()
        first_ids = {c["id"] for c in first["items"]}

        await add_comment(client, auth_headers, post["id"], "arrived mid-scroll")

        second = (
            await client.get(
                f"{PREFIX}/posts/{post['id']}/comments?limit=2&cursor={first['next_cursor']}",
                headers=auth_headers,
            )
        ).json()

        assert first_ids.isdisjoint({c["id"] for c in second["items"]})

    async def test_list_exposes_no_private_author_fields(self, client, auth_headers, other_user):
        _, other_headers = other_user
        post = await create_post(client, auth_headers)
        await add_comment(client, other_headers, post["id"])

        page = (
            await client.get(f"{PREFIX}/posts/{post['id']}/comments", headers=auth_headers)
        ).json()

        author = page["items"][0]["author"]
        assert "email" not in author
        assert "password_hash" not in author

    async def test_invalid_cursor_rejected(self, client, auth_headers):
        post = await create_post(client, auth_headers)

        resp = await client.get(
            f"{PREFIX}/posts/{post['id']}/comments?cursor=nonsense", headers=auth_headers
        )

        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "invalid_cursor"


class TestDeletePermissions:
    async def test_author_can_delete_own_comment(self, client, auth_headers, other_user):
        _, other_headers = other_user
        post = await create_post(client, other_headers)
        comment = await add_comment(client, auth_headers, post["id"])

        resp = await client.delete(f"{PREFIX}/comments/{comment['id']}", headers=auth_headers)

        assert resp.status_code == 204

    async def test_post_owner_can_moderate_a_comment_on_their_post(
        self, client, auth_headers, other_user
    ):
        """Without this, someone can leave abuse on your post and you cannot remove it."""
        _, other_headers = other_user
        post = await create_post(client, auth_headers)
        comment = await add_comment(client, other_headers, post["id"], "unwelcome")

        resp = await client.delete(f"{PREFIX}/comments/{comment['id']}", headers=auth_headers)

        assert resp.status_code == 204

    async def test_stranger_cannot_delete(self, client, auth_headers, other_user, make_user):
        _, other_headers = other_user
        _, third_headers = await make_user()

        post = await create_post(client, auth_headers)
        comment = await add_comment(client, other_headers, post["id"])

        resp = await client.delete(f"{PREFIX}/comments/{comment['id']}", headers=third_headers)

        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "permission_denied"

    async def test_the_comment_survives_a_denied_delete(
        self, client, auth_headers, other_user, make_user
    ):
        _, other_headers = other_user
        _, third_headers = await make_user()
        post = await create_post(client, auth_headers)
        comment = await add_comment(client, other_headers, post["id"], "still here")

        await client.delete(f"{PREFIX}/comments/{comment['id']}", headers=third_headers)

        page = (
            await client.get(f"{PREFIX}/posts/{post['id']}/comments", headers=auth_headers)
        ).json()
        assert [c["body"] for c in page["items"]] == ["still here"]

    async def test_can_delete_flag_matches_what_is_allowed(
        self, client, auth_headers, other_user, make_user
    ):
        _, other_headers = other_user
        _, third_headers = await make_user()
        post = await create_post(client, auth_headers)
        await add_comment(client, other_headers, post["id"])

        as_post_owner = (
            await client.get(f"{PREFIX}/posts/{post['id']}/comments", headers=auth_headers)
        ).json()["items"][0]
        as_comment_author = (
            await client.get(f"{PREFIX}/posts/{post['id']}/comments", headers=other_headers)
        ).json()["items"][0]
        as_stranger = (
            await client.get(f"{PREFIX}/posts/{post['id']}/comments", headers=third_headers)
        ).json()["items"][0]

        assert as_post_owner["can_delete"] is True
        assert as_comment_author["can_delete"] is True
        assert as_stranger["can_delete"] is False

    async def test_delete_decrements_the_count(self, client, auth_headers):
        post = await create_post(client, auth_headers)
        c1 = await add_comment(client, auth_headers, post["id"], "one")
        await add_comment(client, auth_headers, post["id"], "two")

        await client.delete(f"{PREFIX}/comments/{c1['id']}", headers=auth_headers)

        fresh = (await client.get(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)).json()
        assert fresh["comments_count"] == 1

    async def test_deleting_unknown_comment_is_404(self, client, auth_headers):
        resp = await client.delete(
            f"{PREFIX}/comments/00000000-0000-0000-0000-000000000000", headers=auth_headers
        )

        assert resp.status_code == 404


class TestCascade:
    async def test_deleting_a_post_removes_its_comments(self, client, auth_headers, other_user):
        """Enforced by the FK, not application code — an orphan cannot survive a code
        path that forgot to clean up."""
        _, other_headers = other_user
        post = await create_post(client, auth_headers)
        await add_comment(client, other_headers, post["id"])
        await add_comment(client, other_headers, post["id"], "another")

        await client.delete(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)

        async with SessionLocal() as session:
            remaining = await session.scalar(
                select(func.count()).select_from(Comment).where(Comment.post_id == post["id"])
            )

        assert remaining == 0
