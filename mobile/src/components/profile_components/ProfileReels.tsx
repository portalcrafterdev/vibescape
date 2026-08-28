import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { Play } from 'lucide-react-native';
import Video from 'react-native-video';
import { useNavigation, useIsFocused } from '@react-navigation/native';

import { listReels, deleteReel, ReelOut } from '../../../api/authApi';

const SIZE = Dimensions.get('window').width / 3;

// A paused video shows its first frame, which is the only cover picture the
// API gives us. Each one holds a decoder though, so only the squares near the
// top get one and the rest stay dark.
const WITH_FRAME = 6;

// The API has no per user reels endpoint, so the feed is walked and filtered.
// This many pages is plenty for now and stops the profile hammering the API.
const MAX_PAGES = 5;

interface reelsprops {
  userId?: string;
  // Changes when the screen is refreshed, which loads the reels again.
  reload?: number;
  // Only the signed-in user can remove their own reels.
  canDelete?: boolean;
  onDeleted?: () => void;
}

const ProfileReels = ({ userId, reload, canDelete, onDeleted }: reelsprops) => {
  const navigation = useNavigation<any>();
  // The thumbnails let go of their decoders while the viewer is open.
  const isfocused = useIsFocused();

  const [reels, setReels] = useState<ReelOut[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReels = async () => {
    if (!userId) return;

    try {
      let cursor: string | null = null;
      const mine: ReelOut[] = [];

      for (let page = 0; page < MAX_PAGES; page++) {
        const response = await listReels({ cursor, limit: 30 });

        mine.push(...response.items.filter((item) => item.author.id === userId));

        if (!response.has_more || !response.next_cursor) break;

        cursor = response.next_cursor;
      }

      setReels(mine);
    } catch (error) {
      console.log('Load reels failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, reload]);

  const handleDelete = (reel: ReelOut) => {
    if (!canDelete) return;

    Alert.alert('Delete reel', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReel(reel.id);
            setReels((old) => old.filter((item) => item.id !== reel.id));

            if (onDeleted) onDeleted();
          } catch (error) {
            console.log('Delete reel failed', error);
            Alert.alert('Could not delete', 'Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator style={styles.loader} color="#fff" />;
  }

  if (reels.length === 0) {
    return <Text style={styles.empty}>No reels yet.</Text>;
  }

  return (
    <FlatList
      data={reels}
      keyExtractor={(item) => item.id}
      numColumns={3}
      scrollEnabled={false}
      renderItem={({ item, index }) => (
        <TouchableOpacity
          style={styles.item}
          onPress={() =>
            navigation.push('ReelViewer', { reels, index })
          }
          onLongPress={() => handleDelete(item)}
          activeOpacity={0.8}
        >
          {item.album_url ? (
            <Image source={{ uri: item.album_url }} style={styles.image} />
          ) : index < WITH_FRAME && isfocused ? (
            <Video
              source={{ uri: item.video_url }}
              style={styles.image}
              resizeMode="cover"
              paused
              muted
              repeat={false}
              controls={false}
              playInBackground={false}
              playWhenInactive={false}
              onError={(error) => console.log('Reel thumbnail failed', error)}
            />
          ) : null}

          <View style={styles.middle}>
            <Play size={26} color="#ffffffcc" fill="#ffffffcc" />
          </View>

          <View style={styles.views}>
            <Play size={12} color="#fff" fill="#fff" />
            <Text style={styles.viewsText}>{item.views_count ?? 0}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
};

export default ProfileReels;

const styles = StyleSheet.create({
  item: {
    width: SIZE,
    height: SIZE * 1.5,
    borderWidth: 0.3,
    borderColor: '#000',
    backgroundColor: '#1c1c1e',
  },

  image: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },

  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  views: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  viewsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },

  loader: {
    marginTop: 40,
  },

  empty: {
    color: '#8e8e93',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 40,
  },
});
