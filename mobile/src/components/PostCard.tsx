import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';

import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  EllipsisVertical,
  Pencil,
  Trash2,
} from 'lucide-react-native';

import { useNavigation } from '@react-navigation/native';

import EditPost from './EditPost';
import StoryAvatar from './StoryAvatar';
import { useProfile } from '../context/ProfileContext';

import {
  likePost,
  unlikePost,
  deletePost,
  listComments,
  PostOut,
  CommentOut,
} from '../../api/authApi';

interface Props {
  post: PostOut;
  // Lets the feed drop the card once the post is gone.
  onDeleted?: (postId: string) => void;
  // On a post of its own there is room for the first comments and the full
  // date, the way Instagram shows it.
  detail?: boolean;
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

// "18 May 2025", which is how a post of its own is dated.
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const fullDate = (date: string) => {
  const when = new Date(date);

  return `${when.getDate()} ${MONTHS[when.getMonth()]} ${when.getFullYear()}`;
};

const PostCard = ({ post, onDeleted, detail }: Props) => {
  const navigation = useNavigation<any>();

  // Only used to keep my own picture up to date on my own posts.
  const { user: me } = useProfile();

  const [liked, setLiked] = useState(!!post.is_liked);
  const [likes, setLikes] = useState(post.likes_count ?? 0);
  const [busy, setBusy] = useState(false);

  // Kept here rather than read off the post, so adding a comment moves the
  // number straight away instead of waiting for the next reload.
  const [comments, setComments] = useState(post.comments_count ?? 0);

  // A long caption is cut short until it is tapped open.
  const [showAll, setShowAll] = useState(false);

  // When the last tap landed, and the big heart that follows a double one.
  const [lastTap, setLastTap] = useState(0);
  const [burst, setBurst] = useState(false);

  // The first couple of comments, shown under the caption on a single post.
  const [preview, setPreview] = useState<CommentOut[]>([]);

  // The three dots sheet, and the screen for changing the post.
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption ?? '');

  const loadPreview = async () => {
    if (!detail) return;

    try {
      const response = await listComments(post.id, { limit: 2 });
      setPreview(response.items);
    } catch (error) {
      console.log('Load comments failed', error);
    }
  };

  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, detail]);

  // Two taps within a moment of each other turn the like on, or off again
  // if it is already on. The big heart only shows when one is being added.
  const handleTap = () => {
    const now = Date.now();

    if (now - lastTap < 300) {
      setLastTap(0);

      if (!liked) {
        setBurst(true);
        setTimeout(() => setBurst(false), 700);
      }

      handleLike();
    } else {
      setLastTap(now);
    }
  };

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

  // Only my own posts can be changed, so there is nothing to show on others.
  const handleMenu = () => {
    if (!post.is_mine) return;

    setMenu(true);
  };

  const startEdit = () => {
    setMenu(false);
    setEditing(true);
  };

  const handleDelete = () => {
    setMenu(false);

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
    navigation.push('Comments', {
      postId: post.id,
      onChange: (delta: number) => {
        setComments((old) => Math.max(0, old + delta));

        // The two comments under the caption move as well.
        loadPreview();
      },
    });
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userRow}>
          {/* Tapping the picture opens their story when they have one, so
              only the name goes to the profile. */}
          <StoryAvatar
            userId={post.author.id}
            username={post.author.username}
            // My own posts carry whatever picture I had when the API sent
            // them, so the one from my profile is used instead. It is always
            // the current one.
            avatarUrl={
              post.author.id === me?.id ? me?.avatar_url : post.author.avatar_url
            }
          />

          <TouchableOpacity onPress={openAuthor}>
            <Text style={styles.username}>
              {post.author.username}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleMenu}>
          <EllipsisVertical color="white" size={20} />
        </TouchableOpacity>
      </View>

      {/* Post Image. Two taps close together is a like. */}
      {!!post.image_url && (
        <TouchableWithoutFeedback onPress={handleTap}>
          <View>
            <Image
              source={{ uri: post.image_url }}
              style={styles.postImage}
            />

            {burst && (
              <View style={styles.burstBox}>
                <Heart size={100} color="#fff" fill="#fff" />
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
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

          {/* The count sits beside the icon, as it does on Instagram. */}
          {comments > 0 && <Text style={styles.iconCount}>{comments}</Text>}

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
      {!!caption && (
        <Text
          style={styles.caption}
          numberOfLines={showAll ? undefined : 2}
          onPress={() => setShowAll(true)}
        >
          <Text style={styles.bold}>
            {post.author.username}
          </Text>{' '}
          {caption.split(/(#\w+)/g).map((part, i) =>
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

      {/* A long caption is cut at two lines until "more" is tapped. */}
      {!!caption && !showAll && caption.length > 80 && (
        <Text style={styles.more} onPress={() => setShowAll(true)}>
          ... more
        </Text>
      )}

      {/* The first comments, only where there is room for them. */}
      {preview.map((item) => (
        <TouchableOpacity key={item.id} onPress={openComments}>
          <Text style={styles.caption} numberOfLines={1}>
            <Text style={styles.bold}>{item.author.username}</Text>{' '}
            {item.body}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Comments */}
      <TouchableOpacity onPress={openComments}>
        <Text style={styles.comments}>
          {comments ? `View all ${comments} comments` : 'Add a comment'}
        </Text>
      </TouchableOpacity>

      {/* Time. On its own page the whole date is shown instead of "5h". */}
      <Text style={styles.time}>
        {detail ? fullDate(post.created_at) : timeAgo(post.created_at)}
      </Text>

      {/* The three dots sheet */}
      <Modal
        visible={menu}
        transparent
        animationType="slide"
        onRequestClose={() => setMenu(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setMenu(false)}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <TouchableOpacity style={styles.sheetRow} onPress={startEdit}>
            <Pencil size={22} color="#fff" />
            <Text style={styles.sheetText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetRow} onPress={handleDelete}>
            <Trash2 size={22} color="#ed4956" />
            <Text style={[styles.sheetText, styles.danger]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Changing the post */}
      <Modal
        visible={editing}
        animationType="slide"
        onRequestClose={() => setEditing(false)}
      >
        <EditPost
          post={post}
          caption={caption}
          onClose={() => setEditing(false)}
          onSaved={(text) => {
            setCaption(text);
            setEditing(false);
          }}
        />
      </Modal>

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
    height: 420,
    marginHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#111',
  },

  burstBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
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

  iconCount: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  more: {
    color: 'gray',
    marginHorizontal: 12,
    marginTop: 2,
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

  backdrop: {
    flex: 1,
    backgroundColor: '#00000099',
  },

  sheet: {
    backgroundColor: '#1c1c1c',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: 24,
  },

  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#5a5a5a',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 10,
  },

  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  sheetText: {
    color: '#fff',
    fontSize: 16,
  },

  danger: {
    color: '#ed4956',
  },

  time: {
    color: 'gray',
    fontSize: 12,
    marginHorizontal: 12,
    marginTop: 5,
    marginBottom: 10,
  },
});
