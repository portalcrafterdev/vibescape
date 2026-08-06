import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  useWindowDimensions,
  Alert,
} from 'react-native';

import {
  Trash2,
  Image as PhotoIcon,
  Sticker,
  Heart,
  MoreVertical,
  ChevronDown,
  Pin,
  Send,
  EyeOff,
  CircleAlert,
  Ban,
} from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';
import { useProfile } from '../context/ProfileContext';
import StoryAvatar from '../components/StoryAvatar';

import {
  listComments,
  createComment,
  deleteComment,
  listReplies,
  createReply,
  CommentOut,
} from '../../api/authApi';

type Props = NativeStackScreenProps<RootStackParamList, 'Comments'>;

// The quick row above the box. Tapping one posts it as a comment.
const emojis = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'];

// "63w" beside the name, which is all the line has room for.
const timeAgo = (date: string) => {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);

  if (minutes < 60) return `${Math.max(minutes, 1)}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;

  const days = Math.floor(minutes / 1440);

  if (days < 7) return `${days}d`;

  return `${Math.floor(days / 7)}w`;
};

const CommentsScreen = ({ route, navigation }: Props) => {
  const { postId, mine, onChange } = route.params;
  const { user } = useProfile();

  const [comments, setComments] = useState<CommentOut[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');

  // The API only has comments for posts, so a reel id comes back 404.
  const [missing, setMissing] = useState(false);

  // How much of the screen the keyboard is covering. The sheet sits in its
  // own window, where the usual keyboard handling does not reach it, so it
  // is measured and moved by hand.
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [keyboard, setKeyboard] = useState(0);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', (event) =>
      setKeyboard(event.endCoordinates.height),
    );

    const hidden = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboard(0),
    );

    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  // Normally two thirds of the screen, but never taller than the space left
  // above the keyboard, so the top of the sheet cannot slide out of sight.
  const sheetHeight = Math.min(
    screenHeight * 0.68,
    screenHeight - keyboard - 40,
  );

  // Held open on one comment by a long press, and where the finger was, so
  // the menu opens beside that comment instead of in the middle of nowhere.
  const [menuFor, setMenuFor] = useState<CommentOut | null>(null);
  const [menuAt, setMenuAt] = useState({ x: 0, y: 0 });

  // The API has no likes on comments and no way to hide one, so both are
  // kept here. They last as long as the sheet is open.
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const toggleLike = (id: string) => setLiked({ ...liked, [id]: !liked[id] });

  const hide = (id: string) => setHidden({ ...hidden, [id]: true });

  // Set while answering someone, which sends a reply instead of a comment.
  const [replyTo, setReplyTo] = useState<CommentOut | null>(null);

  // Only one comment shows its replies at a time, so one list is enough.
  const [openId, setOpenId] = useState<string | null>(null);
  const [replies, setReplies] = useState<CommentOut[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);

  const toggleReplies = async (comment: CommentOut) => {
    if (openId === comment.id) {
      setOpenId(null);
      return;
    }

    setOpenId(comment.id);
    setReplies([]);
    setLoadingReplies(true);

    try {
      const response = await listReplies(comment.id, { limit: 20 });
      setReplies(response.items);
    } catch (error) {
      console.log('Load replies failed', error);
    } finally {
      setLoadingReplies(false);
    }
  };

  const loadComments = async (nextCursor: string | null) => {
    try {
      const response = await listComments(postId, {
        cursor: nextCursor,
        limit: 20,
      });

      // First page replaces the list, later pages add to it.
      setComments(
        nextCursor ? (old) => [...old, ...response.items] : response.items,
      );
      setCursor(response.next_cursor ?? null);
      setHasMore(!!response.has_more && !!response.next_cursor);
    } catch (error: any) {
      console.log('Load comments failed', error);

      if (error?.response?.status === 404) {
        setMissing(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // The guard stops a fast scroll asking for the same page twice.
  const loadMore = async () => {
    if (!hasMore || !cursor || loadingMore) return;

    setLoadingMore(true);
    await loadComments(cursor);
    setLoadingMore(false);
  };

  // Used by both the emoji row and the text box.
  const send = async (body: string) => {
    if (!body.trim() || sending) return;

    setSending(true);

    try {
      // Answering someone posts a reply against their comment instead.
      if (replyTo) {
        const reply = await createReply(replyTo.id, { body: body.trim() });

        if (openId === replyTo.id) setReplies([...replies, reply]);

        // Keep the "view replies" count honest without reloading.
        setComments(
          comments.map((item) =>
            item.id === replyTo.id
              ? { ...item, replies_count: (item.replies_count ?? 0) + 1 }
              : item,
          ),
        );

        setReplyTo(null);
        setText('');
        return;
      }

      const comment = await createComment(postId, { body: body.trim() });

      // Newest first, matching the order the API returns.
      setComments([comment, ...comments]);
      setText('');

      // The post behind this sheet keeps its own count, so it is told.
      if (onChange) onChange(1);
    } catch (error: any) {
      console.log('Post comment failed', error);

      if (error?.response?.status === 404) {
        setMissing(true);
        Alert.alert(
          'Not available',
          'The server has no comments for reels yet.',
        );
      } else {
        Alert.alert('Could not post', 'Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleDelete = (comment: CommentOut) => {
    Alert.alert('Delete comment', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(comment.id);
            setComments(comments.filter((item) => item.id !== comment.id));

            if (onChange) onChange(-1);
          } catch (error: any) {
            console.log('Delete comment failed', error);

            // The server has the final say on who may clear a comment.
            Alert.alert(
              'Could not delete',
              error?.response?.status === 403
                ? 'This comment is not yours to remove.'
                : 'Please try again.',
            );
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.overlay}>
      {/* The reel keeps showing through here. Tapping it closes the sheet. */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => navigation.goBack()}
      />

      <View
        style={[styles.sheet, { height: sheetHeight, marginBottom: keyboard }]}
      >
        <View style={styles.handle} />

        <View style={styles.sheetHeader}>
          <View style={styles.headerSide} />

          <Text style={styles.sheetTitle}>Comments</Text>

          <MoreVertical size={20} color="#fff" style={styles.headerSide} />
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.filterText}>For you</Text>
          <ChevronDown size={16} color="#fff" />
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color="#fff" />
        ) : comments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>
              {missing ? 'Comments are off' : 'No comments yet'}
            </Text>
            <Text style={styles.emptyText}>
              {missing
                ? 'This one does not take comments yet.'
                : 'Start the conversation.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={comments.filter((item) => !hidden[item.id])}
            keyExtractor={(item) => item.id}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              // Holding a comment opens the menu, the way Instagram does it.
              <TouchableOpacity
                style={styles.row}
                onLongPress={(event) => {
                  setMenuAt({
                    x: event.nativeEvent.pageX,
                    y: event.nativeEvent.pageY,
                  });
                  setMenuFor(item);
                }}
                activeOpacity={1}
              >
                {/* The ring shows when they have a story to watch. */}
                <StoryAvatar
                  userId={item.author.id}
                  username={item.author.username}
                  // My own comments carry whatever picture I had when the
                  // API sent them, so mine comes from my profile instead.
                  avatarUrl={
                    item.author.id === user?.id
                      ? user?.avatar_url
                      : item.author.avatar_url
                  }
                  size={34}
                />

                <View style={styles.body}>
                  <View style={styles.nameLine}>
                    <Text style={styles.username}>{item.author.username}</Text>

                    <Text style={styles.age}>{timeAgo(item.created_at)}</Text>
                  </View>

                  <Text style={styles.comment}>{item.body}</Text>

                  <View style={styles.actions}>
                    {/* There is no point answering yourself, so Reply only
                        shows on someone else's comment. */}
                    {item.author.id !== user?.id && (
                      <TouchableOpacity onPress={() => setReplyTo(item)}>
                        <Text style={styles.action}>Reply</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={() => hide(item.id)}>
                      <Text style={styles.action}>Hide</Text>
                    </TouchableOpacity>

                    {!!item.replies_count && item.replies_count > 0 && (
                      <TouchableOpacity onPress={() => toggleReplies(item)}>
                        <Text style={styles.action}>
                          {openId === item.id
                            ? 'Hide replies'
                            : `View ${item.replies_count} replies`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {openId === item.id && (
                    loadingReplies ? (
                      <ActivityIndicator
                        style={styles.replyLoader}
                        size="small"
                        color="#fff"
                      />
                    ) : (
                      replies.map((reply) => (
                        <View key={reply.id} style={styles.replyRow}>
                          <StoryAvatar
                            userId={reply.author.id}
                            username={reply.author.username}
                            avatarUrl={
                              reply.author.id === user?.id
                                ? user?.avatar_url
                                : reply.author.avatar_url
                            }
                            size={26}
                          />

                          <View style={styles.replyBody}>
                            <Text style={styles.username}>
                              {reply.author.username}
                            </Text>
                            <Text style={styles.comment}>{reply.body}</Text>
                          </View>
                        </View>
                      ))
                    )
                  )}
                </View>

                {/* The heart down the right hand side, with its count. */}
                <TouchableOpacity
                  style={styles.likeBox}
                  onPress={() => toggleLike(item.id)}
                >
                  <Heart
                    size={16}
                    color={liked[item.id] ? '#ed4956' : '#8e8e93'}
                    fill={liked[item.id] ? '#ed4956' : 'none'}
                  />

                  {liked[item.id] && <Text style={styles.likeCount}>1</Text>}
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}

        <View style={styles.emojiRow}>
          {emojis.map((emoji) => (
            <TouchableOpacity key={emoji} onPress={() => send(emoji)}>
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Shows who is being answered, with a way out of it. */}
        {!!replyTo && (
          <View style={styles.replyingRow}>
            <Text style={styles.replyingText}>
              Replying to {replyTo.author.username}
            </Text>

            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Text style={styles.action}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputRow}>
          <StoryAvatar
            userId={user?.id}
            username={user?.username}
            avatarUrl={user?.avatar_url}
            size={32}
          />

          <View style={styles.pill}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="What do you think of this?"
              placeholderTextColor="#8e8e93"
              style={styles.input}
              multiline
              onSubmitEditing={() => send(text)}
            />

            {/* Sending shows a spinner, an empty box shows the two icons and
                typed text shows the send button. */}
            {sending ? (
              <ActivityIndicator size="small" color="#6C63FF" />
            ) : text.trim() ? (
              <TouchableOpacity onPress={() => send(text)}>
                <Text style={styles.post}>Post</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.pillIcons}>
                <PhotoIcon size={20} color="#8e8e93" />
                <Sticker size={20} color="#8e8e93" style={styles.iconGap} />
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Held down on a comment */}
      <Modal
        visible={!!menuFor}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuFor(null)}
      >
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setMenuFor(null)}
        >
          {/* Kept on screen: never past the right edge, never so low that
              the bottom of the menu falls off. */}
          <View
            style={[
              styles.menu,
              {
                left: Math.min(Math.max(menuAt.x - 40, 12), screenWidth - 222),
                top: Math.min(menuAt.y + 12, screenHeight - 380),
              },
            ]}
          >
            {[
              { key: 'Pin', icon: Pin },
              { key: 'Share', icon: Send },
              { key: 'Restrict', icon: EyeOff },
              { key: 'Report', icon: CircleAlert, red: true },
              { key: 'Block', icon: Ban },
            ].map((row) => (
              <TouchableOpacity
                key={row.key}
                style={styles.menuRow}
                onPress={() => {
                  setMenuFor(null);
                  Alert.alert(row.key, 'This one is not built yet.');
                }}
              >
                <row.icon size={20} color={row.red ? '#ed4956' : '#fff'} />

                <Text style={[styles.menuText, row.red && styles.menuRed]}>
                  {row.key}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Always here. The server turns down a comment that is not
                mine to remove, and says so. */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                const target = menuFor;
                setMenuFor(null);

                if (target) handleDelete(target);
              }}
            >
              <Trash2 size={20} color="#ed4956" />

              <Text style={[styles.menuText, styles.menuRed]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default CommentsScreen;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  backdrop: {
    flex: 1,
  },

  sheet: {
    backgroundColor: '#000',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: 10,
  },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  sheetTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  headerSide: {
    width: 20,
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  filterText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  age: {
    color: '#8e8e93',
    fontSize: 12,
  },

  likeBox: {
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingTop: 2,
  },

  likeCount: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 2,
  },

  menuBackdrop: {
    flex: 1,
    backgroundColor: '#00000088',
  },

  menu: {
    position: 'absolute',
    width: 210,
    borderRadius: 14,
    backgroundColor: '#262626',
    paddingVertical: 6,
    // Lifts it off the dimmed sheet behind.
    elevation: 8,
  },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },

  menuText: {
    color: '#fff',
    fontSize: 16,
  },

  menuRed: {
    color: '#ed4956',
  },

  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#5a5a5a',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },

  loader: {
    flex: 1,
  },

  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },

  emptyText: {
    color: '#8e8e93',
    fontSize: 13,
    marginTop: 6,
  },

  listContent: {
    paddingVertical: 8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#262626',
  },

  body: {
    flex: 1,
    marginHorizontal: 12,
  },

  username: {
    color: '#8e8e93',
    fontSize: 13,
  },

  comment: {
    color: '#fff',
    fontSize: 14,
    marginTop: 2,
  },

  actions: {
    flexDirection: 'row',
    marginTop: 6,
  },

  action: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 18,
  },

  replyLoader: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },

  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },

  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#262626',
  },

  replyBody: {
    flex: 1,
    marginLeft: 10,
  },

  replyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },

  replyingText: {
    color: '#8e8e93',
    fontSize: 12,
  },

  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  emoji: {
    fontSize: 26,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 4,
  },

  myAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#262626',
  },

  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 14,
    minHeight: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#333',
  },

  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    maxHeight: 90,
    paddingVertical: 8,
  },

  pillIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconGap: {
    marginLeft: 14,
  },

  post: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '700',
  },
});
