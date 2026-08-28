import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { X } from 'lucide-react-native';

import StoryAvatar from './StoryAvatar';
import { followUser, unfollowUser, UserSummary } from '../../api/authApi';

interface rowprops {
  user: UserSummary;
  onPress?: () => void;
  onFollowChange?: (userId: string, following: boolean) => void;
  // Bigger picture and a wider button, the way the sheet showing who is in
  // a photo reads in Instagram. The lists of followers stay as they are.
  big?: boolean;
  // When given, a cross shows in place of the follow button, for taking
  // somebody off a photo.
  onRemove?: () => void;
}

const UserRow = ({
  user,
  onPress,
  onFollowChange,
  big,
  onRemove,
}: rowprops) => {
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
    <TouchableOpacity
      style={[styles.container, big && styles.bigContainer]}
      onPress={onPress}
    >
      <StoryAvatar
        userId={user.id}
        username={user.username}
        avatarUrl={user.avatar_url}
        size={big ? 56 : 44}
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

      {onRemove ? (
        <TouchableOpacity style={styles.remove} onPress={onRemove}>
          <X size={20} color="#8e8e93" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.button,
            big && styles.bigButton,
            following && styles.greyButton,
          ]}
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
      )}
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

  bigContainer: {
    paddingVertical: 8,
  },

  remove: {
    padding: 8,
  },

  bigButton: {
    minWidth: 112,
    height: 36,
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
