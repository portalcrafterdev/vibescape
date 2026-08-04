import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Trash2 } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';
import { getUserStories, deleteStory, StoryOut } from '../../api/authApi';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryViewer'>;

const StoryViewer = ({ route, navigation }: Props) => {
  const { userId, username } = route.params;

  const [stories, setStories] = useState<StoryOut[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadStories = async () => {
    try {
      const response = await getUserStories(userId);
      setStories(response);
    } catch (error) {
      console.log('Load stories failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const story = stories[index];

  // Tap the right half for the next story, the left half to go back.
  const goNext = () => {
    if (index < stories.length - 1) {
      setIndex(index + 1);
    } else {
      navigation.goBack();
    }
  };

  const goBack = () => {
    if (index > 0) setIndex(index - 1);
  };

  const handleDelete = () => {
    if (!story) return;

    Alert.alert('Delete story', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStory(story.id);

            const left = stories.filter((item) => item.id !== story.id);

            if (left.length === 0) {
              navigation.goBack();
              return;
            }

            setStories(left);
            setIndex(index > 0 ? index - 1 : 0);
          } catch (error) {
            console.log('Delete story failed', error);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {loading ? (
        <ActivityIndicator style={styles.loader} color="#fff" />
      ) : !story ? (
        <View style={styles.centered}>
          <Text style={styles.message}>No stories to show.</Text>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.viewer}>
          <Image source={{ uri: story.image_url }} style={styles.image} />

          {/* Tap areas sit on top of the picture */}
          <TouchableOpacity style={styles.leftTap} onPress={goBack} />
          <TouchableOpacity style={styles.rightTap} onPress={goNext} />

          <View style={styles.header}>
            <Text style={styles.username}>
              {story.author.username ?? username}
            </Text>

            <View style={styles.headerIcons}>
              {story.is_mine && (
                <TouchableOpacity onPress={handleDelete} style={styles.trash}>
                  <Trash2 size={22} color="#fff" />
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => navigation.goBack()}>
                <X size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.counter}>
            {index + 1} / {stories.length}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default StoryViewer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  viewer: {
    flex: 1,
  },

  image: {
    flex: 1,
    width: '100%',
    resizeMode: 'contain',
  },

  leftTap: {
    position: 'absolute',
    top: 60,
    bottom: 0,
    left: 0,
    width: '35%',
  },

  rightTap: {
    position: 'absolute',
    top: 60,
    bottom: 0,
    right: 0,
    width: '65%',
  },

  header: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  trash: {
    marginRight: 18,
  },

  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  counter: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    color: '#8e8e93',
    fontSize: 13,
  },

  loader: {
    marginTop: 60,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  message: {
    color: '#8e8e93',
    fontSize: 15,
  },

  close: {
    color: '#6C63FF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
  },
});
