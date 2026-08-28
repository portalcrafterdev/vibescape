import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  FlatList,
  TextInput,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import {
  X,
  Eye,
  Send,
  Users,
  Share2,
  AtSign,
  Menu,
} from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';
import { useStories } from '../context/StoryContext';

import {
  getUserStories,
  deleteStory,
  startConversation,
  sendMessage,
  viewStory,
  getStoryViewers,
  StoryOut,
  StoryViewerOut,
} from '../../api/authApi';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryViewer'>;

// Cloudinary puts the kind of file in the address, and the ending is there
// for anything that does not.
const isVideo = (url?: string) => {
  if (!url) return false;

  return (
    url.includes('/video/') || /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url)
  );
};

// How long one story stays up before the next one comes in.
const DURATION = 15000;
const STEP = 100;

const StoryViewer = ({ route, navigation }: Props) => {
  const { userId, username, latestAt } = route.params;

  // Watching a story greys its ring everywhere the person's picture shows.
  const { markSeen } = useStories();

  const [stories, setStories] = useState<StoryOut[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // 0 to 1 across the bar of the story being shown.
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  // Who has watched the story being shown. Only the person who posted it is
  // allowed to ask for the list, so this is only ever filled for my own.
  const [showActivity, setShowActivity] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerOut[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [views, setViews] = useState(0);

  const openActivity = async () => {
    if (!story) return;

    setPaused(true);
    setShowActivity(true);
    setLoadingViewers(true);

    try {
      setViewers(await getStoryViewers(story.id, { limit: 100 }));
    } catch (error) {
      console.log('Load viewers failed', error);
    } finally {
      setLoadingViewers(false);
    }
  };

  const closeActivity = () => {
    setShowActivity(false);
    setPaused(false);
  };

  const loadStories = async () => {
    try {
      const response = await getUserStories(userId);
      setStories(response);
    } catch (error) {
      console.log('Load stories failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // The newest story seen is handed to the story context, which every ring
  // in the app reads from. The server remembers this too, but only after the
  // tray is asked again, so this greys the ring straight away.
  //
  // The time the tray already knows about is the safest one to save, because
  // both sides then compare the very same value. Arriving from anywhere
  // else, it is worked out by the largest time rather than by the order the
  // list came back in. Compared as text, not as dates, since the API sends
  // six decimal places, which is more than a date understands.
  useEffect(() => {
    if (stories.length === 0) return;

    let newest = latestAt ?? '';

    if (!newest) {
      stories.forEach((item) => {
        if (!newest || item.created_at > newest) newest = item.created_at;
      });
    }

    markSeen(userId, newest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stories]);

  const story = stories[index];

  // Tell the server the story was opened. Sending the same one again does
  // not count twice, and looking at my own is never counted, so the number
  // that comes back is the one to show under my own story.
  useEffect(() => {
    if (!story) return;

    setViews(story.views_count ?? 0);

    const send = async () => {
      try {
        const response = await viewStory(story.id);
        setViews(response.views_count);
      } catch (error) {
        console.log('View story failed', error);
      }
    };

    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  // Dragging up on my own story opens the list of who watched, the way it
  // works in Instagram. The capture asks before the taps underneath get the
  // touch, and it only says yes to a clear drag upwards, so a short tap
  // still moves to the next story.
  const swipeUp = PanResponder.create({
    onMoveShouldSetPanResponderCapture: (event, state) =>
      !!story?.is_mine &&
      state.dy < -25 &&
      Math.abs(state.dy) > Math.abs(state.dx),

    onPanResponderRelease: () => openActivity(),
  });

  // Tap the right half for the next story, the left half to go back.
  const goNext = () => {
    if (index < stories.length - 1) {
      setIndex(index + 1);
    } else {
      navigation.goBack();
    }
  };

  const goBack = () => {
    if (index > 0) setIndex(index - 1);
  };

  // One timer fills the bar, the other moves on when it is full. Typing a
  // reply holds both, so a story does not slide away mid sentence.
  useEffect(() => {
    if (!story || paused) return;

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
  }, [index, story?.id, paused, stories.length]);

  const handleDelete = () => {
    if (!story) return;

    setPaused(true);

    Alert.alert('Delete story', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel', onPress: () => setPaused(false) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStory(story.id);

            const left = stories.filter((item) => item.id !== story.id);

            if (left.length === 0) {
              navigation.goBack();
              return;
            }

            setStories(left);
            setIndex(index > 0 ? index - 1 : 0);
            setPaused(false);
          } catch (error) {
            console.log('Delete story failed', error);
            setPaused(false);
          }
        },
      },
    ]);
  };

  // Replying to a story is a normal message to whoever posted it.
  const handleReply = async () => {
    if (!reply.trim() || sending || !story) return;

    setSending(true);

    try {
      const conversation = await startConversation({
        user_id: story.author.id,
      });

      await sendMessage(conversation.id, { body: reply.trim() });

      setReply('');
      setPaused(false);
      Alert.alert('Sent', `Your reply went to ${story.author.username}.`);
    } catch (error) {
      console.log('Reply failed', error);
      Alert.alert('Could not send', 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {loading ? (
        <ActivityIndicator style={styles.loader} color="#fff" />
      ) : !story ? (
        <View style={styles.centered}>
          <Text style={styles.message}>No stories to show.</Text>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.viewer} {...swipeUp.panHandlers}>
          {/* A story can be a clip as well as a picture, and the address is
              the only way to tell them apart. */}
          {isVideo(story.image_url) ? (
            <Video
              source={{ uri: story.image_url }}
              style={styles.image}
              resizeMode="contain"
              repeat
              paused={paused}
            />
          ) : (
            <Image source={{ uri: story.image_url }} style={styles.image} />
          )}

          {/* Tap areas sit on top of the picture */}
          <TouchableOpacity style={styles.leftTap} onPress={goBack} />
          <TouchableOpacity style={styles.rightTap} onPress={goNext} />

          {/* One bar per story, filling as this one plays. */}
          <View style={styles.bars}>
            {stories.map((item, i) => (
              <View key={item.id} style={styles.barTrack}>
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
                story.author.avatar_url
                  ? { uri: story.author.avatar_url }
                  : require('../assets/images/Portelcrafterlogo.png')
              }
              style={styles.avatar}
            />

            <Text style={styles.username}>
              {story.author.username ?? username}
            </Text>

            <Text style={styles.time}>{timeAgo(story.created_at)}</Text>

            <View style={styles.headerIcons}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <X size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* My own story gets the count of who watched and the owner's bar
              under it. Both sit in the one column, so the count can never
              land on top of the labels. Delete lives under More, where
              Instagram keeps it. */}
          {story.is_mine && (
            <View style={styles.ownerArea}>
              <TouchableOpacity style={styles.viewsRow} onPress={openActivity}>
                <Eye size={17} color="#fff" />

                <Text style={styles.viewsText}>
                  {views === 1 ? '1 view' : `${views} views`}
                </Text>
              </TouchableOpacity>

              <View style={styles.ownerBar}>
                {[
                  { key: 'Activity', label: 'Activity', icon: Users },
                  { key: 'ShareTo', label: 'Share to', icon: Send },
                  { key: 'ShareOn', label: 'Share on...', icon: Share2 },
                  { key: 'Mention', label: 'Mention', icon: AtSign },
                  { key: 'More', label: 'More', icon: Menu },
                ].map((one) => (
                  <TouchableOpacity
                    key={one.key}
                    style={styles.ownerItem}
                    onPress={() => {
                      if (one.key === 'More') return handleDelete();
                      if (one.key === 'Activity') return openActivity();

                      Alert.alert(one.label, 'This one is not built yet.');
                    }}
                  >
                    <one.icon size={24} color="#fff" />
                    <Text style={styles.ownerText}>{one.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Only someone else's story can be answered. */}
          {!story.is_mine && (
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

      {/* Who has watched this story, newest first */}
      <Modal
        visible={showActivity}
        transparent
        animationType="slide"
        onRequestClose={closeActivity}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={closeActivity}
        />

        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetTitle}>
            {views === 1 ? '1 view' : `${views} views`}
          </Text>

          <Text style={styles.sheetNote}>
            Only you can see who has watched your story.
          </Text>

          {loadingViewers ? (
            <ActivityIndicator style={styles.sheetLoader} color="#fff" />
          ) : (
            <FlatList
              data={viewers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.viewerRow}
                  onPress={() => {
                    closeActivity();
                    navigation.push('UserProfile', { userId: item.id });
                  }}
                >
                  <Image
                    source={
                      item.avatar_url
                        ? { uri: item.avatar_url }
                        : require('../assets/images/Portelcrafterlogo.png')
                    }
                    style={styles.viewerAvatar}
                  />

                  <View style={styles.viewerNames}>
                    <Text style={styles.viewerUsername} numberOfLines={1}>
                      {item.username}
                    </Text>

                    {!!item.display_name && (
                      <Text style={styles.viewerName} numberOfLines={1}>
                        {item.display_name}
                      </Text>
                    )}
                  </View>

                  <Text style={styles.viewerTime}>
                    {timeAgo(item.viewed_at)}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.sheetEmpty}>
                  Nobody has watched this one yet.
                </Text>
              }
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// "16s ago", "5m ago", "3h ago", the way the story header reads.
const timeAgo = (iso: string) => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);

  if (seconds < 60) return `${Math.max(seconds, 1)}s ago`;

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes}m ago`;

  return `${Math.floor(minutes / 60)}h ago`;
};

export default StoryViewer;

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
    bottom: 80,
    left: 0,
    width: '35%',
  },

  rightTap: {
    position: 'absolute',
    top: 60,
    bottom: 80,
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
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#262626',
  },

  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },

  trash: {
    marginRight: 18,
  },

  username: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },

  time: {
    color: '#ddd',
    fontSize: 13,
    marginLeft: 8,
  },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: '#00000099',
  },

  sheet: {
    maxHeight: '70%',
    backgroundColor: '#1c1c1c',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: 20,
  },

  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#5a5a5a',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 10,
  },

  sheetTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  sheetNote: {
    color: '#8e8e93',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 30,
  },

  sheetLoader: {
    marginVertical: 30,
  },

  sheetEmpty: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 30,
    paddingHorizontal: 30,
  },

  // The whole bottom corner of my own story. A little dark behind it keeps
  // the writing readable over a bright picture.
  ownerArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#00000055',
    paddingTop: 4,
  },

  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  viewsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  viewerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#262626',
  },

  viewerNames: {
    flex: 1,
    marginLeft: 12,
  },

  viewerUsername: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  viewerName: {
    color: '#8e8e93',
    fontSize: 14,
    marginTop: 2,
  },

  viewerTime: {
    color: '#8e8e93',
    fontSize: 13,
    marginLeft: 10,
  },

  ownerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
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
