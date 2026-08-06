import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';

import { Search, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import SearchItem from '../components/SearchItems';
import UserRow from '../components/UserRow';
import {
  globalSearch,
  getExplore,
  listReels,
  UserSummary,
  ExploreItem,
  HashtagOut,
} from '../../api/authApi';
import { useProfile } from '../context/ProfileContext';

const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const { user: me } = useProfile();

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [tags, setTags] = useState<HashtagOut[]>([]);
  const [searching, setSearching] = useState(false);

  const [explore, setExplore] = useState<ExploreItem[]>([]);
  const [loadingExplore, setLoadingExplore] = useState(true);
  const [opening, setOpening] = useState(false);

  // A tile only carries an id, so the full reel is fetched before the player
  // opens. Without it there would be no author, no likes and no comments.
  const handleOpen = async (item: ExploreItem) => {
    if (!item.is_video || opening) return;

    setOpening(true);

    try {
      const response = await listReels({ limit: 30 });
      const index = response.items.findIndex((reel) => reel.id === item.id);

      if (index === -1) {
        Alert.alert('Not available', 'This reel could not be opened.');
        return;
      }

      navigation.push('ReelViewer', { reels: response.items, index });
    } catch (error) {
      console.log('Open reel failed', error);
    } finally {
      setOpening(false);
    }
  };

  // The grid behind the search box, loaded once when the tab opens.
  useEffect(() => {
    const loadExplore = async () => {
      try {
        const response = await getExplore(30);
        setExplore(response.items);
      } catch (error) {
        console.log('Load explore failed', error);
      } finally {
        setLoadingExplore(false);
      }
    };

    loadExplore();
  }, []);

  useEffect(() => {
    const text = query.trim();

    if (!text) {
      setUsers([]);
      setTags([]);
      return;
    }

    setSearching(true);

    // Wait a moment after typing stops so we do not call the API on every key.
    const timer = setTimeout(async () => {
      try {
        // One call brings back people and tags together.
        const response = await globalSearch(text, 20);

        // The API sends the logged in user back like anyone else, and there is
        // no point searching for yourself.
        setUsers((response.users ?? []).filter((item) => item.id !== me?.id));
        setTags(response.hashtags ?? []);
      } catch (error) {
        console.log('Search failed', error);
        setUsers([]);
        setTags([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, me?.id]);

  const searchBar = (
    <View style={styles.searchBar}>
      <Search color="#8e8e93" size={20} />

      <TextInput
        placeholder="Search"
        placeholderTextColor="#8e8e93"
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {!!query && (
        <TouchableOpacity onPress={() => setQuery('')}>
          <X color="#8e8e93" size={18} />
        </TouchableOpacity>
      )}
    </View>
  );

  // With an empty search box we keep showing the explore grid.
  if (!query.trim()) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={explore}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={({ item, index }) => (
            <SearchItem
              item={item}
              index={index}
              // Only a reel has somewhere to go. There is no screen for a
              // single post yet, so those tiles stay quiet.
              onPress={item.is_video ? () => handleOpen(item) : undefined}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={searchBar}
          ListEmptyComponent={
            loadingExplore ? (
              <ActivityIndicator style={styles.loader} color="#fff" />
            ) : (
              <Text style={styles.empty}>Nothing to explore yet.</Text>
            )
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {searchBar}

      {searching ? (
        <ActivityIndicator style={styles.loader} color="#fff" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              onPress={() => navigation.push('UserProfile', { userId: item.id })}
            />
          )}
          // Tags sit above the people, the way Instagram shows them.
          ListHeaderComponent={
            tags.length > 0 ? (
              <View>
                {tags.map((item) => (
                  <TouchableOpacity
                    key={item.tag}
                    style={styles.tagRow}
                    onPress={() =>
                      navigation.push('Hashtag', { tag: item.tag })
                    }
                  >
                    <View style={styles.tagCircle}>
                      <Text style={styles.tagHash}>#</Text>
                    </View>

                    <View style={styles.tagNames}>
                      <Text style={styles.tagName}>#{item.tag}</Text>

                      <Text style={styles.tagCount}>
                        {item.posts_count ?? 0} posts
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            tags.length > 0 ? null : (
              <Text style={styles.empty}>Nothing found.</Text>
            )
          }
        />
      )}
    </SafeAreaView>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },

  listContent: {
    paddingBottom: 90,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },

  input: {
    flex: 1,
    color: '#fff',
    marginLeft: 8,
    fontSize: 15,
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

  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  tagCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tagHash: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  tagNames: {
    flex: 1,
    marginLeft: 12,
  },

  tagName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  tagCount: {
    color: '#8e8e93',
    fontSize: 14,
    marginTop: 2,
  },
});
