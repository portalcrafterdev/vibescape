import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  
} from 'react-native';
 import Video from 'react-native-video';
import ReelsHeader from './ReelHeader';
import ReelActions from './ReelAction';
import ReelFooter from './ReelsFooter';

const { width, height } = Dimensions.get('window');

const ReelCard = ({ item, isActive }: any) => {
    console.log(item , "this is item data")
  return (
    <View style={styles.container}>
      {/* Reel Image / Video */}
<Video
  source={item.video}
  style={styles.video}
  resizeMode="cover"
  repeat={true}