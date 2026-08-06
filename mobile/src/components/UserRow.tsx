import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import StoryAvatar from './StoryAvatar';
import { followUser, unfollowUser, UserSummary } from '../../api/authApi';

interface rowprops {
  user: UserSummary;
  onPress?: () => void;
  onFollowChange?: (userId: string, following: boolean) => void;
}

const UserRow = ({ user, onPress, onFollowChange }: rowprops) => {
  const [following, setFollowing] = useState(!!user.is_following);
  const [busy, setBusy] = useState(false);

  // The same user can come back in a later page of results.
  useEffect(() => {
    setFollowing(!!user.is_following);
  }, [user.is_following]);

  const handleFollow = async () => {
    if (busy) return;

    setBusy(true);

    try {
      const response = following
        ? await unfollowUser(user.id)
        : await followUser(user.id);

      setFollowing(response.following);

      if (onFollowChange) onFollowChange(user.id, response.following);
    } catch (error) {
      console.log('Follow failed', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <StoryAvatar
        userId={user.id}
        username={user.username}
        avatarUrl={user.avatar_url}
        size={44}
      />

      <View style={styles.names}>
        <Text style={styles.username} numberOfLines={1}>
          {user.username}
        </Text>

        {!!user.display_name && (
          <Text style={styles.displayName} numberOfLines={1}>
            {user.display_name}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, following && styles.greyButton]}
        onPress={handleFollow}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {following ? 'Following' : 'Follow'}
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default UserRow;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#262626',
  },

  names: {
    flex: 1,
    marginLeft: 12,
  },

  username: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  displayName: {
    color: '#8e8e93',
    fontSize: 14,
    marginTop: 2,
  },

  button: {
    minWidth: 96,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  greyButton: {
    backgroundColor: '#262626',
  },

  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
