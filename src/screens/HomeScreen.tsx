import React from 'react';
import { FlatList } from 'react-native';

import StoryItem from '../components/storyItem';
import PostCard from '../components/PostCard';

import { stories } from '../data/stories';
import { posts } from '../data/Posts';

const HomeScreen = () => {
  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PostCard item={item} />}
      ListHeaderComponent={
        <FlatList
          horizontal
          data={stories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <StoryItem item={item} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        />
      }
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: '#000' }}
    />
  );
};

export default HomeScreen;