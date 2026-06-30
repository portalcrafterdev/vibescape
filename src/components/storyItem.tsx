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
            <Plus color="white" size={14} />
          </View>
        )}
      </View>

      <Text
        numberOfLines={1}
        style={styles.name}
      >
        {item.username || item.name || item.note}
      </Text>
    </View>
  );
};

export default StoryItem;

const styles = StyleSheet.create({
  container: {
    width: 80,
    alignItems: 'center',
    marginRight: 10,
  },

  storyBorder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#ff3040',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  image: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
