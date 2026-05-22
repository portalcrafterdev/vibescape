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