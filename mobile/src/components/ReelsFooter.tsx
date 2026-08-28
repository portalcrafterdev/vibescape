import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';

import { ReelOut } from '../../api/authApi';

const ReelFooter = ({ reel }: { reel: ReelOut }) => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>

      {/* User Row */}
      <View style={styles.userRow}>

        <TouchableOpacity
          onPress={() =>
            navigation.push('UserProfile', { userId: reel.author.id })
          }
        >
          <Image
            source={
              reel.author.avatar_url
                ? { uri: reel.author.avatar_url }
                : require('../assets/images/Portelcrafterlogo.png')
            }
            style={styles.profile}
          />
        </TouchableOpacity>

        <Text style={styles.username}>
          {reel.author.username}
        </Text>

        {!reel.is_mine && (
          <TouchableOpacity style={styles.followButton}>
            <Text style={styles.followText}>
              Follow
            </Text>
          </TouchableOpacity>
        )}

      </View>

      {/* Caption */}
      {!!reel.caption && (
        <Text style={styles.caption}>
          {reel.caption}
        </Text>
      )}

      {/* Views */}
      <Text style={styles.likes}>
        <Text style={styles.bold}>{reel.views_count ?? 0}</Text> views
      </Text>

    </View>
  );
};

export default ReelFooter;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 15,
    right: 80,
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#262626',
  },

  username: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },

  followButton: {
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },

  followText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },

  caption: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },

  likes: {
    color: '#ddd',
    marginTop: 10,
    fontSize: 13,
  },

  bold: {
    color: '#fff',
    fontWeight: '700',
  },
});
