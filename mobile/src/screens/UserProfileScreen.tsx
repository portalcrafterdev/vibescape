import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';
import ProfileInfo from '../components/profile_components/ProfileInfo';
import ProfileTabs from '../components/profile_components/ProfileTabs';
import ProfileGrid from '../components/profile_components/ProfileGrid';
import ProfileReels from '../components/profile_components/ProfileReels';
import StoryHighlight from '../components/profile_components/StoryHighlight';

import {
  followUser,
  getUserById,
  getUserByUsername,
  unfollowUser,
  UserProfile,
} from '../../api/authApi';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

const UserProfileScreen = ({ route, navigation }: Props) => {
  const { userId, username } = route.params;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  const loadUser = async () => {
    try {
      // Use the id when we have it, otherwise look the user up by name.
      const response = userId
        ? await getUserById(userId)
        : await getUserByUsername(username!);

      setUser(response);
    } catch (error) {
      console.log('Load user failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, username]);

  const handleFollow = async () => {
    if (!user || busy) return;

    setBusy(true);

    try {
      const response = user.is_following
        ? await unfollowUser(user.id)
        : await followUser(user.id);

      setUser({
        ...user,
        is_following: response.following,
        followers_count: response.followers_count,
      });
    } catch (error) {
      console.log('Follow failed', error);
    } finally {
      setBusy(false);
    }
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={26} color="#fff" strokeWidth={2.2} />
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          {user?.username ?? username ?? 'Profile'}
        </Text>

        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#fff" />
      ) : !user ? (
        <Text style={styles.message}>Could not load this profile.</Text>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <ProfileInfo
            user={user}
            showAddButton={false}
            onPressFollowers={() => openFollowList('followers')}
            onPressFollowing={() => openFollowList('following')}
          />

          {!user.is_self && (
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[
                  styles.button,
                  user.is_following ? styles.greyButton : styles.blueButton,
                ]}
                onPress={handleFollow}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={styles.buttonInner}>
                    <Text style={styles.buttonText}>
                      {user.is_following ? 'Following' : 'Follow'}
                    </Text>

                    {user.is_following && (
                      <ChevronDown size={16} color="#fff" strokeWidth={2.5} />
                    )}
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, styles.greyButton]}>
                <Text style={styles.buttonText}>Message</Text>
              </TouchableOpacity>
            </View>
          )}

          <StoryHighlight userId={user.id} />

          <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* No delete here, since these belong to someone else. */}
          {activeTab === 'posts' && <ProfileGrid userId={user.id} />}

          {activeTab === 'reels' && <ProfileReels userId={user.id} />}

          {activeTab === 'tagged' && (
            <Text style={styles.message}>Nothing tagged yet.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default UserProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },

  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  placeholder: {
    width: 26,
  },

  content: {
    paddingBottom: 40,
  },

  loader: {
    marginTop: 40,
  },

  message: {
    color: '#8e8e93',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 60,
  },

  buttons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 18,
  },

  button: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  blueButton: {
    backgroundColor: '#6C63FF',
  },

  greyButton: {
    backgroundColor: '#262626',
  },

  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
