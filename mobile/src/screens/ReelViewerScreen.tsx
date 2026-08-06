import React, { useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Dimensions,
  StatusBar,
  View,
} from 'react-native';

import { useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import ReelCard from '../components/ReelsCard';
import { RootStackParamList } from '../types/navigation';
import { ReelOut } from '../../api/authApi';

const { height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'ReelViewer'>;

// Plays reels the profile already loaded, so nothing is fetched here.
const ReelViewerScreen = ({ route, navigation }: Props) => {
  const { reels: opened, index } = route.params;

  const isfocused = useIsFocused();

  const [reels, setReels] = useState<ReelOut[]>(opened);
  const [activeId, setActiveId] = useState<string | null>(
    opened[index]?.id ?? null,
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveId(viewableItems[0].item.id);
  }).current;

  const handleDeleted = (reelId: string) => {
    const left = reels.filter((item) => item.id !== reelId);

    // Nothing else to watch, so go back to the profile.
    if (left.length === 0) {
      navigation.goBack();
      return;
    }

    setReels(left);
  };

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
          <ReelCard
            reel={item}
            isCurrent={item.id === activeId}
            isActive={item.id === activeId && isfocused}
            onDeleted={handleDeleted}
            onOpenComments={() =>
              navigation.push('Comments', {
                postId: item.id,
                mine: !!item.is_mine,
              })
            }
            onBack={() => navigation.goBack()}
          />
        )}
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        bounces={false}
        // Needed so the list can open on the reel that was tapped.
        initialScrollIndex={index}
        getItemLayout={(data, i) => ({
          length: height,
          offset: height * i,
          index: i,
        })}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
      />
    </View>
  );
};

export default ReelViewerScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
