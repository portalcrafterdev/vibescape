import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  Text,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import ProfileHeader from '../components/profile_components/ProfileHeader';
import ProfileInfo from '../components/profile_components/ProfileInfo';
import ProfileButtons from '../components/profile_components/ProfileButtons';
import StoryHighlight from '../components/profile_components/StoryHighlight';
import ProfileTabs from '../components/profile_components/ProfileTabs';
import ProfileGrid from '../components/profile_components/ProfileGrid';
import ProfileReels from '../components/profile_components/ProfileReels';
import { useProfile } from '../context/ProfileContext';
import { useStories } from '../context/StoryContext';
import { getUserStories, StoryOut } from '../../api/authApi';

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, loading, loadProfile } = useProfile();
  const { ringFor } = useStories();

  const [activeTab, setActiveTab] = useState('posts');
  const [refreshing, setRefreshing] = useState(false);
  // Bumped to make the grid load again.
  const [reload, setReload] = useState(0);

  // My own stories, so my picture carries the ring here as well.
  const [stories, setStories] = useState<StoryOut[]>([]);

  const loadStories = async () => {
    if (!user) return;

    try {
      setStories(await getUserStories(user.id));
    } catch (error) {
      console.log('Load my stories failed', error);
    }
  };

  useEffect(() => {
    loadStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, reload]);

  // The newest of them. The list order is not promised, so pick the largest
  // time, compared as text since the API sends six decimal places.
  let newestStory = '';

  stories.forEach((item) => {
    if (!newestStory || item.created_at > newestStory) {
      newestStory = item.created_at;
    }
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setReload(reload + 1);
    setRefreshing(false);
  };

  // Coming back from the create screen, or from anywhere else, picks up a new
  // post and the count that goes with it.
  useEffect(() => {
    return navigation.addListener('focus', () => {
      loadProfile();
      setReload((old) => old + 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  const openFollowList = (mode: 'followers' | 'following') => {
    if (!user) return;

    navigation.push('FollowList', {
      userId: user.id,
      username: user.username,
      mode,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#fff"
          />
        }
      >
        <ProfileHeader user={user} />

        {loading && !user ? (
          <ActivityIndicator style={styles.loader} color="#fff" />
        ) : (
          <>
            <ProfileInfo
              user={user}
              hasStory={stories.length > 0}
              seenStory={ringFor(user?.id, newestStory) === 'seen'}
              onPressAvatar={
                stories.length > 0 && user
                  ? () =>
                      navigation.push('StoryViewer', {
                        userId: user.id,
                        username: user.username,
                        latestAt: newestStory,
                      })
                  : undefined
              }
              onPressFollowers={() => openFollowList('followers')}
              onPressFollowing={() => openFollowList('following')}
            />

            <ProfileButtons user={user} />

            <StoryHighlight
              userId={user?.id}
              reload={reload}
              canAdd
              username={user?.username}
              avatarUrl={user?.avatar_url}
            />

            <ProfileTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />

            {activeTab === 'posts' && (
              <ProfileGrid
                userId={user?.id}
                reload={reload}
                canDelete
                onDeleted={loadProfile}
              />
            )}

            {activeTab === 'reels' && (
              <ProfileReels
                userId={user?.id}
                reload={reload}
                canDelete
                onDeleted={loadProfile}
              />
            )}

            {/* Someone else made these posts, so there is nothing to delete. */}
            {activeTab === 'tagged' && (
              <ProfileGrid userId={user?.id} reload={reload} tagged />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  content: {
    paddingBottom: 80,
  },

  loader: {
    marginTop: 60,
  },
});
