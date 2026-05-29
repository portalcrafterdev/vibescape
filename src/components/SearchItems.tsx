import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';

import { Eye } from 'lucide-react-native';

const width = Dimensions.get('window').width;
const ITEM_SIZE = width / 3;

const SearchItem = ({ item }: any) => {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: item.image }}
        style={styles.image}
      />
