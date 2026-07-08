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
  paused={!isActive}
  muted={false}
  controls={false}
  playInBackground={false}
  playWhenInactive={false}
  ignoreSilentSwitch="ignore"
  onLoad={() => console.log('Video Loaded')}
  onError={(error) => console.log('Video Error:', error)}
/>

      {/* Top Header */}
      <ReelsHeader />

      {/* Right Side Actions */}
      <ReelActions item={item} />

      {/* Bottom Footer */}
      <ReelFooter item={item} />
    </View>
  );
};

export default ReelCard;

const styles = StyleSheet.create({
  container: {