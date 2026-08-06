import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useProfile } from './ProfileContext';
import { getStoryTray, StoryTray } from '../../api/authApi';

interface StoryValue {
  tray: StoryTray[];
  /** '' for nobody with a story, 'new' for a red ring, 'seen' for a grey one. */
  ringFor: (userId?: string, latestAt?: string | null) => string;
  markSeen: (userId: string, latestAt: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const StoryContext = createContext<StoryValue>({
  tray: [],
  ringFor: () => '',
  markSeen: async () => {},
  refresh: async () => {},
});

// Holds who has a story and which of them have been watched, so every avatar
// in the app draws the same ring without each screen asking the API again.
export const StoryProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useProfile();

  const [tray, setTray] = useState<StoryTray[]>([]);
  const [seen, setSeen] = useState<Record<string, string>>({});

  const refresh = async () => {
    if (!user) return;

    try {
      setTray(await getStoryTray());
    } catch (error) {
      console.log('Load story tray failed', error);
    }

    // The key carries whoever is signed in, so watching on one account
    // leaves the same story red on the other.
    const key = `seenStories-${user.id}`;
    let saved = await AsyncStorage.getItem(key);

    // The key used to be the same for everyone. Anything watched back then
    // is moved across once, so those rings do not turn red again.
    if (!saved) {
      const shared = await AsyncStorage.getItem('seenStories');

      if (shared) {
        await AsyncStorage.setItem(key, shared);
        saved = shared;
      }
    }

    setSeen(saved ? JSON.parse(saved) : {});
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markSeen = async (userId: string, latestAt: string) => {
    if (!user || !latestAt) return;

    const key = `seenStories-${user.id}`;
    const saved = await AsyncStorage.getItem(key);
    const map = saved ? JSON.parse(saved) : {};

    // Never step back to an older time. Opening an old story again must not
    // undo a newer one that was already watched.
    if (map[userId] && map[userId] >= latestAt) return;

    map[userId] = latestAt;

    await AsyncStorage.setItem(key, JSON.stringify(map));
    setSeen(map);
  };

  // The times are compared as plain text. The API sends six decimal places,
  // which is more than a date understands, so reading them can give nothing
  // back. Same shape and same zone means the text sorts by time.
  const ringFor = (userId?: string, latestAt?: string | null) => {
    if (!userId) return '';

    // A time can be handed in by a screen that asked the API itself. Anyone
    // else is looked up in the tray.
    const latest =
      latestAt ?? tray.find((item) => item.author.id === userId)?.latest_at;

    if (!latest) return '';

    const watched = seen[userId];

    return watched && watched >= latest ? 'seen' : 'new';
  };

  return (
    <StoryContext.Provider value={{ tray, ringFor, markSeen, refresh }}>
      {children}
    </StoryContext.Provider>
  );
};

export const useStories = () => useContext(StoryContext);
