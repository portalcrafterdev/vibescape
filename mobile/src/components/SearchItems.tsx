import React, { useState } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

import { Eye, Play } from 'lucide-react-native';
import Video from 'react-native-video';

import { ExploreItem } from '../../api/authApi';

const width = Dimensions.get('window').width;
const ITEM_SIZE = width / 3;

// A reel arrives as its video address, not a picture, so the first frame is
// shown instead. Each one holds a decoder, so only the squares near the top
// get one and the rest fall back to the logo.
const WITH_FRAME = 6;

interface itemprops {
  item: ExploreItem;
  index: number;
  onPress?: () => void;
}

const SearchItem = ({ item, index, onPress }: itemprops) => {
  // A dead address leaves a black square, so the logo stands in for both an
  // empty address and one that will not load.
  const [failed, setFailed] = useState(false);

  const broken = failed || !item.image_url;
  const showFrame = item.is_video && !broken && index < WITH_FRAME;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
    >
      {showFrame ? (
        <Video
          source={{ uri: item.image_url }}
          style={styles.image}
          resizeMode="cover"
          paused
          muted
          repeat={false}
          controls={false}
          playInBackground={false}
          playWhenInactive={false}
          onError={() => setFailed(true)}
        />
      ) : (
        <Image
          source={
            broken
              ? require('../assets/images/Portelcrafterlogo.png')
              : { uri: item.image_url }
          }
          style={broken ? styles.fallback : styles.image}
          resizeMode={broken ? 'contain' : 'cover'}
          onError={() => setFailed(true)}
        />
      )}

      <View style={styles.overlay}>
        {item.is_video ? (
          <Play color="white" size={13} fill="white" />
        ) : (
          <Eye color="white" size={13} />
        )}

        <Text style={styles.views}>
          {item.views ?? 0}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default SearchItem;

const styles = StyleSheet.create({
  container: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 1.55,
    padding: 1
  },

  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#262626',
  },

  fallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1c1c1e',
    opacity: 0.5,
  },

  overlay: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  views: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
});