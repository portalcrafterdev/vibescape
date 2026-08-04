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

interface actionprops {
  liked: boolean;
  likes: number;
  comments: number;
  albumUrl?: string | null;
  isMine: boolean;
  onLike: () => void;
  onComment: () => void;
  onDelete: () => void;
}

const ReelActions = ({
  liked,
  likes,
  comments,
  albumUrl,
  isMine,
  onLike,
  onComment,
  onDelete,
}: actionprops) => {
  return (
    <View style={styles.container}>

   <TouchableOpacity style={styles.item} onPress={onLike}>
  <Heart
    color={liked ? '#ff3040' : 'white'}
    fill={liked ? '#ff3040' : 'none'}
    size={23}
    strokeWidth={2}
  />
  <Text style={styles.count}>{likes}</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.item} onPress={onComment}>
  <MessageCircle color="white" size={23} strokeWidth={2} />
  <Text style={styles.count}>{comments}</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.item}>
  <Repeat2 color="white" size={23} strokeWidth={2} />
</TouchableOpacity>

<TouchableOpacity style={styles.item}>
  <Send color="white" size={23} strokeWidth={2} />
</TouchableOpacity>

<TouchableOpacity style={styles.item}>
  <Bookmark color="white" size={23} strokeWidth={2} />
</TouchableOpacity>

{/* Only my own reels have anything behind this. */}
{isMine && (
  <TouchableOpacity style={styles.item} onPress={onDelete}>
    <MoreHorizontal color="white" size={23} strokeWidth={2} />
  </TouchableOpacity>
)}

{!!albumUrl && (
  <TouchableOpacity style={styles.albumContainer}>
    <Image
      source={{ uri: albumUrl }}
      style={styles.albumImage}
    />
  </TouchableOpacity>
)}

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
  },

  albumContainer: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },

  albumImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
});
