import React , {useState, useRef}from 'react';
import {
  FlatList,
  StyleSheet,
  Dimensions,
  StatusBar,
  View,
} from 'react-native';

import ReelCard from '../components/ReelsCard';
import { reels } from '../data/Reels';
import { useIsFocused } from '@react-navigation/native';

const { height } = Dimensions.get('window');

const ReelsScreen = () => {
  const isfocused = useIsFocused();
  const [activeId, setActiveId] = useState(reels[0].id);
  const viewabilityConfig= useRef({ itemVisiblePercentThreshold: 80}).current;

  const onViewableItemsChanged = useRef(({viewableItems}: any)=>{
    if(viewableItems.length>0) setActiveId(viewableItems[0].item.id);
  }).current 

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <FlatList
        data={reels}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReelCard item={item} isActive={item.id === activeId && isfocused} />
        )}
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        bounces={false}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        viewabilityConfig={viewabilityConfig}
        windowSize={3}
        onViewableItemsChanged={onViewableItemsChanged}
      />
    </View>
  );
};

export default ReelsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});