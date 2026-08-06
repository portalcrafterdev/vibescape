import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  Switch,
  TextInput,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Check,
  Music,
  MapPin,
  Sparkles,
  ChevronRight,
  UserPlus,
  Type,
} from 'lucide-react-native';

import {
  updatePost,
  searchUsers,
  PostOut,
  UserSummary,
} from '../../api/authApi';

interface editprops {
  post: PostOut;
  // The caption the card is showing, which may already have been changed.
  caption: string;
  onClose: () => void;
  onSaved: (caption: string) => void;
}

// "64w", the way Instagram dates an old post.
const timeAgo = (date: string) => {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);

  if (days < 1) return 'today';
  if (days < 7) return `${days}d`;

  return `${Math.floor(days / 7)}w`;
};

const EditPost = ({ post, caption, onClose, onSaved }: editprops) => {
  const [draft, setDraft] = useState(caption);
  const [saving, setSaving] = useState(false);

  // The whole picture is shown rather than a cut down piece of it, so its
  // own shape decides the height. A square until the real size arrives.
  const [ratio, setRatio] = useState(1);

  useEffect(() => {
    if (!post.image_url) return;

    Image.getSize(
      post.image_url,
      (width, height) => setRatio(width / height),
      (error) => console.log('Image size failed', error),
    );
  }, [post.image_url]);

  // Whoever is already tagged comes with the post.
  const [tagged, setTagged] = useState<UserSummary[]>(
    (post.tagged_users ?? []).map((item) => ({
      id: item.id,
      username: item.username,
      display_name: item.display_name,
      avatar_url: item.avatar_url,
    })),
  );

  const [showTags, setShowTags] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [searching, setSearching] = useState(false);

  // The API takes none of these yet, so they are only held on the screen.
  const [audio, setAudio] = useState('');
  const [location, setLocation] = useState('');
  const [aiLabel, setAiLabel] = useState(false);
  const [altText, setAltText] = useState('');

  // Audio, location and alt text are all a line of text typed into the same
  // little sheet, so one is enough. Empty means nothing is open.
  const [sheet, setSheet] = useState('');
  const [sheetText, setSheetText] = useState('');

  const openSheet = (kind: string) => {
    setSheet(kind);
    setSheetText(kind === 'audio' ? audio : kind === 'alt' ? altText : location);
  };

  const saveSheet = () => {
    if (sheet === 'audio') setAudio(sheetText.trim());
    else if (sheet === 'alt') setAltText(sheetText.trim());
    else setLocation(sheetText.trim());

    setSheet('');
  };

  // Look people up a moment after typing stops, not on every key.
  useEffect(() => {
    const text = query.trim();

    if (!text) {
      setResults([]);
      return;
    }

    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        setResults(await searchUsers(text, 20));
      } catch (error) {
        console.log('Search people failed', error);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Tapping someone already tagged takes them off again.
  const toggleTag = (person: UserSummary) => {
    if (tagged.some((item) => item.id === person.id)) {
      setTagged(tagged.filter((item) => item.id !== person.id));
    } else {
      setTagged([...tagged, person]);
    }
  };

  const handleSave = async () => {
    if (saving) return;

    setSaving(true);

    try {
      // Any #word in the caption is sent as a tag as well, so the post keeps
      // turning up under the right ones after a change.
      const tags = (draft.match(/#(\w+)/g) || []).map((word) => word.slice(1));

      await updatePost(post.id, {
        caption: draft.trim() || null,
        hashtags: tags,
        tagged_users: tagged.map((item) => ({ user_id: item.id })),
      });

      onSaved(draft.trim());
    } catch (error) {
      console.log('Edit post failed', error);
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <X size={26} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>Edit info</Text>

        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#4da6ff" />
          ) : (
            <Check size={26} color="#4da6ff" strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Who posted it, and how long ago */}
        <View style={styles.authorRow}>
          <Image
            source={
              post.author.avatar_url
                ? { uri: post.author.avatar_url }
                : require('../assets/images/Portelcrafterlogo.png')
            }
            style={styles.avatar}
          />

          <Text style={styles.username}>{post.author.username}</Text>

          <Text style={styles.age}>{timeAgo(post.created_at)}</Text>
        </View>

        {!!post.image_url && (
          <Image
            source={{ uri: post.image_url }}
            style={[styles.image, { aspectRatio: ratio }]}
            resizeMode="contain"
          />
        )}

        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a caption..."
          placeholderTextColor="#777"
          style={styles.caption}
          multiline
        />

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={() => openSheet('audio')}>
          <Music size={22} color="#fff" />

          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{audio || 'Add audio'}</Text>
          </View>

          <ChevronRight size={20} color="#8e8e93" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => setShowTags(true)}>
          <UserPlus size={22} color="#fff" />

          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Tag people and collaborators</Text>
          </View>

          {tagged.length > 0 && (
            <Text style={styles.rowValue}>
              {tagged.length} {tagged.length === 1 ? 'person' : 'people'}
            </Text>
          )}

          <ChevronRight size={20} color="#8e8e93" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => openSheet('location')}
        >
          <MapPin size={22} color="#fff" />

          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{location || 'Add location'}</Text>
          </View>

          {/* A place already picked can be taken off again. */}
          {!!location && (
            <TouchableOpacity onPress={() => setLocation('')}>
              <X size={20} color="#8e8e93" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <View style={styles.row}>
          <Sparkles size={22} color="#fff" />

          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Add AI label</Text>

            <Text style={styles.rowNote}>
              We require you to label certain realistic content that's made
              with AI.
            </Text>
          </View>

          <Switch
            value={aiLabel}
            onValueChange={setAiLabel}
            trackColor={{ false: '#3a3a3a', true: '#4A5BE8' }}
            thumbColor="#fff"
          />
        </View>

        <TouchableOpacity style={styles.row} onPress={() => openSheet('alt')}>
          <Type size={22} color="#fff" />

          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Edit Alt Text</Text>

            {!!altText && (
              <Text style={styles.rowNote} numberOfLines={1}>
                {altText}
              </Text>
            )}
          </View>

          <ChevronRight size={20} color="#8e8e93" />
        </TouchableOpacity>
      </ScrollView>

      {/* Audio, location and alt text, all a line of typing */}
      <Modal
        visible={!!sheet}
        animationType="slide"
        onRequestClose={() => setSheet('')}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSheet('')}>
              <X size={26} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.title}>
              {sheet === 'audio'
                ? 'Add audio'
                : sheet === 'alt'
                ? 'Alt text'
                : 'Add location'}
            </Text>

            <TouchableOpacity onPress={saveSheet}>
              <Check size={26} color="#4da6ff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <TextInput
            value={sheetText}
            onChangeText={setSheetText}
            placeholder={
              sheet === 'audio'
                ? 'Song name'
                : sheet === 'alt'
                ? 'Describe the picture'
                : 'Where was this?'
            }
            placeholderTextColor="#777"
            style={styles.search}
            autoFocus
          />
        </SafeAreaView>
      </Modal>

      {/* People picker */}
      <Modal
        visible={showTags}
        animationType="slide"
        onRequestClose={() => setShowTags(false)}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowTags(false)}>
              <X size={26} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.title}>Tag people</Text>

            <TouchableOpacity onPress={() => setShowTags(false)}>
              <Check size={26} color="#4da6ff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor="#777"
            style={styles.search}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {searching ? (
            <ActivityIndicator style={styles.loader} color="#fff" />
          ) : (
            <FlatList
              // Whoever is already tagged stays on top, so they can be taken
              // off again without searching for them a second time.
              data={[
                ...tagged,
                ...results.filter(
                  (item) => !tagged.some((person) => person.id === item.id),
                ),
              ]}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.personRow}
                  onPress={() => toggleTag(item)}
                >
                  <Image
                    source={
                      item.avatar_url
                        ? { uri: item.avatar_url }
                        : require('../assets/images/Portelcrafterlogo.png')
                    }
                    style={styles.personAvatar}
                  />

                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{item.username}</Text>

                    {!!item.display_name && (
                      <Text style={styles.rowNote}>{item.display_name}</Text>
                    )}
                  </View>

                  {tagged.some((person) => person.id === item.id) && (
                    <Check size={20} color="#0095F6" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                query.trim() ? (
                  <Text style={styles.empty}>Nobody found.</Text>
                ) : null
              }
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default EditPost;

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

  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#262626',
  },

  username: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },

  age: {
    color: '#8e8e93',
    fontSize: 14,
    marginLeft: 'auto',
  },

  image: {
    width: '100%',
    backgroundColor: '#111',
  },

  caption: {
    color: '#fff',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 90,
    textAlignVertical: 'top',
  },

  divider: {
    height: 8,
    backgroundColor: '#0d0d0d',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1c1c1c',
  },

  rowBody: {
    flex: 1,
  },

  rowTitle: {
    color: '#fff',
    fontSize: 15,
  },

  rowNote: {
    color: '#8e8e93',
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },

  rowValue: {
    color: '#8e8e93',
    fontSize: 14,
  },

  search: {
    color: '#fff',
    fontSize: 15,
    backgroundColor: '#262626',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 12,
  },

  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  personAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#262626',
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
