import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';

import { Plus } from 'lucide-react-native';

const StoryItem = ({ item }: any) => {
  return (
    <View style={[styles.container]}>
      <View style={styles.storyBorder}>
        <Image
          source={{ uri: item.image }}
          style={styles.image}
        />

        {item.isMe && (
          <View style={styles.plusButton}>