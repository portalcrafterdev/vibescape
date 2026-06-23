import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';

import {
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  Bookmark,
  MoreHorizontal,
} from 'lucide-react-native';

const ReelActions = ({ item }: any) => {
  return (
    <View style={styles.container}>

   <TouchableOpacity style={styles.item}>
  <Heart color="white" size={23} strokeWidth={2} />
  <Text style={styles.count}>Likes</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.item}>
  <MessageCircle color="white" size={23} strokeWidth={2} />
  <Text style={styles.count}>784</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.item}>
  <Repeat2 color="white" size={23} strokeWidth={2} />
  <Text style={styles.count}>1,370</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.item}>
  <Send color="white" size={23} strokeWidth={2} />
</TouchableOpacity>