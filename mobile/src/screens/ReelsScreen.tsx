import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Dimensions,
  StatusBar,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';

import { useIsFocused, useNavigation } from '@react-navigation/native';

import ReelCard from '../components/ReelsCard';
import { listReels, ReelOut } from '../../api/authApi';

const { height } = Dimensions.get('window');

const ReelsScreen = () => {
  const isfocused = useIsFocused();
  const navigation = useNavigation<any>();

  const [reels, setReels] = useState<ReelOut[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const fromComments = useRef(false);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveId(viewableItems[0].item.id);
  }).current;

  const loadReels = async (nextCursor: string | null) => {
    try {
      const response = await listReels({ cursor: nextCursor, limit: 10 });

      // First page replaces the list, later pages add to it.
      setReels(nextCursor ? (old) => [...old, ...response.items] : response.items);
      setCursor(response.next_cursor ?? null);
      setHasMore(!!response.has_more && !!response.next_cursor);

      if (!nextCursor) {
        setActiveId(response.items[0]?.id ?? null);
      }
    } catch (error) {
      console.log('Load reels failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReels(null);
  }, []);

  // Reload on focus so a reel just posted shows up without restarting the app.
  // Closing the comments sheet also counts as focus, and reloading there would
  // throw the user back to the first reel, so that one case is skipped.
  useEffect(() => {
    return navigation.addListener('focus', () => {
      if (fromComments.current) {
        fromComments.current = false;
        return;
      }

      loadReels(null);
    });
  }, [navigation]);

  // The guard stops a fast scroll asking for the same page twice.
  const loadMore = async () => {
    if (!hasMore || !cursor || loadingMore) return;

    setLoadingMore(true);
    await loadReels(cursor);
    setLoadingMore(false);
  };

  const handleDeleted = (reelId: string) => {
    setReels((old) => old.filter((item) => item.id !== reelId));
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (reels.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>
          No reels yet. Record one from the create screen.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <FlatList
        data={reels}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReelCard
            reel={item}
            isCurrent={item.id === activeId}
            isActive={item.id === activeId && isfocused}
            onDeleted={handleDeleted}
            onOpenComments={() => {
              fromComments.current = true;
              navigation.push('Comments', {
                postId: item.id,
                mine: !!item.is_mine,
              });
            }}
          />
        )}
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        bounces={false}
        // Only one video plays at a time, so there is no reason to keep more
        // than the neighbours around.
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
      />
    </View>
  );
};

export default ReelsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  centered: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  empty: {
    color: '#8e8e93',
    fontSize: 15,
    textAlign: 'center',
  },
});
