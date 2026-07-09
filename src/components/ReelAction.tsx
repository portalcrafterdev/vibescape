import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';

import {
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  Bookmark,
  MoreHorizontal,
} from 'lucide-react-native';

const ReelActions = ({ item }: any) => {
  return (
    <View style={styles.container}>

   <TouchableOpacity style={styles.item}>
  <Heart color="white" size={23} strokeWidth={2} />
  <Text style={styles.count}>Likes</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.item}>
  <MessageCircle color="white" size={23} strokeWidth={2} />
  <Text style={styles.count}>784</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.item}>
  <Repeat2 color="white" size={23} strokeWidth={2} />
  <Text style={styles.count}>1,370</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.item}>
  <Send color="white" size={23} strokeWidth={2} />
</TouchableOpacity>

<TouchableOpacity style={styles.item}>
  <Bookmark color="white" size={23} strokeWidth={2} />
  <Text style={styles.count}>3,694</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.item}>
  <MoreHorizontal color="white" size={23} strokeWidth={2} />
</TouchableOpacity>

<TouchableOpacity style={styles.albumContainer}>
  <Image
    source={{ uri: item.album }}
    style={styles.albumImage}
  />
</TouchableOpacity>

    </View>
  );
};

export default ReelActions;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    bottom: 68,
    alignItems: 'center',
  },

  item: {
    alignItems: 'center',
    marginBottom: 18,
  },

  count: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,