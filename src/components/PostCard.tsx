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
        style={styles.postImage}
      />

      {/* Action Icons */}
      <View style={styles.actions}>

        <View style={styles.leftIcons}>
          <TouchableOpacity onPress={() => setLiked(!liked)}>
            <Heart
              color={liked ? 'red' : 'white'}
              fill={liked ? 'red' : 'none'}
              size={28}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconSpacing}>
            <MessageCircle color="white" size={26} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconSpacing}>
            <Send color="white" size={25} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity>
          <Bookmark color="white" size={26} />
        </TouchableOpacity>

      </View>

      {/* Likes */}
      <Text style={styles.likes}>
        {item.likes} likes
      </Text>

      {/* Caption */}
      <Text style={styles.caption}>
        <Text style={{ fontWeight: 'bold' }}>
          {item.username}
        </Text>{' '}
        {item.caption}
      </Text>

      {/* Comments */}
      <Text style={styles.comments}>
        View all {item.comments} comments
      </Text>

      {/* Time */}
      <Text style={styles.time}>
        {item.time}
      </Text>

    </View>
  );
};

export default PostCard;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    marginBottom: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },

  username: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 10,
  },

  postImage: {
    width: '100%',
    height: 420,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  leftIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconSpacing: {
    marginLeft: 15,
  },

  likes: {
    color: 'white',
    fontWeight: 'bold',
    marginHorizontal: 12,
  },

  caption: {
    color: 'white',
    marginHorizontal: 12,
    marginTop: 6,
  },

  comments: {
    color: 'gray',
    marginHorizontal: 12,
    marginTop: 8,
  },

  time: {
    color: 'gray',
    fontSize: 12,
    marginHorizontal: 12,
    marginTop: 5,
    marginBottom: 10,
  },
});