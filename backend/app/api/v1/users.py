import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.deps import CurrentUser, DbSession, get_current_user
from app.core.logging import get_logger
from app.models.user import User
from app.schemas.user import (
    FollowResponse,
    OwnProfile,
    PaginatedUsers,
    UpdateProfileRequest,
    UserProfile,
    UserSummary,
)
from app.services import users as service

log = get_logger(__name__)
router = APIRouter(prefix="/users", tags=["users"])


async def optional_user(db: DbSession, request_user: CurrentUser | None = None) -> User | None:
    return request_user


def _to_profile(user: User, *, viewer: User | None, following: bool) -> UserProfile:
    profile = UserProfile.model_validate(user)
    profile.is_self = viewer is not None and viewer.id == user.id
    profile.is_following = following
    return profile


# ---------------------------------------------------------------- own profile


@router.get("/me", response_model=OwnProfile)
async def read_me(current_user: CurrentUser) -> OwnProfile:
    """The authenticated user's own profile, including their email."""
    profile = OwnProfile.model_validate(current_user)
    profile.is_self = True
    return profile


@router.patch("/me", response_model=OwnProfile)
async def update_me(
    payload: UpdateProfileRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> OwnProfile:
    """Update your own profile.

    Only fields present in the body are changed. An explicit null clears a field;
    omitting it leaves it alone.
    """
    updated = await service.update_profile(
        db, actor=current_user, target_id=current_user.id, payload=payload
    )
    profile = OwnProfile.model_validate(updated)
    profile.is_self = True
    return profile


# ---------------------------------------------------------------- search
# Registered before /{user_id} so "search" is not parsed as a UUID path param.


@router.get("/search", response_model=list[UserSummary])
async def search_users(
    db: DbSession,
    current_user: CurrentUser,
    q: Annotated[str, Query(min_length=1, max_length=60)],
    limit: Annotated[int, Query(ge=1, le=service.MAX_PAGE_SIZE)] = service.DEFAULT_PAGE_SIZE,
) -> list[UserSummary]:
    """Search users by username or display name."""
    found = await service.search(db, query=q, limit=limit)
    followed = await service.following_set(db, current_user.id, [u.id for u in found])

    return [
        UserSummary(
            id=u.id,
            username=u.username,
            display_name=u.display_name,
            avatar_url=u.avatar_url,
            is_following=u.id in followed,
        )
        for u in found
    ]


@router.get("/by-username/{username}", response_model=UserProfile)
async def read_by_username(
    username: str,
    db: DbSession,
    current_user: CurrentUser,
) -> UserProfile:
    user = await service.get_by_username(db, username)
    following = await service.is_following(db, current_user.id, user.id)
    return _to_profile(user, viewer=current_user, following=following)


# ---------------------------------------------------------------- other profiles


@router.get("/{user_id}", response_model=UserProfile)
async def read_user(
    user_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> UserProfile:
    """Another user's public profile.

    Returns UserProfile, not OwnProfile — email is absent by construction rather than
    by remembering to strip it.
    """
    user = await service.get_by_id(db, user_id)
    following = await service.is_following(db, current_user.id, user.id)
    return _to_profile(user, viewer=current_user, following=following)


@router.patch(
    "/{user_id}",
    response_model=UserProfile,
    dependencies=[Depends(get_current_user)],
)
async def update_user(
    user_id: uuid.UUID,
    payload: UpdateProfileRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> UserProfile:
    """Update a profile by id.

    Exists so the ownership check is exercised on an addressable route: being
    authenticated does not make someone else's row yours. The service raises 403
    unless the id is the caller's own.
    """
    updated = await service.update_profile(
        db, actor=current_user, target_id=user_id, payload=payload
    )
    return _to_profile(updated, viewer=current_user, following=False)


# ---------------------------------------------------------------- follow graph


@router.post("/{user_id}/follow", response_model=FollowResponse, status_code=status.HTTP_200_OK)
async def follow_user(
    user_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> FollowResponse:
    """Follow a user. Idempotent — following twice is not an error."""
    following, followers_count = await service.follow(db, follower=current_user, target_id=user_id)
    return FollowResponse(following=following, followers_count=followers_count)


@router.delete("/{user_id}/follow", response_model=FollowResponse)
async def unfollow_user(
    user_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> FollowResponse:
    """Unfollow a user. Idempotent."""
    following, followers_count = await service.unfollow(
        db, follower=current_user, target_id=user_id
    )
    return FollowResponse(following=following, followers_count=followers_count)


@router.get("/{user_id}/followers", response_model=PaginatedUsers)
async def list_followers(
    user_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=service.MAX_PAGE_SIZE)] = service.DEFAULT_PAGE_SIZE,
) -> PaginatedUsers:
    await service.get_by_id(db, user_id)
    rows, next_cursor, has_more = await service.list_followers(
        db, target_id=user_id, cursor=cursor, limit=limit
    )
    return await _to_page(db, rows, current_user, next_cursor, has_more)


@router.get("/{user_id}/following", response_model=PaginatedUsers)
async def list_following(
    user_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=service.MAX_PAGE_SIZE)] = service.DEFAULT_PAGE_SIZE,
) -> PaginatedUsers:
    await service.get_by_id(db, user_id)
    rows, next_cursor, has_more = await service.list_following(
        db, target_id=user_id, cursor=cursor, limit=limit
    )
    return await _to_page(db, rows, current_user, next_cursor, has_more)


async def _to_page(db, rows, viewer: User, next_cursor: str | None, has_more: bool):
    """Annotate a page with the viewer's follow state in one query, not one per row."""
    users = [row[0] for row in rows]
    followed = await service.following_set(db, viewer.id, [u.id for u in users])

    return PaginatedUsers(
        items=[
            UserSummary(
                id=u.id,
                username=u.username,
                display_name=u.display_name,
                avatar_url=u.avatar_url,
                is_following=u.id in followed,
            )
            for u in users
        ],
        next_cursor=next_cursor,
        has_more=has_more,
    )
