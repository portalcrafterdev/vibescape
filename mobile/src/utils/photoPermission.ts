import { Platform, PermissionsAndroid } from 'react-native';

import {
  iosReadGalleryPermission,
  iosRequestReadWriteGalleryPermission,
} from '@react-native-camera-roll/camera-roll';

// "limited" means the user shared only some photos, which still works.
export type PhotoAccess = 'granted' | 'limited' | 'denied' | 'blocked';

const askAndroid = async (): Promise<PhotoAccess> => {
  const version = Number(Platform.Version);

  // Android 12 and below use the old storage permission.
  if (version < 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );

    if (result === 'granted') return 'granted';
    return result === 'never_ask_again' ? 'blocked' : 'denied';
  }

  // Android 13 split images and video into two permissions, and reels need
  // the video one.
  const wanted = [
    PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
    PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
  ];

  // Android 14 added "Select photos", which grants a different permission.
  if (version >= 34) {
    wanted.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_VISUAL_USER_SELECTED);
  }

  const results = await PermissionsAndroid.requestMultiple(wanted);

  if (results['android.permission.READ_MEDIA_IMAGES'] === 'granted') {
    return 'granted';
  }

  if (results['android.permission.READ_MEDIA_VISUAL_USER_SELECTED'] === 'granted') {
    return 'limited';
  }

  const blocked = Object.values(results).includes('never_ask_again');

  return blocked ? 'blocked' : 'denied';
};

const askIOS = async (): Promise<PhotoAccess> => {
  // camera-roll has its own photo permission check, so we do not need
  // react-native-permissions (which would need extra Podfile setup).
  let status = await iosReadGalleryPermission('readWrite');

  if (status === 'not-determined') {
    status = await iosRequestReadWriteGalleryPermission();
  }

  if (status === 'granted') return 'granted';
  if (status === 'limited') return 'limited';
  if (status === 'denied') return 'denied';

  return 'blocked';
};

export const requestPhotoAccess = () =>
  Platform.OS === 'android' ? askAndroid() : askIOS();
