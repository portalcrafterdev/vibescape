import React from 'react';
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
} from 'react-native';

import { Search } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import SearchItem from '../components/SearchItems';
import { searchData } from '../data/SearchData';

const SearchScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={searchData}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => <SearchItem item={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.searchBar}>
            <Search
              color="#8e8e93"
              size={20}
            />

            <TextInput
              placeholder="Search with Meta AI"
              placeholderTextColor="#8e8e93"
              style={styles.input}
            />
          </View>
        }
      />
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
});