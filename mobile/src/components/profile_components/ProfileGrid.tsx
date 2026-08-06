import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { Pin } from 'lucide-react-native';

import {
  getUserPosts,
  getUserTagged,
  deletePost,
  PostGridItem,
} from '../../../api/authApi';

const SIZE = Dimensions.get('window').width / 3;

interface gridprops {
  userId?: string;
  // Changes when the screen is refreshed, which loads the grid again.
  reload?: number;
  // Only the signed-in user can remove their own posts.
  canDelete?: boolean;
  onDeleted?: () => void;
  // The Tagged tab shows posts this user appears in, not the ones they made.
  tagged?: boolean;
}

const ProfileGrid = ({
  userId,
  reload,
  canDelete,
  onDeleted,
  tagged,
}: gridprops) => {
  const [posts, setPosts] = useState<PostGridItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPosts = async (nextCursor: string | null) => {
    if (!userId) return;

    try {
      const response = tagged
        ? await getUserTagged(userId, { cursor: nextCursor, limit: 30 })
        : await getUserPosts(userId, { cursor: nextCursor, limit: 30 });

      // First page replaces the grid, later pages add to it.
      setPosts(
        nextCursor ? (old) => [...old, ...response.items] : response.items,
      );
      setCursor(response.next_cursor ?? null);
      setHasMore(!!response.has_more && !!response.next_cursor);
    } catch (error) {
      console.log('Load posts failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, reload]);

  // The grid does not scroll on its own, so more posts come from a button
  // rather than from reaching the end of a list.
  const loadMore = async () => {
    if (loadingMore) return;

    setLoadingMore(true);
    await loadPosts(cursor);
    setLoadingMore(false);
  };

  const handleDelete = (post: PostGridItem) => {
    if (!canDelete) return;

    Alert.alert('Delete post', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(post.id);
            setPosts((old) => old.filter((item) => item.id !== post.id));

            // The count lives on the profile, so it is reloaded from there.
            if (onDeleted) onDeleted();
          } catch (error) {
            console.log('Delete post failed', error);
            Alert.alert('Could not delete', 'Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator style={styles.loader} color="#fff" />;
  }

  if (posts.length === 0) {
    return (
      <Text style={styles.empty}>
        {tagged ? 'No tagged posts yet.' : 'No posts yet.'}
      </Text>
    );
  }

  return (
    <>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onLongPress={() => handleDelete(item)}
            activeOpacity={0.8}
          >
            <Image
              source={
                item.image_url
                  ? { uri: item.image_url }
                  : require('../../assets/images/Portelcrafterlogo.png')
              }
              style={styles.image}
            />

            {item.pinned && (
              <View style={styles.pin}>
                <Pin
                  size={14}
                  color="#fff"
                  fill="#fff"
                />
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {hasMore && (
        <TouchableOpacity
          style={styles.more}
          onPress={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.moreText}>Show more</Text>
          )}
        </TouchableOpacity>
      )}
    </>
  );
};

export default ProfileGrid;

const styles = StyleSheet.create({
  item: {
    width: SIZE,
    height: SIZE,
    borderWidth: 0.3,
    borderColor: '#000',
  },

  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#262626',
  },

  pin: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  loader: {
    marginTop: 40,
  },

  empty: {
    color: '#8e8e93',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 40,
  },

  more: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  moreText: {
    color: '#4da6ff',
    fontSize: 15,
    fontWeight: '600',
  },
});
