import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
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
  const { conversationId, username } = route.params;

  const [messages, setMessages] = useState<MessageOut[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={26} color="#fff" strokeWidth={2.2} />
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          {username ?? 'Chat'}
        </Text>

        <View style={styles.placeholder} />
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
          renderItem={({ item }) => (
            <View style={item.is_mine ? styles.mineRow : styles.theirRow}>
              <View style={item.is_mine ? styles.mine : styles.theirs}>
                <Text style={styles.body}>{item.body}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Say hello.</Text>}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor="#777"
            style={styles.input}
            multiline
          />

          <TouchableOpacity onPress={handleSend} disabled={sending}>
            {sending ? (
              <ActivityIndicator size="small" color="#6C63FF" />
            ) : (
              <Text style={[styles.send, !text.trim() && styles.sendOff]}>
                Send
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
  },

  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  placeholder: {
    width: 26,
  },

  listContent: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexGrow: 1,
  },

  mineRow: {
    alignItems: 'flex-end',
    marginVertical: 3,
  },

  theirRow: {
    alignItems: 'flex-start',
    marginVertical: 3,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#262626',
  },

  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
    marginRight: 12,
  },

  send: {
    color: '#6C63FF',
    fontSize: 15,
    fontWeight: '700',
  },

  sendOff: {
    color: '#3a3a3a',
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
