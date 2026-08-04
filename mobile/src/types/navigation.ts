import { ProfileLink } from '../../api/authApi';

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
  CreateScreen: undefined;
  UserProfile: { userId?: string; username?: string };
  FollowList: {
    userId: string;
    username?: string;
    mode: 'followers' | 'following';
  };
};
