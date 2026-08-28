import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Trash2,
  Send,
  Users,
  Copy,
  CirclePlay,
  Menu,
} from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';

import {
  getHighlightItems,
  deleteHighlight,
  startConversation,
  sendMessage,
  HighlightItemOut,
} from '../../api/authApi';

type Props = NativeStackScreenProps<RootStackParamList, 'HighlightViewer'>;

// The same pace as a story.
const DURATION = 15000;
const STEP = 100;

const HighlightViewer = ({ route, navigation }: Props) => {
  const { highlightId, title, mine, userId, username, avatarUrl } =
    route.params;

  const [items, setItems] = useState<HighlightItemOut[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // 0 to 1 across the bar of the picture being shown.
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  // Answering a highlight is a normal message to whoever it belongs to.
  const handleReply = async () => {
    if (!reply.trim() || sending || !userId) return;

    setSending(true);

    try {
      const conversation = await startConversation({ user_id: userId });

      await sendMessage(conversation.id, { body: reply.trim() });

      setReply('');
      setPaused(false);
      Alert.alert('Sent', `Your reply went to ${username ?? 'them'}.`);
    } catch (error) {
      console.log('Reply failed', error);
      Alert.alert('Could not send', 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getHighlightItems(highlightId);

        // The API gives each one a place in the order, so it is kept.
        setItems(
          [...response].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
        );
      } catch (error) {
        console.log('Load highlight failed', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [highlightId]);

  const item = items[index];

  // Tap the right half for the next one, the left half to go back.
  const goNext = () => {
    if (index < items.length - 1) {
      setIndex(index + 1);
    } else {
      navigation.goBack();
    }
  };

  const goBack = () => {
    if (index > 0) setIndex(index - 1);
  };

  // One timer fills the bar, the other moves on when it is full.
  useEffect(() => {
    if (!item || paused) return;

    setProgress(0);

    const tick = setInterval(
      () => setProgress((old) => old + STEP / DURATION),
      STEP,
    );

    const jump = setTimeout(goNext, DURATION);

    return () => {
      clearInterval(tick);
      clearTimeout(jump);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, item?.id, paused, items.length]);

  const handleDelete = () => {
    setPaused(true);

    Alert.alert('Delete highlight', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel', onPress: () => setPaused(false) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHighlight(highlightId);
            navigation.goBack();
          } catch (error) {
            console.log('Delete highlight failed', error);
            Alert.alert('Could not delete', 'Please try again.');
            setPaused(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {loading ? (
        <ActivityIndicator style={styles.loader} color="#fff" />
      ) : !item ? (
        <View style={styles.centered}>
          <Text style={styles.message}>Nothing in this highlight.</Text>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.viewer}>
          <Image source={{ uri: item.image_url ?? '' }} style={styles.image} />

          {/* Tap areas sit on top of the picture */}
          <TouchableOpacity style={styles.leftTap} onPress={goBack} />
          <TouchableOpacity style={styles.rightTap} onPress={goNext} />

          {/* One bar per picture, filling as this one plays. */}
          <View style={styles.bars}>
            {items.map((one, i) => (
              <View key={one.id} style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width:
                        i < index
                          ? '100%'
                          : i === index
                          ? `${Math.min(progress, 1) * 100}%`
                          : '0%',
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          <View style={styles.header}>
            <Image
              source={
                avatarUrl
                  ? { uri: avatarUrl }
                  : require('../assets/images/Portelcrafterlogo.png')
              }
              style={styles.avatar}
            />

            <Text style={styles.title} numberOfLines={1}>
              {title ?? 'Highlight'}
            </Text>

            <View style={styles.headerIcons}>
              {mine && (
                <TouchableOpacity onPress={handleDelete} style={styles.trash}>
                  <Trash2 size={22} color="#fff" />
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => navigation.goBack()}>
                <X size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* My own highlight gets the owner's bar, anyone else's gets the
              box to answer them in. */}
          {mine ? (
            <View style={styles.ownerBar}>
              {[
                { key: 'Activity', icon: Users },
                { key: 'Browse', icon: Copy },
                { key: 'Create', icon: CirclePlay },
                { key: 'Send', icon: Send },
                { key: 'More', icon: Menu },
              ].map((one) => (
                <TouchableOpacity
                  key={one.key}
                  style={styles.ownerItem}
                  onPress={() =>
                    Alert.alert(one.key, 'This one is not built yet.')
                  }
                >
                  <one.icon size={24} color="#fff" />
                  <Text style={styles.ownerText}>{one.key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <KeyboardAvoidingView
              style={styles.replyWrap}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View style={styles.replyRow}>
                <TextInput
                  value={reply}
                  onChangeText={setReply}
                  placeholder="Say something..."
                  placeholderTextColor="#ddd"
                  style={styles.replyInput}
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)}
                />

                <TouchableOpacity onPress={handleReply} disabled={sending}>
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Send size={22} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

export default HighlightViewer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  viewer: {
    flex: 1,
  },

  image: {
    flex: 1,
    width: '100%',
    resizeMode: 'contain',
  },

  leftTap: {
    position: 'absolute',
    top: 60,
    bottom: 0,
    left: 0,
    width: '35%',
  },

  rightTap: {
    position: 'absolute',
    top: 60,
    bottom: 0,
    right: 0,
    width: '65%',
  },

  bars: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    gap: 4,
  },

  barTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#ffffff55',
    overflow: 'hidden',
  },

  barFill: {
    height: '100%',
    backgroundColor: '#fff',
  },

  header: {
    position: 'absolute',
    top: 22,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#262626',
    marginRight: 10,
  },

  title: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  ownerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },

  ownerItem: {
    alignItems: 'center',
    gap: 5,
  },

  ownerText: {
    color: '#fff',
    fontSize: 12,
  },

  replyWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },

  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ffffff88',
  },

  replyInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },

  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  trash: {
    marginRight: 18,
  },

  loader: {
    marginTop: 60,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  message: {
    color: '#8e8e93',
    fontSize: 15,
  },

  close: {
    color: '#6C63FF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
  },
});
