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

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, loading, loadProfile } = useProfile();

  const [activeTab, setActiveTab] = useState('posts');
  const [refreshing, setRefreshing] = useState(false);
  // Bumped to make the grid load again.
  const [reload, setReload] = useState(0);

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
              onPressFollowers={() => openFollowList('followers')}
              onPressFollowing={() => openFollowList('following')}
            />

            <ProfileButtons user={user} />

            <StoryHighlight userId={user?.id} reload={reload} canAdd />

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

            {activeTab === 'tagged' && <Text>This is Tagged Screen</Text>}
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
