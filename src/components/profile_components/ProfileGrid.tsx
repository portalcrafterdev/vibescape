import React from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  View,
  Dimensions,
} from 'react-native';

import { Pin } from 'lucide-react-native';

import { profilePosts } from '../../data/ProfilePosts';

const SIZE = Dimensions.get('window').width / 3;

const ProfileGrid = () => {
  return (
    <FlatList
      data={profilePosts}
      keyExtractor={(item) => item.id}
      numColumns={3}
      scrollEnabled={false}