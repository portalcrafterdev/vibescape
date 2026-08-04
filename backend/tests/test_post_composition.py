"""Hashtags, tagged people and mentions on posts."""

from app.core.config import get_settings

PREFIX = get_settings().API_V1_PREFIX

IMAGE = "https://picsum.photos/500/500"


async def create_post(client, headers, **body) -> dict:
    payload = {"image_url": IMAGE, **body}
    resp = await client.post(f"{PREFIX}/posts", headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestHashtagsOnPosts:
    async def test_caption_tags_are_extracted(self, client, auth_headers):
        post = await create_post(client, auth_headers, caption="sunset at the #beach #summer")
        assert post["hashtags"] == ["beach", "summer"]

    async def test_tags_survive_a_reread(self, client, auth_headers):
        post = await create_post(client, auth_headers, caption="#hiking trip")

        fresh = (await client.get(f"{PREFIX}/posts/{post['id']}", headers=auth_headers)).json()
        assert fresh["hashtags"] == ["hiking"]

    async def test_explicit_tags_merge_with_the_caption(self, client, auth_headers):
        """A composer with a separate tag field still works."""
        post = await create_post(
            client, auth_headers, caption="a walk #outdoors", hashtags=["#Nature", "travel"]
        )
        assert post["hashtags"] == ["outdoors", "nature", "travel"]

    async def test_duplicate_tags_collapse(self, client, auth_headers):
        post = await create_post(client, auth_headers, caption="#same #SAME #same")
        assert post["hashtags"] == ["same"]

    async def test_no_caption_means_no_tags(self, client, auth_headers):
        post = await create_post(client, auth_headers)
        assert post["hashtags"] == []

    async def test_invalid_explicit_tag_is_rejected(self, client, auth_headers):
        resp = await client.post(
            f"{PREFIX}/posts",
            headers=auth_headers,
            json={"image_url": IMAGE, "hashtags": ["two words"]},
        )
        assert resp.status_code == 422

    async def test_editing_a_caption_resyncs_tags(self, client, auth_headers):
        """The tag that left the caption must not linger on the post."""
        post = await create_post(client, auth_headers, caption="#before")

        resp = await client.patch(
            f"{PREFIX}/posts/{post['id']}", headers=auth_headers, json={"caption": "#after"}
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["hashtags"] == ["after"]

    async def test_editing_only_pinned_keeps_tags(self, client, auth_headers):
        post = await create_post(client, auth_headers, caption="#keepme")

        resp = await client.patch(
            f"{PREFIX}/posts/{post['id']}", headers=auth_headers, json={"pinned": True}
        )
        assert resp.json()["hashtags"] == ["keepme"]


class TestHashtagEndpoints:
    async def test_lookup_reports_the_count(self, client, auth_headers):
        await create_post(client, auth_headers, caption="#shared one")
        await create_post(client, auth_headers, caption="#shared two")

        resp = await client.get(f"{PREFIX}/hashtags/shared", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == {"tag": "shared", "posts_count": 2}

    async def test_lookup_is_case_insensitive(self, client, auth_headers):
        await create_post(client, auth_headers, caption="#MixedCase")

        resp = await client.get(f"{PREFIX}/hashtags/MIXEDCASE", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["tag"] == "mixedcase"

    async def test_unknown_tag_is_404(self, client, auth_headers):
        resp = await client.get(f"{PREFIX}/hashtags/neverused", headers=auth_headers)
        assert resp.status_code == 404

    async def test_posts_for_a_tag(self, client, auth_headers):
        tagged = await create_post(client, auth_headers, caption="#findme here")
        await create_post(client, auth_headers, caption="not tagged")

        resp = await client.get(f"{PREFIX}/hashtags/findme/posts", headers=auth_headers)
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert [i["id"] for i in items] == [tagged["id"]]

    async def test_unused_tag_lists_empty_rather_than_404(self, client, auth_headers):
        """Tapping a tag in a caption should show "nothing here", not an error."""
        resp = await client.get(f"{PREFIX}/hashtags/nothing/posts", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["items"] == []

    async def test_search_is_prefix_matched_and_ranked(self, client, auth_headers):
        await create_post(client, auth_headers, caption="#travel a")
        await create_post(client, auth_headers, caption="#travel b")
        await create_post(client, auth_headers, caption="#travelling c")
        await create_post(client, auth_headers, caption="#cooking d")

        resp = await client.get(
            f"{PREFIX}/hashtags/search", headers=auth_headers, params={"q": "trav"}
        )
        assert resp.status_code == 200
        tags = [row["tag"] for row in resp.json()]

        assert tags == ["travel", "travelling"]  # most used first
        assert "cooking" not in tags

    async def test_search_accepts_a_leading_hash(self, client, auth_headers):
        await create_post(client, auth_headers, caption="#coffee")

        resp = await client.get(
            f"{PREFIX}/hashtags/search", headers=auth_headers, params={"q": "#cof"}
        )
        assert [row["tag"] for row in resp.json()] == ["coffee"]

    async def test_wildcard_in_the_query_is_escaped(self, client, auth_headers):
        """A bare "%" must not match every tag in the table."""
        await create_post(client, auth_headers, caption="#alpha #beta")

        resp = await client.get(
            f"{PREFIX}/hashtags/search", headers=auth_headers, params={"q": "%"}
        )
        assert resp.json() == []

    async def test_deleting_a_post_releases_its_tag_count(self, client, auth_headers):
        first = await create_post(client, auth_headers, caption="#counted")
        await create_post(client, auth_headers, caption="#counted again")

        await client.delete(f"{PREFIX}/posts/{first['id']}", headers=auth_headers)

        resp = await client.get(f"{PREFIX}/hashtags/counted", headers=auth_headers)
        assert resp.json()["posts_count"] == 1

    async def test_search_requires_auth(self, client):
        resp = await client.get(f"{PREFIX}/hashtags/search", params={"q": "x"})
        assert resp.status_code == 401


class TestTaggedPeople:
    async def test_tag_someone_when_creating(self, client, auth_headers, other_user):
        other, _ = other_user

        post = await create_post(
            client,
            auth_headers,
            tagged_users=[{"user_id": other["user"]["id"], "x": 0.5, "y": 0.25}],
        )

        assert len(post["tagged_users"]) == 1
        tag = post["tagged_users"][0]
        assert tag["username"] == other["user"]["username"]
        assert tag["x"] == 0.5
        assert tag["y"] == 0.25

    async def test_position_is_optional(self, client, auth_headers, other_user):
        other, _ = other_user
        post = await create_post(
            client, auth_headers, tagged_users=[{"user_id": other["user"]["id"]}]
        )
        assert post["tagged_users"][0]["x"] is None

    async def test_position_must_be_a_fraction(self, client, auth_headers, other_user):
        other, _ = other_user
        resp = await client.post(
            f"{PREFIX}/posts",
            headers=auth_headers,
            json={
                "image_url": IMAGE,
                "tagged_users": [{"user_id": other["user"]["id"], "x": 42, "y": 0.5}],
            },
        )
        assert resp.status_code == 422

    async def test_tagging_a_nonexistent_user_fails(self, client, auth_headers):
        import uuid

        resp = await client.post(
            f"{PREFIX}/posts",
            headers=auth_headers,
            json={"image_url": IMAGE, "tagged_users": [{"user_id": str(uuid.uuid4())}]},
        )
        assert resp.status_code == 400

    async def test_a_failed_tag_rolls_the_post_back(self, client, auth_headers):
        """The post and its tags land together, or not at all."""
        import uuid

        before = (await client.get(f"{PREFIX}/feed", headers=auth_headers)).json()

        await client.post(
            f"{PREFIX}/posts",
            headers=auth_headers,
            json={"image_url": IMAGE, "tagged_users": [{"user_id": str(uuid.uuid4())}]},
        )

        after = (await client.get(f"{PREFIX}/feed", headers=auth_headers)).json()
        assert len(after["items"]) == len(before["items"])

    async def test_add_a_tag_afterwards(self, client, auth_headers, other_user):
        other, _ = other_user
        post = await create_post(client, auth_headers)

        resp = await client.post(
            f"{PREFIX}/posts/{post['id']}/tags",
            headers=auth_headers,
            json={"user_id": other["user"]["id"], "x": 0.1, "y": 0.2},
        )
        assert resp.status_code == 201, resp.text
        assert [t["username"] for t in resp.json()] == [other["user"]["username"]]

    async def test_retagging_moves_the_marker(self, client, auth_headers, other_user):
        other, _ = other_user
        post = await create_post(client, auth_headers)
        url = f"{PREFIX}/posts/{post['id']}/tags"

        await client.post(
            url, headers=auth_headers, json={"user_id": other["user"]["id"], "x": 0.1}
        )
        resp = await client.post(
            url, headers=auth_headers, json={"user_id": other["user"]["id"], "x": 0.9}
        )

        assert len(resp.json()) == 1
        assert resp.json()[0]["x"] == 0.9

    async def test_only_the_author_may_tag(self, client, auth_headers, other_user):
        other, other_headers = other_user
        post = await create_post(client, auth_headers)

        resp = await client.post(
            f"{PREFIX}/posts/{post['id']}/tags",
            headers=other_headers,
            json={"user_id": other["user"]["id"]},
        )
        assert resp.status_code == 403

    async def test_author_can_remove_a_tag(self, client, auth_headers, other_user):
        other, _ = other_user
        post = await create_post(
            client, auth_headers, tagged_users=[{"user_id": other["user"]["id"]}]
        )

        resp = await client.delete(
            f"{PREFIX}/posts/{post['id']}/tags/{other['user']['id']}", headers=auth_headers
        )
        assert resp.status_code == 204

        remaining = (
            await client.get(f"{PREFIX}/posts/{post['id']}/tags", headers=auth_headers)
        ).json()
        assert remaining == []

    async def test_you_can_untag_yourself(self, client, auth_headers, other_user):
        """Being tagged is done to you, so you must be able to undo it."""
        other, other_headers = other_user
        post = await create_post(
            client, auth_headers, tagged_users=[{"user_id": other["user"]["id"]}]
        )

        resp = await client.delete(
            f"{PREFIX}/posts/{post['id']}/tags/{other['user']['id']}", headers=other_headers
        )
        assert resp.status_code == 204

    async def test_a_third_party_cannot_untag(self, client, auth_headers, make_user):
        tagged, _ = await make_user()
        _, stranger_headers = await make_user()

        post = await create_post(
            client, auth_headers, tagged_users=[{"user_id": tagged["user"]["id"]}]
        )

        resp = await client.delete(
            f"{PREFIX}/posts/{post['id']}/tags/{tagged['user']['id']}", headers=stranger_headers
        )
        assert resp.status_code == 403

    async def test_tagged_tab_lists_the_post(self, client, auth_headers, other_user):
        other, other_headers = other_user
        post = await create_post(
            client, auth_headers, tagged_users=[{"user_id": other["user"]["id"]}]
        )

        resp = await client.get(
            f"{PREFIX}/users/{other['user']['id']}/tagged", headers=other_headers
        )
        assert resp.status_code == 200
        assert [i["id"] for i in resp.json()["items"]] == [post["id"]]

    async def test_tagged_tab_is_empty_for_an_untagged_user(self, client, auth_headers, registered):
        await create_post(client, auth_headers, caption="nobody tagged")

        resp = await client.get(
            f"{PREFIX}/users/{registered['user']['id']}/tagged", headers=auth_headers
        )
        assert resp.json()["items"] == []

    async def test_untagging_removes_it_from_the_tab(self, client, auth_headers, other_user):
        other, other_headers = other_user
        post = await create_post(
            client, auth_headers, tagged_users=[{"user_id": other["user"]["id"]}]
        )

        await client.delete(
            f"{PREFIX}/posts/{post['id']}/tags/{other['user']['id']}", headers=other_headers
        )

        resp = await client.get(
            f"{PREFIX}/users/{other['user']['id']}/tagged", headers=other_headers
        )
        assert resp.json()["items"] == []


class TestMentionsOnPosts:
    async def test_mention_resolves_to_the_account(self, client, auth_headers, other_user):
        other, _ = other_user
        username = other["user"]["username"]

        post = await create_post(client, auth_headers, caption=f"shot by @{username}")

        assert [m["username"] for m in post["mentions"]] == [username]

    async def test_unknown_handle_is_not_stored(self, client, auth_headers):
        """A typo stays plain text rather than becoming a row."""
        post = await create_post(client, auth_headers, caption="thanks @nobody_at_all")
        assert post["mentions"] == []

    async def test_email_in_a_caption_is_not_a_mention(self, client, auth_headers):
        post = await create_post(client, auth_headers, caption="mail me at hi@example.com")
        assert post["mentions"] == []

    async def test_mentions_feed(self, client, auth_headers, other_user):
        other, other_headers = other_user
        username = other["user"]["username"]

        post = await create_post(client, auth_headers, caption=f"with @{username}")
        await create_post(client, auth_headers, caption="nobody here")

        resp = await client.get(f"{PREFIX}/users/me/mentions", headers=other_headers)
        assert resp.status_code == 200
        assert [i["id"] for i in resp.json()["items"]] == [post["id"]]

    async def test_mentions_feed_is_per_viewer(self, client, auth_headers, other_user):
        other, _ = other_user
        await create_post(client, auth_headers, caption=f"@{other['user']['username']} look")

        resp = await client.get(f"{PREFIX}/users/me/mentions", headers=auth_headers)
        assert resp.json()["items"] == []

    async def test_editing_a_caption_resyncs_mentions(self, client, auth_headers, other_user):
        other, other_headers = other_user
        post = await create_post(client, auth_headers, caption=f"@{other['user']['username']} hi")

        resp = await client.patch(
            f"{PREFIX}/posts/{post['id']}", headers=auth_headers, json={"caption": "never mind"}
        )
        assert resp.json()["mentions"] == []

        feed = (await client.get(f"{PREFIX}/users/me/mentions", headers=other_headers)).json()
        assert feed["items"] == []


class TestFeedCarriesComposition:
    async def test_feed_card_has_all_three(self, client, auth_headers, other_user):
        other, _ = other_user
        username = other["user"]["username"]

        await create_post(
            client,
            auth_headers,
            caption=f"#roadtrip with @{username}",
            tagged_users=[{"user_id": other["user"]["id"], "x": 0.4, "y": 0.6}],
        )

        feed = (await client.get(f"{PREFIX}/feed", headers=auth_headers)).json()
        card = feed["items"][0]

        assert card["hashtags"] == ["roadtrip"]
        assert [m["username"] for m in card["mentions"]] == [username]
        assert [t["username"] for t in card["tagged_users"]] == [username]


class TestCombinedSearch:
    async def test_returns_users_and_hashtags(self, client, auth_headers, make_user):
        person, _ = await make_user()
        username = person["user"]["username"]

        # Tag sharing the account's prefix, so one query hits both sides.
        await create_post(client, auth_headers, caption=f"#{username}")

        resp = await client.get(
            f"{PREFIX}/search", headers=auth_headers, params={"q": username[:8]}
        )
        assert resp.status_code == 200
        body = resp.json()

        assert username in [u["username"] for u in body["users"]]
        assert username in [h["tag"] for h in body["hashtags"]]

    async def test_leading_hash_searches_tags_only(self, client, auth_headers, make_user):
        person, _ = await make_user()
        username = person["user"]["username"]
        await create_post(client, auth_headers, caption=f"#{username}")

        resp = await client.get(
            f"{PREFIX}/search", headers=auth_headers, params={"q": f"#{username[:8]}"}
        )
        body = resp.json()

        assert body["users"] == []
        assert username in [h["tag"] for h in body["hashtags"]]

    async def test_requires_auth(self, client):
        resp = await client.get(f"{PREFIX}/search", params={"q": "anything"})
        assert resp.status_code == 401
