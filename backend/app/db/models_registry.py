"""Single import point for every SQLAlchemy model.

Alembic autogenerate only sees models that have been imported. Add each new model
module here when it is created, or its table will be silently missing from migrations.
"""

from app.db.base import Base
from app.models.comment import Comment
from app.models.follow import Follow
from app.models.hashtag import Hashtag, PostHashtag
from app.models.media import MediaAsset
from app.models.mention import Mention
from app.models.message import Conversation, ConversationParticipant, Message
from app.models.post import Post, PostLike
from app.models.reel import Reel, ReelLike
from app.models.story import Highlight, HighlightItem, Story
from app.models.tag import PostTag
from app.models.token import PasswordResetToken, RefreshToken
from app.models.user import User

__all__ = [
    "Base",
    "Comment",
    "Conversation",
    "ConversationParticipant",
    "Message",
    "Hashtag",
    "Highlight",
    "HighlightItem",
    "Follow",
    "MediaAsset",
    "Mention",
    "PasswordResetToken",
    "Post",
    "PostHashtag",
    "PostLike",
    "PostTag",
    "Reel",
    "ReelLike",
    "RefreshToken",
    "Story",
    "User",
]
