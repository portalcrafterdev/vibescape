import { AxiosResponse } from "axios";
import api from "./axios";

// ============================================================
// Shared types
// ============================================================

export interface CursorParams {
  cursor?: string | null;
  limit?: number;
}

export interface MessageResponse {
  message: string;
}

export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  database: "up" | "down";
  cache: "up" | "down";
}

// ============================================================
// Auth types
// ============================================================

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface SignUpRequest {
  username: string;
  email: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token?: string | null;
}

export interface forgotrequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/** What /auth/register, /auth/login and /auth/me return: account fields only, no counts. */
export interface UserPrivate {
  id: string;
  username: string;
  email: string;
  created_at: string;
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  gender?: string | null;
}

export interface AuthResponse {
  user: UserPrivate;
  tokens: TokenPair;
}

// ============================================================
// User types
// ============================================================

export interface ProfileLink {
  title: string;
  url: string;
}

/** Someone else's profile: /users/{id}, /users/by-username/{username}. */
export interface UserProfile {
  id: string;
  username: string;
  created_at: string;
  display_name?: string | null;
  bio?: string | null;
  pronouns?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  gender?: string | null;
  links?: ProfileLink[];
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  is_following?: boolean;
  is_self?: boolean;
}

/** The signed-in user's own profile: /users/me. Same as UserProfile plus email. */
export interface OwnProfile extends UserProfile {
  email: string;
}

/**
 * The profile object screens hold in state (populated by getme).
 * post_count is kept only so older screens keep compiling — the API field is posts_count.
 */
export type AuthUser = OwnProfile & {
  /** @deprecated the API returns posts_count */
  post_count?: number;
};

export interface UserSummary {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  is_following?: boolean;
}

export interface UpdateProfileRequest {
  username?: string | null;
  display_name?: string | null;
  bio?: string | null;
  pronouns?: string | null;
  gender?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  links?: ProfileLink[] | null;
}

export interface FollowResponse {
  following: boolean;
  followers_count: number;
}

export interface PaginatedUsers {
  items: UserSummary[];
  next_cursor?: string | null;
  has_more?: boolean;
}

// ============================================================
// Post types
// ============================================================

