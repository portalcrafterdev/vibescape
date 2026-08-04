import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';

import Video from 'react-native-video';

import ReelsHeader from './ReelHeader';
import ReelActions from './ReelAction';
import ReelFooter from './ReelsFooter';

import {
  likeReel,
  unlikeReel,
  deleteReel,
  recordReelView,
  ReelOut,
} from '../../api/authApi';

const { width, height } = Dimensions.get('window');

interface cardprops {
  reel: ReelOut;
  isCurrent: boolean;
  isActive: boolean;
  onDeleted: (reelId: string) => void;
  onOpenComments: () => void;
}

const ReelCard = ({
  reel,
  isCurrent,
  isActive,
  onDeleted,
  onOpenComments,
}: cardprops) => {
  const [liked, setLiked] = useState(!!reel.is_liked);
  const [likes, setLikes] = useState(reel.likes_count ?? 0);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // One view per card, not one per replay.
  const counted = useRef(false);

  const handleLoad = () => {
    if (counted.current) return;
    counted.current = true;

    recordReelView(reel.id).catch(() => {});
  };

  const handleLike = async () => {
    if (busy) return;

    setBusy(true);

    try {
      const response = liked
        ? await unlikeReel(reel.id)
        : await likeReel(reel.id);

      setLiked(response.liked);
      setLikes(response.likes_count);
    } catch (error) {
      console.log('Like reel failed', error);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    if (!reel.is_mine) return;

    Alert.alert('Delete reel', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReel(reel.id);
            onDeleted(reel.id);
          } catch (error) {
            console.log('Delete reel failed', error);
            Alert.alert('Could not delete', 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Only the visible reel holds a decoder. Keeping every card's video
          mounted runs several at once, which older devices cannot do. It stays
          mounted while the comments sheet is open so the reel shows behind it,
          and only pauses. */}
      {isCurrent && !failed && (
        <Video
          source={{ uri: reel.video_url }}
          style={styles.video}
          resizeMode="cover"
          repeat={true}
          paused={!isActive}
          muted={false}
          controls={false}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          onLoad={handleLoad}
          onError={(error) => {
            console.log('Video Error:', error);
            setFailed(true);
          }}
        />
      )}

      {failed && (
        <View style={styles.failed}>
          <Text style={styles.failedText}>This reel could not be played.</Text>
        </View>
      )}

      {/* Top Header */}
      <ReelsHeader />

      {/* Right Side Actions */}
      <ReelActions
        liked={liked}
        likes={likes}
        comments={reel.comments_count ?? 0}
        albumUrl={reel.album_url}
        isMine={!!reel.is_mine}
        onLike={handleLike}
        onComment={onOpenComments}
        onDelete={handleDelete}
      />

      {/* Bottom Footer */}
      <ReelFooter reel={reel} />
    </View>
  );
};

export default ReelCard;

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: '#000',
  },

 video: {
  position: 'absolute',
  width: '100%',
  height: '100%',
},

  failed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  failedText: {
    color: '#8e8e93',
    fontSize: 15,
  },
});
