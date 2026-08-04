import React, { useState } from 'react';
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
import { useProfile } from '../context/ProfileContext';

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, loading, loadProfile } = useProfile();

  const [activeTab, setActiveTab] = useState('posts');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

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

            <StoryHighlight />

            <ProfileTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />

            {activeTab === 'posts' && <ProfileGrid />}

            {activeTab === 'reels' && <Text>This is reel screen</Text>}

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
