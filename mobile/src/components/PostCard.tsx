import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';

import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  EllipsisVertical,
} from 'lucide-react-native';

import { useNavigation } from '@react-navigation/native';

import { likePost, unlikePost, deletePost, PostOut } from '../../api/authApi';

interface Props {
  post: PostOut;
  // Lets the feed drop the card once the post is gone.
  onDeleted?: (postId: string) => void;
}

// Turns the created_at date into "5m", "3h", "2d".
const timeAgo = (date: string) => {
  const seconds = (Date.now() - new Date(date).getTime()) / 1000;

  if (seconds < 60) return 'now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return `${Math.floor(days / 7)}w`;
};

const PostCard = ({ post, onDeleted }: Props) => {
  const navigation = useNavigation<any>();

  const [liked, setLiked] = useState(!!post.is_liked);
  const [likes, setLikes] = useState(post.likes_count ?? 0);
  const [busy, setBusy] = useState(false);

  const handleLike = async () => {
    if (busy) return;

    setBusy(true);

    try {
      const response = liked
        ? await unlikePost(post.id)
        : await likePost(post.id);

      setLiked(response.liked);
      setLikes(response.likes_count);
    } catch (error) {
      console.log('Like failed', error);
    } finally {
      setBusy(false);
    }
  };

  // Only my own posts can be deleted, so there is nothing to show on others.
  const handleMenu = () => {
    if (!post.is_mine) return;

    Alert.alert('Delete post', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(post.id);
            if (onDeleted) onDeleted(post.id);
          } catch (error) {
            console.log('Delete post failed', error);
            Alert.alert('Could not delete', 'Please try again.');
          }
        },
      },
    ]);
  };

  const openAuthor = () => {
    navigation.push('UserProfile', { userId: post.author.id });
  };

  const openComments = () => {
    navigation.push('Comments', { postId: post.id });
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.userRow} onPress={openAuthor}>
          <Image
            source={
              post.author.avatar_url
                ? { uri: post.author.avatar_url }
                : require('../assets/images/Portelcrafterlogo.png')
            }
            style={styles.avatar}
          />

          <Text style={styles.username}>
            {post.author.username}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleMenu}>
          <EllipsisVertical color="white" size={20} />
        </TouchableOpacity>
      </View>

      {/* Post Image */}
      {!!post.image_url && (
        <Image
          source={{ uri: post.image_url }}
          style={styles.postImage}
        />
      )}

      {/* Action Icons */}
      <View style={styles.actions}>

        <View style={styles.leftIcons}>
          <TouchableOpacity onPress={handleLike}>
            <Heart
              color={liked ? 'red' : 'white'}
              fill={liked ? 'red' : 'none'}
              size={28}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconSpacing} onPress={openComments}>
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
        {likes} likes
      </Text>

      {/* Caption. Splitting on #word keeps the tags as their own pieces, so
          each one can be tapped while the rest stays plain text. */}
      {!!post.caption && (
        <Text style={styles.caption}>
          <Text style={styles.bold}>
            {post.author.username}
          </Text>{' '}
          {post.caption.split(/(#\w+)/g).map((part, i) =>
            part.startsWith('#') ? (
              <Text
                key={i}
                style={styles.tag}
                onPress={() =>
                  navigation.push('Hashtag', { tag: part.slice(1) })
                }
              >
                {part}
              </Text>
            ) : (
              part
            ),
          )}
        </Text>
      )}

      {/* Comments */}
      <TouchableOpacity onPress={openComments}>
        <Text style={styles.comments}>
          {post.comments_count
            ? `View all ${post.comments_count} comments`
            : 'Add a comment'}
        </Text>
      </TouchableOpacity>

      {/* Time */}
      <Text style={styles.time}>
        {timeAgo(post.created_at)}
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
    backgroundColor: '#262626',
  },

  username: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 10,
  },

  postImage: {
    width: '100%',
    height: 420,
    backgroundColor: '#111',
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

  tag: {
    color: '#4da6ff',
  },

  caption: {
    color: 'white',
    marginHorizontal: 12,
    marginTop: 6,
  },

  bold: {
    fontWeight: 'bold',
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
