import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import {
  Plus,
} from 'lucide-react-native';

import { AuthUser } from '../../../api/authApi';

interface infoprops{
 user: AuthUser| null;
};

const ProfileInfo = ({user}:infoprops) => {
  return (
    <View style={styles.container}>

      {/* Top Row */}
      <View style={styles.topRow}>

        {/* Profile Image */}
        <View style={styles.avatarContainer}>
          <Image
            source= 
            { user?.avatar_url? {uri:user.avatar_url}:
              require('../../assets/images/Portelcrafterlogo.png')}
            style={styles.avatar}
          />

          <TouchableOpacity style={styles.addButton}>
            <Plus
              color="#000"
              size={18}
              strokeWidth={3}
            />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.post_count? user.post_count: 33}</Text>
            <Text style={styles.statLabel}>posts</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.followers_count? user.followers_count: 333}</Text>
            <Text style={styles.statLabel}>followers</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.following_count? user.following_count: 333}</Text>
            <Text style={styles.statLabel}>following</Text>
          </View>

        </View>

      </View>

      <View style={styles.bioContainer}>

        <Text style={styles.name}>
        {user?.display_name? user.display_name:"Portal Crafter 🚀"} 
        </Text>

        <Text style={styles.bio} numberOfLines={2}>
          { user?.bio? user.bio:"Building Beautiful Mobile Apps Flutter • React Native"}
        </Text>

        <TouchableOpacity>
          <Text style={styles.link}>{user?.banner_url? user.banner_url:"portelcrafter.dev"}</Text>
        </TouchableOpacity>

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