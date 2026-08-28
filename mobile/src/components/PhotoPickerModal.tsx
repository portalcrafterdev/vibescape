import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import {
  CameraRoll,
  PhotoIdentifier,
} from '@react-native-camera-roll/camera-roll';

import { requestPhotoAccess } from '../utils/photoPermission';

const width = Dimensions.get('window').width;
const IMAGE_SIZE = width / 3;

interface pickerprops {
  visible: boolean;
  onClose: () => void;
  onSelect: (photo: PhotoIdentifier) => void;
}

const PhotoPickerModal = ({ visible, onClose, onSelect }: pickerprops) => {
  const [photos, setPhotos] = useState<PhotoIdentifier[]>([]);
  const [access, setAccess] = useState('');
  const [loading, setLoading] = useState(true);

  const loadPhotos = async () => {
    try {
      const page = await CameraRoll.getPhotos({
        first: 200,
        assetType: 'Photos',
        // We need these to work out the file name, type and size.
        include: ['filename', 'fileExtension', 'fileSize'],
      });

      setPhotos(page.edges);
    } catch (error) {
      console.log('Load photos failed', error);
    }
  };

  const start = async () => {
    setLoading(true);

    const result = await requestPhotoAccess();
    setAccess(result);

    if (result === 'granted' || result === 'limited') {
      await loadPhotos();
    }

    setLoading(false);
  };

  useEffect(() => {
    if (visible) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const denied = access === 'denied' || access === 'blocked';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={26} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.title}>Choose a photo</Text>

          <View style={styles.placeholder} />
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color="#fff" />
        ) : denied ? (
          <View style={styles.centered}>
            <Text style={styles.message}>
              Photo access is needed to choose a picture.
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
            data={photos}
            numColumns={3}
            keyExtractor={(item, index) => `${item.node.id}-${index}`}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => onSelect(item)}>
                <Image
                  source={{ uri: item.node.image.uri }}
                  style={styles.image}
                />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.message}>No photos on this device.</Text>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default PhotoPickerModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
  },

  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  placeholder: {
    width: 26,
  },

  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    padding: 1,
    backgroundColor: '#111',
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
    marginTop: 40,
    paddingHorizontal: 32,
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
});
