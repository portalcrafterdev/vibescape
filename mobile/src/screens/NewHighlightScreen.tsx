import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, ArrowLeft } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';
import { useProfile } from '../context/ProfileContext';

import {
  getUserStories,
  createHighlight,
  StoryOut,
} from '../../api/authApi';

type Props = NativeStackScreenProps<RootStackParamList, 'NewHighlight'>;

const SIZE = Dimensions.get('window').width / 3;

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// "13 Jun", the way the gallery labels each one.
const dayOf = (date: string) => {
  const when = new Date(date);

  return `${when.getDate()} ${MONTHS[when.getMonth()]}`;
};

const NewHighlightScreen = ({ navigation }: Props) => {
  const { user } = useProfile();

  const [stories, setStories] = useState<StoryOut[]>([]);
  const [loading, setLoading] = useState(true);

  // Ids of the ones ticked, in the order they were tapped.
  const [picked, setPicked] = useState<string[]>([]);

  // Step two, where the highlight gets its name.
  const [naming, setNaming] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      try {
        setStories(await getUserStories(user.id));
      } catch (error) {
        console.log('Load my stories failed', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const toggle = (id: string) => {
    if (picked.includes(id)) {
      setPicked(picked.filter((item) => item !== id));
    } else {
      setPicked([...picked, id]);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || saving) return;

    setSaving(true);

    try {
      // The cover is the first one picked, which is what Instagram does
      // until the cover is changed by hand.
      const first = stories.find((item) => item.id === picked[0]);

      await createHighlight({
        title: title.trim(),
        cover_url: first?.image_url ?? null,
        story_ids: picked,
      });

      navigation.goBack();
    } catch (error: any) {
      console.log('Create highlight failed', error);
      Alert.alert('Could not save', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Step two: the name.
  if (naming) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setNaming(false)}>
            <X size={26} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.title}>Name this highlight</Text>

          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#4da6ff" />
            ) : (
              <Check
                size={26}
                color={title.trim() ? '#4da6ff' : '#3a3a3a'}
                strokeWidth={2.5}
              />
            )}
          </TouchableOpacity>
        </View>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Highlight name"
          placeholderTextColor="#777"
          style={styles.nameInput}
          maxLength={60}
          autoFocus
        />

        <Text style={styles.note}>
          {picked.length} {picked.length === 1 ? 'story' : 'stories'} will be
          kept here for good, even after they disappear from your profile.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={26} color="#fff" strokeWidth={2.2} />
        </TouchableOpacity>

        <Text style={styles.title}>Add to highlight</Text>

        <TouchableOpacity
          onPress={() => setNaming(true)}
          disabled={picked.length === 0}
        >
          <Text
            style={[styles.next, picked.length === 0 && styles.nextOff]}
          >
            Next
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#fff" />
      ) : stories.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.message}>
            A highlight is made from your stories, and you have none up right
            now. Post one first, then come back.
          </Text>
        </View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={(item) => item.id}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const at = picked.indexOf(item.id);

            return (
              <TouchableOpacity
                style={styles.tile}
                onPress={() => toggle(item.id)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.tileImage}
                />

                {/* The day it was posted, in its own corner. */}
                <View style={styles.dayBadge}>
                  <Text style={styles.dayText}>{dayOf(item.created_at)}</Text>
                </View>

                {/* An empty box on every one, filled in with the order it
                    will play in once it is picked. */}
                <View style={[styles.tick, at > -1 && styles.tickOn]}>
                  {at > -1 && <Text style={styles.tickText}>{at + 1}</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

export default NewHighlightScreen;

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

  next: {
    color: '#4da6ff',
    fontSize: 15,
    fontWeight: '700',
  },

  nextOff: {
    color: '#3a3a3a',
  },

  tile: {
    width: SIZE,
    height: SIZE,
    padding: 1,
  },

  tileImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#262626',
  },

  dayBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#000000aa',
  },

  dayText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // A square, not a circle, which is what the picker uses.
  tick: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#fff',
    backgroundColor: '#00000055',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tickOn: {
    backgroundColor: '#4A5BE8',
    borderColor: '#4A5BE8',
  },

  tickText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  nameInput: {
    color: '#fff',
    fontSize: 17,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#1c1c1c',
  },

  note: {
    color: '#8e8e93',
    fontSize: 13,
    lineHeight: 18,
    margin: 16,
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
    lineHeight: 21,
    textAlign: 'center',
  },
});