export interface PostAuthor {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface PostOut {
  id: string;
  author: PostAuthor;
  created_at: string;
  image_url?: string | null;
  caption?: string | null;
  likes_count?: number;
  comments_count?: number;
  pinned?: boolean;
  is_liked?: boolean;
  is_mine?: boolean;
}

/** Trimmed post shape used by the profile grid. */
export interface PostGridItem {
  id: string;
  image_url?: string | null;
  pinned?: boolean;
  likes_count?: number;
  comments_count?: number;
}

export interface CreatePostRequest {
  image_url?: string | null;
  media_asset_id?: string | null;
  caption?: string | null;
}

export interface UpdatePostRequest {
  caption?: string | null;
  pinned?: boolean | null;
}

export interface LikeResponse {
  liked: boolean;
  likes_count: number;
}

export interface PaginatedPosts {
  items: PostOut[];
  next_cursor?: string | null;
  has_more?: boolean;
}

export interface PaginatedGrid {
  items: PostGridItem[];
  next_cursor?: string | null;
  has_more?: boolean;
}

// ============================================================
// Comment types
// ============================================================

export interface CommentOut {
  id: string;
  post_id: string;
  author: PostAuthor;
  body: string;
  created_at: string;
  can_delete?: boolean;
}

export interface CreateCommentRequest {
  body: string;
}

export interface PaginatedComments {
  items: CommentOut[];
  next_cursor?: string | null;
  has_more?: boolean;
}

// ============================================================
// Media types
// ============================================================

export interface UploadUrlRequest {
  content_type: string;
}

export interface UploadUrlResponse {
  asset_id: string;
  upload_url: string;
  fields: Record<string, string>;
  max_bytes: number;
  expires_in: number;
}

export interface MediaOut {
  asset_id: string;
  url: string;
  expires_in: number;
  content_type?: string | null;
  size_bytes?: number | null;
}

// ============================================================
// Reel types
// ============================================================

export interface ReelOut {
  id: string;
  author: PostAuthor;
  video_url: string;
  created_at: string;
  album_url?: string | null;
  caption?: string | null;
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  is_liked?: boolean;
  is_mine?: boolean;
}

export interface CreateReelRequest {
  video_url?: string | null;
  media_asset_id?: string | null;
  album_url?: string | null;
  caption?: string | null;
}

export interface ReelLikeResponse {
  liked: boolean;
  likes_count: number;
}

export interface PaginatedReels {
  items: ReelOut[];
  next_cursor?: string | null;
  has_more?: boolean;
}

// ============================================================
// Story & highlight types
// ============================================================

export interface StoryOut {
  id: string;
  author: PostAuthor;
  image_url: string;
  created_at: string;
  expires_at: string;
  is_mine?: boolean;
}

/** One bubble in the story tray, one entry per author. */
export interface StoryTray {
  author: PostAuthor;
  latest_at: string;
  is_mine?: boolean;
  story_count?: number;
  preview_url?: string | null;
}

export interface CreateStoryRequest {
  image_url?: string | null;
  media_asset_id?: string | null;
}

export interface HighlightOut {
  id: string;
  title: string;
  cover_url?: string | null;
  position?: number;
  item_count?: number;
}

export interface HighlightItemOut {
  id: string;
  image_url?: string | null;
  position?: number;
}

export interface CreateHighlightRequest {
  title: string;
  cover_url?: string | null;
  story_ids?: string[];
}

// ============================================================
// Explore types
// ============================================================

export interface ExploreItem {
  id: string;
  image_url: string;
  views?: number;
  is_video?: boolean;
}

export interface ExploreResponse {
  items: ExploreItem[];
}

// ============================================================
// Messaging types
// ============================================================

export interface ConversationOut {
  id: string;
  participants: PostAuthor[];
  created_at: string;
}

/** A row in the inbox list. */
export interface ConversationRow {
  id: string;
  other: PostAuthor;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
  online?: boolean;
}

export interface StartConversationRequest {
  user_id: string;
}

export interface MessageOut {
  id: string;
  conversation_id: string;
  sender: PostAuthor;
  body: string;
  created_at: string;
  is_mine?: boolean;
}

export interface SendMessageRequest {
  body: string;
}

export interface PaginatedMessages {
  items: MessageOut[];
  next_cursor?: string | null;
  has_more?: boolean;
}

export interface UnreadTotal {
  unread_total: number;
}

// ============================================================
// Helpers
// ============================================================

/**
 * Endpoints that promise a body sometimes answer 204 or an empty string when a
 * proxy trims the response. Screens read `.data` straight away, so fail loudly
 * here instead of handing them undefined.
 */
const unwrap = <T>(response: AxiosResponse<T>): T => {
  if (response.status === 204 || !response.data) {
    throw new Error("The server returned an empty response.");
  }
  return response.data;
};

// ============================================================
// Auth  —  /auth
// ============================================================

/** POST /auth/register -> 201 */
export const registerUser = async (
  data: SignUpRequest
): Promise<AuthResponse> => unwrap(await api.post("/auth/register", data));

/** POST /auth/login */
export const loginUser = async (
  data: LoginRequest
): Promise<AuthResponse> => unwrap(await api.post("/auth/login", data));

/**
 * POST /auth/refresh
 * The axios interceptor calls this endpoint directly on a 401; this export is
 * for manual refreshes (for example on app resume).
 */
export const refreshToken = async (
  data: RefreshRequest
): Promise<TokenPair> => unwrap(await api.post("/auth/refresh", data));

/** POST /auth/logout — auth required. Revokes the refresh token server-side. */
export const logoutUser = async (
  data: LogoutRequest = {}
): Promise<MessageResponse> => unwrap(await api.post("/auth/logout", data));

/** POST /auth/forgot-password */
export const forgotpassword = async (
  data: forgotrequest
): Promise<MessageResponse> =>
  unwrap(await api.post("/auth/forgot-password", data));

/** POST /auth/reset-password — `token` comes from the emailed reset link. */
export const resetPassword = async (
  data: ResetPasswordRequest
): Promise<MessageResponse> =>
  unwrap(await api.post("/auth/reset-password", data));

/** GET /auth/me — auth required. Account fields only; use getme for the profile. */
export const getAuthMe = async (): Promise<UserPrivate> =>
  unwrap(await api.get("/auth/me"));

// ============================================================
// Users  —  /users
// ============================================================

/** GET /users/me — auth required. */
export const getme = async (): Promise<OwnProfile> =>
  unwrap(await api.get("/users/me"));

/** PATCH /users/me — auth required. Send only the fields being changed. */
export const updateMe = async (
  data: UpdateProfileRequest
): Promise<OwnProfile> => unwrap(await api.patch("/users/me", data));

/** GET /users/search?q=&limit= — auth required. q is 1-60 chars, limit 1-50. */
export const searchUsers = async (
  q: string,
  limit = 20
): Promise<UserSummary[]> =>
  unwrap(await api.get("/users/search", { params: { q, limit } }));

/** GET /users/by-username/{username} — auth required. */
export const getUserByUsername = async (
  username: string
): Promise<UserProfile> =>
  unwrap(await api.get(`/users/by-username/${encodeURIComponent(username)}`));

/** GET /users/{user_id} — auth required. */
export const getUserById = async (userId: string): Promise<UserProfile> =>
  unwrap(await api.get(`/users/${userId}`));

/** PATCH /users/{user_id} — auth required. */
export const updateUser = async (
  userId: string,
  data: UpdateProfileRequest
): Promise<UserProfile> => unwrap(await api.patch(`/users/${userId}`, data));

/** POST /users/{user_id}/follow — auth required. No body. */
export const followUser = async (userId: string): Promise<FollowResponse> =>
  unwrap(await api.post(`/users/${userId}/follow`));

/** DELETE /users/{user_id}/follow — auth required. */
export const unfollowUser = async (userId: string): Promise<FollowResponse> =>
  unwrap(await api.delete(`/users/${userId}/follow`));

/** GET /users/{user_id}/followers?cursor=&limit= — auth required. limit 1-50. */
export const listFollowers = async (
  userId: string,
  params: CursorParams = {}
): Promise<PaginatedUsers> =>
  unwrap(await api.get(`/users/${userId}/followers`, { params }));

/** GET /users/{user_id}/following?cursor=&limit= — auth required. limit 1-50. */
export const listFollowing = async (
  userId: string,
  params: CursorParams = {}
): Promise<PaginatedUsers> =>
  unwrap(await api.get(`/users/${userId}/following`, { params }));

// ============================================================
// Feed & posts  —  /feed, /posts
// ============================================================

/** GET /feed?cursor=&limit= — auth required. limit 1-50, default 20. */
export const getFeed = async (
  params: CursorParams = {}
): Promise<PaginatedPosts> => unwrap(await api.get("/feed", { params }));

/**
 * POST /posts -> 201 — auth required.
 * Pass either image_url or media_asset_id (from the media upload flow).
 */
export const createPost = async (
  data: CreatePostRequest
): Promise<PostOut> => unwrap(await api.post("/posts", data));

/** GET /posts/{post_id} — auth required. */
export const getPost = async (postId: string): Promise<PostOut> =>
  unwrap(await api.get(`/posts/${postId}`));

/** PATCH /posts/{post_id} — auth required. Author only. */
export const updatePost = async (
  postId: string,
  data: UpdatePostRequest
): Promise<PostOut> => unwrap(await api.patch(`/posts/${postId}`, data));

/** DELETE /posts/{post_id} -> 204 — auth required. Author only. */
export const deletePost = async (postId: string): Promise<void> => {
  await api.delete(`/posts/${postId}`);
};

/** POST /posts/{post_id}/like — auth required. No body. */
export const likePost = async (postId: string): Promise<LikeResponse> =>
  unwrap(await api.post(`/posts/${postId}/like`));

/** DELETE /posts/{post_id}/like — auth required. */
export const unlikePost = async (postId: string): Promise<LikeResponse> =>
  unwrap(await api.delete(`/posts/${postId}/like`));

/** GET /users/{user_id}/posts?cursor=&limit= — auth required. Profile grid. */
export const getUserPosts = async (
  userId: string,
  params: CursorParams = {}
): Promise<PaginatedGrid> =>
  unwrap(await api.get(`/users/${userId}/posts`, { params }));

// ============================================================
// Comments  —  /posts/{id}/comments, /comments
// ============================================================

/** POST /posts/{post_id}/comments -> 201 — auth required. */
export const createComment = async (
  postId: string,
  data: CreateCommentRequest
): Promise<CommentOut> =>
  unwrap(await api.post(`/posts/${postId}/comments`, data));

/** GET /posts/{post_id}/comments?cursor=&limit= — auth required. */
export const listComments = async (
  postId: string,
  params: CursorParams = {}
): Promise<PaginatedComments> =>
  unwrap(await api.get(`/posts/${postId}/comments`, { params }));

/** DELETE /comments/{comment_id} -> 204 — auth required. */
export const deleteComment = async (commentId: string): Promise<void> => {
  await api.delete(`/comments/${commentId}`);
};

// ============================================================
// Media  —  /media
// ============================================================

/**
 * POST /media/upload-url — auth required.
 * Step 1 of the upload flow: hand back a presigned URL plus the form fields to
 * POST the binary to. Upload goes straight to storage, not through this API.
 */
export const createUploadUrl = async (
  data: UploadUrlRequest
): Promise<UploadUrlResponse> =>
  unwrap(await api.post("/media/upload-url", data));

/** POST /media/{asset_id}/confirm — auth required. Step 2: mark the upload done. */
export const confirmUpload = async (assetId: string): Promise<MediaOut> =>
  unwrap(await api.post(`/media/${assetId}/confirm`));

/** GET /media/{asset_id} — auth required. Returns a fresh signed URL. */
export const getMedia = async (assetId: string): Promise<MediaOut> =>
  unwrap(await api.get(`/media/${assetId}`));

// ============================================================
// Reels  —  /reels
// ============================================================

/** GET /reels?cursor=&limit= — auth required. limit 1-30, default 10. */
export const listReels = async (
  params: CursorParams = {}
): Promise<PaginatedReels> => unwrap(await api.get("/reels", { params }));

/** POST /reels -> 201 — auth required. Pass video_url or media_asset_id. */
export const createReel = async (
  data: CreateReelRequest
): Promise<ReelOut> => unwrap(await api.post("/reels", data));

/** DELETE /reels/{reel_id} -> 204 — auth required. Author only. */
export const deleteReel = async (reelId: string): Promise<void> => {
  await api.delete(`/reels/${reelId}`);
};

/** POST /reels/{reel_id}/like — auth required. */
export const likeReel = async (reelId: string): Promise<ReelLikeResponse> =>
  unwrap(await api.post(`/reels/${reelId}/like`));

/** DELETE /reels/{reel_id}/like — auth required. */
export const unlikeReel = async (reelId: string): Promise<ReelLikeResponse> =>
  unwrap(await api.delete(`/reels/${reelId}/like`));

/** POST /reels/{reel_id}/view — auth required. Fire-and-forget view counter. */
export const recordReelView = async (
  reelId: string
): Promise<Record<string, any>> =>
  unwrap(await api.post(`/reels/${reelId}/view`));

// ============================================================
// Stories  —  /stories
// ============================================================

/** GET /stories — auth required. One tray entry per author with active stories. */
export const getStoryTray = async (): Promise<StoryTray[]> =>
  unwrap(await api.get("/stories"));

/** POST /stories -> 201 — auth required. Pass image_url or media_asset_id. */
export const createStory = async (
  data: CreateStoryRequest
): Promise<StoryOut> => unwrap(await api.post("/stories", data));

/** GET /users/{user_id}/stories — auth required. That author's active stories. */
export const getUserStories = async (userId: string): Promise<StoryOut[]> =>
  unwrap(await api.get(`/users/${userId}/stories`));

/** DELETE /stories/{story_id} -> 204 — auth required. Author only. */
export const deleteStory = async (storyId: string): Promise<void> => {
  await api.delete(`/stories/${storyId}`);
};

// ============================================================
// Highlights  —  /highlights
// ============================================================

/** GET /users/{user_id}/highlights — auth required. */
export const getUserHighlights = async (
  userId: string
): Promise<HighlightOut[]> =>
  unwrap(await api.get(`/users/${userId}/highlights`));

/** POST /highlights -> 201 — auth required. story_ids seed the highlight. */
export const createHighlight = async (
  data: CreateHighlightRequest
): Promise<HighlightOut> => unwrap(await api.post("/highlights", data));

/** GET /highlights/{highlight_id}/items — auth required. */
export const getHighlightItems = async (
  highlightId: string
): Promise<HighlightItemOut[]> =>
  unwrap(await api.get(`/highlights/${highlightId}/items`));

/** DELETE /highlights/{highlight_id} -> 204 — auth required. */
export const deleteHighlight = async (highlightId: string): Promise<void> => {
  await api.delete(`/highlights/${highlightId}`);
};

// ============================================================
// Explore  —  /explore
// ============================================================

/** GET /explore?limit= — auth required. limit 1-60, default 30. */
export const getExplore = async (limit = 30): Promise<ExploreResponse> =>
  unwrap(await api.get("/explore", { params: { limit } }));

// ============================================================
// Messaging  —  /conversations
// ============================================================

/** GET /conversations?limit= — auth required. limit 1-100, default 30. */
export const listConversations = async (
  limit = 30
): Promise<ConversationRow[]> =>
  unwrap(await api.get("/conversations", { params: { limit } }));

/** POST /conversations -> 201 — auth required. Reuses the existing thread if any. */
export const startConversation = async (
  data: StartConversationRequest
): Promise<ConversationOut> => unwrap(await api.post("/conversations", data));

/** GET /conversations/unread — auth required. Badge count across all threads. */
export const getUnreadTotal = async (): Promise<UnreadTotal> =>
  unwrap(await api.get("/conversations/unread"));

/** GET /conversations/{conversation_id}/messages?cursor=&limit= — auth required. */
export const listMessages = async (
  conversationId: string,
  params: CursorParams = {}
): Promise<PaginatedMessages> =>
  unwrap(await api.get(`/conversations/${conversationId}/messages`, { params }));

/** POST /conversations/{conversation_id}/messages -> 201 — auth required. */
export const sendMessage = async (
  conversationId: string,
  data: SendMessageRequest
): Promise<MessageOut> =>
  unwrap(await api.post(`/conversations/${conversationId}/messages`, data));

/** POST /conversations/{conversation_id}/read — auth required. No body. */
export const markConversationRead = async (
  conversationId: string
): Promise<UnreadTotal> =>
  unwrap(await api.post(`/conversations/${conversationId}/read`));

// ============================================================
// Health  —  /health
// ============================================================

/** GET /health — public. Useful for a connectivity check on the splash screen. */
export const getHealth = async (): Promise<HealthResponse> =>
  unwrap(await api.get("/health"));
