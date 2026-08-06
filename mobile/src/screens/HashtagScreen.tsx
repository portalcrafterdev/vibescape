import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';

import {
  getHashtag,
  getHashtagPosts,
  PostGridItem,
} from '../../api/authApi';

type Props = NativeStackScreenProps<RootStackParamList, 'Hashtag'>;

const SIZE = Dimensions.get('window').width / 3;

const HashtagScreen = ({ route, navigation }: Props) => {
  const { tag } = route.params;

  const [count, setCount] = useState<number | null>(null);
  const [posts, setPosts] = useState<PostGridItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPosts = async (nextCursor: string | null) => {
    try {
      const response = await getHashtagPosts(tag, {
        cursor: nextCursor,
        limit: 30,
      });

      // First page replaces the grid, later pages add to it.
      setPosts(
        nextCursor ? (old) => [...old, ...response.items] : response.items,
      );
      setCursor(response.next_cursor ?? null);
      setHasMore(!!response.has_more && !!response.next_cursor);
    } catch (error) {
      console.log('Load hashtag posts failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts(null);

    // The count is a nice extra, so a failure here must not empty the grid.
    getHashtag(tag)
      .then((response) => setCount(response.posts_count ?? 0))
      .catch((error) => console.log('Load hashtag failed', error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag]);

  // The guard stops a fast scroll asking for the same page twice.
  const loadMore = async () => {
    if (!hasMore || !cursor || loadingMore) return;

    setLoadingMore(true);
    await loadPosts(cursor);
    setLoadingMore(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={26} color="#fff" strokeWidth={2.2} />
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          #{tag}
        </Text>

        <View style={styles.placeholder} />
      </View>

      {count !== null && (
        <Text style={styles.count}>
          {count} {count === 1 ? 'post' : 'posts'}
        </Text>
      )}

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#fff" />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Image
                source={
                  item.image_url
                    ? { uri: item.image_url }
                    : require('../assets/images/Portelcrafterlogo.png')
                }
                style={styles.image}
              />
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Nothing tagged #{tag} yet.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default HashtagScreen;

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
  },

  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  placeholder: {
    width: 26,
  },

  count: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },

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

  loader: {
    marginTop: 40,
  },

  empty: {
    color: '#8e8e93',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 40,
  },
});
