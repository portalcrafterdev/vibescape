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
