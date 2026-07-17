import React from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  View,
  Dimensions,
} from 'react-native';

import { Pin } from 'lucide-react-native';

import { profilePosts } from '../../data/ProfilePosts';

const SIZE = Dimensions.get('window').width / 3;

const ProfileGrid = () => {
  return (
    <FlatList
      data={profilePosts}
      keyExtractor={(item) => item.id}
      numColumns={3}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <View style={styles.item}>

          <Image
            source={{ uri: item.image }}
            style={styles.image}
          />

          {item.pinned && (
            <View style={styles.pin}>
              <Pin
                size={14}
                color="#fff"
                fill="#fff"
              />
            </View>
          )}

        </View>
      )}
    />
  );
};

export default ProfileGrid;

const styles = StyleSheet.create({
  item: {
    width: SIZE,
    height: SIZE,
    borderWidth: 0.3,
    borderColor: '#000',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  pin: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});