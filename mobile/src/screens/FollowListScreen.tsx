import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';
import UserRow from '../components/UserRow';
import { listFollowers, listFollowing, UserSummary } from '../../api/authApi';

type Props = NativeStackScreenProps<RootStackParamList, 'FollowList'>;

const FollowListScreen = ({ route, navigation }: Props) => {
  const { userId, username, mode } = route.params;

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadUsers = async (nextCursor: string | null) => {
    try {
      const response =
        mode === 'followers'
          ? await listFollowers(userId, { cursor: nextCursor, limit: 20 })
          : await listFollowing(userId, { cursor: nextCursor, limit: 20 });

      // First page replaces the list, later pages add to it.
      setUsers(nextCursor ? (old) => [...old, ...response.items] : response.items);
      setCursor(response.next_cursor ?? null);
      setHasMore(!!response.has_more && !!response.next_cursor);
    } catch (error) {
      console.log('Load follow list failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, mode]);

  // The guard stops a fast scroll asking for the same page twice.
  const loadMore = async () => {
    if (!hasMore || !cursor || loadingMore) return;

    setLoadingMore(true);
    await loadUsers(cursor);
    setLoadingMore(false);
  };

  // Remember the new state so it survives when more pages load.
  const handleFollowChange = (changedId: string, following: boolean) => {
    setUsers((old) =>
      old.map((item) =>
        item.id === changedId ? { ...item, is_following: following } : item,
      ),
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={26} color="#fff" strokeWidth={2.2} />
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          {username ? `${username} · ` : ''}
          {mode === 'followers' ? 'Followers' : 'Following'}
        </Text>

        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#fff" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              onFollowChange={handleFollowChange}
              onPress={() => navigation.push('UserProfile', { userId: item.id })}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {mode === 'followers'
                ? 'No followers yet.'
                : 'Not following anyone yet.'}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default FollowListScreen;

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
    paddingVertical: 8,
    flexGrow: 1,
  },

  loader: {
    marginTop: 40,
  },

  empty: {
    color: '#8e8e93',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 60,
  },
});
