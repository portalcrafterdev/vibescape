"""Unit tests for the hashtag and mention parser.

No database and no HTTP — this is the piece every composition feature depends on,
and its failure modes are all about where a marker character sits in the text.
"""

import pytest

from app.core.text import (
    MAX_HASHTAGS,
    extract_hashtags,
    extract_mentions,
    normalise_hashtag,
)


class TestHashtags:
    def test_plain(self):
        assert extract_hashtags("a day at the #beach") == ["beach"]

    def test_several(self):
        assert extract_hashtags("#sun #sea #sand") == ["sun", "sea", "sand"]

    def test_lowercased(self):
        assert extract_hashtags("#Travel and #TRAVEL") == ["travel"]

    def test_order_is_kept(self):
        assert extract_hashtags("#zebra then #apple") == ["zebra", "apple"]

    def test_run_without_spaces(self):
        """`#one#two` is two tags, which is what Instagram does with it."""
        assert extract_hashtags("#one#two") == ["one", "two"]

    def test_url_fragment_is_not_a_hashtag(self):
        """The regression this parser exists for."""
        assert extract_hashtags("see docs.example.com/page#section") == []

    def test_mid_word_hash_is_not_a_hashtag(self):
        assert extract_hashtags("issue foo#42 is open") == []

    def test_punctuation_before_is_fine(self):
        assert extract_hashtags("(#winter) and [#snow]") == ["winter", "snow"]

    def test_stops_at_punctuation(self):
        assert extract_hashtags("#hello, world") == ["hello"]

    def test_bare_hash_yields_nothing(self):
        assert extract_hashtags("# ") == []
        assert extract_hashtags("###") == []

    def test_none_and_empty(self):
        assert extract_hashtags(None) == []
        assert extract_hashtags("") == []

    def test_capped(self):
        text = " ".join(f"#tag{i}" for i in range(MAX_HASHTAGS + 20))
        assert len(extract_hashtags(text)) == MAX_HASHTAGS

    def test_underscores_and_digits(self):
        assert extract_hashtags("#road_trip_2026") == ["road_trip_2026"]


class TestMentions:
    def test_plain(self):
        assert extract_mentions("thanks @alice") == ["alice"]

    def test_email_is_not_a_mention(self):
        """The regression this parser exists for."""
        assert extract_mentions("write to bob@example.com") == []

    def test_trailing_dot_is_punctuation(self):
        """A username may not end in a dot, so the sentence's full stop is not part."""
        assert extract_mentions("ask @bob.") == ["bob"]

    def test_dot_inside_is_kept(self):
        assert extract_mentions("hi @first.last") == ["first.last"]

    def test_lowercased(self):
        assert extract_mentions("@Alice") == ["alice"]

    def test_deduplicated(self):
        assert extract_mentions("@alice and @alice again") == ["alice"]

    def test_too_short_is_dropped(self):
        """Usernames are at least 3 characters, so `@ab` cannot name an account."""
        assert extract_mentions("@ab") == []

    def test_several(self):
        assert extract_mentions("@alice @bob @carol") == ["alice", "bob", "carol"]

    def test_none_and_empty(self):
        assert extract_mentions(None) == []
        assert extract_mentions("") == []


class TestNormaliseHashtag:
    def test_accepts_with_or_without_hash(self):
        assert normalise_hashtag("#Travel") == "travel"
        assert normalise_hashtag("Travel") == "travel"

    def test_trims(self):
        assert normalise_hashtag("  #beach  ") == "beach"

    @pytest.mark.parametrize("bad", ["", "#", "  ", "two words", "no-dashes", "emoji🎉"])
    def test_rejects_junk(self, bad):
        with pytest.raises(ValueError):
            normalise_hashtag(bad)
