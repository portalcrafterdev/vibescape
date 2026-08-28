import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';

import {
  Plus,
} from 'lucide-react-native';

import { UserProfile } from '../../../api/authApi';

interface infoprops{
 // UserProfile, not AuthUser, so this renders both the signed-in user and
 // anyone else's profile. OwnProfile extends UserProfile, so both fit.
 user: UserProfile | null;
 onPressFollowers?: () => void;
 onPressFollowing?: () => void;
 /** The camera/plus badge only belongs on the signed-in user's own avatar. */
 showAddButton?: boolean;
 /** A ring round the picture when there is a story waiting to be watched. */
 hasStory?: boolean;
 seenStory?: boolean;
 onPressAvatar?: () => void;
};

const ProfileInfo = ({
  user,
  onPressFollowers,
  onPressFollowing,
  showAddButton = true,
  hasStory,
  seenStory,
  onPressAvatar,
}: infoprops) => {
  const firstLink = user?.links?.[0];

  return (
    <View style={styles.container}>

      {/* Top Row */}
      <View style={styles.topRow}>

        {/* Profile Image */}
        <TouchableOpacity
          style={[
            styles.avatarContainer,
            hasStory && styles.ring,
            hasStory && seenStory && styles.seenRing,
          ]}
          onPress={onPressAvatar}
          disabled={!onPressAvatar}
          activeOpacity={0.8}
        >
          <Image
            source=
            { user?.avatar_url? {uri:user.avatar_url}:
              require('../../assets/images/Portelcrafterlogo.png')}
            style={styles.avatar}
          />

          {showAddButton && (
            <TouchableOpacity style={styles.addButton}>
              <Plus
                color="#000"
                size={18}
                strokeWidth={3}
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.statsContainer}>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.posts_count ?? 0}</Text>
            <Text style={styles.statLabel}>posts</Text>
          </View>

          <TouchableOpacity
            style={styles.statItem}
            onPress={onPressFollowers}
            disabled={!onPressFollowers}
            accessibilityRole="button"
          >
            <Text style={styles.statValue}>{user?.followers_count ?? 0}</Text>
            <Text style={styles.statLabel}>followers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statItem}
            onPress={onPressFollowing}
            disabled={!onPressFollowing}
            accessibilityRole="button"
          >
            <Text style={styles.statValue}>{user?.following_count ?? 0}</Text>
            <Text style={styles.statLabel}>following</Text>
          </TouchableOpacity>

        </View>

      </View>

      <View style={styles.bioContainer}>

        <Text style={styles.name}>
        {user?.display_name || user?.username || ''}
        </Text>

        {!!user?.pronouns && (
          <Text style={styles.pronouns}>{user.pronouns}</Text>
        )}

        {!!user?.bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {user.bio}
          </Text>
        )}

        {!!firstLink && (
          <TouchableOpacity onPress={() => Linking.openURL(firstLink.url)}>
            <Text style={styles.link}>{firstLink.title || firstLink.url}</Text>
          </TouchableOpacity>
        )}

      </View>

    </View>
  );
};

export default ProfileInfo;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarContainer: {
    position: 'relative',
  },

  ring: {
    borderWidth: 3,
    borderRadius: 51,
    borderColor: '#ff3040',
    padding: 3,
  },

  seenRing: {
    borderColor: '#3a3a3a',
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },

  addButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },

  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginLeft: 20,
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },

  statLabel: {
    color: '#fff',
    fontSize: 15,
    marginTop: 2,
  },

  bioContainer: {
    marginTop: 18,
  },

  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  pronouns: {
    color: '#8e8e93',
    fontSize: 14,
    marginTop: 2,
  },

  bio: {
    color: '#fff',
    fontSize: 15,
    marginTop: 3,
    width:220,
  },

  link: {
    color: '#4da6ff',
    fontSize: 15,
    fontWeight: '600',
    marginTop:4,
  },
});