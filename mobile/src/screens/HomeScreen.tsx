import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { PhotoIdentifier } from '@react-native-camera-roll/camera-roll';

import StoryItem from '../components/storyItem';
import PostCard from '../components/PostCard';
import PhotoPickerModal from '../components/PhotoPickerModal';

import { useProfile } from '../context/ProfileContext';
import { toUploadable } from '../utils/photo';
import { uploadImage } from '../../api/media';

import {
  getFeed,
  getStoryTray,
  getUserStories,
  createStory,
  PostOut,
  StoryOut,
  StoryTray,
} from '../../api/authApi';

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useProfile();

  const [posts, setPosts] = useState<PostOut[]>([]);
  const [stories, setStories] = useState<StoryTray[]>([]);
  const [myStories, setMyStories] = useState<StoryOut[]>([]);

  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadFeed = async (nextCursor: string | null) => {
    try {
      const response = await getFeed({ cursor: nextCursor, limit: 20 });

      // First page replaces the list, later pages add to it.
      setPosts(nextCursor ? (old) => [...old, ...response.items] : response.items);
      setCursor(response.next_cursor ?? null);
      setHasMore(!!response.has_more && !!response.next_cursor);
    } catch (error) {
      console.log('Load feed failed', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStories = async () => {
    try {
      const response = await getStoryTray();
      setStories(response);
    } catch (error) {
      console.log('Load stories failed', error);
    }
  };

  // Our own bubble comes from here, not the tray. The tray may leave our own
  // story out, and then we would never be able to open it.
  const loadMyStories = async () => {
    if (!user) return;

    try {
      const response = await getUserStories(user.id);
      setMyStories(response);
    } catch (error) {
      console.log('Load my stories failed', error);
    }
  };

  useEffect(() => {
    loadFeed(null);
    loadStories();
  }, []);

  useEffect(() => {
    loadMyStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Coming back from the story viewer, where one may have been deleted.
  useEffect(() => {
    return navigation.addListener('focus', loadMyStories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed(null);
    await loadStories();
    await loadMyStories();
    setRefreshing(false);
  };

  // The guard stops a fast scroll asking for the same page twice.
  const loadMore = async () => {
    if (!hasMore || !cursor || loadingMore) return;

    setLoadingMore(true);
    await loadFeed(cursor);
    setLoadingMore(false);
  };

  // Uploading a picture and turning it into a story.
  const handleAddStory = async (photo: PhotoIdentifier) => {
    setShowPicker(false);
    setUploading(true);

    try {
      const file = await toUploadable(photo);
      const asset = await uploadImage(file);

      // The story keeps the asset id, so the API works out the picture itself.
      const story = await createStory({ media_asset_id: asset.asset_id });

      // Show it straight away instead of waiting for a reload.
      setMyStories([story, ...myStories]);
    } catch (error: any) {
      Alert.alert('Could not add story', error?.message ?? 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const openStory = (story: StoryTray) => {
    navigation.push('StoryViewer', {
      userId: story.author.id,
      username: story.author.username,
    });
  };

  // My own bubble always comes first, even before I post anything, so drop
  // my entry from the tray to avoid showing it twice.
  const otherStories = stories.filter(
    (item) => !item.is_mine && item.author.id !== user?.id,
  );

  const hasMyStory = myStories.length > 0;

  const storyHeader = (
    <FlatList
      horizontal
      data={otherStories}
      keyExtractor={(item) => item.author.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.storyRow}
      ListHeaderComponent={
        <StoryItem
          name="Your story"
          // The bubble shows who the story belongs to, so it is the profile
          // picture, not a preview of the story itself.
          imageUrl={user?.avatar_url}
          isMe
          hasStory={hasMyStory}
          loading={uploading}
          onPress={() => {
            if (hasMyStory && user) {
              navigation.push('StoryViewer', {
                userId: user.id,
                username: user.username,
              });
            } else {
              setShowPicker(true);
            }
          }}
          onAdd={() => setShowPicker(true)}
        />
      }
      renderItem={({ item }) => (
        <StoryItem
          name={item.author.username}
          // || not ??, so an empty text from the API still falls back.
          imageUrl={item.author.avatar_url || item.preview_url}
          hasStory
          onPress={() => openStory(item)}
        />
      )}
    />
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={styles.loader} color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onDeleted={(postId) =>
              setPosts((old) => old.filter((post) => post.id !== postId))
            }
          />
        )}
        ListHeaderComponent={storyHeader}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#fff"
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            No posts yet. Follow some people to fill your feed.
          </Text>
        }
      />

      <PhotoPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleAddStory}
      />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  storyRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  loader: {
    marginTop: 40,
  },

  empty: {
    color: '#8e8e93',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
  },
});
