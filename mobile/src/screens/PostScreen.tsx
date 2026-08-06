import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import PostCard from '../components/PostCard';
import { RootStackParamList } from '../types/navigation';
import { getPost, PostOut } from '../../api/authApi';

type Props = NativeStackScreenProps<RootStackParamList, 'Post'>;

const PostScreen = ({ route, navigation }: Props) => {
  const { postId } = route.params;

  const [post, setPost] = useState<PostOut | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPost = async () => {
    try {
      setPost(await getPost(postId));
    } catch (error) {
      console.log('Load post failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={26} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>Post</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#fff" />
      ) : !post ? (
        <Text style={styles.message}>This post is not available.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Deleting from here leaves nothing to look at, so we go back. */}
          <PostCard post={post} onDeleted={() => navigation.goBack()} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default PostScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  loader: {
    marginTop: 40,
  },

  message: {
    color: '#8e8e93',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 60,
  },
});
