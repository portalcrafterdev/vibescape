import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';

import { useNavigation } from '@react-navigation/native';

import { useStories } from '../context/StoryContext';

interface avatarprops {
  userId?: string;
  username?: string;
  avatarUrl?: string | null;
  size?: number;
  /** Set when the screen already asked the API for this person's stories. */
  latestAt?: string | null;
}

// A profile picture that carries the story ring: red for one not watched
// yet, grey once it has been, and no ring at all when there is no story.
const StoryAvatar = ({
  userId,
  username,
  avatarUrl,
  size = 38,
  latestAt,
}: avatarprops) => {
  const navigation = useNavigation<any>();
  const { ringFor } = useStories();

  const ring = ringFor(userId, latestAt);

  // The ring needs room outside the picture, so the box grows with it.
  const box = ring ? size + 8 : size;

  const open = () => {
    if (!ring || !userId) return;

    navigation.push('StoryViewer', { userId, username });
  };

  return (
    <TouchableOpacity
      onPress={open}
      disabled={!ring}
      activeOpacity={0.8}
      style={[
        styles.box,
        {
          width: box,
          height: box,
          borderRadius: box / 2,
          borderWidth: ring ? 2 : 0,
          borderColor: ring === 'seen' ? '#3a3a3a' : '#ff3040',
        },
      ]}
    >
      <Image
        source={
          avatarUrl
            ? { uri: avatarUrl }
            : require('../assets/images/Portelcrafterlogo.png')
        }
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    </TouchableOpacity>
  );
};

export default StoryAvatar;

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262626',
  },
});
