import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Modal,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Settings,
  ChevronDown,
  Camera,
  Copy,
  Music,
  LayoutGrid,
} from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CameraRoll,
  Album,
  PhotoIdentifier,
} from '@react-native-camera-roll/camera-roll';

import { RootStackParamList } from '../types/navigation';
import StoryPreview from '../components/Create_Screen_Components/StoryPreview';

import { requestPhotoAccess } from '../utils/photoPermission';
import { toUploadable } from '../utils/photo';
import { uploadImage } from '../../api/media';
import { createStory } from '../../api/authApi';

type Props = NativeStackScreenProps<RootStackParamList, 'AddStory'>;

const SIZE = Dimensions.get('window').width / 3;

// "0:51" under a video, the way the gallery labels them.
const clock = (seconds?: number) => {
  if (!seconds) return '';

  const whole = Math.round(seconds);

  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

const AddStoryScreen = ({ navigation }: Props) => {
  const [items, setItems] = useState<PhotoIdentifier[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [albums, setAlbums] = useState<Album[]>([]);
  // null means Recents, which is everything on the device.
  const [album, setAlbum] = useState<string | null>(null);
  const [showAlbums, setShowAlbums] = useState(false);

  const [access, setAccess] = useState('');
  const [loading, setLoading] = useState(true);

  // The one being looked at before it goes up.
  const [chosen, setChosen] = useState<PhotoIdentifier | null>(null);
  const [sharing, setSharing] = useState(false);

  const load = async (nextCursor?: string) => {
    try {
      const page = await CameraRoll.getPhotos({
        first: 60,
        after: nextCursor,
        // Photos and videos together, so a story can be either.
        assetType: 'All',
        groupName: album ?? undefined,
        include: ['filename', 'fileExtension', 'fileSize', 'playableDuration'],
      });

      setItems(nextCursor ? (old) => [...old, ...page.edges] : page.edges);
      setCursor(page.page_info.end_cursor);
      setHasMore(page.page_info.has_next_page);
    } catch (error) {
      console.log('Load gallery failed', error);
    }
  };

  const start = async () => {
    setLoading(true);

    const result = await requestPhotoAccess();
    setAccess(result);

    if (result === 'granted' || result === 'limited') {
      await load();

      try {
        setAlbums(await CameraRoll.getAlbums({ assetType: 'All' }));
      } catch (error) {
        console.log('Load albums failed', error);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Picking another album loads it from the top.
  useEffect(() => {
    if (access === 'granted' || access === 'limited') {
      setCursor(undefined);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [album]);

  // The guard stops a fast scroll asking for the same page twice.
  const loadMore = async () => {
    if (!hasMore || !cursor || loadingMore) return;

    setLoadingMore(true);
    await load(cursor);
    setLoadingMore(false);
  };

  const handleShare = async () => {
    if (!chosen || sharing) return;

    setSharing(true);

    try {
      const file = await toUploadable(chosen);
      const asset = await uploadImage(file);

      // The address goes up with the asset id, because the API sends back an
      // empty picture when it is only given the id.
      await createStory({
        media_asset_id: asset.asset_id,
        image_url: asset.url,
      });

      Alert.alert('Shared', 'Your story is live.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Could not share', error?.message ?? 'Please try again.');
    } finally {
      setSharing(false);
    }
  };

  // Checking the one that was picked before it goes anywhere.
  if (chosen) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StoryPreview
          uri={chosen.node.image.uri}
          video={chosen.node.type?.startsWith('video')}
          onBack={() => setChosen(null)}
          onShare={handleShare}
          busy={sharing}
        />
      </SafeAreaView>
    );
  }

  const denied = access === 'denied' || access === 'blocked';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X size={26} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>Add to story</Text>

        <Settings size={24} color="#fff" />
      </View>

      {/* The three cards along the top. Nothing behind them yet. */}
      <View style={styles.cards}>
        <View style={styles.card}>
          <Copy size={22} color="#fff" />
          <Text style={styles.cardText}>Templates</Text>
        </View>

        <View style={styles.card}>
          <Music size={22} color="#fff" />
          <Text style={styles.cardText}>Music</Text>
        </View>

        <View style={styles.card}>
          <LayoutGrid size={22} color="#fff" />
          <Text style={styles.cardText}>Collage</Text>
        </View>
      </View>

      <View style={styles.albumRow}>
        <TouchableOpacity
          style={styles.albumName}
          onPress={() => setShowAlbums(true)}
        >
          <Text style={styles.albumText}>{album ?? 'Recents'}</Text>
          <ChevronDown size={18} color="#fff" />
        </TouchableOpacity>

        <View style={styles.selectButton}>
          <Copy size={16} color="#fff" />
          <Text style={styles.selectText}>Select</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#fff" />
      ) : denied ? (
        <View style={styles.centered}>
          <Text style={styles.message}>
            Photo access is needed to add a story.
          </Text>

          {access === 'blocked' && (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => Linking.openSettings()}
            >
              <Text style={styles.settingsText}>Open Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${item.node.image.uri}-${index}`}
          numColumns={3}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          // The camera sits in the first square, as it does on Instagram.
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.cameraTile}
              onPress={() =>
                navigation.replace('CreateScreen', { mode: 'STORY' })
              }
            >
              <Camera size={26} color="#fff" />
            </TouchableOpacity>
          }
          columnWrapperStyle={styles.column}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.tile}
              onPress={() => setChosen(item)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.node.image.uri }}
                style={styles.tileImage}
              />

              {/* How long a video runs, in its bottom corner. */}
              {item.node.type?.startsWith('video') && (
                <Text style={styles.duration}>
                  {clock(item.node.image.playableDuration)}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Album list */}
      <Modal
        visible={showAlbums}
        animationType="slide"
        onRequestClose={() => setShowAlbums(false)}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowAlbums(false)}>
              <X size={26} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.title}>Albums</Text>

            <View style={styles.placeholder} />
          </View>

          <FlatList
            data={[{ title: 'Recents', count: 0 }, ...albums]}
            keyExtractor={(item) => item.title}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.albumItem}
                onPress={() => {
                  setAlbum(item.title === 'Recents' ? null : item.title);
                  setShowAlbums(false);
                }}
              >
                <Text style={styles.albumItemText}>{item.title}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default AddStoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  placeholder: {
    width: 26,
  },

  cards: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 14,
  },

  card: {
    flex: 1,
    height: 74,
    borderRadius: 10,
    backgroundColor: '#1c1c1c',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  cardText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  albumName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  albumText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1c1c1c',
  },

  selectText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  column: {
    gap: 2,
  },

  cameraTile: {
    width: SIZE,
    height: SIZE,
    backgroundColor: '#1c1c1c',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tile: {
    width: SIZE,
    height: SIZE,
    marginBottom: 2,
  },

  tileImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#262626',
  },

  duration: {
    position: 'absolute',
    right: 6,
    bottom: 5,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  videoPreview: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },

  loader: {
    marginTop: 40,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  message: {
    color: '#8e8e93',
    fontSize: 15,
    textAlign: 'center',
  },

  settingsButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#262626',
    justifyContent: 'center',
  },

  settingsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  albumItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
  },

  albumItemText: {
    color: '#fff',
    fontSize: 16,
  },
});
