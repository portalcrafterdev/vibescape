import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Phone,
  Video,
  Smile,
  Camera,
  Mic,
  Image as ImageIcon,
  Sticker,
  Plus,
} from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';

import {
  listMessages,
  sendMessage,
  markConversationRead,
  MessageOut,
} from '../../api/authApi';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const ChatScreen = ({ route, navigation }: Props) => {
  const { conversationId, username, avatarUrl, online } = route.params;

  const [messages, setMessages] = useState<MessageOut[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');

  // How much of the screen the keyboard covers, measured here rather than
  // left to the window, which does not always give the room back.
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

  const loadMessages = async (nextCursor: string | null) => {
    try {
      const response = await listMessages(conversationId, {
        cursor: nextCursor,
        limit: 30,
      });

      // First page replaces the list, later pages add older messages to it.
      setMessages(
        nextCursor ? (old) => [...old, ...response.items] : response.items,
      );
      setCursor(response.next_cursor ?? null);
      setHasMore(!!response.has_more && !!response.next_cursor);
    } catch (error) {
      console.log('Load messages failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages(null);

    // Opening the thread clears its badge.
    markConversationRead(conversationId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // The guard stops a fast scroll asking for the same page twice.
  const loadMore = async () => {
    if (!hasMore || !cursor || loadingMore) return;

    setLoadingMore(true);
    await loadMessages(cursor);
    setLoadingMore(false);
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    setSending(true);

    try {
      const message = await sendMessage(conversationId, { body: text.trim() });

      // The list is newest first and drawn upside down, so a new message goes
      // on the front.
      setMessages([message, ...messages]);
      setText('');
    } catch (error) {
      console.log('Send message failed', error);
      Alert.alert('Could not send', 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  // The inbox hands the picture over. Coming from anywhere else, the first
  // message they sent has it too.
  const theirAvatar =
    avatarUrl || messages.find((item) => !item.is_mine)?.sender.avatar_url;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={26} color="#fff" strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.avatarBox}>
          <Image
            source={
              theirAvatar
                ? { uri: theirAvatar }
                : require('../assets/images/Portelcrafterlogo.png')
            }
            style={styles.headerAvatar}
          />

          {/* The green dot only shows when the inbox said they were about. */}
          {online && <View style={styles.dot} />}
        </View>

        <View style={styles.names}>
          <Text style={styles.title} numberOfLines={1}>
            {username ?? 'Chat'}
          </Text>

          {online && <Text style={styles.active}>Active now</Text>}
        </View>

        <Smile size={24} color="#fff" style={styles.headerIcon} />
        <Phone size={22} color="#fff" style={styles.headerIcon} />
        <Video size={24} color="#fff" />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#fff" />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          // Newest at the bottom without having to scroll there by hand.
          inverted
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => {
            // The list is upside down, so index - 1 sits below on the screen
            // and index + 1 sits above.
            const below = messages[index - 1];
            const above = messages[index + 1];

            // The picture goes beside the last message of a run, the way
            // Instagram does it, and the ones above it are pushed closer.
            const showAvatar = !item.is_mine && (!below || below.is_mine);
            const grouped = !!above && above.is_mine === item.is_mine;

            return (
              <View
                style={[
                  styles.row,
                  item.is_mine ? styles.mineRow : styles.theirRow,
                  grouped && styles.grouped,
                ]}
              >
                {/* An empty circle keeps the run lined up under the one
                    message that does show a picture. */}
                {!item.is_mine &&
                  (showAvatar ? (
                    <Image
                      source={
                        item.sender.avatar_url
                          ? { uri: item.sender.avatar_url }
                          : require('../assets/images/Portelcrafterlogo.png')
                      }
                      style={styles.rowAvatar}
                    />
                  ) : (
                    <View style={styles.rowAvatar} />
                  ))}

                <View style={item.is_mine ? styles.mine : styles.theirs}>
                  <Text style={styles.body}>{item.body}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>Say hello.</Text>}
        />
      )}

      {/* The row rides up on top of the keyboard instead of hiding behind. */}
      <View style={{ marginBottom: keyboard }}>
        <View style={styles.inputRow}>
          <View style={styles.cameraButton}>
            <Camera size={20} color="#fff" />
          </View>

          <View style={styles.pill}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Message..."
              placeholderTextColor="#8e8e93"
              style={styles.input}
              multiline
            />

            {/* Typing swaps the row of icons for Send, as Instagram does. */}
            {sending ? (
              <ActivityIndicator size="small" color="#6C63FF" />
            ) : text.trim() ? (
              <TouchableOpacity onPress={handleSend}>
                <Text style={styles.send}>Send</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.pillIcons}>
                <Mic size={22} color="#fff" />
                <ImageIcon size={22} color="#fff" />
                <Sticker size={22} color="#fff" />
                <Plus size={22} color="#fff" />
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
  },

  avatarBox: {
    position: 'relative',
  },

  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#262626',
  },

  dot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#31c04d',
    borderWidth: 2,
    borderColor: '#000',
  },

  names: {
    flex: 1,
  },

  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  active: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 1,
  },

  headerIcon: {
    marginRight: 8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 6,
  },

  grouped: {
    marginVertical: 1,
  },

  rowAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#262626',
  },

  listContent: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexGrow: 1,
  },

  // The row lays its children out sideways now, so which end a message sits
  // at is justifyContent. alignItems only decides how they line up top to
  // bottom, which is why mine were still coming out on the left.
  mineRow: {
    justifyContent: 'flex-end',
  },

  theirRow: {
    justifyContent: 'flex-start',
  },

  mine: {
    backgroundColor: '#6C63FF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: '78%',
  },

  theirs: {
    backgroundColor: '#262626',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: '78%',
  },

  body: {
    color: '#fff',
    fontSize: 15,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  cameraButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0f6fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    backgroundColor: '#262626',
  },

  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
  },

  pillIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  send: {
    color: '#0f6fff',
    fontSize: 15,
    fontWeight: '700',
  },

  loader: {
    marginTop: 40,
  },

  empty: {
    color: '#8e8e93',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 60,
    // The list is upside down, so this text has to be flipped back.
    transform: [{ scaleY: -1 }],
  },
});
