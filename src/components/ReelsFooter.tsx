import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { Music2 } from 'lucide-react-native';

const ReelFooter = ({ item }: any) => {
  return (
    <View style={styles.container}>

      {/* User Row */}
      <View style={styles.userRow}>

        <Image
          source={{ uri: item.profile }}
          style={styles.profile}
        />

        <Text style={styles.username}>
          {item.username}
        </Text>

        <TouchableOpacity style={styles.followButton}>
          <Text style={styles.followText}>
            Follow
          </Text>
        </TouchableOpacity>

      </View>

 

      {/* Caption */}
      <Text style={styles.caption}>
        {item.caption}
      </Text>

      {/* Liked By */}
      <Text style={styles.likes}>
        Liked by <Text style={styles.bold}>john_doe</Text> and{' '}
        <Text style={styles.bold}>3,521 others</Text>
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

  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',