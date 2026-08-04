import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';

import { Search, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import SearchItem from '../components/SearchItems';
import UserRow from '../components/UserRow';
import { searchData } from '../data/SearchData';
import { searchUsers, UserSummary } from '../../api/authApi';

const SearchScreen = () => {
  const navigation = useNavigation<any>();

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const text = query.trim();

    if (!text) {
      setUsers([]);
      return;
    }

    setSearching(true);

    // Wait a moment after typing stops so we do not call the API on every key.
    const timer = setTimeout(async () => {
      try {
        const response = await searchUsers(text, 20);
        setUsers(response);
      } catch (error) {
        console.log('Search failed', error);
        setUsers([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

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

  // With an empty search box we keep showing the old explore grid.
  if (!query.trim()) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={searchData}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={({ item }) => <SearchItem item={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={searchBar}
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
          ListEmptyComponent={
            <Text style={styles.empty}>No users found.</Text>
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
});
