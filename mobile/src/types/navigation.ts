import { ProfileLink, ReelOut } from '../../api/authApi';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Forgot: undefined;
  Register: undefined;
  Maintabs : undefined;
  // GenderScreen and LinkPage send their result back through these params.
  EditProfile: { gender?: string; links?: ProfileLink[] } | undefined;
  LinkPage: { links?: ProfileLink[] } | undefined;
  BannerScreen: undefined;
  GenderScreen: { gender?: string } | undefined;
  ThreadsScreen: undefined;
  SettingsScreen: undefined;
  // The reels screen passes mode 'REEL' so it opens ready to film.
  CreateScreen: { mode?: string } | undefined;
  UserProfile: { userId?: string; username?: string };
  // latestAt is the time of their newest story, saved once it is watched.
  StoryViewer: { userId: string; username?: string; latestAt?: string };
  Comments: { postId: string };
  // One post on its own, opened from a profile grid tile.
  Post: { postId: string };
  // The profile hands over the reels it already has, and which one was tapped.
  ReelViewer: { reels: ReelOut[]; index: number };
  // Without the leading #, so it can go straight into the URL.
  Hashtag: { tag: string };
  Chat: { conversationId: string; username?: string };
  FollowList: {
    userId: string;
    username?: string;
    mode: 'followers' | 'following';
  };
};
