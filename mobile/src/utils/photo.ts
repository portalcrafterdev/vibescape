import { Platform } from 'react-native';
import {
  CameraRoll,
  PhotoIdentifier,
} from '@react-native-camera-roll/camera-roll';

import { UploadableImage } from '../../api/media';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

/**
 * Turns a camera-roll entry into something FormData can actually send.
 *
 * On Android the gallery URI is already readable. On iOS it is a PhotoKit
 * `ph://` reference that no HTTP layer can open, so the real file has to be
 * materialised first.
 */
export const toUploadable = async (
  photo: PhotoIdentifier,
): Promise<UploadableImage> => {
  const { id, image } = photo.node;

  let uri = image.uri;
  let size = image.fileSize;
  let extension = (image.extension ?? '').toLowerCase();
  let name = image.filename ?? `photo.${extension || 'jpg'}`;

  if (Platform.OS === 'ios' && uri.startsWith('ph://')) {
    // convertHeicImages also solves the format problem: iPhone photos are HEIC,
    // which browsers cannot display, so they become JPEG on the way out.
    const resolved = await CameraRoll.iosGetImageDataById(id, {
      convertHeicImages: true,
    });

    const filepath = resolved.node.image.filepath;

    if (!filepath) {
      throw new Error('Could not read that photo from your library.');
    }

    uri = filepath.startsWith('file://') ? filepath : `file://${filepath}`;
    size = resolved.node.image.fileSize ?? size;

    if (extension === 'heic' || extension === 'heif') {
      extension = 'jpg';
      name = name.replace(/\.(heic|heif)$/i, '.jpg');
    }
  }

  return {
    uri,
    name,
    type: CONTENT_TYPES[extension] ?? 'image/jpeg',
    size,
  };
};
