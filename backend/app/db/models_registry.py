"""Single import point for every SQLAlchemy model.

Alembic autogenerate only sees models that have been imported. Add each new model
module here when it is created, or its table will be silently missing from migrations.
"""

from app.db.base import Base
from app.models.comment import Comment
from app.models.follow import Follow
from app.models.post import Post, PostLike
from app.models.token import PasswordResetToken, RefreshToken
from app.models.user import User

__all__ = [
    "Base",
    "Comment",
    "Follow",
    "PasswordResetToken",
    "Post",
    "PostLike",
    "RefreshToken",
    "User",
]
