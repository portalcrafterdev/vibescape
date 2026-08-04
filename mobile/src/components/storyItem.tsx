import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { Plus } from 'lucide-react-native';

interface storyprops {
  name: string;
  imageUrl?: string | null;
  isMe?: boolean;
  // No story yet means a grey ring instead of the red one.
  hasStory?: boolean;
  loading?: boolean;
  onPress?: () => void;
  onAdd?: () => void;
}

const StoryItem = ({
  name,
  imageUrl,
  isMe,
  hasStory,
  loading,
  onPress,
  onAdd,
}: storyprops) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[styles.storyBorder, !hasStory && styles.noStoryBorder]}>
        <Image
          source={
            imageUrl
              ? { uri: imageUrl }
              : require('../assets/images/Portelcrafterlogo.png')
          }
          style={styles.image}
        />

        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}

        {isMe && !loading && (
          <TouchableOpacity style={styles.plusButton} onPress={onAdd}>
            <Plus color="white" size={14} />
          </TouchableOpacity>
        )}
      </View>

      <Text
        numberOfLines={1}
        style={styles.name}
      >
        {name}
      </Text>
    </TouchableOpacity>
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

  noStoryBorder: {
    borderColor: '#3a3a3a',
  },

  image: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#262626',
  },

  loading: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 34,
    backgroundColor: '#000000A0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  name: {
    color: '#fff',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },

  plusButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0095F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
});
