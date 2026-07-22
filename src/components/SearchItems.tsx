import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';

import { Eye } from 'lucide-react-native';

const width = Dimensions.get('window').width;
const ITEM_SIZE = width / 3;

const SearchItem = ({ item }: any) => {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: item.image }}
        style={styles.image}
      />

      <View style={styles.overlay}>
        <Eye
          color="white"
          size={13}
        />

        <Text style={styles.views}>
          {item.views}
        </Text>
      </View>
    </View>
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