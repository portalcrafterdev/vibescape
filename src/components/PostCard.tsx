import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  EllipsisVertical,
} from 'lucide-react-native';

interface Props {
  item: any;
}

const PostCard = ({ item }: Props) => {
  const [liked, setLiked] = useState(false);

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userRow}>
          <Image
            source={{ uri: item.profileImage }}
            style={styles.avatar}
          />

          <Text style={styles.username}>
            {item.username}
          </Text>
        </View>

        <EllipsisVertical color="white" size={20} />
      </View>

      {/* Post Image */}
      <Image
        source={{ uri: item.postImage }}