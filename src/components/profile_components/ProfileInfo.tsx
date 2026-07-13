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

const ProfileInfo = () => {
  return (
    <View style={styles.container}>

      {/* Top Row */}
      <View style={styles.topRow}>

        {/* Profile Image */}
        <View style={styles.avatarContainer}>
          <Image
            source={require('../../assets/images/Portelcrafterlogo.png')}
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
            <Text style={styles.statValue}>147</Text>
            <Text style={styles.statLabel}>posts</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>357</Text>
            <Text style={styles.statLabel}>followers</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>338</Text>
            <Text style={styles.statLabel}>following</Text>
          </View>

        </View>

      </View>

      <View style={styles.bioContainer}>

        <Text style={styles.name}>
          Portal Crafter 🚀
        </Text>

        <Text style={styles.bio}>
          Building Beautiful Mobile Apps
        </Text>

        <Text style={styles.bio}>
          Flutter • React Native
        </Text>

        <Text style={styles.link}>
          portalcrafter.dev
        </Text>

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