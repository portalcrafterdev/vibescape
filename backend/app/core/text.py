"""Hashtag and mention extraction, shared by post captions and comment bodies.

Both entities are written by the same rule: a marker character (`#` or `@`) that
starts a token. The subtlety is deciding when a marker in the middle of other text
is *not* the start of one — `user@example.com` is an email, not a mention of
`example.com`, and `docs.site/page#section` is a URL fragment, not a hashtag.
"""

import re

# Cap what one caption can carry. Without a limit, a single post can insert an
# unbounded number of rows into hashtags/mentions on one request.
MAX_HASHTAGS = 30
MAX_MENTIONS = 30

MAX_TAG_LENGTH = 100

# Deliberately not anchored — the preceding character is checked in Python, because
# the rule ("non-word, start of string, or the end of the previous match") needs the
# previous match's position, which a lookbehind cannot see.
_HASHTAG_RE = re.compile(rf"#([A-Za-z0-9_]{{1,{MAX_TAG_LENGTH}}})")

# Mirrors the username charset in app/schemas/user.py: letters, digits, dots and
# underscores. A username may not begin with a dot, so the first character is
# narrower than the rest.
_MENTION_RE = re.compile(r"@([A-Za-z0-9_][A-Za-z0-9._]{0,29})")

USERNAME_MIN_LENGTH = 3


def _starts_a_token(text: str, start: int, previous_end: int) -> bool:
    """Whether the marker at `start` opens a new token.

    True at the start of the string, after any non-alphanumeric character, or
    immediately after the previous match — that last case is what makes the run
    `#one#two` two hashtags rather than one.
    """
    if start == 0 or start == previous_end:
        return True
    previous = text[start - 1]
    return not (previous.isalnum() or previous == "_")


def _scan(pattern: re.Pattern[str], text: str | None, limit: int) -> list[str]:
    """Ordered, de-duplicated, lowercased matches, capped at `limit`."""
    if not text:
        return []

    found: list[str] = []
    seen: set[str] = set()
    previous_end = 0

    for match in pattern.finditer(text):
        if not _starts_a_token(text, match.start(), previous_end):
            continue
        previous_end = match.end()

        token = match.group(1).lower()
        if token in seen:
            continue

        seen.add(token)
        found.append(token)

        if len(found) >= limit:
            break

    return found


def extract_hashtags(text: str | None) -> list[str]:
    """Hashtags in `text`, without the leading `#`, lowercased and de-duplicated.

    Order is preserved so the first tag in a caption is the first one stored.
    """
    return _scan(_HASHTAG_RE, text, MAX_HASHTAGS)


def extract_mentions(text: str | None) -> list[str]:
    """Candidate usernames in `text`, without the leading `@`.

    Candidates only. These are matched against real accounts before anything is
    stored, so a typo stays plain text rather than becoming a row.
    """
    candidates = _scan(_MENTION_RE, text, MAX_MENTIONS)

    usernames: list[str] = []
    for candidate in candidates:
        # "Ping @bob." ends a sentence; the dot is punctuation, not part of the
        # name. A username cannot end in one anyway, so stripping is safe.
        name = candidate.rstrip(".")
        if len(name) >= USERNAME_MIN_LENGTH:
            usernames.append(name)

    return usernames


def normalise_hashtag(tag: str) -> str:
    """Clean a caller-supplied tag into the stored form.

    Accepts `#Travel` or `Travel` and returns `travel`. Raises when nothing usable
    is left, so an explicit list of junk fails the request rather than writing an
    empty tag.
    """
    cleaned = tag.strip().lstrip("#").lower()

    if not cleaned or not re.fullmatch(rf"[a-z0-9_]{{1,{MAX_TAG_LENGTH}}}", cleaned):
        raise ValueError("a hashtag may contain only letters, numbers and underscores")

    return cleaned
